#!/usr/bin/env python3
"""
seed_source.py — the Loremaster's material → campaign/pack/seed.json, the pack the GM page seeds
from (engine/state.js seed; engine/config.js defaultCampaign.seed).

The GM's own notes (the Notion export: the campaign overview, the four Nameless Things, Barad
Tarminalë, the bear song, the notes for the Mirkwood Elf) and what the table has established
(campaign/docs/chronicle/) are set down here as sections the GM tabs edit. Tags: [YOURS] is the
Loremaster's own prep, [SET] what happened at the table, [OPEN] what neither has decided, [NOTE]
context. This is public (PLAN.md O3: "seed from the repo").

The seed fills only what a campaign has never had: once the GM edits a section in the tabs, the
tabs' copy is the campaign's, and rerunning this changes nothing for them.

    python3 campaign/build/seed_source.py
"""
import json
import os

CAMPAIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(CAMPAIGN, "pack", "seed.json")
ART = "campaign/pack/art/"


def sec(id_, title, text, sections=None, about=None, **extra):
    d = {"id": id_, "title": title, "text": text.strip()}
    if sections:
        d["sections"] = sections
    if about:
        d["about"] = about
    d.update(extra)
    return d


overview = [
    sec("bb-premise", "The premise", """
[YOURS] Set in the seventy years between *The Hobbit* and *The Lord of the Rings*; the tale begins in the spring of 2965. The story centres on ancient threats that **Morgoth** established in the First Age — eldritch horrors and terrible monsters — sealed away in hidden places. The protections on those places are beginning to fail.

- Morgoth prepared hidden sites, each imprisoning a powerful entity.
- The Company investigates failing seals, repairs the protections, and contains the threats.
- The first threats are lethal if faced directly: clever solutions, and partial containment.
- A possible long-term goal: the Company learns Morgoth's strategy, why these sites exist, and how to seal or neutralise them for good.

[SET] Círdan's charge (end of summer 2965) is the campaign's shape as the table has it: the Banes ought in the end to be destroyed; until then, make each **safe for every generation** — a law, a rite, a religion, a story — so long as it is never broken. The peoples bound to each place should find allies and keep in touch, so that they can gather if one falters.
"""),
    sec("bb-anti-valar", "The Banes as measures against the Valar", """
[YOURS] Each Bane may be a countermeasure Morgoth designed against one of the Valar, disrupting their domain:

- **Ulmo** (water): a sea-borne corruption — an oceanic Bane.
- **Aulë** (smithing): a rust-monster, or an artifact that corrodes craft.
- **Manwë** (wind, vision): regions of distorted weather — no wind, perpetual dark or fog.
- **Yavanna** (nature): blight or plague.
- **Irmo** (dreams): nightmare-bearing artifacts or beings.
- **Mandos** (death, fate): corrupted resurrection, or endless Orc-making.
- **Tulkas** (strength, battle): weaponised, unbeatable physical threats — Balrogs, dragons.
"""),
    sec("bb-drift", "Theological drift weakens the seal", """
[YOURS] A community — Elves, Dwarves or Men — has performed sacred rites for generations (offerings, vigil-songs, cycles of purification) without knowing what they really guard. Over time a new movement urges reform: *the old ways are superstition; we must purify the faith.* The rites stop, the site is desecrated or repurposed, and the last seal begins to crack. The reformers may be sincere and misguided, or corrupted by a subtle influence.

- **Too late:** the reform has happened; the Company must convince sceptics, rebuild lost rites, or improvise a substitute.
- **Split factions:** old faithful, reformers, shadowy manipulators.
- **False miracle:** the reform brings short-term prosperity or signs of blessing — which are the Bane waking and rewarding its liberators.
- **The reform is right, but incomplete:** there is truth in the change; the method must be refined, or joined to the ancient rite.
"""),
    sec("bb-banes-considered", "Banes considered, not yet placed", """
[YOURS] From the first notes, besides the four Nameless Things now placed (Threads):

- **Dragon, of the brood of Glaurung.** Trapped, placated by ritual tribute; perhaps near the Blue Mountains, involving Dwarves; communities offer gold regularly. Powerful, intelligent, physically overwhelming.
- **An Orc-making place.** A site of Morgoth's that recycles corrupted Elf-souls into Orcs, endlessly; hidden in some remote fortress. It would explain Sauron's seemingly endless armies. Strategic, overwhelming, a moral horror.
- **Corrupted Maiar.** One or both of the lost Blue Wizards, partly corrupted by Morgoth's influence; ambiguous; a mystical, psychological and ideological challenge.
- *Optional:* a poison or plague — Ungoliant's lingering venom, blighting nature and communities; a rust or destruction monster that ruins crafted things.

[NOTE] What the table has since heard bears on these: Círdan says the place in the east that took [Canthwë](./#people/canthwe) corrupted one of the **Istari** (the Corrupted Maiar idea); and there is *at least one other* Bane nobody knows anything about.
"""),
    sec("bb-bear-song", "Tom's song for bears", """
[YOURS] Tom sings it to the bear in the Old Forest; the Company learned it, and it works best sung together. The Westron verse:

> Bear, O bear, with coat so brown,
> Let not thy heavy paw come down.
> This one walks with leaf and light —
> No fang shall bite, no claw shall smite.
> Friend of forest, field, and den,
> Let them pass, and part as kin.
> Sleep, O bear, or softly roam,
> This is not your meat, nor home.

For night-time the last lines may run: *Sleep, O bear, the moon is high; / Let friend and kin go safely by.*

As the Company sings it, in Adûnaic:

> Bârun, Bârun, zîrân lô,
> Uzûn bâri nardim tô.
> Katha lô îdô kalab,
> Nardê batîr, nardê khâlab.
> Zimra-nîdô, azra-lad,
> Aphadad, lô nardad!
> Nimmê, Bârun, târik bal,
> Anadê thâni, nardê zal.

- *Bârun, Bârun, zîrân lô* — Bear, O bear, be gentle now
- *Uzûn bâri nardim tô* — Long is the peace with this one, so (don't harm)
- *Katha lô îdô kalab* — This one walks with light today
- *Nardê batîr, nardê khâlab* — Not for claw, not for wrath
- *Zimra-nîdô, azra-lad* — Friend of song, of earth and path
- *Aphadad, lô nardad!* — Follow them, do not hurt them!
- *Nimmê, Bârun, târik bal* — Sleep now, bear, under the sky's hall
- *Anadê thâni, nardê zal* — The man is spared, no harm shall fall

Said aloud: BAH-roon, BAH-roon, ZEE-rahn loh / oo-ZOON BAH-ree NAHR-deem toe / KAH-thah loh EE-doh KAH-lahb / NAHR-day BAH-teer, NAHR-day KHAH-lahb / ZEEM-rah NEE-doh, AZ-rah LAHD / AH-fah-dahd, loh NAHR-dahd! / NEEM-may BAH-roon, TAH-reek bahl / AH-nah-day THAH-nee, NAHR-day zahl. Stress falls on the first syllable; *kh* as in *loch*.
"""),
]

