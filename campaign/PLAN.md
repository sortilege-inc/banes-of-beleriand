# Banes of Beleriand × sortilege-vtt-tor2e — plan and decision log

A hybrid of VTT and campaign site: this repo is an **instance** of the TOR2e VTT — a fork that
takes the VTT at its root and adds the campaign inside the VTT's framing. The pattern and its
owner decisions are Portents & Fortunes' (`~/Sortilege/Campaigns/2026 Portents & Fortunes/
portents-and-fortunes/campaign/PLAN.md` and `INSTANCE-PLAYBOOK.md`); the campaign pages borrow
the *structure* — not the content — of Home Is Where We Make Our Fire (Home, Chronicle, the
Company, Dramatis Personae, Timeline, Atlas).

Status words: **PROPOSED** (awaiting the owner), **(owner)** decided, **landed** built and
proven in the browser through the real controls.

Two repos take part:

- **here** — `sortilege-inc/banes-of-beleriand` (**public**, pushed 2026-09-23 — O1).
- **upstream** — `sortilege-inc/sortilege-vtt-tor2e` (private). Everything generic is built
  there and pulled here.

## Owner decisions

**(owner, 2026-09-23)** The VTT is `sortilege-vtt-tor2e`, instanced here; the campaign site's
structure is borrowed from Home Is Where We Make Our Fire, not its content; Portents &
Fortunes is the reference for the fusion.

Carried from Portents as settled pattern (its O2, O3, O6, O9): the fork is a merge of upstream at
the root, updated by merge; the VTT owns `/` and `/gm/` and the campaign lives inside its framing;
homebrew that must be right is a DSL layer through the VTT's gate; the process is written down
as it is proven.

**O1 — Public (owner, 2026-09-23).** The repo stays public and publishes upstream's `data/` — the
nine TOR2e books, Free League's text verbatim, 5.3 MB — although upstream itself is private (its
D3). The owner pushed `main` at `372fa9c` on 2026-09-23; that push was the point of publication
and cannot be taken back. (Considered: making the repo private first, as upstream is; or pushing
nothing yet.)

Still open under O1: GitHub Pages from `main` (the owner's step in Settings → Pages); the origin
— no `CNAME` yet, and `worker/wrangler.jsonc` admits only `https://sortilege-inc.github.io`; the
Worker is not deployed (`engine/config.js` `worker.deployed` empty).

**O2 — The veil retired (owner, 2026-09-24).** The Loremaster's material lives in the GM tabs
(Overview, Scenes, Threads, People, Places, Notes), in the pack, as PLAYBOOK §4b has it. The
*Behind the Veil* panel is gone; its Company loader stays as the *Company files* panel; `/gm/`
opens on *Scenes · Company · Inspector*. `campaign/docs/veil/` held nothing (`build_docs: … veil 0`),
so there was nothing to move. (Considered: keeping the veil until there was content.)

**O3 — The content (owner, 2026-09-24).** Sources: `../banes-of-beleriand-support/archive/` (moved there from `~/Downloads/2025 Banes of Beleriand/` on 2026-09-26, in Caul's layout) — nine
sessions 2025-05-06 … 09-09 as audio + machine transcripts (08-26 in several recordings), the
2025-05-04 premise talk, five Foundry actors, art, the treasure index; and two Notion exports: the
players' wiki (`notion-export/2026-09-24/players-wiki/Private & Shared/`: session notes 01–08, characters, Songs of the
Fellowship) and the GM's notes (`notion-export/2026-09-24/gm-notes/`: the campaign overview, the four Nameless Things —
Tarkûrzagûl, Môrthuring, Uludrith, Thrakdûmpuzûr — Barad Tarminalë, lore Q&A, a Third-Age
timeline). **Precedence (owner):** the wiki's spellings are the most correct; the transcripts'
content is more complete than the wiki. Settled:
- **Chronicle** — one chapter per session, prose in a Tolkienesque voice (as Caul went Elden Ring),
  as complete as the recording allows: the dialogue, descriptions, details and specific actions.
  **No mechanics at all** — no dice, no footnoted ledger, no named rules (feat die, Gandalf rune,
  Hope, Shadow…); they are implicit in the telling. Nothing the table did not establish. A pilot
  (session 1) first, reviewed by the owner, then the other nine.
