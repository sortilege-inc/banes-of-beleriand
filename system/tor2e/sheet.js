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
  };
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
      wounded: !!lv.wounded, injury: lv.injury || '', inspired: !!lv.inspired,
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
    const cond = [isWeary(m) ? 'Weary' : null, isMiserable(m) ? 'Miserable' : null, l.wounded ? 'Wounded' : null].filter(Boolean);
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
  function readFile(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Not a character file.');
    if (obj.kind === FILE_KIND && obj.system && obj.system !== ((window.VttConfig || {}).system || 'tor2e')) throw new Error('That character file is for ' + obj.system + ', not The One Ring.');
    const v = obj.kind === FILE_KIND && obj.character ? obj.character : obj;
    return complete(v);
  }
  function fileOf(v, lv) {
    return { kind: FILE_KIND, version: 1, system: (window.VttConfig || {}).system || 'tor2e', templateId: (declaration() || {}).id || null, exported: new Date().toISOString(), name: v.Name || '', character: v, live: lv || undefined };
  }
  function download(v, lv) {
    const blob = new Blob([JSON.stringify(fileOf(v, lv), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (v.Name || 'player-hero').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.tor2e-hero.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function memberFrom(v, source, lv) {
    return { id: State().genId('pc'), templateId: (declaration() || {}).id || '#tor5PlayerHero00001', name: v.Name || 'Unnamed', source: source || { kind: 'file' }, character: v, live: lv || {}, notes: '', playerNotes: '' };
  }
  const readMember = (obj, fileName) => memberFrom(readFile(obj), { kind: 'file', name: fileName || null }, obj && obj.live);
  const downloadMember = (m) => download(m.character || blank(), m.live || {});

  // ── play: the live sheet and the rolls ──
  const patch = (m, p) => State().commit('setPartyLive', [m.id, p]);
  function log(m, r, label) {
    State().commit('appendLog', [{ at: Date.now(), kind: 'roll', memberId: m.id, who: m.name, label, text: Dice.line(r), ok: r.ok, degree: r.degree }]);
  }

  // One roller per member, kept across redraws (a roll's own log entry redraws the panel;
  // a fresh roller would wipe the result the moment it appeared).
  const rollers = {};
  function rollerFor(m) {
    if (!rollers[m.id]) {
      const r = Dice.roller({ rating: 0, tn: '', onRule: (id) => window.TorOpenEntity && window.TorOpenEntity(id), onRoll: (x) => {
        const cur = State().state.party.find((p) => p.id === m.id) || m;
        if (r.spendHope) {
          patch(cur, { hope: Math.max(0, live(cur).hope - HOPE_SPEND) });
          r.spendHope = false;
        }
        log(cur, x, r.what || 'a roll');
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
    r.set({ rating, tn: target == null ? '' : target, favour: o.favoured ? 'favoured' : null, weary: isWeary(m), miserable: isMiserable(m), switched: false });
    const gain = r.querySelectorAll('input.num')[2];
    if (gain) gain.value = o.hope ? String(inspired ? INSPIRED_DICE : HOPE_DICE) : '0';
    r.querySelector('.roll-btn').click();
    if (gain) gain.value = '0';
  }

  const cite = (rule, label) => el('a', { class: 'ref rule-cite', href: '#', onclick: (ev) => { ev.preventDefault(); if (window.TorOpenEntity) window.TorOpenEntity(rule.id); } }, [label || rule.name]);

  // The live sheet: the hero as made, with the values play changes and the rolls.
  function liveSheet(m, opts) {
    const o = opts || {};
    const v = complete(m.character || {});
    const l = live(m);
    const box = el('div', { class: 'sheet live' });
    box.appendChild(el('div', { class: 'sheet-headline' }, [el('h2', { class: 'chapter-h' }, [m.name]), el('div', { class: 'muted small' }, [sentence(v)])]));
    const hopeBox = el('label', { class: 'check small' }, [el('input', { type: 'checkbox' }), ' spend 1 Hope (', cite(RULES.hope, 'gain (1d)'), ')']);
    const hopeOn = () => hopeBox.querySelector('input').checked;

    // the running tallies
    const tally = (label, key, max, rule) => {
      const cur = key === 'endurance' ? l.endurance : key === 'hope' ? l.hope : l[key];
      return el('div', { class: 'tile pool live' }, [
        el('div', { class: 'pool-n' }, [rule ? cite(rule, label) : label]),
        el('div', { class: 'pool-cur' }, [el('b', {}, [String(cur == null ? '—' : cur)]), max != null ? el('span', { class: 'muted small' }, [' / ' + max]) : null]),
        el('div', { class: 'chiprow tight' }, [
          button('−', () => patch(m, { [key]: Math.max(0, (cur || 0) - 1) }), 'ghost tiny'),
          button('+', () => patch(m, { [key]: max != null ? Math.min(max, (cur || 0) + 1) : (cur || 0) + 1 }), 'ghost tiny'),
        ]),
      ]);
    };
    box.appendChild(el('div', { class: 'stat-tiles' }, [
      tally('Endurance', 'endurance', v.Endurance),
      tally('Hope', 'hope', v.Hope),
      tally('Shadow', 'shadow', null, RULES.shadow),
      tally('Shadow Scars', 'scars', null, RULES.harden),
      tally('Fatigue', 'fatigue', null, RULES.fatigue),
      el('div', { class: 'tile pool' }, [el('div', { class: 'pool-n' }, [cite(RULES.load, 'Load')]), el('div', { class: 'pool-cur' }, [el('b', {}, [String(loadTotal(m))])]), el('div', { class: 'muted tiny' }, ['gear ' + gearLoad(v) + ' · Treasure ' + ((v.Treasure || 0) * TREASURE_LOAD) + ' · Fatigue ' + l.fatigue])]),
    ]));
    box.appendChild(el('div', { class: 'chiprow tight conditions' }, [
      el('span', { class: 'cond' + (isWeary(m) ? ' on' : '') }, [cite(Dice.RULES.weary, 'Weary')]),
      el('span', { class: 'cond' + (isMiserable(m) ? ' on' : '') }, [cite(Dice.RULES.miserable, 'Miserable')]),
      el('label', { class: 'cond' + (l.wounded ? ' on' : '') }, [el('input', { type: 'checkbox', checked: l.wounded || null, onchange: (ev) => patch(m, { wounded: ev.target.checked }) }), ' Wounded']),
      el('input', { class: 'text small', type: 'text', placeholder: 'Injury', value: l.injury, onchange: (ev) => patch(m, { injury: ev.target.value }) }),
      el('label', { class: 'cond' + (l.inspired ? ' on' : '') }, [el('input', { type: 'checkbox', checked: l.inspired || null, onchange: (ev) => patch(m, { inspired: ev.target.checked }) }), ' Inspired']),
    ]));
    box.appendChild(el('div', { class: 'chiprow tight' }, [
      button('Short rest', () => patch(m, { endurance: Math.min(v.Endurance || 0, (l.endurance || 0) + (l.wounded ? 0 : (v.Strength || 0))) }), 'ghost tiny'),
      button('Prolonged rest', () => patch(m, { endurance: l.wounded ? Math.min(v.Endurance || 0, (l.endurance || 0) + (v.Strength || 0)) : v.Endurance }), 'ghost tiny'),
      el('span', { class: 'muted small' }, ['(', cite(RULES.resting), ')']),
      shadowTotal(m) < (v.Hope || 0) && l.shadow > 0 ? button('Harden Will: all Shadow → 1 Scar', () => patch(m, { shadow: 0, scars: l.scars + 1 }), 'ghost tiny') : null,
    ]));

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
    const profOf = (w) => (v['Combat Proficiencies'] || []).find((p) => p.Skill === D.f(recordOf(w), 'Proficiency'));
    const gear = (v['War Gear'] || []);
    box.appendChild(el('h4', {}, ['War gear', el('span', { class: 'muted small' }, [' · attack rolls against the STRENGTH TN'])]));
    box.appendChild(gear.length ? el('div', { class: 'rated' }, gear.map((w) => {
      const p = profOf(w);
      const rank = p ? p.Rank || 0 : 0;
      return el('div', { class: 'rated-row' }, [
        el('span', { class: 'rated-main' }, [el('button', { class: 'ref', type: 'button', onclick: () => window.TorOpenEntity && window.TorOpenEntity(w.hash) }, [w.name]), el('span', { class: 'muted small' }, [' ' + weaponLine(w) + ' · ' + (D.f(recordOf(w), 'Proficiency') || '') + ' ' + rank])]),
        button('Attack', () => rollAbility(m, 'Attack with ' + w.name, rank, tn(v, 'Strength'), { hope: hopeOn() }), 'tiny'),
      ]);
    })) : el('div', { class: 'muted small' }, ['No war gear on the sheet.']));
    // the Protection roll: the armour's and the helm's dice against the blow's Injury
    const prot = ['Armour', 'Helm'].map((k) => parseInt(D.f(recordOf(v[k]), 'Protection'), 10) || 0).reduce((a, b) => a + b, 0);
    const injury = el('input', { class: 'text num small', type: 'number', placeholder: 'Injury' });
    box.appendChild(el('div', { class: 'chiprow tight' }, [
      el('span', {}, ['Protection ', el('b', {}, [prot + 'd'])]),
      el('span', { class: 'muted small' }, ['against the Injury']), injury,
      button('Protection roll', () => rollAbility(m, 'Protection', prot, injury.value === '' ? null : parseInt(injury.value, 10), { hope: hopeOn() }), 'tiny'),
      el('span', { class: 'muted small' }, ['(', cite(RULES.piercing), ')']),
    ]));
    box.appendChild(rollerFor(m));
    // the rest of the sheet, read-only
    box.appendChild(el('details', { class: 'sheet-rest' }, [el('summary', { class: 'muted small' }, ['The whole sheet']), render(v, null)]));
    if (o.gm) box.appendChild(el('div', {}, [el('div', { class: 'prop-k' }, ['Loremaster’s notes', el('span', { class: 'muted' }, [' · never sent to players'])]), el('textarea', { class: 'text', rows: 3, onchange: (ev) => State().commit('setPartyNotes', [m.id, ev.target.value]) }, [m.notes || ''])]));
    return box;
  }

  return {
    ACTOR, FILE_KIND, RULES, control, spec, blank, complete, skills, proficiencies, culture, calling, attributeOf, tn, gearLoad, loadTotal,
    current: live, shadowTotal, isWeary, isMiserable, sentence, statusLine, render, readFile, fileOf, download, memberFrom,
    readMember, downloadMember, live: liveSheet, rollerFor, rollAbility, refOf, recordOf, weaponLine,
  };
})();
