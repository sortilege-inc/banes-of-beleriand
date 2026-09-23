#!/usr/bin/env bash
# Regenerate data/ from The One Ring 2e DSL corpus and prove the round trip.
#
#   bash build/build.sh [<path to titterpig-dsl-tor2e/0.5>]
#
# build (every token of every file consumed, or the parser raises; every corpus file claimed
# by exactly one book, or the build raises) → verify both directions → check the shapes the
# site reads against an independent line scan → node --check every data file. Any failure
# exits non-zero.
set -euo pipefail
cd "$(dirname "$0")/.."
CORPUS="${1:-$HOME/Sortilege/Titterpig/DSL/titterpig-dsl-tor2e/0.5}"

echo "--- build ($CORPUS)"
python3 build/build_data.py "$CORPUS"
echo "--- verify (every string, both directions)"
python3 build/verify_data.py "$CORPUS"
echo "--- shape (the blocks the site reads, against the corpus's own counts)"
python3 build/check_shape.py "$CORPUS"
echo "--- syntax"
for f in data/*.js; do node --check "$f"; done
echo "build.sh: OK"
