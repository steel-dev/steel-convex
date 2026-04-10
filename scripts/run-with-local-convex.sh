#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "$#" -eq 0 ]]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 1
fi

LOG_FILE="$(mktemp -t steel-convex-local-convex.XXXXXX.log)"
CONVEX_PID=""

cleanup() {
  if [[ -n "$CONVEX_PID" ]] && kill -0 "$CONVEX_PID" >/dev/null 2>&1; then
    kill "$CONVEX_PID" >/dev/null 2>&1 || true
    wait "$CONVEX_PID" 2>/dev/null || true
  fi
  rm -f "$LOG_FILE"
}

trap cleanup EXIT

CONVEX_AGENT_MODE=anonymous npx convex dev --local >"$LOG_FILE" 2>&1 &
CONVEX_PID="$!"

ready=false
for _ in $(seq 1 120); do
  if grep -q "Convex functions ready!" "$LOG_FILE"; then
    ready=true
    break
  fi

  if ! kill -0 "$CONVEX_PID" >/dev/null 2>&1; then
    cat "$LOG_FILE" >&2
    exit 1
  fi

  sleep 1
done

if [[ "$ready" != "true" ]]; then
  echo "Timed out waiting for local Convex backend to become ready." >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

"$@"
