#!/usr/bin/env bash
# FitLog IL — build + deploy ל-GitHub Pages (main:/docs)
set -euo pipefail
cd "$(dirname "$0")/.."

msg="${1:?שימוש: ./scripts/deploy.sh \"הודעת קומיט\"}"

echo "→ type-check"
npx tsc --noEmit

echo "→ build"
npm run build

echo "→ dist → docs"
rm -rf docs
cp -r dist docs

echo "→ commit + push"
git add -A
git commit -m "$msg"
git push origin main

echo "✓ נדחף. האתר יתעדכן תוך 1-2 דקות: https://avikomemi.github.io/gain-goals/"
