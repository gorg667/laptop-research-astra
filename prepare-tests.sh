#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"
mkdir -p .cache/debs .cache/lib .cache/tmp artifacts
export npm_config_cache="$ROOT/.cache/npm"
export PLAYWRIGHT_BROWSERS_PATH="$ROOT/.browsers"
export TMPDIR="$ROOT/.cache/tmp"
npm ci --ignore-scripts
npx playwright install chromium
# Debian 13 sandbox lacks these shared libraries. Extract locally, never install system-wide.
if command -v apt-get >/dev/null && command -v dpkg-deb >/dev/null; then
  (cd .cache/debs && apt-get download libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libxcomposite1 libxdamage1)
  for package in .cache/debs/*.deb; do dpkg-deb -x "$package" .cache/lib; done
fi
printf '\nRun: TMPDIR="$PWD/.cache/tmp" LD_LIBRARY_PATH="$PWD/.cache/lib/usr/lib/x86_64-linux-gnu" PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" npm test\n'