places = [
    sec("bb-place-barad-tarminale", "Barad Tarminalë", """
[YOURS] *The High Watch of the North Wind.* A stone ring-fort built by Aranarth's followers in the early Third Age, long abandoned and lately restored as a cold-weather way-station, kept stocked by Rangers travelling to Lindon. It offers rare word with the Elves of Mithlond. Its tower is said to hold a beacon-crystal, a gift from Gilraen, that glows when Orcs cross the high passes of the Lhûn.

[SET] At the table it lies in the hills north beyond Fornost, ten days from Tom's house, a ring of stone cut into the northern and western faces of the hills; the ruins of Tarkûrzagûl are a day and a half north-east ([Barad Tarminalë](./#atlas/barad-tarminale)).

[NOTE] The first notes place it on the eastern face of the Blue Mountains, above the northward sources of the Lhûn. Play has put it in the North beyond Fornost; the beacon-crystal has not yet been seen.
"""),
    sec("bb-place-thargindum", "Thargindum, the hall of the Cavity Stone", """
[YOURS] A secretive hall in the northern Ered Luin. Its Dwarves have *sealed* the Cavity Stone deep beneath a collapsed mine shaft, ringed with black iron and runes of warding; they have not destroyed it. *"The Eye is sleeping."*

- A small priesthood has formed around the stone: the **Silencekeepers**. They do not worship it, but revere its *potential* to bring Dwarves clarity and strength of will. They now handle disputes and cast judgments in the hall, though not of the royal line.
- **Public belief:** *"It is gone. Buried. No danger remains."* But miners speak of strange dreams, tools left near old vents grow too hot to touch, and a new forge built above the collapsed shaft makes strangely resonant metals.

Hooks: the Company is asked to recover an ancestral tool forged in Thargindum, and warned off "the closed tunnels"; a younger Dwarf begs them to help "break the silence"; a renowned artisan makes a perfect blade that cannot be sheathed and whispers to its bearer; the Elves of Lindon feel a low pulse in the stones beneath their towers.

[SET] As Thramli told it at the Havens, a group of Dwarves keeps the place where the stone lies, left as it was and tended; it took the Dwarves thirty years to see that the stone was what all their troubles had in common. Cutting off someone's exposure at the first signs stops the effects growing worse, but they do not go away, and nobody has found a way to undo them. One keeper died in an accident, the carelessness of someone who knows every rule and one day does not follow them; another threatened violence and is kept apart, watched, and allowed no weapons; some have begun to speak in strange tongues. The hall the Company reached, where the council of the Blue Mountains sits, has not been named at the table.

[OPEN] Whether the council's hall is Thargindum, or Thargindum lies further in.
"""),
]