- **Secrets** — the Loremaster's material (the six Banes, their art, what lies behind each seal)
  is seeded from the repo (`campaign/pack/`), public, as Caul and Portents did.
- **Players** — no player names anywhere on the site.
- **Sheets** — the five Foundry exports as they are (14 May 2025, at creation), labelled as the
  campaign's start. **Follow-up:** the owner looks for later exports; when found, convert them and
  replace these.
- Not published: the audio, the transcripts, the photographed Tale of Years (a *LotR: The Card
  Game* booklet) and David Day map (copyrighted reference), the fonts.

## Layout

```
index.html  gm/  engine/  system/  data/  build/  worker/  assets/     UPSTREAM-OWNED (never edited here)
engine/config.js  worker/wrangler.jsonc  README.md  .gitignore
.gitattributes  .claude/launch.json                                    INSTANCE-OWNED root files (merge=ours)
campaign/                                                              INSTANCE-OWNED
  PLAN.md                 this plan
  build/                  build.sh (the layer + the docs), build_docs.py
  dsl/                    the homebrew layer (Loremaster characters, adversaries…) → data/campaign.js, index.js
  docs/                   the authored prose, one Markdown file per page (format: docs/README.md) → data/docs.js
  data/                   GENERATED by campaign/build/build.sh — never edit
  site/                   site.js (the six tabs), gm.js (Behind the Veil), campaign.css
  pack/company/           the Player-heroes' character files, saved from the VTT's sheet
  assets/                 portraits, maps, art
  source/                 records kept verbatim (e.g. Foundry exports a sheet was checked against)
```

## Milestones

