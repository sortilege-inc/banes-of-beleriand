// system/tor2e/sheet.js — the Player-hero's sheet, derived from the corpus's ACTOR
// "Player-hero" at runtime (PLAYBOOK §1b; PLAN.md D1): the declared fields, in declared order,
// each rendered by its declared type — a STRING a line, an INTEGER MIN 1 MAX 9 a rating, an
// ENUM a choice of its options, a reference to ^"Heroic Culture" a pick from the typed
// cultures, a LIST OF ^"Skill Rank" the rated rows, a LIST OF ^"Virtue" picks from the
// Virtues. Nothing about the sheet is hand-listed except a number the book states only in
// prose, and that is a named constant citing its rule.
//
// Also here: the live sheet for play — what the rules let a session change (current Endurance
// and Hope, Shadow and Shadow Scars, Fatigue, Wounded and its Injury) and what they derive from
// it (Load, Weary, Miserable), with the rolls: every Skill against its Attribute's TN, attacks
// against STRENGTH, VALOUR and WISDOM against HEART and WITS, Protection against an Injury.
window.TorSheet = (function () {
  const { el, button } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Dice = window.TorDice;
  const State = () => window.VttState;

  const ACTOR = 'Player-hero';
  const FILE_KIND = 'sortilege-vtt-character';

  // ── rules the sheet follows, each citing the entity that states it ──
  const RULES = {
    tn: Dice.RULES.tn,                                                      // TN = 20 minus the Attribute
    tnUse: { id: '#t1B5mKO356jm44ncLwVHzjZ', name: 'Target Numbers' },     // STRENGTH TN for attack rolls; HEART for VALOUR; WITS for WISDOM
    load: { id: '#tXBOzixZPLQIqK651XNZeXB', name: 'Load' },                // Weary while Endurance ≤ Load total
    fatigue: { id: '#t63wgX51qeTphz0RtGxNGEz', name: 'Fatigue' },          // Fatigue raises the Load total
    treasure: { id: '#tIBypKet1tVqu4ihaV4Z2ct', name: 'Carrying Treasure' }, // "every single point of Treasure … corresponds to one point of Load"
    shadow: { id: '#tJ5Je6tpsVcen9FIP4GQ2so', name: 'Shadow' },            // Miserable while Hope ≤ Shadow
    harden: { id: '#tqFlMkloxe7s58Fxyh9ppzI', name: 'Harden Will' },       // a Shadow Scar is a 'permanent' Shadow point; trade all Shadow for one Scar
    resting: { id: '#t8ukkGbMg2yDiQWDyejdv3l', name: 'Resting' },          // short rest: + STRENGTH (Wounded: none); prolonged: all (Wounded: + STRENGTH)
    hope: Dice.RULES.bonus,                                                 // 1 Hope to gain (1d); Inspired: (2d)
    piercing: { id: '#tOpO6Y6BrlaAQENgRRPjfPe', name: 'Piercing Blows' },  // the Protection roll against the Injury
    enduranceLoss: { id: '#tTVhB32XAi4ALdHmN50AZR6', name: 'Endurance Loss' }, // "if their Endurance is reduced to zero, they drop unconscious"
    wounds: { id: '#tIOalEv8rLQ1bYeMJVkHcEE', name: 'Wounds' },            // the Wounded box; a second Wound: Endurance zero, Dying
    dying: { id: '#tbQWtEhFwTV9iMKdVDxQgWg', name: 'Dying Heroes' },       // "must receive a successful HEALING roll within approximately 1 hour"
    skillPoints: { id: '#tWV88uyeAZh78uZSw32fIH5', name: 'Skill Points' }, // "3 Skill points each at the end of every gaming session they attend"
    adventurePoints: { id: '#tPU6l2FnCDwuOs2GmJgwG8a', name: 'Adventure Points' }, // "3 Adventure points each at the end of every gaming session they attend"
    updates: { id: '#ty8ByvDXekeuuyLg4SXNva5', name: 'Perform Updates' },  // Training, Growth, Spiritual Recovery (Hope = HEART), 1–3 Shadow removed
    years: { id: '#tN6K0V3Sq9ZPyodnBd56BI8', name: 'The Passage of the Years' }, // Yule: aged one year, all Hope, bonus Skill points = WITS
    costs: { id: '#tGBoXCeiYJZWCqA8tao5vFI', name: 'Experience Points Costs' },
  };
  const SESSION_SKILL_POINTS = 3;      // RULES.skillPoints
  const SESSION_ADVENTURE_POINTS = 3;  // RULES.adventurePoints
  const SHADOW_REMOVED_MAX = 3;        // RULES.updates: "allow them to remove from 1 to 3 Shadow points"
  const YULE_AGE = 1;                  // RULES.years: "all Player-heroes have aged one year"
  const HOPE_SPEND = 1;          // RULES.hope: "can spend 1 Hope point to gain (1d)"
  const HOPE_DICE = 1;           // RULES.hope: gain (1d)
  const INSPIRED_DICE = 2;       // RULES.hope: "An Inspired Player-hero … gains (2d)"
  const TREASURE_LOAD = 1;       // RULES.treasure: one point of Load per point of Treasure
  const TN_BASE = Dice.TN_BASE;  // RULES.tn
  const HEADGEAR = 'Headgear';   // the Armour table's Type for the Helm

  // ── the declaration, read at runtime ──
  const declaration = () => D.declaration(ACTOR);
  const rankFields = () => ((D.declaration('Skill Rank') || {}).props || []).map((p) => p.name);   // Skill, Rank, Favoured

  // One entry per declared field: { name, kind, of, options, min, max, required }.
  function spec() {
    const decl = declaration();
    if (!decl) return [];
    return decl.props.map((f) => {
      const s = { name: f.name, required: !!f.required, min: f.min, max: f.max };
      if (f.vk === 'ref') { s.kind = 'pick'; s.of = f.ref && f.ref.name; }
      else if (f.vk === 'list' && f.of === 'Skill Rank') { s.kind = 'rated'; s.of = f.of; }
      else if (f.vk === 'list' && f.of && f.of !== 'STRING') { s.kind = 'picks'; s.of = f.of; }
      else if (f.vk === 'list') s.kind = 'lines';
      else if (f.vk === 'enum') { s.kind = 'choice'; s.options = f.options || []; }
      else if (f.type === 'INTEGER') s.kind = 'number';
      else s.kind = 'text';
      return s;
    });
  }
  function blank() {
    const v = {};
    spec().forEach((s) => {
      v[s.name] = s.kind === 'pick' ? null : s.kind === 'rated' || s.kind === 'picks' || s.kind === 'lines' ? [] : s.kind === 'number' ? null : '';
    });
    // the sheet prints all 18 Skills and the four Combat Proficiencies, each ranked
    v.Skills = skills().map((r) => ({ Skill: r.name, Rank: 0, Favoured: false }));
    v['Combat Proficiencies'] = proficiencies().map((r) => ({ Skill: r.name, Rank: 0 }));
    return v;
  }
  function complete(v) {
    const out = blank();
    Object.keys(v || {}).forEach((k) => {
      if (v[k] == null) return;
      if ((k === 'Skills' || k === 'Combat Proficiencies') && Array.isArray(v[k])) {
        // keep the printed rows, taking the file's ranks by name; rows the book does not print travel along
        const byName = {};
        v[k].forEach((r) => { byName[r.Skill] = r; });
        out[k] = out[k].map((r) => Object.assign({}, r, byName[r.Skill] || {}));
        v[k].forEach((r) => { if (!out[k].some((x) => x.Skill === r.Skill)) out[k].push(r); });
      } else out[k] = v[k];
    });
    return out;
  }

  // ── the corpus behind the fields (records, always in memory; their text in the core) ──
  const skills = () => D.byType('Skill');
  const proficiencies = () => D.byType('Combat Proficiency');
  const optionsFor = (type) => D.byType(type);
  const refOf = (r) => (r ? { hash: r.id, name: r.name } : null);
  const recordOf = (ref) => (ref && ref.hash ? D.record(ref.hash) : null);
  const entityOf = (ref) => (ref && ref.hash ? D.entity(ref.hash) : null);
  const culture = (v) => entityOf(v['Heroic Culture']);
  const calling = (v) => entityOf(v.Calling);
  const attributeOf = (skillName) => D.f(skills().find((r) => r.name === skillName), 'Attribute') || null;

  // ── what the rules derive ──
  const tn = (v, attr) => (v[attr] == null ? null : TN_BASE - v[attr]);                        // RULES.tn
  function gearLoad(v) {
    let n = 0;
    (v['War Gear'] || []).forEach((w) => { n += Number(D.f(recordOf(w), 'Load')) || 0; });
    ['Armour', 'Helm', 'Shield'].forEach((k) => { n += Number(D.f(recordOf(v[k]), 'Load')) || 0; });
    return n;
  }
  // "a Player-hero's Load total": war gear, Treasure (RULES.treasure) and Fatigue (RULES.fatigue)
  const loadTotal = (m) => gearLoad(m.character || {}) + ((m.character || {}).Treasure || 0) * TREASURE_LOAD + (live(m).fatigue || 0);
  function live(m) {
    const v = m.character || {};
    const lv = m.live || {};
    return {
      endurance: lv.endurance != null ? lv.endurance : v.Endurance,
      hope: lv.hope != null ? lv.hope : v.Hope,
      shadow: lv.shadow || 0, scars: lv.scars || 0, fatigue: lv.fatigue || 0,
      wounded: !!lv.wounded, injury: lv.injury || '', inspired: !!lv.inspired, dying: !!lv.dying,
    };
  }
  const shadowTotal = (m) => live(m).shadow + live(m).scars;                                  // RULES.harden: a Scar is a permanent Shadow point
  const isWeary = (m) => live(m).endurance != null && live(m).endurance <= loadTotal(m);        // RULES.load
  const isMiserable = (m) => live(m).hope != null && live(m).hope <= shadowTotal(m);             // RULES.shadow

  // A one-line description of who this is, from the sheet's own fields.
  function sentence(v) {
    const bits = [v['Heroic Culture'] && v['Heroic Culture'].name, v.Calling && v.Calling.name].filter(Boolean);
    return (v.Name || 'An unnamed hero') + (bits.length ? ', ' + bits.join(' · ') : '');
  }
  function statusLine(m) {
    const v = m.character || {};
    const l = live(m);
    const cond = [isWeary(m) ? 'Weary' : null, isMiserable(m) ? 'Miserable' : null, l.wounded ? 'Wounded' : null, l.endurance === 0 ? 'Unconscious' : null, l.dying ? 'Dying' : null].filter(Boolean);
    return ['Endurance ' + (l.endurance == null ? '—' : l.endurance) + '/' + (v.Endurance == null ? '—' : v.Endurance), 'Hope ' + (l.hope == null ? '—' : l.hope) + '/' + (v.Hope == null ? '—' : v.Hope), 'Shadow ' + shadowTotal(m)].concat(cond).join(' · ');
  }

  // ── the sheet, laid out as the printed one (page 239) ──
  // Fields are read off the declaration; LAYOUT names where each goes, and anything it does
  // not name lands in "Also declared" at the foot.
  const LAYOUT = {
    head: ['Name', 'Heroic Culture', 'Age', 'Standard of Living', 'Treasure', 'Cultural Blessing', 'Patron', 'Calling', 'Shadow Path'],
    features: ['Distinctive Features', 'Flaws'],
    attributes: ['Strength', 'Heart', 'Wits'],
    derived: ['Endurance', 'Hope', 'Parry'],
    points: ['Adventure Points', 'Skill Points', 'Fellowship Score'],
    skills: ['Skills'],
    valour: ['Valour', 'Wisdom'],
    combat: ['Combat Proficiencies', 'Rewards', 'Virtues'],
    gear: ['War Gear', 'Armour', 'Helm', 'Shield', 'Travelling Gear'],
  };

  function pickSelect(s, cur, onPick, ro, filter) {
    const opts = optionsFor(s.of).filter(filter || (() => true));
    const sel = el('select', { class: 'scope', disabled: ro || null, onchange: (ev) => onPick(refOf(D.record(ev.target.value))) });
    sel.appendChild(el('option', { value: '' }, ['— ' + s.of + ' —']));
    opts.forEach((r) => sel.appendChild(el('option', { value: r.id, selected: cur && cur.hash === r.id ? true : null }, [r.name + (r.book !== 'core' ? ' · ' + (D.indexBook(r.book) || {}).label : '')])));
    return sel;
  }

  function control(s, v, onChange, o) {
    const ro = o && o.readOnly;
    const val = v[s.name];
    if (s.kind === 'text') {
      const long = s.name === 'Travelling Gear' || s.name === 'Cultural Blessing';
      return el(long ? 'textarea' : 'input', { class: 'text', type: long ? null : 'text', rows: long ? 2 : null, value: long ? null : (val || ''), readonly: ro || null, oninput: (ev) => onChange(s.name, ev.target.value) }, long ? [val || ''] : []);
    }
    if (s.kind === 'number') {
      return el('input', { class: 'text num', type: 'number', min: s.min != null ? String(s.min) : null, max: s.max != null ? String(s.max) : null, value: val == null ? '' : val, readonly: ro || null, oninput: (ev) => onChange(s.name, ev.target.value === '' ? null : parseInt(ev.target.value, 10)) });
    }
    if (s.kind === 'choice') {
      return el('select', { class: 'scope', disabled: ro || null, onchange: (ev) => onChange(s.name, ev.target.value || null) }, [el('option', { value: '' }, ['—'])].concat(s.options.map((x) => el('option', { value: x, selected: val === x || null }, [x]))));
    }
    if (s.kind === 'pick') {
      // the sheet prints the Helm apart from the Armour; the Armour table types it "Headgear"
      const filter = s.name === 'Helm' ? (r) => D.f(r, 'Type') === HEADGEAR : s.name === 'Armour' ? (r) => D.f(r, 'Type') !== HEADGEAR : null;
      const sel = pickSelect(s, val, (ref) => onChange(s.name, ref), ro, (r) => (!filter || filter(r)) && (!o || !o.filter || o.filter(r)));
      return el('span', {}, [sel, val && val.hash ? el('button', { class: 'ref tiny', type: 'button', title: 'Read it', onclick: () => window.TorOpenEntity && window.TorOpenEntity(val.hash) }, ['read']) : null]);
    }
    if (s.kind === 'picks') {
      const list = (val || []).slice();
      return el('div', { class: 'picks' }, [
        list.map((ref, i) => el('span', { class: 'chip' }, [
          ref.hash ? el('button', { class: 'ref', type: 'button', onclick: () => window.TorOpenEntity && window.TorOpenEntity(ref.hash) }, [ref.name]) : el('span', {}, [ref.name]),
          s.of === 'Weapon' ? el('span', { class: 'muted small' }, [' ' + weaponLine(ref)]) : null,
          ro ? null : el('button', { class: 'ref tiny', type: 'button', title: 'remove', onclick: () => onChange(s.name, list.filter((_, j) => j !== i)) }, ['×']),
        ])),
        ro ? null : pickSelect(s, null, (ref) => ref && onChange(s.name, list.concat([ref])), false, (r) => !list.some((x) => x.hash === r.id) && (!o || !o.filter || o.filter(r))),
      ]);
    }
    if (s.kind === 'lines') {
      const list = (val || []).slice();
      return el('div', { class: 'lines' }, [
        list.map((line, i) => el('div', { class: 'chiprow tight' }, [
          el('input', { class: 'text', type: 'text', value: line || '', readonly: ro || null, oninput: (ev) => { const a = list.slice(); a[i] = ev.target.value; onChange(s.name, a); } }),
          ro ? null : button('×', () => onChange(s.name, list.filter((_, j) => j !== i)), 'ghost tiny'),
        ])),
        ro ? null : button('Add', () => onChange(s.name, list.concat([''])), 'ghost tiny'),
      ]);
    }
    if (s.kind === 'rated') return ratedRows(s, v, onChange, o);
    return null;
  }
  function weaponLine(ref) {
    const r = recordOf(ref);
    if (!r) return '';
    return ['Damage ' + D.f(r, 'Damage'), 'Injury ' + D.f(r, 'Injury'), 'Load ' + D.f(r, 'Load')].join(' · ');
  }

  // the rated rows: a Skill Rank per printed Skill, its diamonds 0–6, Favoured marked
  function ratedRows(s, v, onChange, o) {
    const ro = o && o.readOnly;
    const rows = (v[s.name] || []).slice();
    const isSkills = s.name === 'Skills';
    const set = (i, patch) => { const a = rows.slice(); a[i] = Object.assign({}, rows[i], patch); onChange(s.name, a); };
    return el('div', { class: 'rated' + (isSkills ? ' skills' : '') }, rows.map((r, i) => el('div', { class: 'rated-row' }, [
      isSkills ? el('label', { class: 'fav', title: 'Favoured' }, [el('input', { type: 'checkbox', checked: r.Favoured || null, disabled: ro || null, onchange: (ev) => set(i, { Favoured: ev.target.checked }) })]) : null,
      el('span', { class: 'rated-main' }, [r.Skill, isSkills && attributeOf(r.Skill) ? el('span', { class: 'muted tiny' }, [' ' + attributeOf(r.Skill)]) : null]),
      el('span', { class: 'diamonds' }, [0, 1, 2, 3, 4, 5].map((k) => el('button', { type: 'button', class: 'diamond' + (k < (r.Rank || 0) ? ' on' : ''), disabled: ro || null, title: String(k + 1), onclick: () => set(i, { Rank: (r.Rank || 0) === k + 1 ? k : k + 1 }) }))),
    ])));
  }

  // The whole sheet. onChange(name, value) makes it editable; without it, read-only.
  function render(v, onChange, opts) {
    const o = Object.assign({}, opts || {}, { readOnly: !onChange });
    const set = onChange || (() => {});
    const S = spec();
    const byName = {};
    S.forEach((s) => (byName[s.name] = s));
    const used = new Set();
    const field = (name, cls) => {
      const s = byName[name];
      if (!s) return null;
      used.add(name);
      return el('div', { class: 'sfield ' + (cls || '') }, [el('div', { class: 'prop-k' }, [s.name, s.required ? el('span', { class: 'req' }, [' ·']) : null]), control(s, v, set, o)]);
    };
    const attrTile = (a) => el('div', { class: 'attr' }, [field(a, 'tile'), el('div', { class: 'tn' }, ['TN ', el('b', {}, [String(tn(v, a) == null ? '—' : tn(v, a))])])]);
    const sheet = el('div', { class: 'sheet' }, [
      el('div', { class: 'sheet-head' }, [el('div', { class: 'head-grid' }, LAYOUT.head.map((n) => field(n)))]),
      el('div', { class: 'two-up' }, LAYOUT.features.map((n) => field(n))),
      el('div', { class: 'attrs' }, LAYOUT.attributes.map(attrTile)),
      el('div', { class: 'stat-tiles' }, LAYOUT.derived.concat(LAYOUT.points).map((n) => field(n, 'tile'))),
      el('h4', {}, ['Skills', el('span', { class: 'muted small' }, [' · the box marks a Favoured Skill'])]),
      LAYOUT.skills.map((n) => { used.add(n); return control(byName[n], v, set, o); }),
      el('div', { class: 'stat-tiles' }, LAYOUT.valour.map((n) => field(n, 'tile'))),
      el('div', { class: 'two-up' }, LAYOUT.combat.map((n) => field(n))),
      el('div', {}, LAYOUT.gear.map((n) => field(n))),
    ]);
    const rest = S.filter((s) => !used.has(s.name));
    if (rest.length) sheet.appendChild(el('div', { class: 'sheet-sec' }, [el('h4', {}, ['Also declared']), rest.map((s) => field(s.name))]));
    return sheet;
  }

  // ── the character file ──
  // A hero's file carries the character, its live state, its archived versions and its log (the
  // table's entries for this hero), so a campaign can move a hero from one table to another whole.
  function readFile(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Not a character file.');
    if (obj.kind === FILE_KIND && obj.system && obj.system !== ((window.VttConfig || {}).system || 'tor2e')) throw new Error('That character file is for ' + obj.system + ', not The One Ring.');
    const v = obj.kind === FILE_KIND && obj.character ? obj.character : obj;
    return complete(v);
  }
  function fileOf(v, lv, extra) {
    const x = extra || {};
    return { kind: FILE_KIND, version: 1, system: (window.VttConfig || {}).system || 'tor2e', templateId: (declaration() || {}).id || null, exported: new Date().toISOString(), name: v.Name || '', character: v, live: lv || undefined,
      versions: x.versions && x.versions.length ? x.versions : undefined, log: x.log && x.log.length ? x.log : undefined };
  }
  function download(v, lv, extra) {
    const blob = new Blob([JSON.stringify(fileOf(v, lv, extra), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (v.Name || 'player-hero').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.tor2e-hero.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function memberFrom(v, source, lv, extra) {
    const x = extra || {};
    const m = { id: State().genId('pc'), templateId: (declaration() || {}).id || '#tor5PlayerHero00001', name: v.Name || 'Unnamed', source: source || { kind: 'file' }, character: v, live: lv || {}, notes: '', playerNotes: '' };
    if (x.versions && x.versions.length) m.versions = x.versions;
    if (x.log && x.log.length) m.history = x.log;
    return m;
  }
  const readMember = (obj, fileName) => memberFrom(readFile(obj), { kind: 'file', name: fileName || null }, obj && obj.live, { versions: obj && obj.versions, log: obj && obj.log });
  // while an archived version is on screen the file waits: the page shows one thing, the file another
  function downloadMember(m) {
    if (isViewingArchive(m)) { alert('An archived version of ' + m.name + ' is on screen. Return to Current to download the file.'); return; }
    const log = logOf(m).map((x) => { const y = Object.assign({}, x); delete y.memberId; return y; });
    download(m.character || blank(), m.live || {}, { versions: m.versions || [], log });
  }

  // ── play: the record — every change to a tracker is logged with its cause ──
  const memberNow = (id, fallback) => ((State().state || {}).party || []).find((p) => p.id === id) || fallback || null;
  // the live keys a change is logged for, by their sheet names
  const TRACKED = { endurance: 'Endurance', hope: 'Hope', shadow: 'Shadow', scars: 'Shadow Scars', fatigue: 'Fatigue', spEarned: 'Skill points earned', spSpent: 'Skill points spent', apEarned: 'Adventure points earned', apSpent: 'Adventure points spent' };
  const FLAGS = { wounded: 'Wounded', dying: 'Dying', inspired: 'Inspired' };
  function logEvent(m, text, why) {
    State().commit('appendLog', [{ at: Date.now(), kind: 'event', who: m.name, memberId: m.id, text, why: why || null }]);
  }
  // change(m, patch, why): the patch applied to the hero's live state, and one log line naming
  // every tracker it moved ("Hope 12 → 11"); `always` logs the cause even when nothing moved
  function change(m, p, why, always) {
    const mm = memberNow(m.id, m);
    const cur = live(mm);
    const x = xp(mm);
    const from = (k) => (k === 'spEarned' ? x.sp.earned : k === 'spSpent' ? x.sp.spent : k === 'apEarned' ? x.ap.earned : k === 'apSpent' ? x.ap.spent : cur[k]);
    const lines = Object.keys(p).map((k) => {
      if (TRACKED[k]) return from(k) === p[k] ? null : TRACKED[k] + ' ' + (from(k) == null ? '—' : from(k)) + ' → ' + p[k];
      if (FLAGS[k]) return !!cur[k] === !!p[k] ? null : FLAGS[k] + (p[k] ? ' — marked' : ' — cleared');
      if (k === 'injury') return (cur.injury || '') === (p.injury || '') ? null : 'Injury: ' + (p.injury || '—');
      return null;
    }).filter(Boolean);
    State().commit('setPartyLive', [mm.id, p]);
    if (lines.length || (why && always)) logEvent(mm, lines.join(' · '), why);
  }
  const patch = (m, p, why) => change(m, p, why);

  // ── experience: Skill points and Adventure points, earned and spent ──
  // The sheet's printed "Skill Points" and "Adventure Points" are the points a hero starts with
  // (earned, none spent); play adds to earned (End session, Yule) and spending adds to spent, each
  // spend a ledger line (cost · pool · what · when).
  function xp(m) {
    const v = m.character || {};
    const lv = m.live || {};
    const sp = { earned: lv.spEarned != null ? lv.spEarned : (v['Skill Points'] || 0), spent: lv.spSpent || 0 };
    const ap = { earned: lv.apEarned != null ? lv.apEarned : (v['Adventure Points'] || 0), spent: lv.apSpent || 0 };
    sp.available = sp.earned - sp.spent;
    ap.available = ap.earned - ap.spent;
    return { sp, ap, ledger: lv.xpLedger || [] };
  }
  const POOLS = { sp: 'Skill points', ap: 'Adventure points' };
  function spend(m, pool, cost, what) {
    const mm = memberNow(m.id, m);
    const x = xp(mm);
    const line = { cost, pool, what, when: new Date().toISOString().slice(0, 10) };
    State().commit('setPartyLive', [mm.id, { xpLedger: x.ledger.concat([line]) }]);
    change(mm, { [pool + 'Spent']: x[pool].spent + cost }, 'spent on ' + what);
  }
  function xpBlock(m, ro) {
    const x = xp(m);
    const adj = (key, d) => { const cur = xp(memberNow(m.id, m)); const pool = key.slice(0, 2); const f = key.slice(2) === 'Earned' ? 'earned' : 'spent'; change(m, { [key]: Math.max(0, cur[pool][f] + d) }); };
    const row = (pool) => el('div', { class: 'xp-row' }, [
      el('span', { class: 'track-name' }, [cite(pool === 'sp' ? RULES.skillPoints : RULES.adventurePoints, POOLS[pool])]),
      el('span', { class: 'soc' }, ['earned ', ro ? null : button('−', () => adj(pool + 'Earned', -1), 'ghost tiny'), el('b', { class: 'num' }, [String(x[pool].earned)]), ro ? null : button('+', () => adj(pool + 'Earned', 1), 'ghost tiny')]),
      el('span', { class: 'soc' }, ['spent ', el('b', { class: 'num' }, [String(x[pool].spent)])]),
      el('span', { class: 'soc' }, ['to spend ', el('b', { class: 'num xp-avail' }, [String(x[pool].available)])]),
    ]);
    const ledger = x.ledger.length ? el('ul', { class: 'items xp-ledger' }, x.ledger.map((e) => el('li', {}, [el('b', { class: 'num' }, [String(e.cost)]), ' ' + (POOLS[e.pool] || '') + ' · ', e.what, e.when ? el('span', { class: 'muted small' }, [' · ' + e.when]) : null]))) : null;
    let form = null;
    if (!ro) {
      const cost = el('input', { class: 'text num small', type: 'number', min: 1, placeholder: 'cost' });
      const pool = el('select', { class: 'scope tiny' }, Object.keys(POOLS).map((k) => el('option', { value: k }, [POOLS[k]])));
      const what = el('input', { class: 'text small', type: 'text', placeholder: 'on what (Scan 2 → 3, Valour 2 → 3…)' });
      form = el('div', { class: 'chiprow tight' }, [cost, pool, what, button('Spend', () => {
        const n = parseInt(cost.value || '0', 10);
        if (!(n > 0) || !what.value.trim()) return;
        if (n > xp(memberNow(m.id, m))[pool.value].available) { alert('Not enough ' + POOLS[pool.value] + ' to spend.'); return; }
        spend(m, pool.value, n, what.value.trim());
      }, 'ghost tiny')]);
    }
    return el('div', { class: 'xp' }, [row('sp'), row('ap'), ledger, form]);
  }

  // ── the Company's session and Fellowship bookkeeping (the Company panel calls these) ──
  // End session: every hero who attended earns 3 Skill points and 3 Adventure points.
  function endSession(ids) {
    ids.forEach((id) => {
      const mm = memberNow(id);
      if (!mm) return;
      const x = xp(mm);
      change(mm, { spEarned: x.sp.earned + SESSION_SKILL_POINTS, apEarned: x.ap.earned + SESSION_ADVENTURE_POINTS, session: ((mm.live || {}).session || 0) + 1 }, 'end of the session', true);
    });
  }
  // The Fellowship phase: Hope back equal to HEART (all of it at Yule), the Shadow points the
  // Loremaster allows removed (0–3), and at Yule the bonus Skill points equal to WITS and a year's age.
  function fellowship(ids, opts) {
    const o = opts || {};
    const off = Math.max(0, Math.min(SHADOW_REMOVED_MAX, o.shadow || 0));
    ids.forEach((id) => {
      const mm = memberNow(id);
      if (!mm) return;
      const v = complete(mm.character || {});
      const l = live(mm);
      const p = {};
      if (v.Hope != null) p.hope = o.yule ? v.Hope : Math.min(v.Hope, (l.hope || 0) + (v.Heart || 0));
      if (off) p.shadow = Math.max(0, l.shadow - off);
      if (o.yule) p.spEarned = xp(mm).sp.earned + (v.Wits || 0);
      change(mm, p, o.yule ? 'Yule' : 'the Fellowship phase', true);
      if (o.yule && v.Age != null) {
        State().commit('patchPartyCharacter', [mm.id, { Age: v.Age + YULE_AGE }]);
        logEvent(mm, 'Age ' + v.Age + ' → ' + (v.Age + YULE_AGE), 'Yule');
      }
    });
  }

  // ── versions: an archived copy of the hero and its live state, read-only ──
  // The picker shows one in place of the live sheet (a local view — the member does not change).
  // Archiving is an op (system/tor2e/ops.js), so the room keeps it with the member.
  const viewing = {};
  const versionsOf = (m) => m.versions || [];
  const naming = {};   // member id → the archive form is open (a name field, not a prompt: phones)
  function archive(m, label) {
    const mm = memberNow(m.id, m);
    const name = String(label || '').trim();
    if (!name) return;
    const snap = JSON.parse(JSON.stringify({ character: mm.character || {}, live: mm.live || {} }));
    State().commit('archivePartyVersion', [mm.id, { id: State().genId('v'), label: name, date: new Date().toISOString().slice(0, 10), character: snap.character, live: snap.live }]);
    logEvent(mm, 'Archived this version as “' + name + '”', 'version');
  }
  const isViewingArchive = (m) => !!viewing[m.id] && versionsOf(m).some((x) => x.id === viewing[m.id]);
  function versionPicker(m, redraw, ro) {
    const vs = versionsOf(m);
    const sel = el('select', { class: 'scope tiny', title: 'Versions of this hero: the live sheet, or an archived one (read-only)' },
      [el('option', { value: '' }, ['Current'])].concat(vs.map((x) => el('option', { value: x.id, selected: viewing[m.id] === x.id || null }, [x.label + (x.date ? ' · ' + x.date : '')]))));
    sel.addEventListener('change', () => { viewing[m.id] = sel.value || null; redraw(); });
    if (ro) return vs.length ? el('span', { class: 'chiprow tight' }, [sel]) : null;
    if (naming[m.id]) {
      const name = el('input', { class: 'text small', type: 'text', value: 'Version ' + (vs.length + 1), 'aria-label': 'Name this version' });
      const done = () => { naming[m.id] = false; redraw(); };
      return el('span', { class: 'chiprow tight' }, [vs.length ? sel : null, name,
        button('Archive', () => { archive(m, name.value); done(); }, 'tiny'), button('Cancel', done, 'ghost tiny'),
        el('span', { class: 'muted small' }, ['kept read-only'])]);
    }
    return el('span', { class: 'chiprow tight' }, [vs.length ? sel : null, button('Archive this version…', () => { naming[m.id] = true; redraw(); }, 'ghost tiny')]);
  }

  // a hero's log: what its file brought (earlier tables), then this table's entries
  function logOf(m) {
    const here = (((State().state || {}).log) || []).filter((x) => (x.kind === 'roll' || x.kind === 'event') && x.memberId === m.id);
    const seen = new Set(here.map((x) => x.at + '|' + x.kind));
    return (m.history || []).filter((x) => !seen.has(x.at + '|' + x.kind)).concat(here);
  }
  const logLine = (x) => el('div', { class: 'roll-line' + (x.ok ? ' ok' : x.ok === false ? ' fail' : '') + (x.kind === 'event' ? ' event' : '') }, [
    el('span', { class: 'roll-who' }, [x.kind === 'event' ? (x.why || 'change') : (x.label || 'a roll')]),
    el('span', { class: 'roll-text', html: E.inline(x.text || '') }),
  ]);

  // ── the rolls ──
  function log(m, r, label) {
    State().commit('appendLog', [{ at: Date.now(), kind: 'roll', memberId: m.id, who: m.name, label, text: Dice.line(r), ok: r.ok, degree: r.degree }]);
  }

  // One roller per member, kept across redraws (a roll's own log entry redraws the panel;
  // a fresh roller would wipe the result the moment it appeared).
  const rollers = {};
  function rollerFor(m) {
    if (!rollers[m.id]) {
      const r = Dice.roller({ rating: 0, tn: '', onRule: (id) => window.TorOpenEntity && window.TorOpenEntity(id), onRoll: (x) => {
        const cur = memberNow(m.id, m);
        log(cur, x, r.what || 'a roll');
        if (r.spendHope) {
          change(cur, { hope: Math.max(0, live(cur).hope - HOPE_SPEND) }, 'spent on ' + (r.what || 'a roll'));
          r.spendHope = false;
        }
        // a roll set up for a purpose (an attack, a Protection roll: system/tor2e/combat.js) has its follow-up
        const tag = r.tag;
        r.tag = null;
        if (tag && tag.after) tag.after(x, memberNow(m.id, m));
      } });
      rollers[m.id] = r;
    }
    return rollers[m.id];
  }
  // set the roller for one of the sheet's abilities and roll it
  function rollAbility(m, what, rating, target, opts) {
    const o = opts || {};
    const r = rollerFor(m);
    const inspired = live(m).inspired;
    r.what = what + (o.hope ? ' (1 Hope' + (inspired ? ', Inspired' : '') + ')' : '');
    r.spendHope = !!o.hope;
    r.tag = o.tag || null;
    const gain = (o.gain || 0) + (o.hope ? (inspired ? INSPIRED_DICE : HOPE_DICE) : 0);
    r.set({ rating, tn: target == null ? '' : target, favour: o.favoured ? 'favoured' : null, weary: isWeary(m), miserable: isMiserable(m), switched: false, gain, lose: o.lose || 0 });
    if (o.setOnly) return r;
    r.querySelector('.roll-btn').click();
    r.set({ gain: 0, lose: 0 });
    return r;
  }

  const cite = (rule, label) => el('a', { class: 'ref rule-cite', href: '#', onclick: (ev) => { ev.preventDefault(); if (window.TorOpenEntity) window.TorOpenEntity(rule.id); } }, [label || rule.name]);
  const isUnconscious = (m) => live(m).endurance === 0;   // RULES.enduranceLoss

  // the running tallies, the conditions, the rests
  function tallies(m, v, ro) {
    const l = live(m);
    const tally = (label, key, max, rule) => {
      const cur = l[key];
      return el('div', { class: 'tile pool live' }, [
        el('div', { class: 'pool-n' }, [rule ? cite(rule, label) : label]),
        el('div', { class: 'pool-cur' }, [el('b', {}, [String(cur == null ? '—' : cur)]), max != null ? el('span', { class: 'muted small' }, [' / ' + max]) : null]),
        ro ? null : el('div', { class: 'chiprow tight' }, [
          button('−', () => patch(m, { [key]: Math.max(0, (cur || 0) - 1) }), 'ghost tiny'),
          button('+', () => patch(m, { [key]: max != null ? Math.min(max, (cur || 0) + 1) : (cur || 0) + 1 }), 'ghost tiny'),
        ]),
      ]);
    };
    return el('div', { class: 'stat-tiles' }, [
      tally('Endurance', 'endurance', v.Endurance),
      tally('Hope', 'hope', v.Hope),
      tally('Shadow', 'shadow', null, RULES.shadow),
      tally('Shadow Scars', 'scars', null, RULES.harden),
      tally('Fatigue', 'fatigue', null, RULES.fatigue),
      el('div', { class: 'tile pool' }, [el('div', { class: 'pool-n' }, [cite(RULES.load, 'Load')]), el('div', { class: 'pool-cur' }, [el('b', {}, [String(loadTotal(m))])]), el('div', { class: 'muted tiny' }, ['gear ' + gearLoad(v) + ' · Treasure ' + ((v.Treasure || 0) * TREASURE_LOAD) + ' · Fatigue ' + l.fatigue])]),
    ]);
  }
  function conditionsBlock(m, ro) {
    const l = live(m);
    const flag = (key, label, rule) => el('label', { class: 'cond' + (l[key] ? ' on' : '') }, [el('input', { type: 'checkbox', checked: l[key] || null, disabled: ro || null, onchange: (ev) => patch(m, { [key]: ev.target.checked }) }), ' ', rule ? cite(rule, label) : label]);
    return el('div', { class: 'chiprow tight conditions' }, [
      el('span', { class: 'cond' + (isWeary(m) ? ' on' : '') }, [cite(Dice.RULES.weary, 'Weary')]),
      el('span', { class: 'cond' + (isMiserable(m) ? ' on' : '') }, [cite(Dice.RULES.miserable, 'Miserable')]),
      isUnconscious(m) ? el('span', { class: 'cond on' }, [cite(RULES.enduranceLoss, 'Unconscious')]) : null,
      flag('wounded', 'Wounded', RULES.wounds),
      ro ? (l.injury ? el('span', { class: 'small' }, ['Injury: ' + l.injury]) : null) : el('input', { class: 'text small', type: 'text', placeholder: 'Injury', value: l.injury, onchange: (ev) => patch(m, { injury: ev.target.value }) }),
      flag('dying', 'Dying', RULES.dying),
      flag('inspired', 'Inspired'),
    ]);
  }
  function restsBlock(m, v) {
    const l = live(m);
    return el('div', { class: 'chiprow tight' }, [
      button('Short rest', () => patch(m, { endurance: Math.min(v.Endurance || 0, (l.endurance || 0) + (l.wounded ? 0 : (v.Strength || 0))) }, 'a short rest' + (l.wounded ? ' (Wounded: none recovered)' : '')), 'ghost tiny'),
      button('Prolonged rest', () => patch(m, { endurance: l.wounded ? Math.min(v.Endurance || 0, (l.endurance || 0) + (v.Strength || 0)) : v.Endurance }, 'a prolonged rest' + (l.wounded ? ' (Wounded: STRENGTH recovered)' : '')), 'ghost tiny'),
      el('span', { class: 'muted small' }, ['(', cite(RULES.resting), ')']),
      shadowTotal(m) < (v.Hope || 0) && l.shadow > 0 ? button('Harden Will: all Shadow → 1 Scar', () => patch(m, { shadow: 0, scars: l.scars + 1 }, 'Harden Will'), 'ghost tiny') : null,
    ]);
  }
  function header(m, v, extra) {
    const pic = m.portrait || null;
    return el('div', { class: 'sheet-headline' }, [
      pic ? el('img', { class: 'portrait', src: pic, alt: v.Name || m.name }) : null,
      el('div', { class: 'head-text' }, [el('h2', { class: 'chapter-h' }, [m.name]), el('div', { class: 'muted small' }, [sentence(v)]), extra || null]),
    ]);
  }

  // The live sheet: the hero as made, with the values play changes, the record and the rolls.
  function liveSheet(m, opts) {
    const o = opts || {};
    const redraw = () => window.VttBus.emit('state:remote', { view: true }, { local: true });
    // an archived version, read-only, in place of the live sheet
    if (isViewingArchive(m)) {
      const ver = versionsOf(m).find((x) => x.id === viewing[m.id]);
      const am = { id: m.id, name: m.name, character: ver.character, live: ver.live, portrait: m.portrait };
      const av = complete(ver.character || {});
      const box = el('div', { class: 'sheet live archived' });
      box.appendChild(header(am, av, versionPicker(m, redraw, true)));
      box.appendChild(el('div', { class: 'archive-banner' }, ['Viewing “' + ver.label + '”' + (ver.date ? ' (' + ver.date + ')' : '') + ' — archived, read-only. Downloading the file waits until you return to Current.']));
      box.appendChild(tallies(am, av, true));
      box.appendChild(conditionsBlock(am, true));
      box.appendChild(xpBlock(am, true));
      box.appendChild(render(av, null));
      return box;
    }
    // the player's copy: compact, in tabs on a phone (system/tor2e/player.js)
    if (o.player && window.TorPlayer) return window.TorPlayer.sheet(m, header, versionPicker(m, redraw, true));
    const v = complete(m.character || {});
    const l = live(m);
    const box = el('div', { class: 'sheet live' });
    box.appendChild(header(m, v, versionPicker(m, redraw, false)));
    const hopeBox = el('label', { class: 'check small' }, [el('input', { type: 'checkbox' }), ' spend 1 Hope (', cite(RULES.hope, 'gain (1d)'), ')']);
    const hopeOn = () => hopeBox.querySelector('input').checked;
    box.appendChild(tallies(m, v, false));
    box.appendChild(conditionsBlock(m, false));
    box.appendChild(restsBlock(m, v));
    // a combat the Loremaster has started (system/tor2e/combat.js)
    const fight = window.TorCombat && window.TorCombat.pane(m, o);
    if (fight) box.appendChild(fight);

    // the rolls
    box.appendChild(el('h4', {}, ['Rolls', el('span', { class: 'muted small' }, [' · Weary and Miserable are read off the sheet'])]));
    box.appendChild(el('div', { class: 'chiprow tight' }, [hopeBox]));
    const attrs = el('div', { class: 'roll-grid' }, ['Strength', 'Heart', 'Wits'].map((a) => el('div', { class: 'attr-col' }, [
      el('div', { class: 'attr-h' }, [a.toUpperCase(), el('span', { class: 'muted small' }, [' ' + (v[a] == null ? '—' : v[a]) + ' · TN ' + (tn(v, a) == null ? '—' : tn(v, a))])]),
      (v.Skills || []).filter((r) => attributeOf(r.Skill) === a).map((r) => el('button', { type: 'button', class: 'skill-roll' + (r.Favoured ? ' fav' : ''), title: 'Roll ' + r.Skill + (r.Favoured ? ' (Favoured)' : ''), onclick: () => rollAbility(m, r.Skill, r.Rank || 0, tn(v, a), { favoured: r.Favoured, hope: hopeOn() }) }, [
        r.Skill, el('span', { class: 'rk' }, [String(r.Rank || 0)]),
      ])),
    ])));
    box.appendChild(attrs);
    box.appendChild(el('div', { class: 'chiprow tight' }, [
      button('VALOUR ' + (v.Valour || 0) + ' vs HEART TN', () => rollAbility(m, 'Valour', v.Valour || 0, tn(v, 'Heart'), { hope: hopeOn() }), 'tiny'),
      button('WISDOM ' + (v.Wisdom || 0) + ' vs WITS TN', () => rollAbility(m, 'Wisdom', v.Wisdom || 0, tn(v, 'Wits'), { hope: hopeOn() }), 'tiny'),
      el('span', { class: 'muted small' }, ['(', cite(RULES.tnUse), ')']),
    ]));
    // attacks: a Combat Proficiency against the STRENGTH TN; the weapon's Damage and Injury beside it
    const C = window.TorCombat;
    const gear = (v['War Gear'] || []).filter((w) => w && w.hash);
    box.appendChild(el('h4', {}, ['War gear', el('span', { class: 'muted small' }, [' · attack rolls against the STRENGTH TN'])]));
    box.appendChild(gear.length ? el('div', { class: 'rated' }, gear.map((w) => {
      const wo = C.weaponOf(w);
      const rank = C.ratingFor(v, wo);
      return el('div', { class: 'rated-row' }, [
        el('span', { class: 'rated-main' }, [el('button', { class: 'ref', type: 'button', onclick: () => window.TorOpenEntity && window.TorOpenEntity(w.hash) }, [w.name]), el('span', { class: 'muted small' }, [' ' + weaponLine(w) + ' · ' + (wo.prof || '') + ' ' + rank + (wo.prof === 'Brawling' ? ' (highest proficiency, lose (1d))' : '')]), ' ', C.gripControl(m, wo)]),
        C.combatOf(m) ? null : button('Attack', () => C.attack(m, wo, null, { hope: hopeOn() }), 'tiny'),
      ]);
    })) : el('div', { class: 'muted small' }, ['No war gear on the sheet.']));
    // the Protection roll: the armour's and the helm's dice against the blow's Injury
    const prot = protectionOf(v);
    const injury = el('input', { class: 'text num small', type: 'number', placeholder: 'Injury' });
    box.appendChild(el('div', { class: 'chiprow tight' }, [
      el('span', {}, ['Protection ', el('b', {}, [prot + 'd'])]),
      el('span', { class: 'muted small' }, ['against the Injury']), injury,
      button('Protection roll', () => rollAbility(m, 'Protection', prot, injury.value === '' ? null : parseInt(injury.value, 10), { hope: hopeOn() }), 'tiny'),
      el('span', { class: 'muted small' }, ['(', cite(RULES.piercing), ')']),
    ]));
    box.appendChild(rollerFor(m));
    // the record: experience, then the hero's recent log
    box.appendChild(el('h4', {}, ['Experience', el('span', { class: 'muted small' }, [' · spent in the Fellowship phase (', cite(RULES.updates), ')'])]));
    box.appendChild(xpBlock(m, false));
    const recent = logOf(m).slice(-8).reverse();
    if (recent.length) box.appendChild(el('details', { class: 'hero-log' }, [el('summary', { class: 'muted small' }, ['The log · ' + logOf(m).length + ' entries']), recent.map(logLine)]));
    // the rest of the sheet, read-only
    box.appendChild(el('details', { class: 'sheet-rest' }, [el('summary', { class: 'muted small' }, ['The whole sheet']), render(v, null)]));
    if (o.gm) box.appendChild(el('div', {}, [el('div', { class: 'prop-k' }, ['Loremaster’s notes', el('span', { class: 'muted' }, [' · never sent to players'])]), el('textarea', { class: 'text', rows: 3, onchange: (ev) => State().commit('setPartyNotes', [m.id, ev.target.value]) }, [m.notes || ''])]));
    void l;
    return box;
  }
  const protectionOf = (v) => ['Armour', 'Helm'].map((k) => parseInt(D.f(recordOf(v[k]), 'Protection'), 10) || 0).reduce((a, b) => a + b, 0);

  return {
    ACTOR, FILE_KIND, RULES, control, spec, blank, complete, skills, proficiencies, culture, calling, attributeOf, tn, gearLoad, loadTotal,
    current: live, shadowTotal, isWeary, isMiserable, isUnconscious, sentence, statusLine, render, readFile, fileOf, download, memberFrom,
    readMember, downloadMember, live: liveSheet, rollerFor, rollAbility, refOf, recordOf, weaponLine, protectionOf,
    change, logEvent, xp, spend, endSession, fellowship, archive, isViewingArchive, logOf, memberNow,
    SESSION_SKILL_POINTS, SESSION_ADVENTURE_POINTS, SHADOW_REMOVED_MAX,
  };
})();
