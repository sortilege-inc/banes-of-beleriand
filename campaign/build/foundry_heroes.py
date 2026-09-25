#!/usr/bin/env python3
"""
foundry_heroes.py — the Company's Foundry exports (campaign/source/foundry/fvtt-Actor-*.json) →
the VTT's character files (campaign/pack/company/<slug>.tor2e-hero.json).

The exports are the five heroes as the Foundry world had them on 14 May 2025, the campaign's
start (PLAN.md O3). Foundry is a working copy and the corpus is canon: every published thing on
the sheet — culture, calling, Distinctive Features, Virtues, Rewards, war gear, armour — is
resolved against the books (data/records.js) and written with the corpus's spelling and hash.
Endurance, Hope and Parry are derived from the culture's Derived Stats in the corpus, not copied.
What the corpus does not name is kept by name (no hash) and listed; what is not a sheet field at
all (a note typed into an item) is listed for the Company page. Nothing is dropped silently:
every item and trait of every export is accounted for in the report, and the run fails (exit 1)
if one is not.

    python3 campaign/build/foundry_heroes.py
"""
import glob
import json
import os
import re
import sys
import unicodedata

CAMPAIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(CAMPAIGN)
SRC = os.path.join(CAMPAIGN, "source", "foundry")
OUT = os.path.join(CAMPAIGN, "pack", "company")
FILE_KIND = "sortilege-vtt-character"
TEMPLATE = "#tor5PlayerHero00001"
EXPORTED = "2025-05-14T00:00:00.000Z"   # the Foundry world's last change to these actors

# The names the Notion wiki gives the heroes (its spellings are the most correct — PLAN.md O3).
NAMES = {"Marigold": "Marigold Cotton"}

# Foundry's spelling → the corpus's, where normalising case and typography is not enough.
ALIAS = {
    "hobbit of the shire": "Hobbits of the Shire",
    "grievious": "Grievous",
}
# Traits Foundry files as Distinctive Features that are the culture's Cultural Blessing (a field
# of its own on the sheet), and Foundry flaws that are the Shadow Path's four stages listed in
# order ("1 - Spiteful" … "4 - Murderous"), not flaws the hero has taken.
STAGE = re.compile(r"^\d+\s*-\s*")
# Items Foundry keeps as "miscellaneous" that are not gear: notes typed into the item list.
NOT_GEAR = {"grieving her husband", "no longer free from fear", "slender/nimble"}


def norm(s):
    s = unicodedata.normalize("NFKC", s or "").replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", s).strip().lower()


def load_records():
    text = open(os.path.join(ROOT, "data", "records.js"), encoding="utf-8").read()
    m = re.search(r"T\.records=(\[.*\]);", text, re.S)
    return json.loads(m.group(1))


_BOOKS = {}


def load_entity(eid, book):
    if book not in _BOOKS:
        text = open(os.path.join(ROOT, "data", book + ".js"), encoding="utf-8").read()
        m = re.search(r"var d=(\{.*\});var T=window\.TOR2E", text, re.S)
        _BOOKS[book] = json.loads(m.group(1)).get("entities") or {}
    return _BOOKS[book][eid]


RECORDS = load_records()


def find(type_, name, prefer=None):
    """The record of `type_` named `name` (normalised, or by ALIAS); `prefer(r)` breaks ties."""
    want = norm(ALIAS.get(norm(name), name))
    hits = [r for r in RECORDS if r["type"] == type_ and norm(r["name"]) == want]
    if prefer and len(hits) > 1:
        hits = sorted(hits, key=lambda r: 0 if prefer(r) else 1)
    return hits[0] if hits else None


def untyped(name):
    """An entity of the core named `name` that the records do not list — a fallback for a corpus
    that has left something untyped (the core's *Hardiness* was, until corpus d40463a)."""
    if "core" not in _BOOKS:
        try:
            load_entity("", "core")
        except KeyError:
            pass
    hits = [e for e in _BOOKS["core"].values() if norm(e.get("name")) == norm(name)]
    return hits[0] if len(hits) == 1 else None


def ref(r):
    return {"hash": r["id"], "name": r["name"]}


def bare(name):
    """'Short sword (Grievous)' → 'Short sword'; '(Fell) Bow' → 'Bow'; 'Spear (1h)' → 'Spear'."""
    return re.sub(r"\s*\([^)]*\)\s*", " ", name).strip()