| # | Where | Milestone | Proof |
|---|---|---|---|
| U1 | upstream | **The instance hooks, ported from l5r5e** (Portents' M2): `engine/instance.js`, the stage tags in the four pages, titles from `VttConfig.title`, `build/build_layer.py` + `.sh` with four gates and a fixture | **landed 2026-09-23**, `1d46040` (merged `239254a`, pushed to the private upstream). Upstream's own gate after the change: *11629 strings — 0 uncovered · 0 unsourced*, *check_shape: OK (115 assertions)*, `data/` byte-identical (0 of 12 files differ). The fixture passes all four gates and each was made to fail (a mistyped type hash, a corpus id reused, a misspelt name, tampered data). Browser, no instance declared: every page titled and branded *The One Ring* as before. Full proof in upstream `PLAN.md` § *Instances* |
| M1 | here | **The fork and the boundary.** `upstream` remote; its history merged at the root; the instance-owned root files; `.gitattributes` `merge=ours` + `git config merge.ours.driver true` | **landed 2026-09-23**, `f3485b6`. The repo had no commits, so the merge fast-forwarded to upstream's `239254a` and nothing had to move (Portents' move commit does not apply). In a throwaway clone, a fake upstream commit editing `engine/config.js` and `index.html`: **without** the driver → *CONFLICT (content): Merge conflict in engine/config.js*; **with** it → `title: 'Banes of Beleriand'` kept and `index.html` took upstream's edit. A real `git fetch upstream && git merge upstream/main` → *Already up to date* |
| U2 | upstream | **Upstream T1–T5 pulled** (upstream `PLAN.md` § *Catching up with the family*): the Loremaster's Notes / Scenes / Threads · Encounters, the record (Skill and Adventure points, End the session, the Fellowship phase, versions), combat, the phone player's page and Advancement, every enemy tracked, the declared grip; the corpus's recovered Tales and Hands text | **landed 2026-09-24** — `git fetch upstream && git merge upstream/main`: no conflicts, 25 files; `engine/config.js` kept this repo's copy (`merge=ours`; upstream changed only comments there, so nothing to carry by hand); the Worker fix already committed here (`b66c249`, `f914b22`) is upstream's too and merged clean. `bash campaign/build/build.sh` → *build_layer: OK*, *campaign build: OK*. Browser (served from Bash on 8742): the site titled *Banes of Beleriand — the books*, the six campaign tabs ahead of upstream's seven, tor2e's scripts; the Loremaster's page titled and branded, its panels upstream's 13 plus *Behind the Veil*, opening on *veil · company · inspector*; the player's page *Banes of Beleriand — play*, the new player sheet loaded. No script errors from the instance's own pages (the console's others were a Daggerheart page cached at this origin) |
| U3 | upstream | **The family standards (PLAYBOOK §4b)**, upstream `e8b6b23`: `robots.txt` and the robots meta tag, the Loremaster's material in the GM tabs (sessions, scene cards with beats, questions, threads with play notes, People with *About*, Encounters its own pane), the GM ops local, the seed filled by id, the gate on `/gm/`, the books' tabs off the public site | **landed 2026-09-24** — `git merge upstream/main`: no conflicts, 20 files; `engine/config.js` kept this repo's copy (`merge=ours`) and its two new settings were added by hand: `siteBooks: false` and `gmGate` — `diff` against `git show e8b6b23 -- engine/config.js` → identical. `bash campaign/build/build.sh` → *build_layer: OK*, *build_docs: chronicle 0, company 0, people 0, atlas 0, veil 0*, *campaign build: OK*, `campaign/data/` unchanged. Browser (site served from Bash on 8742, Worker `wrangler dev --port 8795 --inspector-port 9293`): **books off** → tabs *Home, Chronicle, The Company, Dramatis Personae, Timeline, Atlas, Dice*; Home's cards the five campaign sections (no books card); `#books`, `#adventures`, `#create`, `#adversaries`, `#folk`, `#search` each land on Home. **Books on** (Settings pane's checkbox → `banes-vtt:site-books` = `1`) → 13 tabs, the books card back, the shelf 10 books; off again → back to 7. **Gate**: `/gm/` shows *The Loremaster’s table* with *Enter* / *Turn back* (→ `./`, the site); after Enter a reload skips it; a new tab shows it again. **Each GM pane saves**: through each pane's own controls — Overview (a section, a ruling, free notes), Scenes (a scene, a question), Threads (a thread, its play note), Places, People (someone, a note on a hero), Encounters (Búrzgul ×1, saved), Notes — then a reload: every entry was still there (Overview and Notes share one free-notes field, which held the last write, Notes'). **Live room** (session `Q5A7D`, frames recorded at `WebSocket.send`): `init` carries none of `gm`/`gmNotes`/`arc`/`threads`/`encounters`; 12 GM-pane actions → **0 frames**; control `setClock` + `removeClock` → 2 `op` frames. **Robots**: `robots.txt` 200 (ends `User-agent: *` / `Disallow: /`); `index.html`, `gm/index.html`, `gm/vtt.html`, `gm/play.html` carry `noindex, nofollow, noarchive, noimageindex` (the instance has no pages of its own, only tabs and a panel on these). **Console**: 0 errors on `/`, `/gm/`, `/gm/vtt.html`, `/gm/play.html`. Test state and the room cleared afterwards. *Behind the Veil* retired after the owner's answer (O2) |
| U4 | upstream | **Treasure carried, not the whole Treasure, counts toward Load** (upstream `5ceb407`, its X1, raised by decision 26), with `0dc90a4` (the Hardiness data rebuild, already identical here) | **landed 2026-09-25** — `git fetch upstream && git merge upstream/main`: no conflicts, 4 files (`PLAN.md`, `assets/css/tor2e.css`, `system/tor2e/player.js`, `system/tor2e/sheet.js`); `engine/config.js` untouched upstream. `bash campaign/build/build.sh` → *foundry_heroes: OK — 5 heroes*, *build_docs: chronicle 9, company 5, people 56, atlas 18*, *seed_source: 25 sections*, *campaign build: OK*, no generated file changed. Browser (the site already served on 8742): *Company files* → *Add* Lily, Marigold, Perry → each **Treasure carried 0 of 30, not Weary** — Lily Load 12 / Endurance 23, Marigold 13 / 22, Perry 16 / 24 (Lily was Load 42, Weary); Lily's *all* → Load 42, Weary lit, the old figure. 0 console errors. The three removed afterwards (this browser's Company was empty before) |
| U5 | upstream | **Foundry's dice, rules glyphs and special icons; the Gandalf-rune favicon** (upstream `45fab1c`, its X2, owner 2026-09-25), with `42226de` (the books setting closes only the books' own text): merged from the local upstream repo (`git fetch ~/Sortilege/VTT/sortilege-vtt-tor2e main`), clean, no instance file touched | **Done 2026-09-25** — `bash campaign/build/build.sh` → *campaign build: OK*; the four pages carry the favicon. Browser on 8742, `/gm/`: *Add Már* → her sheet's *Inspired* carries its icon; an Awe roll logged *Feat 8 + 6[Success] 3 = 17 vs TN 13* and drawn as three dice, all loaded; 0 console errors. Test state removed afterwards |
| U6 | here + upstream | **The campaign's maps** (owner 2026-09-25: *"pull the map of middle earth from foundry to use"*; both published, owner's call). From the Foundry world's scenes *Middle Earth* (`sortilege/beleriand/maps/middle earth ing .jpg`, 7016×4961) and *Middle Earth (Copy)* (`…/eriador.png`, 4208×3112), fetched from foundry.sortilege.online: `campaign/assets/maps/eriador.webp` (2.4 MB) and `middle-earth.webp` (5.8 MB) at full size, each with a 1600-px preview. `engine/config.js` `maps` lists them; upstream `b22d7bb` (its X3) makes the table's *maps in the repo…* list read `VttConfig.maps`; `campaign/site/site.js` draws them atop the Atlas, each preview linking to the full image | **Done 2026-09-25** — `bash campaign/build/build.sh` → *campaign build: OK*. Browser on 8742: `#atlas` drew *Eriador* and *Middle-earth* above the 18 places; `gm/vtt.html`'s list offered both, and choosing Eriador drew it on the table; 0 console errors |
| M2 | here | **The campaign in the VTT's framing.** The DSL layer (a skeleton), the docs pipeline with its checks, six site tabs ahead of the books, the *Behind the Veil* panel with the Company loader | **landed 2026-09-23** — see *M2 proof* below |
| M3 | here | **The campaign's content** — the Company, the chronicle, the people, places and the Loremaster's state, written into `campaign/docs/`, `campaign/dsl/` and `campaign/pack/` (O3) | **Done 2026-09-25** — the chronicle (9 chapters, sessions 2025-05-06 → 09-09); the Company (5 pages, 5 character files converted from the Foundry exports by `campaign/build/foundry_heroes.py`, 4 portraits); Dramatis Personae (56); the Atlas (18); the Timeline and Home; the Loremaster's seed (`campaign/pack/seed.json`, 25 sections, from `campaign/build/seed_source.py`, with the four Banes' art). `bash campaign/build/build.sh` → *chronicle 9, company 5, people 56, atlas 18*, *seed_source: 25 sections*, *campaign build: OK*. Proof below |
| M4 | here | **Deploy**: push (**done 2026-09-23**, the owner, `372fa9c`); Pages; the Worker for this origin; a player joins from a second origin, claims a hero, rolls | — |

