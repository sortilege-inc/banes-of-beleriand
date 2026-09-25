#!/usr/bin/env bash
# Build the campaign's own data: its DSL layer (through the VTT's layer gates), the Company's
# character files (from the Foundry exports), its docs, and the Loremaster's seed.
# The books (data/) are upstream's and already built; rebuild them only after pulling upstream
# (bash build/build.sh). Any failure exits non-zero.
#
#   bash campaign/build/build.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "--- the layer (campaign/dsl → campaign/data/campaign.js, index.js)"
bash build/build_layer.sh campaign/dsl campaign "Banes of Beleriand" campaign/data
echo "--- the Company (campaign/source/foundry → campaign/pack/company)"
python3 campaign/build/foundry_heroes.py | tail -1
echo "--- the docs (campaign/docs → campaign/data/docs.js)"
python3 campaign/build/build_docs.py
node --check campaign/data/docs.js
echo "--- the seed (campaign/build/seed_source.py → campaign/pack/seed.json)"
python3 campaign/build/seed_source.py
echo "campaign build: OK"
