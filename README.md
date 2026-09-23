# Banes of Beleriand

A *The One Ring, Second Edition* campaign, served as an **instance** of
[sortilege-vtt-tor2e](https://github.com/sortilege-inc/sortilege-vtt-tor2e).

The VTT owns the root: the site at `/`, the Loremaster's table at `/gm/`, the engine, the TOR2e
system module, and the books generated from the Titterpig corpus. The campaign owns
`campaign/`: its pages (Home, Chronicle, the Company, Dramatis Personae, Timeline, Atlas) are
tabs on the VTT's site, and its Loremaster's notes are the *Behind the Veil* panel on `/gm/`.

- `campaign/PLAN.md` — how this instance was stood up: decisions, milestones, their proof.
- `campaign/docs/README.md` — how to write the campaign's pages.

## Building

```bash
bash campaign/build/build.sh      # the campaign's DSL layer and docs → campaign/data/
```

The books (`data/`) are upstream's; rebuild them (`bash build/build.sh`) only after a pull.

## The fork

`upstream` is the VTT. Engine and system updates arrive by a merge, never a rebase:

```bash
git fetch upstream && git merge upstream/main
```

Upstream-owned files are never edited here — anything every TOR2e campaign would want is built
upstream and pulled. The instance's own root files (`engine/config.js`, `worker/wrangler.jsonc`,
`README.md`, `CNAME`, `.gitignore`, `.claude/launch.json`, `.gitattributes`) are marked
`merge=ours`, so a pull keeps this repo's copy. That needs a driver git does not store; run once
per clone:

```bash
git config merge.ours.driver true
```

## Local

Launch entries `banes` (site, 8742) and `banes-worker` (sessions, 8795).
