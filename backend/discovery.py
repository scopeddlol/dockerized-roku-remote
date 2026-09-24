"""Find Roku devices on the local network.

Tries SSDP multicast on every network interface first (instant), then falls
back to probing each interface's /24 for ECP responders on port 8060.

Inside Docker, SSDP only works with host networking (``network_mode: host``);
on a bridge network the subnet scan still finds TVs when you pass the LAN
prefix explicitly (e.g. ``192.168.1``).
"""
import fcntl
import re
import socket
import struct
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

from roku import ECP_PORT

SUBNET = re.compile(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$")


def describe(ip):
    """Device name/model for an ECP responder, or None if it isn't a Roku."""
    try:
        url = f"http://{ip}:{ECP_PORT}/query/device-info"
        with urllib.request.urlopen(url, timeout=2) as resp:
            info = ET.fromstring(resp.read())
    except (OSError, ET.ParseError):
        return None
    return {
        "ip": ip,
        "name": info.findtext("friendly-device-name")
                or info.findtext("user-device-name")
                or info.findtext("friendly-model-name"),
        "model": info.findtext("friendly-model-name"),
    }


def local_ipv4_addresses():
    """Usable IPv4 addresses on every interface, without ifconfig/iproute2."""
    addrs = set()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        for _, name in socket.if_nameindex():
            try:
                # SIOCGIFADDR: the interface's IPv4 address (Linux only).
                packed = fcntl.ioctl(sock.fileno(), 0x8915,
                                     struct.pack("256s", name[:15].encode()))
                addrs.add(socket.inet_ntoa(packed[20:24]))
            except OSError:
                continue
    except (OSError, AttributeError):
        pass
    finally:
        sock.close()

    if not addrs:
        # Portable fallback: whichever interface routes outward. Nothing is
        # actually sent; connect() on UDP only picks a source address.
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("192.0.2.1", 80))
            addrs.add(sock.getsockname()[0])
        except OSError:
            pass
        finally:
            sock.close()

    return sorted(a for a in addrs if not a.startswith(("127.", "169.254.")))


def ssdp_search(source_ip, timeout=2.5):
    msg = ("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\n"
           'MAN: "ssdp:discover"\r\nST: roku:ecp\r\nMX: 2\r\n\r\n').encode()
    found = set()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.settimeout(timeout)
    try:
        sock.bind((source_ip, 0))
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF,
                        socket.inet_aton(source_ip))
        sock.sendto(msg, ("239.255.255.250", 1900))
        while True:
            data, addr = sock.recvfrom(1024)
            match = re.search(r"http://([\d.]+):8060", data.decode(errors="replace"))
            found.add(match.group(1) if match else addr[0])
    except OSError:
        pass
    finally:
        sock.close()
    return found


def subnet_scan(prefix):
    def probe(ip):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        try:
            return ip if sock.connect_ex((ip, ECP_PORT)) == 0 else None
        finally:
            sock.close()

    with ThreadPoolExecutor(max_workers=64) as pool:
        hits = pool.map(probe, (f"{prefix}.{i}" for i in range(1, 255)))
    return {ip for ip in hits if ip}


def discover(extra_subnets=()):
    """Return ``[{ip, name, model}]`` for every Roku found, sorted by IP."""
    local_ips = local_ipv4_addresses()

    candidates = set()
    for ip in local_ips:
        candidates |= ssdp_search(ip)

    prefixes = set()
    for spec in extra_subnets:
        match = SUBNET.match(spec.strip().rstrip("."))
        if match and all(int(o) < 256 for o in match.groups()):
            prefixes.add(match.group(0))
    if not candidates:
        prefixes |= {ip.rsplit(".", 1)[0] for ip in local_ips}
    for prefix in sorted(prefixes):
        candidates |= subnet_scan(prefix)

    with ThreadPoolExecutor(max_workers=16) as pool:
        found = [r for r in pool.map(describe, sorted(candidates)) if r]
    return {"devices": found, "interfaces": local_ips}
