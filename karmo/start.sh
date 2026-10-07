#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js is not installed. Get the LTS version from https://nodejs.org"
  exit 1
fi
[ -d node_modules ] || npm install --omit=dev || exit 1
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[!] Put your bot token after DISCORD_TOKEN= in .env, then run ./start.sh again."
  exit 1
fi

while true; do
  node src/index.js
  code=$?
  [ "$code" -eq 78 ] && exit 1
  echo "Bot stopped (exit $code). Restarting in 5 seconds... (Ctrl+C to quit)"
  sleep 5
done
