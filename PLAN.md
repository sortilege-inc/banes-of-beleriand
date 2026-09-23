# sortilege-vtt-tor2e — plan and decision log

A virtual tabletop for **The One Ring, Second Edition** (Free League), built on the Titterpig
corpus `titterpig-dsl-tor2e/0.5`. Its shape follows `sortilege-vtt-teeth`'s `PLAYBOOK.md`, with
Troika!'s adventure-and-bestiary pattern and VtM5e's lazily loaded shelf of books. All three
repos are read-only reference; nothing in them is modified here. Eighth in the line after
Wyldwolf Axis, NOVA Open, City of Winter, TEETH, Invisible Sun, Troika! and VtM5e.

Status words: **PROPOSED** (awaiting the owner), **(owner)** decided, **landed** built and
verified in the browser by the main session.

## Ground rules (inherited, 2026-09-23)

- The sibling repos are read-only reference. Only the system-agnostic code is reused:
  `engine/*.js` (no game words), the generic DSL parser, the shape of the gates and of the
  build, and the Worker. No other system's data, `system/` module, css, book map or namespace
  comes across. Every word of rules text this site shows comes from `titterpig-dsl-tor2e/0.5`.
- `data/` is generated; regenerating is the only way to change it. Corpus gaps found while
  building are reported to `titterpig-dsl-tor2e/TODO.md` and never patched in the tool.
- Rules text is verbatim. The tool's own words are labels and connective prose only. A number
  the rules state only in prose is a named constant that cites its sentence.

## What is on disk (read 2026-09-23)

| Input | State |
|---|---|
| `~/Sortilege/VTT/sortilege-vtt-tor2e` | cloned empty 2026-09-23; remote `sortilege-inc/sortilege-vtt-tor2e` (private); identity Jordan Peacock <jordan@sortilege.online> set per repo |
| `~/Sortilege/Titterpig/DSL/titterpig-dsl-tor2e/0.5` | 374 DSL files + 1 `.lore`, 3.6 MB, **nine books**: the core and eight sourcebooks (Moria, Rivendell, Ruins of the Lost Realm, Tales from the Lone-lands, Peoples of Wilderland, Realms of the Three Rings, Strider Mode, Hands of the White Wizard). Gates at `a6fad20` (2026-09-23): validator 374 files 0/0, constructs 249 GUIDANCE 0 errors, references 1279 §5d sites 0 hashless, coverage 9/9 manifests PASS |
| The conversions | `~/Sortilege/Titterpig/Temp/tor2e-core-conversion` (core), `…/tor2e-sourcebook-conversions` (the eight sourcebooks). **The BASE is hand-authored**; no generator writes it |

**The inherited parser reads this corpus unchanged:** `parse_dsl.parse_files` (the L5R5e
derivation, a superset of VtM5e's) on all 374 DSL files → 374 of 374 in 0.5 s (pilot,
2026-09-23).

### The corpus, by what the tool needs

| Need | In the corpus | Shape |
|---|---|---|
| The books | nine books, one file per chapter, `tor2e-0.5-<book>-<chapter>`; actors in `adversaries/` `loremaster-characters/` `patrons/`, prefixed the same way | the file-name prefix is the book |
| Rules text | the heading tree as nested DEFs, DESCRIPTION verbatim, `Rules` / `Items` / `Effects` / `Steps` / `Examples` lists, 249 GUIDANCE sidebars, 302 printed TABLEs cell for cell, the three rules icons written `[Success]` `[Eye of Sauron]` `[Gandalf Rune]` | a tree; the outline is the nesting |
| Character creation | **typed**: 6 `Heroic Culture` (attribute sets, derived-stat formulas, skill ranks, blessing, standard of living, names), 6 `Calling`, 18 `Skill`, 4 `Combat Proficiency`, 24 `Distinctive Feature`, 41 `Virtue`, 6 `Reward`, 16 `Weapon` / 5 `Armour` / 3 `Shield`, Previous Experience | records by BASE type |
| Adversaries | `ACTOR "Adversary"`: 129 `.actor`s with Attribute Level, Endurance, Might, Hate or Resolve, Parry, Armour, parsed Combat Proficiencies, Fell Abilities | records |
| Loremaster characters · Patrons | `ACTOR "Loremaster Character"` × 176, `ACTOR "Patron"` × 6 (Fellowship Bonus, Advantage) | records |
| Adventures | 13 `.arc`s — the core's *Star of the Mist*, *Tales from the Lone-lands*' six, *Hands of the White Wizard*'s six — 175 SCENEs, 145 LOCATIONs, 62 numbered Parts (FLOW PHASEs); plus Moria's 5 campaign-focus `.frame`s | the modules |
| The dice | Feat die (d12, Gandalf Rune / Eye of Sauron) and Success die (d6, the Success icon) in the BASE; the rules in *Action Resolution* | BASE types + prose; the roller's numbers are named constants citing their sentences |
| **The Player-hero** | **`ACTOR "Player-hero"` in the BASE** — added for this tool (D1) | the sheet is derived from it |

