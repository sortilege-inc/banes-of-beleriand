# campaign/docs — the campaign's authored prose

Markdown, one file per page. `bash campaign/build/build.sh` turns it into
`campaign/data/docs.js`, which the site's campaign tabs render. The build fails, naming the file,
on a bad key, a missing file, an unknown entity, a broken `[[link]]` or a page in no section.

A page may open with front matter: `key: value` lines between `---` fences. Paths are relative
to `campaign/`. The file name (without `.md`) is the page's slug, unique across every section,
and sets the order within its section — number them (`01-…`) where order matters.

| Where | Site tab | Front matter (**required**) | The body |
|---|---|---|---|
| `home.md` | Home | — | The campaign's front page, above the cards into every section. |
| `chronicle/*.md` | Chronicle | **title**, part, date, played | One chapter or session. `part` groups chapters (a book, an arc); `date` is the in-world date, `played` the real one. Prose only: no dice, no named rules — the mechanics are implicit in the telling (PLAN.md O3). |
| `company/*.md` | The Company | **name**, epithet, culture, calling, player, portrait, sheet | A Player-hero's biography. `sheet` is the character file saved from the VTT's sheet (`pack/company/<name>.tor2e-hero.json`); the page draws it, and the Loremaster's *Company files* panel adds it to the Company in one click. |
| `dramatis-personae/*.md` | Dramatis Personae | **name**, **side**, epithet, entity, portrait, first | Someone met. `side` is `allies`, `foes` or `others`. `entity` is the id of their stat block — in the books or in `campaign/dsl/` — drawn beneath the biography. `first` is where they were met (free text). |
| `timeline.md` | Timeline | — | The reckoning of events, in whatever shape suits (a list under dated headings, a table). |
| `atlas/*.md` | Atlas | **name**, region, portrait | A place. `region` groups places. |

Everything in `docs/` is published with the site. The Loremaster's own material — prep, threads,
secrets — is not a doc: it goes in the GM tabs on `/gm/`, saved in the pack. A `.md` anywhere
not listed above fails the build.

Link any page to any other with `[[slug]]` or `[[slug|the words shown]]`.

Portraits and maps go in `campaign/assets/`, web-optimised (WebP).
