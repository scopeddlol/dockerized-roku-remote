#!/usr/bin/env python3
"""Roku LAN remote: JSON API over Roku ECP, plus the built web UI.

Zero dependencies (Python 3.10+ standard library only). Configure with env vars:

  PORT        port to listen on               (default 8000)
  TV_IP       TV address used until one is saved from the UI
  DATA_DIR    where config.json/macros.json live (default ./data)
  STATIC_DIR  built web UI to serve            (default ../web/dist)
"""
import json
import os
import sys
import threading
import traceback
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import storage
from discovery import discover
from roku import Roku

STATIC_DIR = Path(os.environ.get("STATIC_DIR",
                                 Path(__file__).resolve().parent.parent / "web" / "dist"))


class State:
    """The currently configured TV. Swapped atomically when settings change."""

    def __init__(self):
        self.lock = threading.Lock()
        self.config = storage.load_config()
        self.roku = Roku(self.config["tv_ip"]) if self.config.get("tv_ip") else None

    def set_tv(self, host):
        with self.lock:
            self.config["tv_ip"] = host
            storage.save_config(self.config)
            self.roku = Roku(host)


STATE = State()


class NotConfigured(Exception):
    pass


def tv():
    if STATE.roku is None:
        raise NotConfigured("No TV configured yet. Open Settings to find one.")
    return STATE.roku


class Handler(SimpleHTTPRequestHandler):
    server_version = "RokuRemote/2"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def log_message(self, fmt, *args):
        pass

    # -- helpers -----------------------------------------------------------

    def send_json(self, payload, code=200):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self, default):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return default
        if length > 256 * 1024:
            raise ValueError("request body too large")
        return json.loads(self.rfile.read(length))

    def fail(self, exc):
        if isinstance(exc, NotConfigured):
            self.send_json({"error": str(exc), "code": "not_configured"}, 409)
            return
        if isinstance(exc, ValueError):  # includes json.JSONDecodeError
            self.send_json({"error": str(exc)}, 400)
            return
        # Log before replying: a client that already hung up makes send_json
        # raise, and the traceback would otherwise be lost.
        print(f"{self.command} {self.path} failed: {exc!r}", file=sys.stderr)
        traceback.print_exc()
        self.send_json({"error": str(exc)}, 502)

    def tail(self, prefix):
        return urllib.parse.unquote(self.route[len(prefix):])

    def end_headers(self):
        # Vite fingerprints everything under /assets, so it can be cached forever.
        if self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        super().end_headers()

    # -- routes ------------------------------------------------------------

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        self.route = parsed.path
        try:
            if self.route == "/api/health":
                self.send_json({"ok": True})
            elif self.route == "/api/status":
                if STATE.roku is None:
                    self.send_json({"reachable": False, "configured": False})
                else:
                    self.send_json({**STATE.roku.status(), "configured": True})
            elif self.route == "/api/apps":
                self.send_json(tv().apps())
            elif self.route.startswith("/api/icon/"):
                data, ctype = tv().icon(self.tail("/api/icon/"))
                self.send_response(200)
                self.send_header("Content-Type", ctype or "image/png")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(data)
            elif self.route == "/api/macros":
                self.send_json(storage.load_macros())
            elif self.route == "/api/config":
                self.send_json({"tv_ip": STATE.config.get("tv_ip")})
            elif self.route == "/api/discover":
                query = urllib.parse.parse_qs(parsed.query)
                self.send_json(discover(query.get("subnet", [])))
            elif self.route.startswith("/api/"):
                self.send_json({"error": "not found"}, 404)
            else:
                self.serve_static()
        except Exception as exc:
            self.fail(exc)

    def do_POST(self):
        self.route = urllib.parse.urlparse(self.path).path
        try:
            if self.route.startswith("/api/keypress/"):
                tv().keypress(self.tail("/api/keypress/"))
                self.send_json({"ok": True})
            elif self.route.startswith("/api/launch/"):
                tv().launch(self.tail("/api/launch/"))
                self.send_json({"ok": True})
            elif self.route == "/api/text":
                text = str(self.read_json({}).get("text", ""))[:200]
                tv().send_text(text)
                self.send_json({"ok": True})
            elif self.route.startswith("/api/macro/"):
                name = self.tail("/api/macro/")
                macro = next((m for m in storage.load_macros()
                              if m.get("name") == name), None)
                if macro is None:
                    self.send_json({"error": f"no automation named {name!r}"}, 404)
                    return
                tv().run_steps(storage.validate_macros([macro])[0]["steps"])
                self.send_json({"ok": True})
            elif self.route == "/api/macros":
                self.send_json(storage.save_macros(self.read_json([])))
            elif self.route == "/api/config":
                host = storage.validate_host(self.read_json({}).get("tv_ip"))
                STATE.set_tv(host)
                self.send_json({"tv_ip": host})
            else:
                self.send_json({"error": "not found"}, 404)
        except Exception as exc:
            self.fail(exc)

    def serve_static(self):
        # Single-page app: unknown paths get index.html so client routes work.
        target = STATIC_DIR / self.route.lstrip("/")
        if self.route == "/" or not target.resolve().is_file():
            self.path = "/index.html"
        if not (STATIC_DIR / "index.html").is_file():
            self.send_json({"error": f"web UI not built (looked in {STATIC_DIR}); "
                                     "run `npm run build` in web/"}, 503)
            return
        super().do_GET()


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # Browsers routinely drop idle keep-alive sockets; don't log those.
        if not isinstance(sys.exc_info()[1], (ConnectionError, TimeoutError)):
            super().handle_error(request, client_address)


def main():
    port = int(os.environ.get("PORT", 8000))
    server = Server(("0.0.0.0", port), Handler)
    tv_ip = STATE.config.get("tv_ip") or "not configured (open Settings in the UI)"
    print(f"Roku remote listening on :{port}  TV: {tv_ip}  data: {storage.DATA_DIR}",
          flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