## Decisions

**D1 — (owner, 2026-09-23) DECIDED and landed in the corpus (`titterpig-dsl-tor2e` `a6fad20`):
declare the Player-hero in the BASE.** The corpus declared no ACTOR for a player's character, so
there was nothing to derive a sheet from. The printed sheet (core p. 239) is not in the corpus.
`#tor5PlayerHero00001 ACTOR "Player-hero"` now has one property per printed label, in the
sheet's order: Name, Heroic Culture (hash-bound), Age, Standard of Living, Treasure, Distinctive
Features, Cultural Blessing, Patron, Calling (hash-bound), Shadow Path, Flaws, Strength / Heart /
Wits (1–9), Endurance, Hope, Parry, Adventure Points, Skill Points, Fellowship Score, Skills and
Combat Proficiencies (`Skill Rank`), Valour / Wisdom (1–6), Rewards, Virtues, Travelling Gear,
War Gear (`Weapon`), Armour / Helm (`Armour`), Shield. Attribute TNs are the rule ("Each
Attribute TN is equal to 20 minus its corresponding Attribute score"), not declarations. The
running tallies are live state kept by the tool: current Endurance, current Hope, Load, Fatigue,
Shadow, Shadow Scars, Weary / Miserable / Wounded, Injury. BASE VERSION 0.5.1 → 0.5.2; all four
gates green in the commit message; pushed.

**D2 — the books are the shelf; a book's chapters are its files** (autonomous, tool/method).
`build/build_data.py` assigns each corpus file to its book by the file-name prefix. That map is
the only hand-written list in the build, and the build refuses to run if any corpus file is
claimed by no book. A book's `.actor` files are grouped into one chapter per directory. Each
book is its own data file, loaded on demand (`engine/data.js`); `data/records.js` lists every
typed record so the Bestiary and the creator work before any book is loaded.

**D3 — (owner, 2026-09-23) private, local only.** The repo stays private and nothing is
deployed. Sessions are proven with `wrangler dev` on 8793. Deploying later takes one step
(below).

## Layout (the inherited three-layer shape; everything game-specific written here)

```
index.html               the site: the books, the Bestiary, the Loremaster characters, the
                         dice, making a Player-hero, search
build/                   the generator and its gates
data/                    GENERATED — window.TOR2E.index / .records / .books / .entities, one file per book
engine/                  system-agnostic, copied whole from VtM5e
system/tor2e/            accessors, the entity renderer, the site's tabs, the dice, the sheet and
                         creator; for the table: ops, the table adapter, panels
gm/                      the Loremaster's page, the table (vtt.html), the player's page (play.html)
worker/                  the session rooms (Cloudflare Worker + Durable Object); not deployed
assets/css/              the look
```

## Milestones

| # | Milestone | Proof required |
|---|---|---|
| M0 | Repo skeleton: `engine/*.js` and `worker/` copied from VtM5e and renamed, `build/parse_dsl.py` from L5R5e; `engine/config.js`; launch entries (`vtt-tor2e` 8741, `vtt-tor2e-worker` 8793); this plan; git identity | **landed 2026-09-23**: `grep -rniE 'vtm|vampire|kindred|troika|l5r' engine worker/src worker/*.json* build/parse_dsl.py` matches only a parser comment that cites L5R5e's hash form as the reason for a generic rule, and a lockfile checksum; the pilot parse read 374 of 374 |
| M1 | `build/` generates `data/` from the corpus, one file per book plus `index.js` and `records.js`; `verify_data.py` checks both directions (DSL strings and `.lore` lines); `check_shape.py` checks against an independent line scan; `build.sh` | **landed 2026-09-23**: `bash build/build.sh`: 375 files → 9 books, 3,155 entities, 751 records (Adversary 129, Loremaster Character 176, Patron 6, Heroic Culture 6, Calling 6, Virtue 41, Table 302 …), 13 arcs / 175 scenes; `verify_data: 11525 strings — 0 uncovered · 0 unsourced`; `check_shape: OK (49 assertions)`; `node --check` on every data file |
| M2 | The site: the books (outline, reader, sidebars, tables, the rules icons), the adventures, the Bestiary and the Loremaster characters, the dice, search | **landed 2026-09-23**: browser on 8741 at 1400 px, through the real controls. The shelf lists the 9 books from `index.js` (*Core Rules · 16 chapters · 669 entries · 1 adventure*). The core loads on demand, and *How to Read the Feat Dice* reads verbatim under *Chapter 2: Action Resolution › Making Rolls*, its icons drawn as glyphs. **Adventures** lists 13 adventures and 5 campaign focuses by book; *The Beast of Dunland* opens with its epigraph, text, six Parts and their scenes. **Adversaries** lists 129 of 129 before any book loads; *Búrzgul* shows Attribute Level 5 · Endurance 22 · Might 1 · Hate 5 · Parry +3 · Armour 3, his two Combat Proficiencies and three Fell Abilities, and pressing *Scimitar 3 (3/16, Break Shield)* rolled Feat 6 + 1 5 3 = 15 with the icons switched. **Loremaster characters**: 182 of 182. The Hands outline lists 105 scenes; *Poor Welcomes* opens under *Part 2: Journey to Crow Hall*. The prologue `.lore` renders 4 headings and 26 paragraphs. **Dice**: the seven cited rules render and a roll reads *13 vs TN 14 — failed*. **Search** "Gandalf rune": 35 hits. 0 console errors. Under node the roll logic holds at every edge (rune with a low total succeeds, the Eye counts 0, the Eye while Miserable fails, Weary zeroes a 2, Favoured keeps the rune, Ill-favoured keeps the Eye, the icons switched for a servant of the Shadow, *lose (3d)* from 2 leaves 0 dice). `check_shape` now also asserts that the 13 rules the dice cite are core entities under those names (76 assertions) |
| M3 | The Loremaster's page: Adventure tracker (the 13 arcs as modules), Company, Inspector, Bestiary (put in a scene), Tables (rolled on), Dice, Rules & Book, Log, Campaign; the table and the player's page wired | **landed 2026-09-23**: browser at 1400 px, through the real controls. The shell opens on Adventure · Company · Inspector; the adventure picker lists the 13 adventures by book. Choosing *The Star of the Mist* gives *Core Rules · 0 of 6 scenes done* and its six scenes. **Trapped!** made current (`state.current['tor2e-star-of-the-mist']` = its id) loads the core and shows the scene's text. The adventure's own cast offered **+ Elwen**, which stored `cast[Trapped!] = [Elwen]`. Her chip opened her in the Inspector, and pressing *Pitted Blade 3 (4/16)* rolled Feat 9 + 2 3 6 = 20 with the icons switched, logged as *Elwen · Pitted Blade 3 (4/16)*. **Tables** (the adventure's book): *60 tables · 29 labelled with a die, rolled here*; *Journey Events Table* rolled the Feat die → 6 → the printed *4–7 · Mishap* row, logged. **Dice**: *14 vs TN 14 — a great success*, logged. **Rules & Book** "Miserable": 19 results. The **Log** shows all three. `gm/vtt.html?scene=…` opened titled *The One Ring — Trapped!* with the six scenes; adding Elwen drew her token reading *Elwen · Endurance 24 · Hate 5 · Parry +2 · Armour 2*. `gm/play.html` shows *Join the table*. 0 console errors on each page. Under node the system op applies and the role rule holds (the GM may `setSceneCast`, a player may not) |
| M4 | The Player-hero sheet derived from the ACTOR, the creator (the core's *Adventurers* chapter walked over the typed cultures and callings), a per-browser roster, the live sheet and the rolls | |
| M5 | Sessions proven with `wrangler dev` on 8793 | |

Each milestone is one commit, pushed, and proven in the browser by the main session through the
real controls (PLAYBOOK §5) before the next one begins.

## Decision log

| # | Decision | Why |
|---|---|---|
| 1 | The engine and Worker are copied whole from VtM5e (the latest derivation with the lazily loaded shelf); the parser from L5R5e (VtM5e's plus five 0.5 extensions); the Worker renamed, `ALLOWED_ORIGIN` left at the github.io origin, local port **8793**; the site on **8741** | The engine has no game words. Ports 8735–8740 and 8787–8792 belong to the siblings (8791 to two static sites). |
| 2 | D1–D3 above | — |
| 3 | **Records by BASE type.** Every entity that EXTENDS a type the BASE declares is a record; `RECORD_FIELDS` names the few scalar fields a list shows (keys the BASE declares) | Unlike VtM5e, this BASE types its sets; nothing needs to be found by shape. |
| 4 | **An adventure keeps its document order** (`seq`): its own properties (*Epigraph*, *Rumour*, *Old Lore* …), LOCATIONs, SCENEs and the entities between them, interleaved as printed; the FLOW's numbered Parts list their SCENE_REFs; an entity inside a SCENE or LOCATION is listed by that block, not as a root of the book | The arcs mix all four at the top level, and *Star of the Mist* has no FLOW at all. The printed order is the only order that reads right for every one of them. |
| 5 | A chapter's page is the first `(pages N` of its `# source:` hint, read as written; the BASE (no hint) comes first | The files carry printed pages; nothing is inferred. |
| 6 | **The three rules icons are drawn as glyphs** (`assets/icons/*.svg`, drawn for this tool, tinted by CSS): the Gandalf rune gold, the Eye red, the Success icon green. The token stays each glyph's title and accessible name | The conversion writes them as `[Success]` / `[Eye of Sauron]` / `[Gandalf Rune]`; the book prints icons. The owner's art pack for TOR (if any) would replace the three files. |
| 7 | **The roller's numbers are named constants citing their rules** (`TorDice.RULES`, asserted by `check_shape`): Feat die 11 = the Eye, 12 = the Gandalf rune (the *Using Your Own Dice* sidebar); the rune succeeds regardless, the Eye counts zero; Favoured / Ill-favoured keep the best / worst of two, both at once roll one; Weary zeroes 1–3; Miserable fails on the Eye; *lose (Nd)* floors at zero dice; the degree from the count of Success icons. The rune adds nothing to the total (the rule gives it no number) | Rules text is the book's; the roller is arithmetic over it. |
| 8 | **An adversary's Combat Proficiency rolls with the icons switched by default** (the *Feat Die Results for Adversaries* sidebar, which says the Loremaster "can" do so; a checkbox turns it off) | The book frames it as the thematic choice for a servant of the Shadow. |
| 10 | **The adventure in play is the campaign's first module** (the engine's `setCampaign`), picked at the top of the Adventure panel; its scenes, done / notes / current use the engine's scene ops under the arc's id. `index.js` carries each arc's scenes (id, name, Part) in reading order, so the table and the tracker list them before the book loads; `check_shape` asserts every arc's list | The engine's `scenes()` is synchronous; a 1.2 MB book should not load just to list six names. |
| 11 | **A printed table is rolled with the die its rows are labelled by**: Feat die faces (the Eye, 1–10, the rune, or ranges) → the Feat die; 1–6 → a Success die; the face read to its row (`TorDice.rollTable`). A table labelled any other way is reference only, with no Roll button. A face the book prints no row for says so | The books print the die; picking a row at random would misweight the ranges. |
| 12 | **The cast is records** (adversaries, Loremaster characters, patrons — always in memory) put in a scene by id (system op `setSceneCast`); an arc's own `CAST` names (*Star of the Mist*: Elwen) are resolved by name to records and offered as **+** chips | Only one arc names a cast, and only by name. |
| 9 | **An adventure with Parts reads Part by Part**, each Part's scenes in turn, then its locations under a *Locations* heading (this tool's word) and anything else it prints; an adventure without Parts (*Star of the Mist*, a Landmark) reads in the file's order | The Hands arcs write every LOCATION ahead of every SCENE, so file order would put the map key first. |
