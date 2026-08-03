#!/bin/sh
# Install (or remove) the Roku LAN Remote server as a macOS launchd service
# so it starts on boot and restarts if it crashes.
#
#   sudo ./install-macos.sh              install/update using this repo's location
#   sudo ./install-macos.sh --uninstall  stop and remove the service
#
# Always a system LaunchDaemon running as root, so the server is up after a
# reboot without anyone logging in.
#
# Root is required even on an unprivileged port. macOS Local Network Privacy
# blocks a normal user's python from opening connections to LAN addresses --
# the TV's ECP port fails with "[Errno 65] No route to host" -- and a launchd
# job has no UI to request the permission. System daemons running as root are
# exempt, so that is the only reliable way to reach the TV.
set -eu

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
LABEL="com.roku.remote"
AGENT_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PLIST="/Library/LaunchDaemons/$LABEL.plist"
PYTHON3="$(command -v python3)"
RUN_USER="${SUDO_USER:-$(id -un)}"

stop_existing() {
    # Older versions of this script installed a per-user LaunchAgent; clear
    # that out too so the two can't both be running.
    launchctl bootout "gui/$(id -u "$RUN_USER")/$LABEL" 2>/dev/null || true
    rm -f "$AGENT_PLIST"
    launchctl bootout "system/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
}

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo $0 ${1:-}" >&2
    exit 1
fi

if [ "${1:-}" = "--uninstall" ]; then
    stop_existing
    echo "Removed $LABEL."
    exit 0
fi

PORT="$("$PYTHON3" -c "import json; print(json.load(open('$REPO_DIR/config.json')).get('server_port', 8000))" 2>/dev/null || echo 8000)"

echo "Installing as a root LaunchDaemon on port $PORT."

stop_existing

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON3</string>
    <string>$REPO_DIR/server.py</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>EnvironmentVariables</key>
  <dict><key>PYTHONUNBUFFERED</key><string>1</string></dict>
  <key>StandardOutPath</key><string>$REPO_DIR/server.log</string>
  <key>StandardErrorPath</key><string>$REPO_DIR/server.log</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
EOF

# bootstrap takes <domain-target> <service-path> as SEPARATE arguments; glued
# together it silently does nothing and still exits 0.
launchctl enable "system/$LABEL" 2>/dev/null || true
launchctl bootstrap system "$PLIST"

if ! launchctl print "system/$LABEL" > /dev/null 2>&1; then
    echo "FAILED: $LABEL did not register with launchd." >&2
    exit 1
fi

i=0
while [ "$i" -lt 15 ]; do
    if curl -s -o /dev/null --connect-timeout 3 "http://localhost:$PORT/api/status"; then
        echo "Installed and running on port $PORT."
        echo "Logs: $REPO_DIR/server.log"
        exit 0
    fi
    i=$((i + 1))
    sleep 1
done

echo "Registered with launchd but not answering on port $PORT after 15s." >&2
tail -20 "$REPO_DIR/server.log" 2>/dev/null >&2 || true
exit 1
