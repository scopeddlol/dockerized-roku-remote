#!/usr/bin/env python3
"""Roku terminal remote — a curses TUI that talks directly to the TV over ECP.

Usage: python3 roku_tui.py [--ip 192.168.4.217] [--dictate review|send]
Reads the default TV IP (and optional "dictation_send") from config.json
next to this script. Dictation (^d in type mode) uses the macOS `hear` CLI.
"""
import argparse
import curses
import json
import shutil
import signal
import subprocess
import sys
import textwrap
import threading
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REFRESH_SECONDS = 2.0

KEY_LEGEND = [
    ("arrows", "navigate"),
    ("enter", "OK"),
    ("delete", "back"),
    ("h", "home"),
    ("space", "play/pause"),
    ("< >", "rew/fwd"),
    ("r", "replay"),
    ("i", "options"),
    ("+ -", "volume"),
    ("m", "mute"),
    ("p", "power"),
    ("a", "apps"),
    ("t", "type mode"),
    ("^d", "dictate"),
    ("q", "quit"),
]


def load_config():
    config = Path(__file__).resolve().parent / "config.json"
    try:
        return json.loads(config.read_text())
    except (OSError, ValueError):
        return {}


class Roku:
    def __init__(self, ip):
        self.ip = ip
        self._type_lock = threading.Lock()  # keeps bulk text sends from interleaving

    def _url(self, path):
        return f"http://{self.ip}:8060/{path}"

    def post_sync(self, path):
        try:
            req = urllib.request.Request(self._url(path), data=b"", method="POST")
            urllib.request.urlopen(req, timeout=3).read()
            return True
        except OSError:
            return False

    def post(self, path):
        threading.Thread(target=self.post_sync, args=(path,), daemon=True).start()

    def get_xml(self, path):
        with urllib.request.urlopen(self._url(path), timeout=3) as resp:
            return ET.fromstring(resp.read())

    def keypress(self, key):
        self.post(f"keypress/{key}")

    def type_char(self, char):
        self.post("keypress/Lit_" + urllib.parse.quote(char, safe=""))

    def type_text(self, text):
        # Chars must arrive in order, so send sequentially on one thread
        # (same 50 ms pacing as server.py's send_text). Non-daemon so an
        # in-flight send finishes even if the UI quits; bails on the first
        # failed request so an unreachable TV can't stall exit.
        def worker():
            with self._type_lock:
                for char in text:
                    if not self.post_sync("keypress/Lit_" + urllib.parse.quote(char, safe="")):
                        return
                    time.sleep(0.05)
        threading.Thread(target=worker).start()

    def status(self):
        info = self.get_xml("query/device-info")
        active = self.get_xml("query/active-app")
        player = self.get_xml("query/media-player")
        app = active.find("app")
        return {
            "name": info.findtext("friendly-device-name") or "Roku TV",
            "power": info.findtext("power-mode"),
            "app": (app.text or "").strip() if app is not None else "?",
            "state": player.get("state"),
            "position": player.findtext("position"),
        }

    def apps(self):
        entries = []
        for app in self.get_xml("query/apps"):
            entries.append(((app.text or "").strip(), app.get("id"), app.get("type")))
        return sorted(entries, key=lambda a: (a[2] != "tvin", a[0].lower()))


