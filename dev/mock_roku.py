#!/usr/bin/env python3
"""A fake Roku that speaks just enough ECP to develop the UI without a TV.

  python3 dev/mock_roku.py            # listens on :8060
  TV_IP=127.0.0.1 python3 backend/server.py

Or with Docker: ``docker compose -f compose.yaml -f dev/compose.mock.yaml up``.
It keeps power/app/playback state in memory and logs every keypress.
"""
import html
import re
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

APPS = [
    ("tvinput.hdmi1", "Nintendo Switch", "tvin"),
    ("tvinput.hdmi2", "PlayStation 5", "tvin"),
    ("tvinput.hdmi3", "Apple TV", "tvin"),
    ("tvinput.dtv", "Live TV", "tvin"),
    ("12", "Netflix", "appl"),
    ("837", "YouTube", "appl"),
    ("13535", "Plex - Free Movies & TV", "appl"),
    ("592369", "Jellyfin", "appl"),
    ("291097", "Disney Plus", "appl"),
    ("2285", "Hulu", "appl"),
    ("61322", "Max", "appl"),
    ("13", "Prime Video", "appl"),
    ("593099", "Peacock TV", "appl"),
    ("31440", "Paramount Plus", "appl"),
    ("50539", "Twitch", "appl"),
    ("22297", "Spotify Music", "appl"),
    ("2595", "Crunchyroll", "appl"),
    ("41468", "Tubi - Free Movies & TV", "appl"),
    ("74519", "Pluto TV - It's Free TV", "appl"),
    ("195316", "YouTube TV", "appl"),
    ("34376", "ESPN", "appl"),
    ("551012", "Apple TV", "appl"),
    ("46041", "Sling TV", "appl"),
    ("28", "Pandora", "appl"),
    ("151908", "The Roku Channel", "appl"),
]
NAMES = {app_id: name for app_id, name, _ in APPS}
PALETTE = ["#e50914", "#ff0033", "#e5a00d", "#aa5cc3", "#113ccf", "#1ce783",
           "#002be7", "#00a8e1", "#000000", "#0064ff", "#9146ff", "#1db954"]

state = {"power": "PowerOn", "app": "12", "playing": True,
         "position": 1_234_000, "duration": 6_480_000, "since": time.monotonic()}
lock = threading.Lock()


def position_ms():
    if state["playing"]:
        elapsed = int((time.monotonic() - state["since"]) * 1000)
        return min(state["position"] + elapsed, state["duration"])
    return state["position"]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def reply(self, body, ctype="text/xml", code=200):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urllib.parse.unquote(self.path)
        with lock:
            if path == "/query/device-info":
                self.reply(f"""<device-info>
  <friendly-device-name>Living Room TV</friendly-device-name>
  <friendly-model-name>Roku Streaming Stick 4K</friendly-model-name>
  <power-mode>{state['power']}</power-mode><is-tv>true</is-tv>
</device-info>""")
            elif path == "/query/active-app":
                app = state["app"]
                inner = (f'<app id="{app}">{html.escape(NAMES[app])}</app>' if app
                         else '<app>Roku</app>')
                self.reply(f"<active-app>{inner}</active-app>")
            elif path == "/query/media-player":
                if not state["app"] or state["app"].startswith("tvinput"):
                    self.reply('<player error="false" state="close"/>')
                else:
                    st = "play" if state["playing"] else "pause"
                    self.reply(f"""<player error="false" state="{st}">
  <position>{position_ms()} ms</position><duration>{state['duration']} ms</duration>
</player>""")
            elif path == "/query/apps":
                rows = "".join(f'<app id="{i}" type="{t}">{html.escape(n)}</app>'
                               for i, n, t in APPS)
                self.reply(f"<apps>{rows}</apps>")
            elif path.startswith("/query/icon/"):
                app_id = path.rsplit("/", 1)[1]
                name = html.escape(NAMES.get(app_id, "?"))
                color = PALETTE[sum(map(ord, app_id)) % len(PALETTE)]
                self.reply(f"""<svg xmlns="http://www.w3.org/2000/svg" width="290" height="218">
<rect width="290" height="218" fill="{color}"/>
<text x="145" y="118" fill="#fff" font-family="sans-serif" font-size="26"
 font-weight="700" text-anchor="middle">{name[:16]}</text></svg>""", "image/svg+xml")
            else:
                self.reply("", code=404)

    def do_POST(self):
        path = urllib.parse.unquote(self.path)
        print("POST", path, flush=True)
        with lock:
            if m := re.match(r"/keypress/(.+)", path):
                key = m.group(1)
                if key in ("PowerOff",) or (key == "Power" and state["power"] == "PowerOn"):
                    state["power"] = "DisplayOff"
                elif key in ("PowerOn", "Power"):
                    state["power"] = "PowerOn"
                elif key == "Home":
                    state["app"] = None
                elif key == "Play":
                    state["position"] = position_ms()
                    state["since"] = time.monotonic()
                    state["playing"] = not state["playing"]
            elif m := re.match(r"/launch/(.+)", path):
                state.update(app=m.group(1), power="PowerOn", playing=True,
                             position=0, since=time.monotonic())
        self.reply("")


if __name__ == "__main__":
    import os
    port = int(os.environ.get("MOCK_PORT", 8060))
    print(f"Mock Roku ECP on :{port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
