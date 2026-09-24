"""Thin client for Roku's External Control Protocol (ECP, HTTP on port 8060).

Every Roku exposes the same plain-HTTP API the official mobile app uses:
``POST /keypress/<key>`` presses a remote button, ``POST /launch/<id>`` opens
an app or input, and ``GET /query/*`` returns XML describing device, app, and
playback state. This module wraps those calls and turns the XML into dicts.
"""
import re
import threading
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ECP_PORT = 8060

# Keys, app IDs and input IDs are always short tokens like "Home",
# "tvinput.hdmi1" or "12". Anything else is rejected before it reaches the TV.
SAFE_ID = re.compile(r"^[A-Za-z0-9_.%-]{1,64}$")


class Roku:
    def __init__(self, host):
        self.host = host
        self._icons = {}
        self._status = (0.0, None)
        self._status_lock = threading.Lock()

    # -- transport ---------------------------------------------------------

    def _url(self, path):
        return f"http://{self.host}:{ECP_PORT}/{path}"

    def get(self, path, timeout=4):
        with urllib.request.urlopen(self._url(path), timeout=timeout) as resp:
            return resp.read(), resp.headers.get("Content-Type", "")

    def post(self, path, timeout=4):
        req = urllib.request.Request(self._url(path), data=b"", method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status

    # -- commands ----------------------------------------------------------

    def keypress(self, key):
        if not SAFE_ID.match(key):
            raise ValueError(f"bad key: {key!r}")
        self.post(f"keypress/{key}")

    def launch(self, app_id):
        if not SAFE_ID.match(app_id):
            raise ValueError(f"bad app id: {app_id!r}")
        self.post(f"launch/{app_id}")

    def send_text(self, text):
        # ECP has no "type this string" call; each character is a Lit_ keypress.
        for char in text:
            self.post("keypress/Lit_" + urllib.parse.quote(char, safe=""))
            time.sleep(0.05)

    def run_steps(self, steps):
        for step in steps:
            kind, value = step["type"], str(step["value"])
            if kind == "delay":
                time.sleep(min(int(value), 30000) / 1000)
            elif kind == "keypress":
                self.keypress(value)
            elif kind == "launch":
                self.launch(value)
            elif kind == "text":
                self.send_text(value)

    # -- queries -----------------------------------------------------------

    def status(self, max_age=1.0):
        """Power, active app and playback state.

        Every open browser polls this, so results are shared for ``max_age``
        seconds instead of costing three TV round-trips per client per poll.
        """
        with self._status_lock:
            stamp, cached = self._status
            if cached is not None and time.monotonic() - stamp < max_age:
                return cached
            fresh = self._query_status()
            self._status = (time.monotonic(), fresh)
            return fresh

    def _query_status(self):
        status = {"reachable": True, "tv_ip": self.host}
        try:
            info = ET.fromstring(self.get("query/device-info", timeout=3)[0])
            status["device"] = {
                "name": info.findtext("friendly-device-name")
                        or info.findtext("user-device-name"),
                "model": info.findtext("friendly-model-name"),
                "power": info.findtext("power-mode"),
                "is_tv": info.findtext("is-tv") == "true",
            }

            active = ET.fromstring(self.get("query/active-app", timeout=3)[0])
            app = active.find("app")
            status["app"] = {
                "id": app.get("id") if app is not None else None,
                "name": (app.text or "").strip() if app is not None else None,
                "screensaver": active.find("screensaver") is not None,
            }

            player = ET.fromstring(self.get("query/media-player", timeout=3)[0])
            status["player"] = {
                "state": player.get("state"),
                "position_ms": _parse_ms(player.findtext("position")),
                "duration_ms": _parse_ms(player.findtext("duration")),
            }
        except Exception:
            return {"reachable": False, "tv_ip": self.host}
        return status

    def apps(self):
        root = ET.fromstring(self.get("query/apps")[0])
        return [
            {"id": app.get("id"), "name": (app.text or "").strip(),
             "type": app.get("type")}
            for app in root
        ]

    def icon(self, app_id):
        if not SAFE_ID.match(app_id):
            raise ValueError(f"bad app id: {app_id!r}")
        if app_id not in self._icons:
            self._icons[app_id] = self.get(f"query/icon/{app_id}")
        return self._icons[app_id]


def _parse_ms(text):
    match = re.search(r"(\d+)", text or "")
    return int(match.group(1)) if match else None
