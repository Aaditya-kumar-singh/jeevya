#!/usr/bin/env bash
set -euo pipefail

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree has uncommitted changes."
  echo "Commit your changes before running: npm run ship"
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "master" ]; then
  echo "Refusing to ship from '$BRANCH'. This project ships from master."
  exit 1
fi

echo "Pushing master..."
git push origin master

if [ "${CODESPACES:-false}" = "true" ] && [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  echo "Push complete. Stopping Codespace: $CODESPACE_NAME"
  (
    sleep 3
    gh codespace stop -c "$CODESPACE_NAME" || true
  ) >/tmp/jeevya-codespace-stop.log 2>&1 &
else
  echo "Push complete. Stop the Codespace manually when finished."
fi
