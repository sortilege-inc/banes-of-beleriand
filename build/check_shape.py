#!/usr/bin/env python3
"""
check_shape.py — the fields the site reads, asserted against counts taken from the corpus by
an independent line scanner (regular expressions over the raw files — no code shared with the
parser). verify_data.py proves every string round-trips; it compares distinct strings, so a
dropped block whose text also appears elsewhere would pass it. This gate counts the blocks.

    python3 build/check_shape.py [<path to titterpig-dsl-tor2e/0.5>]
"""
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_data import BOOKS, DEFAULT_CORPUS, corpus_files  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARET = r'\^"(?:[^"\\]|\\.)*"'
ENTITY_RE = re.compile(r'^\s*#(\w{15,})\s+(?:' + CARET + r'|ACTOR\s+"[^"]*")\s+DEF\s*\{', re.M)
EXTENDS_RE = re.compile(r'EXTENDS\s+#\w+\s+\^"((?:[^"\\]|\\.)*)"')
BLOCK_RE = {k: re.compile(r'^\s*' + k + r'\s+\^"', re.M) for k in ("SCENE", "LOCATION", "PHASE")}
SCENE_REF_RE = re.compile(r'^\s*SCENE_REF\s+#\w+', re.M)
TABLE_RE = re.compile(r'^\s*TABLE\s*\{', re.M)
ROW_RE = re.compile(r'^\s*ROW\s*\[', re.M)
GUIDANCE_ENTRY_RE = re.compile(r'^\s*ENTRY\s+\^"', re.M)
FRAME_ENTRY_RE = re.compile(r'^    ENTRY\s+\^"', re.M)       # a frame's own beats sit at depth one


def load(fn, pat):
    src = open(os.path.join(HERE, "data", fn), encoding="utf-8").read()
    return json.loads(re.search(pat, src, re.S).group(1))


