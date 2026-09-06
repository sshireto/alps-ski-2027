#!/bin/sh
# Publishes the ski-trip page to GitHub Pages.
# Run:  sh ~/Projects/alps-ski-2027/publish.sh
set -e
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  git init -q
  git branch -M main
  git remote add origin https://github.com/sshireto/alps-ski-2027.git
fi

git add index.html publish.sh
git commit -qm "Update ski trip page" || echo "Nothing new to commit."
git push -u origin main

# Turn on GitHub Pages (first run only; harmless later).
if command -v gh >/dev/null 2>&1; then
  gh api -X POST repos/sshireto/alps-ski-2027/pages \
    -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 \
    && echo "GitHub Pages enabled." || true
else
  echo "If this is the first run: open https://github.com/sshireto/alps-ski-2027/settings/pages"
  echo "and set Source = Deploy from a branch, Branch = main, folder = / (root)."
fi

echo
echo "Page: https://sshireto.github.io/alps-ski-2027/  (first deploy takes ~1 minute)"
