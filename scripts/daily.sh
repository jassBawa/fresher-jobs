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

# The pipeline writes to Postgres now, so a scheduled run on a machine whose
# Docker is not up fails deep inside the ingest with a connection error. Check
# here instead, where the message can say what to do about it.
DB_URL="${DATABASE_URL:-postgres://jobs:jobs@localhost:5432/jobs}"
if ! docker compose ps --status running 2>/dev/null | grep -q jobs-db; then
  log "db     not running — starting it"
  docker compose up -d >>"$LOG" 2>&1 || { log "FAIL  could not start Postgres. Is Docker running?"; exit 1; }
fi
for _ in $(seq 1 20); do
  docker exec jobs-db pg_isready -U jobs -d jobs >/dev/null 2>&1 && break
  sleep 2
done
if ! docker exec jobs-db pg_isready -U jobs -d jobs >/dev/null 2>&1; then
  log "FAIL  Postgres never became ready — check 'docker compose logs db'"
  exit 1
fi

log "start  $(pnpm --version 2>/dev/null | tail -1) · node $(node -v)"

if pnpm run ingest >>"$LOG" 2>&1; then
  COUNTS=$(docker exec jobs-db psql -U jobs -d jobs -tAc \
    "select count(*) filter (where status='published') || ' published, ' ||
            count(*) filter (where status='draft')     || ' awaiting review, ' ||
            count(*) filter (where status='rejected')  || ' discarded' from jobs" 2>/dev/null)
  log "ok     ${COUNTS:-ingest complete} · review with 'pnpm run drafts'"
else
  log "FAIL   ingest exited non-zero — see $LOG"
  exit 1
fi

# Re-check apply links and retire any that have died since they were drafted.
# This is the half that only works with a database behind it.
if pnpm run verify:apply >>"$LOG" 2>&1; then
  log "ok     apply links re-checked"
else
  log "warn   link verification failed — listings are unchanged, see $LOG"
fi

if [ "${1:-}" = "--build" ]; then
  if SITE="${SITE:-http://localhost:3000}" pnpm run build >>"$LOG" 2>&1; then
    log "ok     site rebuilt"
  else
    log "FAIL   site build failed — see $LOG"
    exit 1
  fi
fi

# Keep a fortnight of logs, no more.
find "$LOG_DIR" -name 'ingest-*.log' -mtime +14 -delete 2>/dev/null

log "done"
