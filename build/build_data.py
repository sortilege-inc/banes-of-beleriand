#!/usr/bin/env python3
"""
build_data.py — The One Ring 2e corpus (titterpig-dsl-tor2e/0.5) → data/*.js.

Everything the site shows comes from here; nothing is hand-typed. The shape is GENERIC and
hash-keyed — the engine reads it without knowing the game, and system/tor2e/ interprets it:

    window.TOR2E.index           { system, counts, books: [ … ] }               data/index.js
    window.TOR2E.records         [ {id, name, book, type, under, fields} ]      data/records.js
    window.TOR2E.books[<id>]     { id, label, chapters: [ … ], entities: [root ids], arcs: [ … ] }
    window.TOR2E.entities[<h>]   { id, name, key, form, book, file, type, parent, slot, children,
                                   desc, props, entries, table, choices, guidance, refs, terms }

What this corpus needs:

  * **Nine books, 3.6 MB.** One data file per book (`data/<book>.js`), loaded on demand by
    engine/data.js (VtM5e's shape). A file belongs to a book by its file-name PREFIX
    (`tor2e-0.5-<book>-…`, the three actor directories included); BOOKS below is the prefix
    map, the only hand-written list in the build, and every corpus file must be claimed by
    exactly one book or this exits non-zero.

  * **Chapters in printed order** by the `# source: … (pages N` hint each file opens with
    (the `.lore` by its `pages N-M (printed)` header). A book's `.actor` files are grouped into
    one chapter per directory (Adversaries, Loremaster characters, Patrons) after its text.

  * **The BASE declares types**, so records are known BY TYPE, not by shape: every entity that
    EXTENDS a BASE type (a Heroic Culture, a Calling, a Virtue, an Adversary …) is listed in
    data/records.js with a few of its fields, so the Bestiary and the creator work before any
    book is loaded. The field names are the BASE's declarations, read by key.

  * **Adventures are `.arc`s (13) and campaign focuses `.frame`s (5).** An arc keeps its
    document order — its own properties, LOCATIONs, SCENEs, the FLOW's numbered Parts over
    SCENE_REFs, its CAST and its sidebars — so the tracker can read it as the book prints it.
    An entity nested in a SCENE or LOCATION is an entity like any other; the block lists its id.

Every string is carried byte-for-byte from the DSL (only DSL escapes resolved); this file
decides shape alone. verify_data.py then proves the round trip in both directions.

    python3 build/build_data.py [<path to titterpig-dsl-tor2e/0.5>]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_dsl import parse_files  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CORPUS = os.path.expanduser("~/Sortilege/Titterpig/DSL/titterpig-dsl-tor2e/0.5")
FILE_PREFIX = "tor2e-0.5-"

# ───────────────────────── the prefix → book map ─────────────────────────
#
# `label` is this build's own short name for the book (declared as ours to the gate); each
# chapter's own title is its file's NAME, verbatim. Order: the core, then the sourcebooks in
# the order the corpus README lists them.
BOOKS = [
    {"id": "core", "label": "Core Rules", "prefix": "core"},
    {"id": "moria", "label": "Moria", "prefix": "moria"},
    {"id": "rivendell", "label": "Rivendell", "prefix": "rivendell"},
    {"id": "ruins", "label": "Ruins of the Lost Realm", "prefix": "ruins"},
    {"id": "tales", "label": "Tales from the Lone-lands", "prefix": "tales"},
    {"id": "peoples", "label": "Peoples of Wilderland", "prefix": "peoples"},
    {"id": "realms", "label": "Realms of the Three Rings", "prefix": "realms"},
    {"id": "strider", "label": "Strider Mode", "prefix": "strider"},
    {"id": "hands", "label": "Hands of the White Wizard", "prefix": "hands"},
]
# the actor directories, each a chapter of whichever book its files belong to (labels ours)
ACTOR_DIRS = [
    ("adversaries", "Adversaries"),
    ("loremaster-characters", "Loremaster characters"),
    ("patrons", "Patrons"),
]
BASE_FILE = FILE_PREFIX + "core-base.ttrpg"
KINDS = {"book", "ttrpg", "arc", "frame", "lore", "actors"}
DSL_EXTS = (".ttrpg", ".arc", ".frame", ".actor")
LORE_EXTS = (".lore",)

# ───────────────────────── records by type ─────────────────────────
# Scalar fields a record list shows without loading its book — keys only, as the BASE
# declares them. A type not listed here is still a record, with no fields.
RECORD_FIELDS = {
    "Adversary": ["Adversary Type", "Attribute Level", "Endurance", "Might", "Hate", "Resolve", "Parry", "Armour"],
    "Loremaster Character": ["Occupation", "Location"],
    "Patron": ["Occupation", "Fellowship Bonus"],
    "Heroic Culture": ["Standard of Living"],
    "Virtue": ["Culture"],
    "Distinctive Feature": ["Calling"],
    "Skill": ["Attribute", "Skill Group"],
    "Weapon": ["Damage", "Injury", "Load", "Proficiency"],
    "Armour": ["Protection", "Load", "Type"],
    "Shield": ["Parry Modifier", "Load"],
    "Undertaking": ["Yule Only"],
}

PAGE_RE = re.compile(r"#\s*source:[^\n]*?\(pages?\s+(\d+)")
LORE_PAGE_RE = re.compile(r"pages?\s+(\d+)")


# ───────────────────────── AST accessors ─────────────────────────

def kws(body, name):
    return [x for x in (body or []) if x.get("n") == "kw" and x["kw"] == name]


def kw1(body, name):
    got = kws(body, name)
    return got[0] if got else None


def kwstr(body, name):
    n = kw1(body, name)
    if not n:
        return None
    return next((a["v"] for a in n["args"] if a["k"] == "str"), None)


def kwlist(body, name):
    n = kw1(body, name)
    return (arg(n, "list") or []) if n else []


def arg(node, kind):
    return next((a["v"] for a in (node or {}).get("args", []) if a["k"] == kind), None)


def elem_ref(e):
    if e.get("k") == "ref":
        return {"hash": e["hash"], "name": e["v"]}
    if e.get("k") == "hash":
        return {"hash": e["v"], "name": None}
    if e.get("k") == "caret":
        return {"hash": None, "name": e["v"]}
    return None


def prop_nodes(body):
    """A DEF's properties: the PROPERTIES block's rows, plus any row written directly in
    the body (this corpus writes nearly all of its instances' rows there)."""
    out = [p for p in (body or []) if p.get("n") == "prop" and p.get("type") != "CHOICE"]
    for b in kws(body, "PROPERTIES"):
        out.extend(p for p in (b.get("body") or []) if p.get("n") == "prop")
    return out


def elem_value(e):
    if e.get("k") == "def":
        return {"vk": "def", "fields": [prop_value(p) for p in prop_nodes(e.get("body"))]}
    if e.get("k") in ("ref", "hash", "caret"):
        return dict(vk="ref", **elem_ref(e))
    return {"vk": "scalar", "value": e["v"]}


def prop_value(p):
    v = {"name": p["name"]}
    t = p.get("type")
    if t == "DEF":
        v["vk"] = "def"
        ext = kw1(p.get("body"), "EXTENDS")
        if ext:
            v["type"] = arg(ext, "caret")
            v["typeHash"] = arg(ext, "hash")
        v["fields"] = [prop_value(x) for x in prop_nodes(p.get("body"))]
        return v
    if t == "LIST":
        v["vk"] = "list"
        if p.get("of"):
            v["of"] = p["of"]
        if p.get("of_hash"):
            v["ofHash"] = p["of_hash"]
        v["items"] = [elem_value(e) for e in p.get("items", [])]
        return v
    if t == "ENUM":
        v["vk"] = "enum"
        if "options" in p:
            v["options"] = p["options"]
        if "value" in p:
            v["value"] = p["value"]
        return v
    if t == "REF":
        v["vk"] = "ref"
        v["ref"] = {"hash": p.get("hash"), "name": p.get("ref")}
        return v
    v["vk"] = "scalar"
    if t and t != "VALUE":
        v["type"] = t
    if "value" in p:
        v["value"] = p["value"]
    for m in ("min", "max", "required", "fixed", "default"):
        if m in p:
            v[m] = p[m]
    return v


# ───────────────────────── blocks ─────────────────────────

def refs_of(body):
    """§5c REFERENCES: `"label" -> #hash ^"Name"` lines, stand-off."""
    out = []
    for rb in kws(body, "REFERENCES"):
        for item in (rb.get("body") or []):
            if item.get("n") != "str":
                continue
            for a in item.get("args", []):
                if a["k"] == "ref":
                    out.append({"label": item["v"], "hash": a["hash"], "name": a["v"]})
    return out


def guidance_of(body):
    """§22 GUIDANCE: a sidebar, beside what it CONCERNS."""
    out = []
    for gb in kws(body, "GUIDANCE"):
        for e in kws(gb.get("body"), "ENTRY"):
            out.append({
                "name": arg(e, "caret"), "id": arg(e, "hash"),
                "concerns": [r for r in (elem_ref(x) for x in kwlist(e.get("body"), "CONCERNS")) if r],
                "topics": [x["v"] for x in kwlist(e.get("body"), "TOPICS") if x.get("k") == "str"],
                "text": kwstr(e.get("body"), "TEXT"),
            })
    return out


def choices_of(body):
    out = []
    for cb in kws(body, "CHOICES"):
        for p in (cb.get("body") or []):
            if p.get("n") == "prop" and p.get("type") == "CHOICE":
                out.append({"name": p["name"], "pick": p.get("pick"),
                            "items": [r for r in (elem_ref(e) for e in p.get("items", [])) if r]})
            elif p.get("n") == "str":
                out.append({"rubric": p["v"]})
    return out


def defs_block(body, keyword):
    """ENTRIES: a table's typed rows. A hashless row is carried as a def value; a hashed
    row is an entity of its own and listed here by id."""
    out = []
    for b in kws(body, keyword):
        for p in (b.get("body") or []):
            if p.get("n") == "prop" and p.get("type") == "DEF":
                out.append(prop_value(p))
            elif p.get("n") == "entity":
                out.append({"vk": "entity", "id": p["hash"], "name": p["name"]})
    return out


def table_of(body):
    """A printed table, cell for cell: COLUMNS then ROWs."""
    tb = kw1(body, "TABLE")
    if not tb:
        return None
    columns = [x["v"] for x in kwlist(tb.get("body"), "COLUMNS")]
    rows = [[x["v"] for x in (arg(r, "list") or [])] for r in kws(tb.get("body"), "ROW")]
    return {"columns": columns, "rows": rows}


def nested_ids(body):
    """Ids of the hashed entities written directly in a keyword block (a SCENE, a LOCATION)."""
    return [e["hash"] for e in (body or []) if e.get("n") == "entity"]


def entity_record(e, doc, book, parent_id=None, slot=None):
    body = e["body"]
    props = [prop_value(p) for p in prop_nodes(body)]
    ext = kw1(body, "EXTENDS")
    return {
        "id": e["hash"],
        "name": e["name"],
        "key": e["name"],
        "form": e.get("kind") or "DEF",
        "book": book,
        "file": doc["file"],
        "type": arg(ext, "caret") if ext else None,
        "typeHash": arg(ext, "hash") if ext else None,
        "parent": parent_id,
        "slot": slot,
        "children": [],
        "desc": kwstr(body, "DESCRIPTION"),
        "props": props,
        "entries": defs_block(body, "ENTRIES"),
        "table": table_of(body),
        "choices": choices_of(body),
        "enum": [x["v"] for x in kwlist(body, "ENUM") if x.get("k") == "str"] or None,
        "guidance": guidance_of(body),
        "refs": refs_of(body),
    }


def collect_entities(doc, book, out, body=None, parent=None, slot=None):
    """Every hashed entity anywhere in the tree, keyed by hash, with `parent` the nearest
    enclosing entity and `slot` the keyword block it sat in (ENTRIES, TERMS, SCENE …).
    Returns the file's ROOTS: its top-level entities only — an entity inside a SCENE or a
    LOCATION belongs to that block, which lists it (block_of)."""
    roots = []
    for e in (body if body is not None else doc["body"]):
        if e.get("n") == "entity":
            rec = entity_record(e, doc, book, parent["id"] if parent else None, slot)
            if rec["id"] in out:
                raise SystemExit("duplicate entity hash %s (%s and %s)" % (rec["id"], out[rec["id"]]["file"], doc["file"]))
            out[rec["id"]] = rec
            if parent:
                parent["children"].append(rec["id"])
            elif slot is None:
                roots.append(rec["id"])
            collect_entities(doc, book, out, e["body"], rec, None)
        elif e.get("n") == "kw" and e.get("body"):
            collect_entities(doc, book, out, e["body"], parent, e["kw"])
    return roots


def block_of(node):
    """A keyword block that is not an entity — a SCENE, a LOCATION, a frame's ENTRY, a
    PHASE — as the book prints it: its name, its own id if it has one, TYPE, DESCRIPTION,
    its properties, a table or rows printed inside it, its sidebars, and the ids of the
    entities written inside it."""
    body = node.get("body") or []
    out = {"kw": node["kw"], "name": arg(node, "caret"), "id": arg(node, "hash"),
           "type": kwstr(body, "TYPE"), "desc": kwstr(body, "DESCRIPTION"),
           "props": [prop_value(p) for p in prop_nodes(body)],
           "entries": defs_block(body, "ENTRIES"), "table": table_of(body),
           "guidance": guidance_of(body), "refs": refs_of(body), "entities": nested_ids(body)}
    if node["kw"] == "PHASE":
        out["scenes"] = [arg(n, "hash") for n in kws(body, "SCENE_REF")]
    return out


def cast_of(body):
    """CAST { FROM "<module>" INCLUDE [ ^"Name" … ] } — who an arc names, by name."""
    out = []
    for cb in kws(body, "CAST"):
        for f in kws(cb.get("body"), "FROM"):
            out.append({"from": arg(f, "str"),
                        "include": [r for r in (elem_ref(x) for x in (arg(f, "list") or [])) if r]})
    return out


def chapter_body(doc):
    """What a chapter file holds outside its entities: its own DESCRIPTION, properties and
    sidebars (an .arc and a .frame write them at the top level), and — for an .arc or a
    .frame — its blocks in document order."""
    body = doc["body"]
    out = {"desc": kwstr(body, "DESCRIPTION"),
           "dependsOn": [a["v"] for n in kws(body, "DEPENDS_ON") for a in n["args"] if a["k"] == "str"],
           "props": [prop_value(p) for p in prop_nodes(body)],
           "guidance": guidance_of(body)}
    if doc["ext"] not in ("arc", "frame"):
        return out
    # the document order an adventure is read in: its properties, LOCATIONs, SCENEs and the
    # entities written between them, interleaved as printed
    seq, locations, scenes, entries = [], [], [], []
    for n in body:
        if n.get("n") == "prop":
            seq.append({"t": "prop", "name": n["name"]})
        elif n.get("n") == "entity":
            seq.append({"t": "entity", "id": n["hash"]})
        elif n.get("n") == "kw" and n["kw"] == "LOCATION":
            seq.append({"t": "location", "i": len(locations)})
            locations.append(block_of(n))
        elif n.get("n") == "kw" and n["kw"] == "SCENE":
            seq.append({"t": "scene", "id": arg(n, "hash")})
            scenes.append(block_of(n))
        elif n.get("n") == "kw" and n["kw"] == "ENTRY":
            seq.append({"t": "entry", "i": len(entries)})
            entries.append(block_of(n))
    phases = [block_of(p) for fl in kws(body, "FLOW") for p in kws(fl.get("body"), "PHASE")]
    out.update({"seq": seq, "locations": locations, "scenes": scenes, "entries": entries,
                "phases": phases, "cast": cast_of(body)})
    return out


# ───────────────────────── files ─────────────────────────

BANNER = ("/* Generated by build/build_data.py from titterpig-dsl-tor2e/0.5 — do not edit by hand.\n"
          "   Every string is verbatim from the DSL corpus; regenerate rather than patch. */\n")

REGISTER = """(function(){var d=%s;var T=window.TOR2E=window.TOR2E||{books:{},entities:{},loaded:{}};
T.loaded[d.src]=true;T.books[d.book.id]=d.book;
for(var h in d.entities){T.entities[h]=d.entities[h];}})();
"""


def corpus_files(corpus):
    out = set()
    for root, _dirs, files in os.walk(corpus):
        for fn in files:
            if fn.endswith(DSL_EXTS + LORE_EXTS):
                out.add(os.path.relpath(os.path.join(root, fn), corpus))
    return out


def book_of(rel):
    """The book a file belongs to: its basename's prefix."""
    fn = os.path.basename(rel)
    if not fn.startswith(FILE_PREFIX):
        return None
    stem = fn[len(FILE_PREFIX):]
    return next((b["id"] for b in BOOKS if stem.startswith(b["prefix"] + "-")), None)


def claimed_files(corpus):
    """file → book; raises if any corpus file is claimed by no book, or a book by no file."""
    on_disk = corpus_files(corpus)
    for b in BOOKS:
        b["_files"] = []
    unclaimed = []
    for rel in sorted(on_disk):
        bid = book_of(rel)
        d = os.path.dirname(rel)
        if not bid or (d and d not in dict(ACTOR_DIRS)):
            unclaimed.append(rel)
            continue
        next(b for b in BOOKS if b["id"] == bid)["_files"].append(rel)
    empty = [b["id"] for b in BOOKS if not b["_files"]]
    if unclaimed or empty:
        raise SystemExit("build_data: the prefix → book map is out of step with the corpus.\n"
                         "  in the corpus, claimed by no book: %s\n"
                         "  books with no file: %s" % (unclaimed or "none", empty or "none"))
    return on_disk


def first_page(path, lore):
    head = open(path, encoding="utf-8").read(4000)
    m = (LORE_PAGE_RE if lore else PAGE_RE).search(head)
    return int(m.group(1)) if m else None


def lore_chapter(path, rel):
    text = open(path, encoding="utf-8").read()
    title = next((ln for ln in text.split("\n") if ln.startswith("# ")), rel)   # the H1 line as written
    return {"file": rel, "kind": "lore", "name": title, "page": first_page(path, True), "text": text}


def scalar(e, name):
    p = next((x for x in e["props"] if x["name"] == name), None)
    return p.get("value") if p and p.get("vk") in ("scalar", "enum") else None


def base_types(entities):
    """The BASE's declared types (a top-level DEF of the BASE file) and its ACTORs."""
    return {e["name"] for e in entities.values() if e["file"] == BASE_FILE and not e["parent"]}


def records_of(entities, order, types):
    out = []
    for h in order:
        e = entities[h]
        if e["file"] == BASE_FILE or e["type"] not in types:
            continue
        rec = {"id": h, "name": e["name"], "book": e["book"], "type": e["type"],
               "under": entities[e["parent"]]["name"] if e["parent"] else None}
        if e["file"].endswith(".actor"):
            rec["dir"] = os.path.dirname(e["file"])
        fields = {}
        for f in RECORD_FIELDS.get(e["type"], []):
            v = scalar(e, f)
            if v is not None:
                fields[f] = v
        if fields:
            rec["fields"] = fields
        out.append(rec)
    return out


# ───────────────────────── emit ─────────────────────────

def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    data_dir = os.path.join(HERE, "data")
    os.makedirs(data_dir, exist_ok=True)
    on_disk = claimed_files(corpus)

    for fn in sorted(os.listdir(data_dir)):
        if fn.endswith(".js"):
            os.remove(os.path.join(data_dir, fn))

    entities = {}
    order = []                       # every entity id in book / chapter / document order
    books_out = []
    for b in BOOKS:
        chapters, groups = [], {}
        for rel in b["_files"]:
            path = os.path.join(corpus, rel)
            d = os.path.dirname(rel)
            if d:
                groups.setdefault(d, []).append(rel)
            elif rel.endswith(LORE_EXTS):
                chapters.append(lore_chapter(path, rel))
            else:
                chapters.append({"file": rel, "kind": os.path.splitext(rel)[1][1:],
                                 "page": first_page(path, False), "_path": path})
        # printed order; a chapter with no printed page (the BASE) comes first
        chapters.sort(key=lambda c: (c["page"] is not None, c["page"] or 0, c["file"]))
        for d, label in ACTOR_DIRS:
            if d in groups:
                chapters.append({"file": d + "/", "kind": "actors", "name": label, "page": None,
                                 "_paths": [os.path.join(corpus, r) for r in sorted(groups[d])]})
        roots = []
        for c in chapters:
            if c["kind"] == "lore":
                continue
            docs = parse_files(c.pop("_paths") if "_paths" in c else [c.pop("_path")])
            c["roots"] = []
            for doc in docs:
                doc["file"] = os.path.relpath(doc["path"], corpus)   # the actors keep their directory
                before = set(entities)
                c["roots"].extend(collect_entities(doc, b["id"], entities))
                order.extend(h for h in entities if h not in before)
                if c["kind"] != "actors":
                    c["container"] = doc["container"]
                    c["cid"] = doc["name"]
                    c["name"] = kwstr(doc["body"], "NAME")
                    c.update(chapter_body(doc))
            roots.extend(c["roots"])
        books_out.append((b, chapters, roots))

    types = base_types(entities)
    records = records_of(entities, order, types)

    index_books = []
    total = 0
    for b, chapters, roots in books_out:
        arcs = [c["cid"] for c in chapters if c["kind"] == "arc"]
        rec = {"id": b["id"], "label": b["label"], "kind": "book", "chapters": chapters, "entities": roots}
        mine = {h: e for h, e in entities.items() if e["book"] == b["id"]}
        payload = {"src": "data/%s.js" % b["id"], "book": rec, "entities": mine}
        with open(os.path.join(data_dir, "%s.js" % b["id"]), "w", encoding="utf-8") as fh:
            fh.write(BANNER)
            fh.write(REGISTER % json.dumps(payload, ensure_ascii=False, sort_keys=True))
        total += len(mine)
        counts = {"entities": len(mine), "chapters": len(chapters), "arcs": len(arcs),
                  "scenes": sum(len(c.get("scenes") or []) for c in chapters),
                  "records": sum(1 for r in records if r["book"] == b["id"])}
        index_books.append({
            "id": b["id"], "label": b["label"], "kind": "book",
            "files": {"main": ["data/%s.js" % b["id"]]},
            "chapters": [{"file": c["file"], "kind": c["kind"], "name": c.get("name"), "page": c["page"],
                          "cid": c.get("cid")} for c in chapters],
            "counts": counts,
            "bytes": os.path.getsize(os.path.join(data_dir, "%s.js" % b["id"])),
        })

    by_type = {}
    for r in records:
        by_type[r["type"]] = by_type.get(r["type"], 0) + 1
    index = {"system": "tor2e", "books": index_books, "types": sorted(types),
             "counts": {"books": len(index_books), "entities": total, "files": len(on_disk), "records": by_type}}
    with open(os.path.join(data_dir, "index.js"), "w", encoding="utf-8") as fh:
        fh.write(BANNER)
        fh.write("(function(){var T=window.TOR2E=window.TOR2E||{books:{},entities:{},loaded:{}};"
                 "T.index=%s;})();\n" % json.dumps(index, ensure_ascii=False, sort_keys=True))
    with open(os.path.join(data_dir, "records.js"), "w", encoding="utf-8") as fh:
        fh.write(BANNER)
        fh.write("(function(){var T=window.TOR2E=window.TOR2E||{books:{},entities:{},loaded:{}};"
                 "T.records=%s;})();\n" % json.dumps(records, ensure_ascii=False, sort_keys=True))

    print("build_data: %d corpus files → %d books, %d entities, %d records (%s)"
          % (len(on_disk), len(index_books), total, len(records),
             ", ".join("%s %d" % (k, by_type[k]) for k in sorted(by_type))))
    for x in index_books:
        c = x["counts"]
        print("  %-10s %3d ch %5d ent %4d rec %2d arcs %3d scenes %5d KB"
              % (x["id"], c["chapters"], c["entities"], c["records"], c["arcs"], c["scenes"], x["bytes"] // 1024))


if __name__ == "__main__":
    main()