people = [
    sec("bb-people-canthwe", "Canthwë", """
[SET] An old man, a Man by his looks, who gardens and smokes about the Havens and eats off the nearest tray. Círdan: he soaked up the curse of a place in the east *the way a rag soaks up wine*; he was one of the **Istari**, very powerful, working a great power in that place, and the curse drew on that power. He once went by another name, which Círdan has sealed. Whatever Círdan did to his mind is a lid that shuts itself again whenever anything rises beneath it — as when he named every Elf on both ships, and who came home.

[NOTE] The first notes' *Corrupted Maiar — one or both of the lost Blue Wizards* (Overview, *Banes considered*).
"""),
    sec("bb-people-nolly", "Nolly, and the maddened Dwarves", """
[SET] Nolly had been missing from the Blue Mountains for weeks; he remembers nothing but being at home. He came back to himself when Már called him by name, and helped wrestle Veig down. Of the seven who attacked: three dead, two brought down alive, Veig bound and awake but not in his mind. Thramli's five were killed with weapons, less than two days before.

[OPEN] Whether the Cavity Stone did this — Nolly was never near it, so far as anyone knows. Whether kin calling them by name can bring the others back. Whether the maddened speak in strange tongues, as some of the stone's keepers began to — the Company thought that might show it was the stone.
"""),
]

pc = [
    sec("bb-pc-makheneb", "Makheneb — a life under the Elvenking", """
[YOURS] Notes for the Elf of Mirkwood.

- **The reign of Thranduil.** He has lived his whole life under Thranduil, who took up his rule in the northern forest after Oropher fell at Dagorlad; he reveres him as king and protector.
- **The darkening of the south.** As a child he knew Greenwood the Great already renamed Mirkwood, the Necromancer in Dol Guldur (c. 2460); all his life the southern forest darkened, its creatures twisted, and spiders multiplied. He likely went on scouting missions south.
- **The Watchful Peace ends (2850–2941).** At about 184 he felt the tension when Gandalf found the Necromancer was Sauron.
- **The White Council, 2941.** Twenty-four years ago Sauron was driven from Dol Guldur; the north stood guard for his return.
- **The Battle of Five Armies, 2941.** He marched with Thranduil to Erebor, and likely lost friends and kin there; his view of the Dwarves of Erebor may be complex.

Themes: isolation and vigilance — suspicion, secrecy, self-reliance; the decay of the forest, groves lost and paths vanished, a profound melancholy; Men as a flickering flame against the Elves' long slow dusk. Tension with Dwarves after Erebor; he may know of Rivendell and Lórien, of Amroth's death and Galadriel.

[SET] At the table: something under three hundred; fought at the Battle of Five Armies; went into southern Mirkwood while the Necromancer held Dol Guldur; his family long fallen on hard times. At the Havens he named the dead of the Five Armies to Elves who called it a blip in the east.
""", about=["Makheneb"]),
]