def derived(culture, attrs):
    e = load_entity(culture["id"], culture["book"])
    ds = next(p for p in e["props"] if p["name"] == "Derived Stats")
    out = {}
    for f in ds["fields"]:
        a = next(x["value"] for x in f["fields"] if x["name"] == "Attribute")
        b = next(x["value"] for x in f["fields"] if x["name"] == "Bonus")
        out[f["name"]] = b + attrs[a]
    return out


def blessing(culture):
    e = load_entity(culture["id"], culture["book"])
    cb = next((p for p in e["props"] if p["name"] == "Cultural Blessing"), None)
    return next((x["value"] for x in cb["fields"] if x["name"] == "Name"), None) if cb else None


def shadow_path(calling):
    e = load_entity(calling["id"], calling["book"])
    return next((p["value"] for p in e["props"] if p["name"] == "Shadow Path"), None)


def convert(path, report):
    d = json.load(open(path, encoding="utf-8"))
    s = d["system"]
    b = s["biography"]
    v = lambda o: o["value"] if isinstance(o, dict) else o
    name = NAMES.get(d["name"], d["name"])
    log = report.setdefault(name, {"resolved": [], "kept by name": [], "not on the sheet": [], "skipped": []})

    culture = find("Heroic Culture", v(b["culture"]))
    calling = find("Calling", v(b["calling"]))
    if not culture or not calling:
        raise SystemExit("%s: culture %r / calling %r not in the corpus" % (path, v(b["culture"]), v(b["calling"])))
    log["resolved"] += ["culture %s → %s" % (v(b["culture"]), culture["name"]), "calling %s → %s" % (v(b["calling"]), calling["name"])]
    attrs = {k.capitalize(): v(x) for k, x in s["attributes"].items()}
    der = derived(culture, attrs)
    fv = {"Endurance": s["resources"]["endurance"]["max"], "Hope": s["resources"]["hope"]["max"], "Parry": v(s["combatAttributes"]["parry"])}
    for k in der:
        if der[k] != fv[k]:
            log["resolved"].append("%s %s (Foundry) → %s (the culture's Derived Stats)" % (k, fv[k], der[k]))

    cb = blessing(culture)
    if norm(v(b["culturalBlessing"])) != norm(cb):
        raise SystemExit("%s: Cultural Blessing %r is not %s's %r" % (path, v(b["culturalBlessing"]), culture["name"], cb))
    sp = shadow_path(calling)
    if norm(v(b["shadowPath"])) != norm(sp):
        raise SystemExit("%s: Shadow Path %r is not the %s's %r" % (path, v(b["shadowPath"]), calling["name"], sp))

    ch = {
        "Name": name,
        "Heroic Culture": ref(culture),
        "Age": v(b["age"]),
        "Standard of Living": v(b["standardOfLiving"]).capitalize() or None,
        "Treasure": v(s["treasure"]),
        "Distinctive Features": [],
        "Cultural Blessing": cb,
        "Patron": "",
        "Calling": ref(calling),
        "Shadow Path": sp,
        "Flaws": [],
        "Strength": attrs["Strength"], "Heart": attrs["Heart"], "Wits": attrs["Wits"],
        "Endurance": der["Endurance"], "Hope": der["Hope"], "Parry": der["Parry"],
        "Adventure Points": v(s["adventurePoints"]), "Skill Points": v(s["skillPoints"]),
        "Fellowship Score": v(s["fellowship"]),
        "Skills": [], "Combat Proficiencies": [],
        "Valour": v(s["stature"]["valour"]), "Wisdom": v(s["stature"]["wisdom"]),
        "Rewards": [], "Virtues": [], "Travelling Gear": "",
        "War Gear": [], "Armour": None, "Helm": None, "Shield": None,
    }
    for k, x in s["commonSkills"].items():
        r = find("Skill", k)
        ch["Skills"].append({"Skill": r["name"], "Rank": v(x), "Favoured": bool(v(x["favoured"]))})
    for k, x in s["combatProficiencies"].items():
        r = find("Combat Proficiency", k)
        ch["Combat Proficiencies"].append({"Skill": r["name"], "Rank": v(x)})

    notes, gear = [], []
    for it in d["items"]:
        t, n, sy = it["type"], it["name"], it["system"]
        grp = v(sy.get("group")) if sy.get("group") is not None else None
        if t == "skill":
            log["skipped"].append("skill item %r (a stray duplicate of the sheet's own %s rank)" % (n, n))
        elif t == "trait" and grp == "distinctiveFeature":
            base, _, note = n.partition(":")
            if norm(base) == norm(cb):
                log["skipped"].append("feature %r (the Cultural Blessing, its own field)" % n)
                continue
            r = find("Distinctive Feature", base)
            if not r:
                raise SystemExit("%s: Distinctive Feature %r not in the corpus" % (path, n))
            ch["Distinctive Features"].append(ref(r))
            log["resolved"].append("feature %s → %s" % (n, r["name"]))
            if note.strip():
                notes.append("%s: %s" % (r["name"], note.strip()))
        elif t == "trait" and grp == "flaw":
            if STAGE.match(n):
                log["skipped"].append("flaw %r (a stage of the Shadow Path, listed, not taken)" % n)
            else:
                ch["Flaws"].append(n)
                log["kept by name"].append("flaw %r" % n)
        elif t == "virtues":
            r = find("Virtue", n, prefer=lambda r: (r.get("fields") or {}).get("Culture") in (culture["name"],))
            if r:
                ch["Virtues"].append(ref(r))
                log["resolved"].append("virtue %s → %s (%s)" % (n, r["name"], r["book"]))
            else:
                e = untyped(n)
                if not e:
                    raise SystemExit("%s: Virtue %r is nowhere in the corpus" % (path, n))
                ch["Virtues"].append({"hash": e["id"], "name": e["name"]})
                log["resolved"].append("virtue %s → %s (%s, an entity the corpus does not type Virtue)" % (n, e["name"], e["file"]))
        elif t == "reward":
            base, _, on = n.partition("(")
            r = find("Reward", base.strip())
            if not r:
                raise SystemExit("%s: Reward %r not in the corpus" % (path, n))
            ch["Rewards"].append(ref(r))
            log["resolved"].append("reward %s → %s" % (n, r["name"]))
            if on:
                notes.append("%s: on the %s" % (r["name"], on.rstrip(")").strip()))
        elif t == "weapon":
            r = find("Weapon", bare(n))
            if not r:
                raise SystemExit("%s: Weapon %r not in the corpus" % (path, n))
            if not any(w["hash"] == r["id"] for w in ch["War Gear"]):
                ch["War Gear"].append(ref(r))
                log["resolved"].append("weapon %s → %s" % (n, r["name"]))
            else:
                log["skipped"].append("weapon %r (the same %s, held the other way)" % (n, r["name"]))
        elif t == "armour":
            if grp == "shield":
                r = find("Shield", bare(n))
                slot = "Shield"
            else:
                r = find("Armour", bare(n))
                slot = "Helm" if grp == "head" else "Armour"
            if not r:
                raise SystemExit("%s: %s %r not in the corpus" % (path, grp, n))
            ch[slot] = ref(r)
            log["resolved"].append("%s %s → %s" % (slot.lower(), n, r["name"]))
        elif t == "miscellaneous":
            if norm(n) in NOT_GEAR:
                log["not on the sheet"].append(n)
            else:
                gear.append(n)
        else:
            raise SystemExit("%s: an item of type %r (%r) this converter does not place" % (path, t, n))
    ch["Travelling Gear"] = ", ".join(gear)
    if gear:
        log["kept by name"].append("travelling gear: " + ", ".join(gear))
    for n in notes:
        log["not on the sheet"].append(n)
    background = re.sub(r"<[^>]+>", "\n", v(s["history"]["background"]) or "").strip()
    if background:
        log["not on the sheet"].append("background: " + re.sub(r"\s+", " ", background))

    ascii_ = unicodedata.normalize("NFKD", norm(name)).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-")
    out = {"kind": FILE_KIND, "version": 1, "system": "tor2e", "templateId": TEMPLATE, "exported": EXPORTED, "name": name, "character": ch}
    return slug, out


def main():
    report = {}
    os.makedirs(OUT, exist_ok=True)
    paths = sorted(glob.glob(os.path.join(SRC, "fvtt-Actor-*.json")))
    if not paths:
        sys.exit("foundry_heroes: no exports in " + SRC)
    for p in paths:
        slug, out = convert(p, report)
        dest = os.path.join(OUT, slug + ".tor2e-hero.json")
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("foundry_heroes: %s → %s" % (os.path.basename(p), os.path.relpath(dest, CAMPAIGN)))
    for name, log in report.items():
        print("\n== " + name)
        for k, xs in log.items():
            for x in xs:
                print("  %-17s %s" % (k, x))
    print("\nfoundry_heroes: OK — %d heroes" % len(paths))


if __name__ == "__main__":
    main()