### M2 proof (2026-09-23, browser on 8742, through the real controls)

- **Build.** `bash campaign/build/build.sh` → the layer *1 files … (0 entities, 0 records)*,
  *strings: 1 (1 occurrences) — 0 / 0 / 0*, ids / references / names clean, *build_layer: OK*;
  *build_docs: chronicle 0, company 0, people 0, atlas 0, veil 0*; *campaign build: OK*.
- **Empty, as committed.** `/` opens on **Home**, titled *Banes of Beleriand*, the brand
  linking `#home`; 13 tabs — Home, Chronicle, The Company, Dramatis Personae, Timeline, Atlas,
  then upstream's seven; the six cards read *nothing yet* and *The books · 10 books · 3027
  entries* (the campaign's layer shelved first); `campaign.css` loaded; 0 console messages.
- **With content (temporary test pages, removed after; `find campaign -name 'zz-*'` → none).**
  Two chapters under one `part`: the index grouped them, a chapter drew its date, prose, the
  ⁂ break, its footnote as the **Ledger**, a `[[link]]` routed to `#atlas/zz-test-place`, and
  paging to the next. A hero with a character file made in the VTT's own sheet
  (`TorSheet.fileOf`): the card, the biography with a `[[link]]` to `#people/zz-test-ally`, and
  the VTT's read-only sheet beneath it (42 fields, the selects disabled). Dramatis Personae in
  *Companions and kin* / *Servants of the Shadow*: an ally whose `entity` is the core's
  *Adelard Took* drew his stat block (*Loremaster Character · Champion Smoker · Core Rules*);
  a foe whose `entity` is a Loremaster Character **in the campaign's layer** drew it
  (*… · Banes of Beleriand*) — and the site's own *Loremaster characters* tab listed it first,
  ahead of the core's. Timeline and Atlas (grouped by region) drew.
- **The Loremaster's table.** `/gm/` titled *Banes of Beleriand — the Loremaster’s table*, 11
  panels (upstream's 10 + *Behind the Veil*). The veil gated (*Lift the veil*), lifted to the
  note, whose `[[link]]` pointed at the site (`./#people/zz-test-foe`); **Add Test Hero** put the
  hero in the Company (`source.name` the repo path) and the Inspector drew the live sheet
  (Heart 4 · TN 16, Awe 2 favoured); the button then read *Test Hero · at the table*,
  disabled. `gm/vtt.html` *Banes of Beleriand — Table* with the campaign's book and docs
  loaded; `gm/play.html` *Banes of Beleriand — play*. 0 console messages on every page.
- **The docs checks fail when they should**, each exit 1 naming the file: a `side: friends`;
  an unknown `entity`; an unknown key `colour`; a `sheet` that is no file; a `sheet` that is not
  JSON; `[[nowhere]]`; a missing required `name`.
- The test state was removed from the browser's storage afterwards.

### M3 proof (2026-09-25, browser on 8742)

- **Build.** `bash campaign/build/build.sh` → *foundry_heroes: OK — 5 heroes*; *build_docs: chronicle 9,
  company 5, people 56, atlas 18*; *seed_source: 25 sections → pack/seed.json*; *campaign build: OK*.
- **Site.** Tabs (books off): Home, Chronicle, The Company, Dramatis Personae, Timeline, Atlas, Dice.
  `#company/02-makheneb` drew the portrait, the biography and the VTT's read-only sheet with the
  converted values (*Elves of Mirkwood · Poor · Warden*, 6/2/6, Endurance 24 · Hope 10 · Parry 20,
  Cunning, Keen-eyed, Shadow-lore, Fell, Deadly Archery, Bow, Short Sword, Leather Corslet, Helm,
  Buckler, *Folk of the Dusk*, *Rope, Grappling Hook*). `#people/tom-bombadil` drew the core's stat
  block *Tom Bombadil and Lady Goldberry · Patron · Core Rules* beneath the biography.
- **The seed.** A fresh `/gm/` (after the gate): *seeded 25*; the arc *Before the council*, *The
  council of the Blue Mountains*; 13 threads; overview 5, places 2, people 2, pc 1. The Threads pane drew
  *Tarkûrzagûl* with its [YOURS]/[SET]/[OPEN]/[NOTE] labels; its links `./#chronicle/03-the-inner-chamber`
  and `campaign/pack/art/tarkurzagul.webp` → 200.
- **Company files.** *Add Lily Goatleaf* put her in the Company (`source.name`
  `campaign/pack/company/lily-goatleaf.tor2e-hero.json`, Parry 17, Virtue *Hardiness* by hash) and the
  Inspector drew her live sheet.
- Console: one error, a 404 for `/favicon.ico` (the site has none); nothing else. The test state
  was removed from the browser's storage afterwards (2 keys).

## Decision log

| # | Decision | Why |
|---|---|---|
| 1 | The instance hooks were built **upstream** (U1) before the fork, ported from l5r5e rather than written here | The boundary rule: upstream-owned files are never edited in an instance. TOR2e had none of Portents' M2. |
| 2 | Upstream's `instance-hooks` was merged into its `main` and pushed | Upstream is private, and every earlier upstream milestone was pushed; the instance pulls from GitHub like any clone. |
| 3 | No move commit | The repo was empty (`No commits yet`); Portents' step 2.1 moves an existing site, and there was none. |
| 4 | Ports: site **8742**, Worker **8795** | 8733–8741 and 8787–8794 belong to the siblings (8796 to another project). |
| 5 | The campaign's prose is Markdown in `campaign/docs/`, built by `campaign/build/build_docs.py` (python-markdown) into `campaign/data/docs.js` and drawn by the campaign's tabs | Portents' rule: authored prose in `docs/`, rendered by the VTT's tabs and panes. A build step (as Home Is Where We Make Our Fire's `build_site.py`) keeps the pages static and checks them; no Markdown parser ships to the browser. |
| 6 | The docs build **fails** on an unknown or missing key, a bad `side`, a missing file, a non-character `sheet`, an `entity` in neither the books nor the layer, a broken `[[link]]` | The same principle as the layer's gate: a page that would show wrong fails the build, not the reader. |
| 7 | The six campaign tabs are **unshifted** onto `VttSiteTabs`, so the site opens on the campaign's Home; the brand links `#home` and its subtitle reads *The One Ring · a campaign* — set by `campaign/site/site.js`, not by editing upstream HTML | O3's "within the VTT's framing": one site, the campaign first, the books a tab away. |
| 8 | A Player-hero is the VTT's own **character file** (`sortilege-vtt-character`, saved from its sheet) in `campaign/pack/company/`, referenced from the hero's page by `sheet:` | The TOR2e VTT's sheet reads character files, not DSL instances; Portents' "a character is an actor instance in DSL" rests on an l5r5e path this VTT does not have. A file keeps the Company one click from the table (decision 10). |
| 9 | A person met is a **doc page** with an optional `entity:` — any stat block in the books or in `campaign/dsl/` — drawn by the VTT's own entity renderer | Biography is prose (docs); a stat block that must be right is DSL (the layer's gate), so a campaign-only adversary or Loremaster character goes in `campaign/dsl/` and is listed in the VTT's own tabs and panels too. |
| 10 | The Loremaster's page opens on **Behind the Veil · Company · Inspector** (`defaultSlots`); the veil holds `campaign/docs/veil/` behind a per-session spoiler gate and the Company's character files, each added to the table in one click | Portents' O8 opens on the campaign's notes; the gate is Portents' decision 9. The site is static, so the gate is courtesy: anyone can read `docs.js`. |
| 11 | The layer is a **skeleton** (`campaign/dsl/banes-of-beleriand.ttrpg`, no entities), spec 0.5 | `build_layer.py` needs at least one file, and the shelf and gates are then live for the first entity. No content was invented. |
| 12 | Served from Bash (`python3 -m http.server 8742`) for the browser proof, not the launch entry | The preview harness's five-server cap was held by other chats (upstream decision 18's precedent). Launch entries `banes` / `banes-worker` are in both `.claude/launch.json` and `~/.claude/launch.json`. |
| 13 | Not ported from Portents: its house rules as `MODIFY` (TOR2e has no errata display; upstream I-5), its encounter builder and the GM's three panes (its M6, unbuilt upstream in l5r5e too), NPC discovery fuzzing | Not built anywhere yet, or no content here to need it; each would be upstream work first. |
| 14 | The two U3 settings sit after `instance` in `engine/config.js`, with upstream's comment, rather than between the Worker's comment and `worker:` where upstream put them | Upstream's placement splits the Worker's comment from its block. The text is upstream's byte for byte (`diff` → identical); only the position differs. |
| 15 | Home's *The books* card shows only when the books tab is in the tab bar (`campaign/site/site.js` reads `#site-tabs`, which `engine/site.js` draws first) | With books off the card linked to a tab that no longer exists, and the link fell back to Home. Reading the drawn bar keeps a single rule (upstream's filter) instead of copying it. |
| 16 | The campaign's six tabs carry no `books` flag: they stay with books off | They are the campaign's own material for the players (brief, U3 step 3). A person's `entity:` stat block, drawn on Dramatis Personae, is shown whatever the setting: the Loremaster chose to publish it with the campaign. |
| 17 | The Worker ran on **8795**, not 8793, with `--inspector-port 9293` | This instance's `worker.local` is 8795 (decision 4); 8793 is upstream's, and a Worker there would not be reached by this site. |
| 18 | Ran upstream's installed `wrangler` against this repo's `worker/`, with `--persist-to` in the session scratchpad | `worker/src` and `package.json` are identical to upstream's (`diff -r` → none), so there was no install or download, and no `.wrangler` state was left in the repo. |
| 19 | A first run of the checks read **stale cached files** (the corpus index and records from an earlier server on 8742): 0 records on `/gm/` | `curl` served the right files, so the cause was the browser pane's HTTP cache. I refetched every file with `cache: 'reload'` and reran all checks from scratch; the results above are from that second run. No code was involved. |
| 20 | O2 carried out: `campaign/site/gm.js` is the *Company files* panel only (`company-files`); `defaultSlots` `['scenes', 'company', 'inspector']`; `veil` removed from `build_docs.py`'s sections, `campaign.css`, `site.js`'s link routing, both READMEs; `docs/veil/` deleted. Supersedes decision 10 | The owner's answer to O2. Scenes opens first because it is where a session is run. A browser with `veil` saved in a slot falls back to the default (upstream `engine/app.js`): tested with `VttState.ui('slots', ['veil', 'company', 'inspector'])` → *scenes · company · inspector*. |
| 21 | `build_docs.py` now **fails** on a `.md` in `docs/` that belongs to no section, naming the GM tabs | Before this, a page in an unknown folder was skipped without warning, yet still published with the repo. A note written into the old `veil/` would have gone public and appeared nowhere. Proof: a planted `docs/veil/secret.md` → *build_docs: FAILED … not a page of any section*, exit 1; `docs/atlas/sub/n.md` → the same; clean → exit 0. |
| 22 | People pages for **everyone met on the page or acting in the story** (56, the horses and Firework among them); none for figures only mentioned (the Valar, Bilbo, Gandalf, Butterbur, Bill Ferny, Hamfast, Fenja, Adis, Galdor, Melody Took, Herbert) | The chronicle's own set of persons is the enumerable source; lore mentioned in passing is the books' business. The unnamed foes (the belted man, the frozen man, the frost-wolves, the Orc, the troll, the white beast, the sleeper, the Beast of Belegaer, the maddened Dwarves) are pages under *foes* by what the table called them; the Banes' own names stay in the seed. |
| 23 | The Company's sheets resolve every published name against the corpus (Foundry is a working copy): *Hobbit of the Shire* → *Hobbits of the Shire*, *Grievious* → *Grievous*, lower-case callings and features to the corpus's case; Cultural Blessing and Shadow Path checked against the culture's and calling's own; Endurance, Hope and Parry **derived** from the culture's *Derived Stats* | Owner rule (memory: corpus is canon, Foundry is wrong). Two Foundry values were wrong by the corpus: Makheneb Hope 1 → 10 and Parry 0 → 20; Lily Parry 18 → 17. Every item and trait is accounted for in the converter's report, or the run fails. |
| 24 | Not put on the sheets: Foundry's Shadow-Path stage list on Már (*1 - Spiteful* … *4 - Murderous*, the four flaws of the Curse of Vengeance in order, not flaws taken — **owner confirmed 2026-09-25**: every Shadow Path is listed this way); the Cultural Blessing where Foundry also filed it as a feature; Már's two stray *Awe* skill items; the second hand of a spear; notes typed as items (*Grieving her husband*, *No Longer free from fear*, *Slender/Nimble*) and the annotation *Enemy-lore: Undead* and each Reward's item (all kept on the Company pages or in the report) | They are not sheet fields, or duplicate one. Marigold's *Halfling* and Perry's *Clumsy* flaws are kept by name (Flaws is a list of strings). |
| 25 | Lily's Virtue *Hardiness* — **resolved 2026-09-25**: the corpus fix (`titterpig-dsl-tor2e` `d40463a`) made it a typed Virtue inside the core's *Virtues List*, and `data/` was rebuilt here with `bash build/build.sh` (byte-identical to upstream `0dc90a4`). Its hash moved with it (now `#tZAuZvrLxkHMU2sbLBBzVTD`, on Lily's sheet too), and the converter now resolves it as an ordinary Virtue record | Before the fix, Hardiness sat outside the *Virtues List* with no `EXTENDS ^"Virtue"`, so records.js had five of the book's six and Lily's sheet referenced the untyped entity. Now `records.js` has 6 generic Virtues under *Virtues List*. |
| 26 | Treasure kept as Foundry had it (30 for Lily, Marigold and Perry). **Owner 2026-09-25: it is stored at home.** The sheet's `Treasure` is the hero's record and stays 30. ~~The VTT counts all of it as carried Load, so the three draw Weary~~ **Resolved upstream (`5ceb407`, its X1; merged here as U4, 2026-09-25):** only `live.treasureCarried` (0 by default, set on the sheet's *Treasure carried* tile or the player's Gear tab) counts toward Load, so the three carry none and are not Weary (Lily Load 12 against Endurance 23) | The book's *Carrying Treasure* counts only what is carried. Zeroing the field would have lost the record; the fix belonged upstream, not in this instance's data. |
| 27 | Portraits: the five heroes' own (Már's added 2026-09-26, owner: the August ChatGPT image in the support archive); Celenneth, Linnea, Eryndil, Findemir from the art folder. Not used: Hallas's portrait (a grown man; at the table Hallas is a small child), Damrod, Eira, Garin (not in this campaign), `character.png` and the 14 May image (unidentified), the Timeline photos and David Day map (O3) | Only faces the table has met, drawn as they were met. |
| 28 | The seed is built by `campaign/build/seed_source.py` and runs in `build.sh`, as does the Foundry converter | Both are deterministic from sources in the repo. The seed only fills what a campaign has never had (engine/state.js), so a rebuild never overwrites the GM's edits. |
| 29 | The seed takes the GM notes' substance, not their form: the ChatGPT framing around Tom's song and the Nameless Things (*Would you like…*) is dropped; the lore Q&A and the Third-Age timeline (general Tolkien reference, from the books) are not seeded | They are the Loremaster's scratch conversations and the books' history, not the campaign. |
| 30 | Where the GM notes and play disagree, play is [SET] and the note stays [YOURS] beside it: Barad Tarminalë (notes: the Blue Mountains' eastern face; play: north beyond Fornost); Thargindum (notes: the stone sealed under a collapsed shaft; Thramli: a place kept and tended) | *Don't get ahead of play* (memory): resolve from what happened, and leave the prep visible for the Loremaster to reconcile. |
| 31 | `.nojekyll` at the root: GitHub Pages serves the files as they are, without Jekyll | Every Pages build since Pages was switched on errored (*Page build failed*: `b6e18ae`, `49cbde5`, `0024f5a`). The legacy build runs Jekyll, which renders every `.md` with front matter — here the 88 in `campaign/docs/` — through the default theme; the likely failure (GitHub reports no detail) is the chronicle's `date: Spring, 2965`, which the theme tries to read as a date. The siblings build because their pages carry no front matter. The site is static and never needed Jekyll; the docs reach the site through `campaign/data/docs.js`. |
| 32 | The live Foundry world (read over the foundryrestapi.com relay, 2026-09-25) was **not** taken for the Company's sheets | Its five heroes are the same actors as the May exports, last changed 2025-07-26: nothing about the heroes has advanced, only live state (Lily Hope 13 and 1 Shadow, Marigold Hope 15) and **Már's Treasure 0 → 90**. The sheets keep the May exports. **Owner 2026-09-25: Már gets the 90 Treasure** (stored at home, as decision 26), set by `OVERRIDES` in `campaign/build/foundry_heroes.py` with its source; nothing else is taken from the live world. |
| 33 | Both maps published in the public repo, though neither carries a credit: Eriador is Free League's TOR2e hex map (as the book text already published, O1); the Middle-earth painting is by an artist not identified | The owner's call, 2026-09-25, offered with the alternative of linking the painting from the Foundry server instead of copying it. |

## Next

**O1's remainder** (above) — Pages, an origin, the Worker.

**Owner follow-ups.** Later Foundry exports of the five heroes, to replace the May 2025 sheets
(drop them in `campaign/source/foundry/` and run the build). Upstream: stored Treasure is counted as Load (decision 26).

**After the next session:** a chapter for it, the arc's scenes marked played in the GM tabs, new
people and places.

To resume: `bash campaign/build/build.sh`, serve the root (`banes`, 8742), open `/` and `/gm/`.
