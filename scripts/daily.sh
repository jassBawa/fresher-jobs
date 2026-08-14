#!/usr/bin/env bash
#
# The scheduled run, for cron or launchd. Fetches new postings, extracts facts,
# writes drafts, and logs the result. Nothing is published — drafts land as
# `status: draft` and wait for `pnpm run promote`.
#
#   ./scripts/daily.sh            fetch + draft
#   ./scripts/daily.sh --build    also rebuild the site afterwards
#
# See README "Running it on a schedule" for the cron line and the launchd plist.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1

# cron and launchd start with a near-empty PATH, so node, pnpm and any local
# agent CLI have to be found explicitly. This is the single most common reason a
# scheduled job works by hand and silently does nothing overnight.
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/$(node -v 2>/dev/null || echo none)/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
command -v pnpm >/dev/null 2>&1 || export PATH="$HOME/Library/pnpm:$PATH"

LOG_DIR="$REPO/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/ingest-$(date +%Y-%m-%d).log"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }

if ! command -v pnpm >/dev/null 2>&1; then
  log "FAIL  pnpm not on PATH — edit the PATH line in scripts/daily.sh"
  exit 127
fi

log "start  $(pnpm --version 2>/dev/null | tail -1) · node $(node -v)"

if pnpm run ingest >>"$LOG" 2>&1; then
  DRAFTS=$(find apps/ingest/data/drafts -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
  PUBLISHED=$(grep -l '^status: published' apps/ingest/data/drafts/*.md 2>/dev/null | wc -l | tr -d ' ')
  log "ok     $DRAFTS drafts on disk · $PUBLISHED published · review with 'pnpm run drafts'"
else
  log "FAIL   ingest exited non-zero — see $LOG"
  exit 1
fi

if [ "${1:-}" = "--build" ]; then
  if SITE="${SITE:-http://localhost:4321}" pnpm run build >>"$LOG" 2>&1; then
    log "ok     site rebuilt into apps/web/dist"
  else
    log "FAIL   site build failed — see $LOG"
    exit 1
  fi
fi

# Keep a fortnight of logs, no more.
find "$LOG_DIR" -name 'ingest-*.log' -mtime +14 -delete 2>/dev/null

log "done"