def bane(id_, title, art, yours, setx, openx=None):
    t = yours.strip() + "\n\n" + setx.strip()
    if openx:
        t += "\n\n" + openx.strip()
    t += "\n\n[NOTE] The art: [%s](%s%s.webp)." % (title.split(",")[0], ART, art)
    return sec(id_, title, t, open=True)


threads = [
    bane("bb-bane-tarkurzagul", "Tarkûrzagûl, the White Terror-Spirit", "tarkurzagul", """
[YOURS] *Tarkûrzagûl* — from the Black Speech: *tarkûr*, white (twisted from Quenya *tarka*, strong, firm), and *zagûl*, shadowy spirit or wraith (as in *Nazgûl*); a name of loathing and spiritual dread. An ice- and cold-themed Balrog, a frost-yeti, the counterpart of the fiery Balrog, made against the Valar of fire and warmth. Sealed in Númenórean ruins north of the Shire, north-east of Barad Tarminalë. First signs: frost-wolves coming out of the ruins, and the corruption of the wild creatures about. Dire, eldritch; it can corrupt the land around it.
""", """
[SET] The Company went down in spring 2965 on Findemir's errand: mended the outer wheel (a chiselled piece put back, broken within the year), found the belted man's bones and fought his ghost; passed the filigree doors; found the frozen man on the inner wheel with a vapour rising from the crack he had prised; saw the beast roll over beneath the glass floor; wrote the ledger (the last caretaking was about forty years before; one entry of eight or ten pages, about a hundred and fifty years ago); carried the frozen man out, and shut the doors. A wolf reformed itself out of ice in the outer chamber. The wolves' den is in the cavern mouth ([The Inner Chamber](./#chronicle/03-the-inner-chamber)).
""", """
[OPEN] Who sent the belted man and the frozen man, and what the frozen man's passphrase opens. The Company means to tell the Rangers the caretaking needs doing far more often than every forty years.
"""),
    bane("bb-bane-morthuring", "Môrthuring, beneath the Tree of Sorrow", "morthuring", """
[YOURS] A vampire, after Sauron's vampire servants in the tale of Beren and Lúthien; sealed underground, bound up with local folklore, bringing nightmares and a vampiric corruption. Personal corruption, physical lethality.

- **Nameless Thing**, Attribute Level 10. Endurance 100, Might 3, Hate 4, Armour 3d, Parry +2, Combat Proficiency 4. Man-like, cloaked in vast tattered wings.
- **Rend** (claws) 8 Damage, Injury 16, *Seize*. **Bite** 8 Damage, Injury 14, *Pierce*.
- **Thing of Terror** — all who see her gain 3 Shadow (Dread) and are Daunted if they fail. **Great Leap** — 1 Hate: attack any Player-hero in any stance. **Snake-like Speed** — 1 Hate: an incoming attack roll is Ill-favoured. **Strike Fear** — 1 Hate: 3 Shadow (Dread) to every Player-hero in sight.
""", """
[SET] She sleeps standing, cradled by the roots in a grotto beneath the Tree of Sorrow, bald, wrapped, like an Elf and like nothing Marigold knew. The long-folk keep her asleep; she last woke a couple of generations ago, and they put her back to sleep at great cost. Their mime is of something that leaps on your back and bites. In the pit beneath the tree only metal things kept their shape. Tom did not know her, and thought the tree-folk have it in hand ([Beneath the Tree of Sorrow](./#chronicle/05-beneath-the-tree-of-sorrow)).
""", """
[OPEN] What the long-folk's rite is, and what it costs them. Whether anyone can speak with them — Lingdadh is their matriarch.
"""),
    bane("bb-bane-uludrith", "Uludrith, the Hollow Voice — the Cavity Stone", "uludrith", """
[YOURS] The Bane of Ered Luin. **The Cavity Stone**: a fist-sized sphere of obsidian, warm to the touch, hollow at the core. Held, it hums with a barely audible resonance, like breath in a deep tunnel. Those who hold it too long hear voices from it, voices like their own, only more certain, and more cruel. Made in the First Age: from the remnants of Morgoth's malice in the forges beneath Thangorodrim, or an echo left when one of his greater servants was slain — an eye that did not die, but turned inward.

- It whispers to those near it, offering security, vengeance, recognition, mastery of craft, escape from shame. It does not dominate; it coaxes, amplifying the doubt and resentment already there.
- Dwarves exposed over long periods grow isolated, paranoid, quietly obsessive; one may craft perfect tools that only they can use, lock away ancestral texts, "cleanse" a rival's workshop, and not see it as wrong.
- **Shadow** for heroes who touch the Stone or its resonance: exploiting a weakness in another; obsessively crafting, hoarding or perfecting; dismissing companions' concerns as irrational or soft; isolating oneself to do better work. If Shadow exceeds Hope: the *Lure of Command*, mistrust of all others' judgment, the Hollow Voice in dreams, guiding, praising, justifying.
- Its keepers and hall: Places, *Thargindum*.
""", """
[SET] Thramli brought it to Círdan; Nenuviel has come to judge it. In the valley below the mountains seven Dwarves, white-eyed, killed Thramli's party and fell on the Company; Nolly was among them ([The Blue Mountains](./#chronicle/09-the-blue-mountains)). The council of the Blue Mountains is to hear the Company after the day's mourning. Círdan was careful not to say the Cavity Stone is the Bane of the mountains, but seemed to think so.
""", """
[OPEN] How the council decides: seven when all sit, fewer tonight; a strong preference for one mind; those who feel strongly but not enough to sink it abstain; a single vote against stops it. Már speaks for the Company. Its asks: that Nenuviel examine the stone, on Thramli's behalf; that the council see it is a threat; evidence of how it touches people — who, how near, whether kin can call them back. Its witness: Nolly, and perhaps one of the bound, restrained.
"""),
    bane("bb-bane-thrakdumpuzur", "Thrakdûmpuzûr, the dragging horror of the abyss", "thrakdumpuzur", """
[YOURS] From the Black Speech: *thrak-*, strike, horror, assault (as in *Durthang*); *dûmpu*, from *dûmpalûk*, deep-darkness, abyss; *zûr*, pull, drag, draw down. *The horror that draws you into the deep-dark* — a name Orcs would refuse to speak at sea, and Sauron would see as a tool of judgment. A kraken; a sea-borne eldritch horror, perhaps bound up with the Silmaril cast into the ocean: seafaring, eldritch creatures, corrupted sea-life.
""", """
[SET] Círdan fears that the **Beast of Belegaer** has woken in the sea, and gave the Company a scrap of script with its name in the Black Speech. A Silmaril was lost in the deep long ago, and he fears it has roused the creature; if the jewel could be taken from it, it might be settled again. The westbound *Lómelindë* was turned back on the Straight Road and came home with a third of those who sailed in her; the *Gwaeloth*, sent to meet her, never met her and never came home. At Lily's asking Círdan holds the next ship until spring, and the Company means to sail with it ([The Returned Ship](./#chronicle/08-the-returned-ship-and-the-ride-north)).
"""),
    sec("bb-bane-south-of-tharbad", "The Bane south of Tharbad", """
[SET] One of the places Tom marked on Perry's map when he saw Marigold's drawing: south of Tharbad. Nothing more is known at the table.

[OPEN] What lies there. The first notes do not place a Bane south of Tharbad.
""", open=True),
    sec("bb-bane-east", "The place in the east that took Canthwë", """
[SET] Círdan counts it among the Banes: a place in the east, *more a place than a thing*, that corrupted one of the Istari. He has "taken care of it" — of Canthwë, at least.

[OPEN] Where it is, and whether it is still dangerous. See People, *Canthwë*.
""", open=True),
    sec("bb-bane-unknown", "At least one other", """
[SET] Círdan: Tom's list is too small. Four are on Tom's map, one is the place in the east, and there is at least one other that nobody knows anything about at all.

[OPEN] Everything.
""", open=True),
    sec("bb-thread-south", "The men from the south", """
[SET] Two men came to the ruins of Tarkûrzagûl from the south: the belted man, who asked questions at Bree a year and a half before and whom Perry's superior at the gate waved through — he tried to carry off a piece of the wheel; and the frozen man, a noble by his sword, from further south than Tharbad, who tried to prise open the inner wheel and carried a passphrase. Someone opened the doors not long before the Company came. Perry never had a good opinion of the man he answered to at the gate.

[OPEN] Who sent them; who else knows; what Perry's superior knows.
""", open=True),
    sec("bb-thread-bow", "The Great Bow of Angnir", """
[SET] The great bow Makheneb took from the store beneath the ruins: Númenórean, perhaps the Great Bow of Angnir, blessed with a straight flight, and with a shadow on it. Gaethel's smiths cleansed it; something lingers and draws enemies' notice — Orcs, at least. Laeroneth and Meneldil sent Lily to look for the tellers of old tales in certain towns.

[OPEN] Its tale.
""", open=True),
    sec("bb-thread-orc", "An Orc in the Shire", """
[SET] An old Orc lived six months at Kingsworthy in a cloak taken from an Elf of Mirkwood. Perry promised to carry word to the Sheriffs and the Bounders.

[OPEN] Whether he has; how it came past Bree.
""", open=True),
    sec("bb-thread-beacons", "Keeping the fire", """
[SET] Círdan's counsel: the peoples bound to each Bane should find allies and keep in touch, so that any may call for help. Perry's idea: great stacks of wood between the places, a fire lit for need, strict punishments for a false fire, riders with buckets for an accident. It excited him more than anything else has.
""", open=True),
    sec("bb-thread-findemir", "Findemir", """
[SET] Left in Moriel's care at Barad Tarminalë, breathing but unable to sit up or speak. Moriel was waiting there for someone, and meant to go west.

[OPEN] How he is; what he knew of his errand that Már was never told.
""", open=True),
    sec("bb-thread-shire", "Loose ends in the Shire", """
[SET] Marigold's daughter Flora is expecting (five or six months from early summer), and Tom promised to come and see the baby. Ammie's grandmother's bust lies in the long grass across the road from the Mathom-house. Marigold has the sixth volume of Melody Took's journals, which mentions the long-folk of the North Moors. Primula has Perry's copy of the flower map, for Mr Bilbo. Posco carries Perry's letter east, and would like berries and mushrooms from the west.
""", open=True),
]