class Dictation:
    """Live speech-to-text via the macOS `hear` CLI (on-device recognition)."""

    HINT_INSTALL = "dictation needs the 'hear' CLI — https://sveinbjorn.org/hear"
    HINT_OS = "dictation is only supported on macOS"

    def __init__(self):
        self.proc = None
        self.transcript = ""
        self.error = None
        self._stderr = []
        self._reader = None

    @staticmethod
    def unavailable_reason():
        if sys.platform != "darwin":
            return Dictation.HINT_OS
        if shutil.which("hear") is None:
            return Dictation.HINT_INSTALL
        return None

    def start(self):
        try:
            self.proc = subprocess.Popen(
                ["hear", "-d", "-p", "-m"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except OSError as exc:
            self.error = f"could not start hear: {exc}"
            return False
        self._reader = threading.Thread(target=self._read_stdout, daemon=True)
        self._reader.start()
        threading.Thread(target=self._read_stderr, daemon=True).start()
        return True

    def _read_stdout(self):
        # Single-line mode rewrites the transcript after \r, so keep a rolling
        # buffer and treat the last \r/\n-delimited segment as the current text.
        data = b""
        while True:
            chunk = self.proc.stdout.read1(65536)
            if not chunk:
                break
            data = (data + chunk)[-65536:]
            parts = [p.strip() for p in data.replace(b"\r", b"\n").split(b"\n")]
            parts = [p for p in parts if p]
            if parts:
                self.transcript = parts[-1].decode("utf-8", "replace")

    def _read_stderr(self):
        for raw in self.proc.stderr:
            line = raw.decode("utf-8", "replace").strip()
            if line:
                self._stderr.append(line)

    def running(self):
        return self.proc is not None and self.proc.poll() is None

    def stop(self):
        if self.proc is None:
            return self.transcript
        if self.proc.poll() is None:
            try:
                self.proc.send_signal(signal.SIGINT)
                self.proc.wait(timeout=1.5)
            except (subprocess.TimeoutExpired, OSError):
                self.proc.kill()
        if self._reader is not None:
            self._reader.join(timeout=0.5)
        if not self.transcript and self._stderr:
            self.error = self._stderr[0]
        return self.transcript

    def cancel(self):
        if self.proc is not None and self.proc.poll() is None:
            try:
                self.proc.kill()
            except OSError:
                pass


class StatusPoller(threading.Thread):
    def __init__(self, roku):
        super().__init__(daemon=True)
        self.roku = roku
        self.data = None

    def run(self):
        while True:
            try:
                self.data = self.roku.status()
            except OSError:
                self.data = None
            time.sleep(REFRESH_SECONDS)


def draw_header(stdscr, poller, width):
    status = poller.data
    if status is None:
        line = "TV unreachable — check power/network"
        color = curses.color_pair(3)
    else:
        power = "on" if status["power"] == "PowerOn" else "standby"
        line = f" {status['name']}  ·  {power}  ·  {status['app']}"
        if status["state"] and status["state"] != "none":
            pos = (status["position"] or "").replace(" ms", "")
            if pos.isdigit():
                sec = int(pos) // 1000
                line += f"  ·  {status['state']} {sec // 60}:{sec % 60:02d}"
            else:
                line += f"  ·  {status['state']}"
        color = curses.color_pair(2)
    stdscr.addnstr(0, 0, line.ljust(width - 1), width - 1, color | curses.A_BOLD)


def draw_legend(stdscr, top, width, mode_line):
    stdscr.addnstr(top, 0, mode_line.ljust(width - 1), width - 1, curses.color_pair(4))
    row, col = top + 2, 2
    for key, label in KEY_LEGEND:
        chunk = f"{key} {label}   "
        if col + len(chunk) >= width:
            row, col = row + 1, 2
        try:
            stdscr.addstr(row, col, key, curses.color_pair(1) | curses.A_BOLD)
            stdscr.addstr(row, col + len(key), f" {label}   ")
        except curses.error:
            break
        col += len(chunk)


def draw_transcript(stdscr, top, width, text, recording):
    shown = text if text else ("(listening…)" if recording else "(empty)")
    if recording and text:
        shown += " _"
    try:
        for offset, line in enumerate(textwrap.wrap(shown, max(10, width - 4))):
            stdscr.addnstr(top + offset, 2, line, width - 3,
                           curses.color_pair(2) | curses.A_BOLD)
    except curses.error:
        pass


def app_picker(stdscr, roku):
    try:
        entries = roku.apps()
    except OSError:
        return
    query, selected = "", 0
    while True:
        stdscr.erase()
        height, width = stdscr.getmaxyx()
        matches = [e for e in entries if query.lower() in e[0].lower()]
        selected = max(0, min(selected, len(matches) - 1))
        stdscr.addnstr(0, 0, f" Launch app — type to filter: {query}_".ljust(width - 1),
                       width - 1, curses.color_pair(2) | curses.A_BOLD)
        for idx, (name, _app_id, kind) in enumerate(matches[: height - 3]):
            label = f"  {'[input] ' if kind == 'tvin' else ''}{name}"
            attr = curses.color_pair(1) | curses.A_REVERSE if idx == selected else 0
            stdscr.addnstr(2 + idx, 0, label.ljust(width - 1), width - 1, attr)
        stdscr.refresh()
        ch = stdscr.getch()
        if ch in (27, ord("q")) and not query:
            return
        if ch == 27:
            query = ""
        elif ch in (curses.KEY_UP,):
            selected -= 1
        elif ch in (curses.KEY_DOWN,):
            selected += 1
        elif ch in (10, 13, curses.KEY_ENTER):
            if matches:
                roku.post(f"launch/{matches[selected][1]}")
            return
        elif ch in (127, 8, curses.KEY_BACKSPACE):
            query = query[:-1]
        elif 32 <= ch < 127:
            query += chr(ch)
            selected = 0


def main(stdscr, roku, send_mode="review"):
    curses.curs_set(0)
    curses.use_default_colors()
    curses.init_pair(1, curses.COLOR_MAGENTA, -1)
    curses.init_pair(2, curses.COLOR_GREEN, -1)
    curses.init_pair(3, curses.COLOR_RED, -1)
    curses.init_pair(4, curses.COLOR_YELLOW, -1)
    stdscr.timeout(250)

    poller = StatusPoller(roku)
    poller.start()
    type_mode = False
    last_action = ""
    dictation = None
    dict_state = None  # None | "recording" | "review"
    pending = ""       # transcript awaiting review
    hint = ""          # transient one-line message, cleared on next keypress

    def start_recording():
        nonlocal dictation, dict_state, hint
        reason = Dictation.unavailable_reason()
        if reason:
            hint = reason
            return
        dictation = Dictation()
        if dictation.start():
            dict_state = "recording"
        else:
            hint = dictation.error or "dictation failed"

    def finish_recording():
        nonlocal dict_state, pending, hint
        text = dictation.stop().strip()
        if not text:
            hint = dictation.error or "heard nothing"
            dict_state = None
        elif send_mode == "send":
            roku.type_text(text)
            hint = "sent to TV"
            dict_state = None
        else:
            pending = text
            dict_state = "review"

    normal_keys = {
        curses.KEY_UP: "Up", curses.KEY_DOWN: "Down",
        curses.KEY_LEFT: "Left", curses.KEY_RIGHT: "Right",
        10: "Select", 13: "Select", curses.KEY_ENTER: "Select",
        127: "Back", 8: "Back", curses.KEY_BACKSPACE: "Back",
        ord(" "): "Play", ord("h"): "Home",
        ord("<"): "Rev", ord(","): "Rev", ord(">"): "Fwd", ord("."): "Fwd",
        ord("r"): "InstantReplay", ord("i"): "Info",
        ord("+"): "VolumeUp", ord("="): "VolumeUp",
        ord("-"): "VolumeDown", ord("_"): "VolumeDown",
        ord("m"): "VolumeMute", ord("p"): "Power",
    }

    try:
        while True:
            if dict_state == "recording" and not dictation.running():
                finish_recording()  # hear exited on its own (error or timeout)

            stdscr.erase()
            _height, width = stdscr.getmaxyx()
            draw_header(stdscr, poller, width)
            if dict_state == "recording":
                mode_line = f" DICTATING — speak · enter stop · esc cancel · mode: {send_mode}"
            elif dict_state == "review":
                mode_line = " REVIEW — enter send to TV · esc discard · ^d re-record"
            elif type_mode:
                mode_line = " TYPE MODE — keys go to the TV · ^d dictate · esc to exit"
            else:
                mode_line = f" remote mode{('  ·  ' + last_action) if last_action else ''}"
            if hint:
                mode_line = f" {hint}"
            if dict_state:
                stdscr.addnstr(2, 0, mode_line.ljust(width - 1), width - 1,
                               curses.color_pair(4))
                draw_transcript(stdscr, 4, width,
                                dictation.transcript if dict_state == "recording" else pending,
                                dict_state == "recording")
            else:
                draw_legend(stdscr, 2, width, mode_line)
            stdscr.refresh()

            ch = stdscr.getch()
            if ch == -1:
                continue
            hint = ""

            if dict_state == "recording":
                if ch in (10, 13, curses.KEY_ENTER, 4):
                    finish_recording()
                elif ch == 27:
                    dictation.cancel()
                    dict_state = None
                continue

            if dict_state == "review":
                if ch in (10, 13, curses.KEY_ENTER):
                    roku.type_text(pending)
                    hint = "sent to TV"
                    dict_state = None
                elif ch == 27:
                    dict_state = None
                elif ch == 4:
                    dict_state = None
                    start_recording()
                continue

            if type_mode:
                if ch == 27:
                    type_mode = False
                elif ch == 4:
                    start_recording()
                elif ch in (127, 8, curses.KEY_BACKSPACE):
                    roku.keypress("Backspace")
                elif ch in (10, 13, curses.KEY_ENTER):
                    roku.keypress("Enter")
                elif 32 <= ch < 127:
                    roku.type_char(chr(ch))
                continue

            if ch == ord("q"):
                return
            if ch == ord("t"):
                type_mode = True
                continue
            if ch == ord("a"):
                app_picker(stdscr, roku)
                continue
            key = normal_keys.get(ch)
            if key:
                roku.keypress(key)
                last_action = key
    finally:
        if dictation is not None:
            dictation.cancel()


if __name__ == "__main__":
    config = load_config()
    parser = argparse.ArgumentParser(description="Roku terminal remote")
    parser.add_argument("--ip", default=config.get("tv_ip", "192.168.4.217"),
                        help="Roku TV IP address")
    parser.add_argument("--dictate", choices=("review", "send"),
                        default=config.get("dictation_send", "review"),
                        help="dictated text: review before sending (default) or send immediately")
    args = parser.parse_args()
    curses.wrapper(main, Roku(args.ip), args.dictate)
