# sortilege-vtt-tor2e

A virtual tabletop for **The One Ring, Second Edition**, built on the Titterpig corpus
`titterpig-dsl-tor2e/0.5` (the core and all eight sourcebooks). A reader for the books at the
root, the Loremaster's table under `gm/`, the player's page, and session rooms on a Cloudflare
Worker. See `PLAN.md` for the decisions and the milestone proofs.

```bash
bash build/build.sh                      # regenerate data/ from the corpus and run the gates
python3 -m http.server 8741              # the site (launch entry vtt-tor2e)
cd worker && npx wrangler dev --port 8793   # sessions (launch entry vtt-tor2e-worker)
```

A campaign can run as an **instance** of this VTT — a fork that owns a `campaign/` folder and
never edits upstream. It declares its own scripts in `engine/config.js` (loaded by
`engine/instance.js`) and builds its homebrew as one more book, gated as the books are:

```bash
bash build/build_layer.sh campaign/dsl campaign "<its title>" campaign/data
```

See `PLAN.md` § *Instances*.

`data/` is generated — never edit it by hand. The rules text is Free League's, carried verbatim
from the corpus; this repo is private (PLAN.md D3).
