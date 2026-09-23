#!/usr/bin/env python3
"""
build_docs.py — the campaign's authored prose (campaign/docs/) → campaign/data/docs.js.

The docs are Markdown, one file per page, each with an optional front matter of `key: value`
lines between `---` fences. The format of every section is in campaign/docs/README.md. This
writes one self-registering file, `window.BanesDocs`, which the campaign's site tabs
(campaign/site/site.js) and Loremaster's panel (campaign/site/gm.js) render; it never touches
the VTT's own data/.

It fails (exit 1), naming the file, on anything a page would show wrong:

  * a front-matter key the section does not define, or a required one missing
  * a `side` that is not one of the three
  * a `portrait` or `sheet` path that is not a file in campaign/
  * a `sheet` that is not a character file the VTT reads (kind `sortilege-vtt-character`)
  * an `entity` id that is neither in the books (data/*.js) nor in the campaign's layer
    (campaign/data/campaign.js) — build the layer first (build/build_layer.sh)
  * a `[[slug]]` link to a page that does not exist

    python3 campaign/build/build_docs.py
"""
import json
import os
import re
import sys

import markdown

CAMPAIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(CAMPAIGN)
DOCS = os.path.join(CAMPAIGN, "docs")
OUT = os.path.join(CAMPAIGN, "data", "docs.js")
ENTITY_BLOB = re.compile(r"var d=(\{.*\});var T=window\.TOR2E", re.S)

# section → (folder or file, keys it allows, keys it requires)
SECTIONS = {
    "chronicle": ("chronicle", {"title", "part", "date", "played"}, {"title"}),
    "company": ("company", {"name", "epithet", "culture", "calling", "player", "portrait", "sheet"}, {"name"}),
    "people": ("dramatis-personae", {"name", "epithet", "side", "entity", "portrait", "first"}, {"name", "side"}),
    "atlas": ("atlas", {"name", "region", "portrait"}, {"name"}),
    "veil": ("veil", {"title"}, {"title"}),
}
SIDES = ("allies", "foes", "others")
FILE_KIND = "sortilege-vtt-character"      # system/tor2e/sheet.js FILE_KIND
WIKILINK = re.compile(r"\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]")

errors = []


def fail(path, msg):
    errors.append("%s: %s" % (os.path.relpath(path, ROOT), msg))


def front_matter(path, text):
    """`---` / key: value lines / `---` at the top of a file → (dict, body)."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        fail(path, "front matter opened with --- and never closed")
        return {}, text
    meta = {}
    for ln in text[4:end].split("\n"):
        if not ln.strip():
            continue
        k, sep, v = ln.partition(":")
        if not sep:
            fail(path, "front-matter line is not `key: value`: %r" % ln)
            continue
        meta[k.strip()] = v.strip()
    return meta, text[end + 5:]


def known_entities():
    ids = set()
    for d in (os.path.join(ROOT, "data"), os.path.join(CAMPAIGN, "data")):
        for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if fn.endswith(".js") and fn != "docs.js":
                m = ENTITY_BLOB.search(open(os.path.join(d, fn), encoding="utf-8").read())
                if m:
                    ids.update(json.loads(m.group(1)).get("entities") or {})
    return ids


def render(md_text):
    """Markdown → HTML; footnotes (`[^id]`) become the page's ledger."""
    return markdown.markdown(md_text, extensions=["footnotes", "tables", "sane_lists", "attr_list"],
                             extension_configs={"footnotes": {"BACKLINK_TEXT": "↩"}})


def asset(path, meta, key):
    """A path in front matter is relative to campaign/; the page gets it relative to the site root."""
    v = meta.get(key)
    if not v:
        return None
    if not os.path.isfile(os.path.join(CAMPAIGN, v)):
        fail(path, "%s %r is not a file under campaign/" % (key, v))
        return None
    return "campaign/" + v


def read_section(sid):
    folder, allowed, required = SECTIONS[sid]
    d = os.path.join(DOCS, folder)
    out = []
    for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not fn.endswith(".md") or fn == "README.md":
            continue
        path = os.path.join(d, fn)
        meta, body = front_matter(path, open(path, encoding="utf-8").read())
        for k in sorted(set(meta) - allowed):
            fail(path, "front-matter key %r is not one of %s" % (k, ", ".join(sorted(allowed))))
        for k in sorted(required - set(meta)):
            fail(path, "front-matter key %r is required" % k)
        page = {"slug": fn[:-3], "md": body}
        for k in allowed:
            if meta.get(k):
                page[k] = meta[k]
        if sid == "people" and meta.get("side") and meta["side"] not in SIDES:
            fail(path, "side %r is not one of %s" % (meta["side"], ", ".join(SIDES)))
        for k in ("portrait", "sheet"):
            if k in allowed and meta.get(k):
                page[k] = asset(path, meta, k)
        if page.get("sheet"):
            try:
                kind = json.load(open(os.path.join(ROOT, page["sheet"]), encoding="utf-8")).get("kind")
            except (ValueError, OSError) as e:
                kind = None
                fail(path, "sheet %r is not JSON: %s" % (meta["sheet"], e))
            if kind is not None and kind != FILE_KIND:
                fail(path, "sheet %r is a %r, not a character file (%s) — save it from the VTT's sheet" % (meta["sheet"], kind, FILE_KIND))
        page["_path"] = path
        out.append(page)
    return out


def main():
    site = {"home": None, "timeline": None}
    for key in ("home", "timeline"):
        path = os.path.join(DOCS, key + ".md")
        if os.path.isfile(path):
            _meta, body = front_matter(path, open(path, encoding="utf-8").read())
            site[key] = {"md": body}
    for sid in SECTIONS:
        site[sid] = read_section(sid)

    entities = known_entities()
    slugs = {p["slug"]: sid for sid in SECTIONS for p in site[sid]}
    for sid in SECTIONS:
        for p in site[sid]:
            if p.get("entity") and p["entity"] not in entities:
                fail(p["_path"], "entity %r is in neither the books nor the campaign's layer" % p["entity"])
    # [[slug]] / [[slug|text]] link any page to any other, by its file name (unique across sections)
    seen = {}
    for sid in SECTIONS:
        for p in site[sid]:
            if p["slug"] in seen:
                fail(p["_path"], "file name %r is also used in %s — [[links]] need it unique" % (p["slug"], seen[p["slug"]]))
            seen[p["slug"]] = sid

    def links(md_text, path):
        def sub(m):
            slug, label = m.group(1), m.group(2)
            if slug not in slugs:
                fail(path, "[[%s]] names no page" % slug)
                return label or slug
            return '<a class="doc-link" data-tab="%s" data-slug="%s">%s</a>' % (slugs[slug], slug, label or slug)
        return WIKILINK.sub(sub, md_text)

    for key in ("home", "timeline"):
        if site[key]:
            site[key] = {"html": render(links(site[key]["md"], os.path.join(DOCS, key + ".md")))}
    for sid in SECTIONS:
        for p in site[sid]:
            p["html"] = render(links(p.pop("md"), p["_path"]))
            del p["_path"]

    if errors:
        print("build_docs: FAILED")
        for e in errors:
            print("  " + e)
        return 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by campaign/build/build_docs.py from campaign/docs/ — do not edit by hand. */\n")
        fh.write("window.BanesDocs=%s;\n" % json.dumps(site, ensure_ascii=False, sort_keys=True))
    print("build_docs: %s → %s" % (", ".join("%s %d" % (s, len(site[s])) for s in SECTIONS),
                                    os.path.relpath(OUT, ROOT)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
