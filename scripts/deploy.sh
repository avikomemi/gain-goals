#!/usr/bin/env bash
# FitLog IL — build + deploy ל-GitHub Pages (main:/docs)
set -euo pipefail
cd "$(dirname "$0")/.."

msg="${1:?שימוש: ./scripts/deploy.sh \"הודעת קומיט\"}"

echo "→ type-check"
# חשוב: tsconfig.json הוא solution-file (files:[], references) — tsc --noEmit עליו לא בודק כלום.
# חייבים לבדוק את הפרויקטים בפועל, אחרת שגיאות (למשל import חסר) עוברות בשקט וגורמות למסך לבן.
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit

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