def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    files = sorted(corpus_files(corpus))
    raw = {f: open(os.path.join(corpus, f), encoding="utf-8").read() for f in files}
    dsl = {f: t for f, t in raw.items() if not f.endswith(".lore")}

    books = {b["id"]: load(b["id"] + ".js", r"var d=(\{.*?\});var T=window\.TOR2E") for b in BOOKS}
    index = load("index.js", r"T\.index=(\{.*\});\}\)\(\);")
    records = load("records.js", r"T\.records=(\[.*\]);\}\)\(\);")
    entities = {}
    for p in books.values():
        entities.update(p["entities"])
    chapters = [c for p in books.values() for c in p["book"]["chapters"]]

    failures = []
    n = [0]

    def check(label, got, want):
        n[0] += 1
        if got != want:
            failures.append("%s: data %r, corpus %r" % (label, got, want))

    # every hashed entity, by the scanner's count, and per book
    scanned = {}
    for f, t in dsl.items():
        for h in ENTITY_RE.findall(t):
            scanned["#" + h] = f
    check("entities (all)", len(entities), len(scanned))
    check("entity ids", set(entities), set(scanned))
    for b in BOOKS:
        want = sum(1 for h, f in scanned.items() if os.path.basename(f).startswith("tor2e-0.5-" + b["prefix"] + "-"))
        check("entities in %s" % b["id"], len(books[b["id"]]["entities"]), want)
    check("entities carry their file", sum(1 for h, e in entities.items() if e["file"] == scanned.get(h)), len(scanned))

    # records by type = EXTENDS counts of every BASE type (outside the BASE)
    types = set(index["types"])
    ext = Counter(m for f, t in dsl.items() if not f.endswith("core-base.ttrpg") for m in EXTENDS_RE.findall(t))
    got = Counter(r["type"] for r in records)
    for ty in sorted(types):
        if ext[ty]:
            check("records of type %s" % ty, got[ty], ext[ty])
    check("record types are BASE types", set(got) - types, set())
    check("the BASE declares the Player-hero", "Player-hero" in types, True)

    # every .actor file is one record of an ACTOR type, in the chapter of its directory
    actor_files = [f for f in dsl if f.endswith(".actor")]
    actor_recs = [r for r in records if r.get("dir")]
    check("actor files → records", len(actor_recs), len(actor_files))
    check("actor records by directory", Counter(r["dir"] for r in actor_recs), Counter(os.path.dirname(f) for f in actor_files))
    check("actor chapters hold every actor", sum(len(c["roots"]) for c in chapters if c["kind"] == "actors"), len(actor_files))

    # adventures: SCENE, LOCATION, PHASE blocks and SCENE_REFs
    arcs = [c for c in chapters if c["kind"] == "arc"]
    frames = [c for c in chapters if c["kind"] == "frame"]
    check("arcs", len(arcs), sum(1 for f in dsl if f.endswith(".arc")))
    check("frames", len(frames), sum(1 for f in dsl if f.endswith(".frame")))
    for kw, key in (("SCENE", "scenes"), ("LOCATION", "locations"), ("PHASE", "phases")):
        want = sum(len(BLOCK_RE[kw].findall(t)) for f, t in dsl.items() if f.endswith(".arc"))
        check("arc %s blocks" % kw, sum(len(c[key]) for c in arcs), want)
    check("SCENE_REFs", sum(len(p["scenes"]) for c in arcs for p in c["phases"]),
          sum(len(SCENE_REF_RE.findall(t)) for t in dsl.values()))
    scene_ids = {s["id"] for c in arcs for s in c["scenes"]}
    check("every SCENE_REF names a scene of its arc",
          [r for c in arcs for p in c["phases"] for r in p["scenes"] if r not in {s["id"] for s in c["scenes"]}], [])
    check("scene ids unique", len(scene_ids), sum(len(c["scenes"]) for c in arcs))
    check("frame beats", sum(len(c["entries"]) for c in frames),
          sum(len(FRAME_ENTRY_RE.findall(t)) for f, t in dsl.items() if f.endswith(".frame")))
    check("arc document order lists every block", sum(len(c["seq"]) for c in arcs),
          sum(len(c["props"]) + len(c["locations"]) + len(c["scenes"]) + len(c["roots"]) for c in arcs))

    # the index lists every arc's scenes, once each, in reading order
    ix_scenes = {c["cid"]: c.get("scenes") for b in index["books"] for c in b["chapters"] if c["kind"] == "arc"}
    for c in arcs:
        got_ids = [s["id"] for s in ix_scenes.get(c["cid"]) or []]
        check("index scenes of %s" % c["cid"], sorted(got_ids), sorted(s["id"] for s in c["scenes"]))

    # tables, cell for cell
    tables = [e["table"] for e in entities.values() if e["table"]]
    tables += [b["table"] for c in arcs for b in c["scenes"] + c["locations"] if b["table"]]
    check("TABLE blocks", len(tables), sum(len(TABLE_RE.findall(t)) for t in dsl.values()))
    check("TABLE rows", sum(len(t["rows"]) for t in tables), sum(len(ROW_RE.findall(t)) for t in dsl.values()))
    check("rows as wide as their columns", [t["columns"] for t in tables if any(len(r) != len(t["columns"]) for r in t["rows"])], [])

    # sidebars
    guidance = sum(len(e["guidance"]) for e in entities.values())
    guidance += sum(len(c.get("guidance") or []) for c in chapters)
    guidance += sum(len(b["guidance"]) for c in arcs + frames for b in c["scenes"] + c["locations"] + c["entries"])
    all_entries = sum(len(GUIDANCE_ENTRY_RE.findall(t)) for t in dsl.values())
    check("GUIDANCE entries", guidance, all_entries - sum(len(c["entries"]) for c in frames))

    # the lore, whole
    for c in chapters:
        if c["kind"] == "lore":
            check("lore %s verbatim" % c["file"], c["text"], raw[c["file"]])

    # every file in exactly one chapter
    in_chapters = Counter()
    for c in chapters:
        if c["kind"] == "actors":
            in_chapters.update(entities[h]["file"] for h in c["roots"])
        else:
            in_chapters[c["file"]] += 1
    check("every corpus file in one chapter", sorted(in_chapters), files)
    check("no file twice", [f for f, k in in_chapters.items() if k > 1 and not f.endswith(".actor")], [])

    # the rules the dice and the sheet cite (RULES in system/tor2e/dice.js, sheet.js) are core
    # entities under those names; every entity id the creator names is a core entity
    for fn in ("dice.js", "sheet.js"):
        src = open(os.path.join(HERE, "system", "tor2e", fn), encoding="utf-8").read()
        cited = re.findall(r"\{ id: '(#\w+)', name: '([^']+)' \}", src)
        check("%s cites rules" % fn, len(cited) > 0, True)
        for h, name in cited:
            e = entities.get(h)
            check("%s rule %s" % (fn, name), (e or {}).get("name"), name)
            check("%s rule %s is in the core" % (fn, name), (e or {}).get("book"), "core")
    src = open(os.path.join(HERE, "system", "tor2e", "creator.js"), encoding="utf-8").read()
    ids = re.findall(r"= '(#t\w+)';", src)
    check("creator.js names entities", len(ids) >= 8, True)
    for h in ids:
        check("creator.js entity %s is in the core" % h, (entities.get(h) or {}).get("book"), "core")

    if failures:
        print("check_shape: %d of %d assertions FAILED" % (len(failures), n[0]))
        for f in failures:
            print("  " + f[:300])
        return 1
    print("check_shape: OK (%d assertions)" % n[0])
    return 0


if __name__ == "__main__":
    sys.exit(main())