arc = [
    sec("bb-arc-before-council", "Before the council", """
[SET] The sacred hours after the mourning: a few hours before the council sits. Each of the Company may do one thing — see the bound Dwarves and how they are now; find out whether Nolly is in a state to bear witness; learn who sent Thramli in the first place, and the story of that.
""", session="Session Ten", summary="A few hours in the Hall, one errand each, before the Company goes before the council.", played=False),
    sec("bb-arc-council", "The council of the Blue Mountains", """
[SET] Somewhere between a town council and a queen's court, nearer the council. Protocol and procedure; supporting documents and witnesses are allowed, and the council has great latitude over what it will hear. The Company's surest road is a compelling case — who we are, what we want, why yes is good for you — and its soft failure a deferred decision.

[SET] Már speaks for the Company. Their plan: Nenuviel to examine the Cavity Stone on Thramli's behalf; convince the council it is a threat; ask for evidence of how it touches people; Nolly as witness, and perhaps one of the bound, restrained; and to refuse is to say Thramli's party died for nothing.
""", session="Session Ten", summary="Seven, or fewer; one mind if it can; a single voice against stops everything.", played=False),
]

pack = {
    "kind": "sortilege-vtt-campaign",
    "version": 1,
    "arc": arc,
    "threads": threads,
    "gm": {"overview": overview, "places": places, "people": people, "pc": pc},
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(pack, f, ensure_ascii=False, indent=1)
    f.write("\n")
n = len(arc) + len(threads) + sum(len(v) for v in pack["gm"].values())
print("seed_source: %d sections → %s" % (n, os.path.relpath(OUT, CAMPAIGN)))
