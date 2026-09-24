"""Persistent settings and automations, stored as JSON under DATA_DIR.

In Docker, DATA_DIR is the ``/data`` volume, so everything you change in the
UI (TV address, automations) survives container rebuilds.
"""
import ipaddress
import json
import os
import re
import shutil
import threading
from pathlib import Path

from roku import SAFE_ID

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT.parent / "data"))
CONFIG_PATH = DATA_DIR / "config.json"
MACROS_PATH = DATA_DIR / "macros.json"
DEFAULT_MACROS = ROOT / "defaults" / "macros.json"

HOSTNAME = re.compile(r"^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
                      r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$")
STEP_TYPES = {"keypress", "launch", "delay", "text"}

_lock = threading.Lock()


def _read(path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def _write(path, payload):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2) + "\n")
    tmp.replace(path)  # atomic: a crash never leaves half a file behind


# -- config ----------------------------------------------------------------

def load_config():
    """Saved config, falling back to the TV_IP env var on first run."""
    config = _read(CONFIG_PATH, {})
    if not config.get("tv_ip") and os.environ.get("TV_IP"):
        config["tv_ip"] = os.environ["TV_IP"].strip()
    return config


def save_config(config):
    with _lock:
        _write(CONFIG_PATH, config)


def validate_host(value):
    value = str(value or "").strip()
    try:
        return str(ipaddress.IPv4Address(value))
    except ValueError:
        pass
    if HOSTNAME.match(value):
        return value
    raise ValueError("Enter an IPv4 address (e.g. 192.168.1.50) or a hostname")


# -- macros ----------------------------------------------------------------

def load_macros():
    if not MACROS_PATH.exists() and DEFAULT_MACROS.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(DEFAULT_MACROS, MACROS_PATH)
    return _read(MACROS_PATH, [])


def save_macros(macros):
    cleaned = validate_macros(macros)
    with _lock:
        _write(MACROS_PATH, cleaned)
    return cleaned


def validate_macros(macros):
    """Normalise an automation list, raising ValueError on anything unsafe."""
    if not isinstance(macros, list) or len(macros) > 100:
        raise ValueError("expected a list of at most 100 automations")
    cleaned, names = [], set()
    for i, macro in enumerate(macros, 1):
        if not isinstance(macro, dict):
            raise ValueError(f"automation {i} must be an object")
        name = str(macro.get("name", "")).strip()[:60]
        if not name:
            raise ValueError(f"automation {i} needs a name")
        if name in names:
            raise ValueError(f"two automations are named {name!r}")
        names.add(name)

        steps = macro.get("steps")
        if not isinstance(steps, list) or not 1 <= len(steps) <= 50:
            raise ValueError(f"{name!r} needs between 1 and 50 steps")
        clean_steps = []
        for j, step in enumerate(steps, 1):
            kind = step.get("type") if isinstance(step, dict) else None
            if kind not in STEP_TYPES:
                raise ValueError(f"{name!r} step {j}: unknown type {kind!r}")
            value = step.get("value", "")
            if kind == "delay":
                try:
                    value = max(0, min(int(value), 30000))
                except (TypeError, ValueError):
                    raise ValueError(f"{name!r} step {j}: delay must be a number")
            elif kind == "text":
                value = str(value)[:200]
            else:
                value = str(value).strip()
                if not SAFE_ID.match(value):
                    raise ValueError(f"{name!r} step {j}: invalid {kind} {value!r}")
            clean_steps.append({"type": kind, "value": value})

        cleaned.append({
            "name": name,
            "icon": str(macro.get("icon", "zap")).strip()[:40] or "zap",
            "steps": clean_steps,
        })
    return cleaned
