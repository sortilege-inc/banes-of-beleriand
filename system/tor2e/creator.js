// system/tor2e/creator.js — making a Player-hero: the core's own procedure (Chapter 3,
// *Your Characters* and *Answer the Call to Adventure*, page 28) walked step by step. Each
// printed step is shown verbatim beside its control, and the control is what the step says,
// over the typed records the step names: "Determine your Attributes, choosing a set or rolling
// a Success die" offers the chosen culture's six Attribute Sets and a Success die; "Calculate
// your Derived Stats" computes them from the culture's printed formulas. A step is matched to
// its control by the words it prints (STEP_WORDS); a step no control matches is shown as text.
// The controls are the sheet's own (TorSheet), over one draft in the browser's roster; what
// leaves is a character file the Loremaster's table reads.
window.TorCreator = (function () {
  const { el, button } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Dice = window.TorDice;
  const Sheet = window.TorSheet;
  const Roster = window.TorRoster;
  const Site = () => window.VttSite;

  // the two printed step lists, and the rules the steps rest on (core, Chapter 3)
  const YOUR_CHARACTERS = '#tzBaVld9HLxfcPkXK2ySmcK';          // "Your Characters": choose a Heroic Culture, then steps 1–7
  const CALL_TO_ADVENTURE = '#tm30wGCvlLHjhzODdQZYbZS';        // "Answer the Call to Adventure": steps 1–4
  const PREVIOUS_EXPERIENCE = '#tdNUI1rCSkUaW3QlVniUyhe';      // "Players have 10 points to spend …"
  const SKILL_COSTS = '#tTPP7YnRhpvkSRLR1Ef7681';
  const PROFICIENCY_COSTS = '#t4zhV4e8jWrdxga9MvpwfoA';
  const STARTING_REWARD = '#t7zMaJe4zuIpnWUN1IgR8AC';          // "start with a rating of 1 in both characteristics"
  const WAR_GEAR = '#t6SK1mKTVjP3vTJGIHhT2GB';                 // "one weapon for each Combat Proficiency for which they have a rating"
  const USEFUL_ITEMS = '#tE9uDL1EdeqZpD6M6iRI75z';             // the Useful Items table, by Standard of Living
  const PREVIOUS_POINTS = 10;       // PREVIOUS_EXPERIENCE: "Players have 10 points to spend on raising Skills and Combat Proficiencies."
  const STARTING_VALOUR = 1;        // STARTING_REWARD: "start with a rating of 1 in both characteristics"
  const STARTING_WISDOM = 1;
  const CALLING_FAVOURED = 2;       // Callings: "you choose two Skills among those listed and mark them as Favoured"
  const FEATURES_TO_CHOOSE = 2;     // each culture: "Choose two Distinctive Features among those listed"

  // which control a printed step gets, by the words it prints
  const STEP_WORDS = [
    ['blessing', /Cultural Blessing/], ['attributes', /Determine your Attributes/], ['tns', /Target Numbers/],
    ['derived', /Derived Stats/], ['ranks', /Skill and Combat Proficiency/], ['features', /Distinctive Features/],
    ['name', /Name and Age/], ['calling', /Choose a Calling/], ['experience', /Previous Experience/],
    ['gear', /starting Gear/], ['valour', /VALOUR\W+and\W+\**WISDOM/],
  ];

  // ── the printed steps ──
  // "Your Characters" prints two numbered runs in one list: the six cultures ("1. Bardings
  // page 32" …) and the seven steps. The steps are the items that do not end in a page number.
  function steps() {
    const out = [];
    const from = (id, part) => {
      const e = D.entity(id);
      ((e && D.val(e, 'Steps')) || []).map((x) => String(x.value)).filter((t) => !/page \d+$/.test(t)).forEach((t) => {
        const hit = STEP_WORDS.find((w) => w[1].test(t));
        out.push({ part, text: t, kind: hit ? hit[0] : 'text' });
      });
    };
    from(YOUR_CHARACTERS, 'Your Characters');
    from(CALL_TO_ADVENTURE, 'Answer the Call to Adventure');
    return out;
  }

  // ── the draft ──
  function draft() {
    const cur = Roster.current();
    if (cur) return Object.assign({}, cur, { character: Sheet.complete(cur.character) });
    const id = Roster.add(Sheet.blank());
    return Roster.get(id);
  }
  function change(d, patch) {
    Object.assign(d.character, patch);
    Roster.save(d.id, d.character);
  }

  // ── what the culture and the calling print ──
  const cultureOf = (v) => Sheet.culture(v);
  const callingOf = (v) => Sheet.calling(v);
  const fields = (e, name) => D.fieldsOf(D.prop(e, name));
  function attributeSets(c) {
    return (D.val(c, 'Attribute Sets') || []).map((it) => {
      const f = {};
      (it.fields || []).forEach((x) => { f[x.name] = x.value; });
      return f;
    });
  }
  // "N points" → N (the cost tables' cells)
  const points = (cell) => parseInt(String(cell).replace(/[^\d]/g, ''), 10) || 0;
  // the cost to go up ONE level from `rank`, off a printed cost table (row i = from i to i+1)
  function costFrom(tableId, rank) {
    const t = (D.entity(tableId) || {}).table;
    return t && t.rows[rank] ? points(t.rows[rank][1]) : null;
  }

  // ── the controls, one per kind of step ──
  function control(step, d, redraw) {
    const v = d.character;
    const c = cultureOf(v);
    const k = step.kind;
    const need = (what) => el('div', { class: 'muted small' }, ['First ' + what + '.']);
    if (k === 'blessing') {
      if (!c) return need('choose a Heroic Culture');
      const b = fields(c, 'Cultural Blessing');
      if (v['Cultural Blessing'] !== b.Name) setTimeout(() => { change(d, { 'Cultural Blessing': b.Name }); redraw(); }, 0);
      return el('div', { class: 'creator-out' }, [el('b', {}, [b.Name || '']), b.Effect ? el('span', { html: ' — ' + E.inline(b.Effect) }) : null]);
    }
    if (k === 'attributes') {
      if (!c) return need('choose a Heroic Culture');
      const sets = attributeSets(c);
      const pick = (s) => change(d, { Strength: s.Strength, Heart: s.Heart, Wits: s.Wits, _attributeRoll: s.Roll });
      return el('div', {}, [
        D.text(c, 'Attributes Text') ? el('div', { class: 'muted small', html: E.inline(D.text(c, 'Attributes Text')) }) : null,
        el('table', { class: 'records sets' }, [
          el('thead', {}, [el('tr', {}, ['Roll', 'Strength', 'Heart', 'Wits', ''].map((h) => el('th', {}, [h])))]),
          el('tbody', {}, sets.map((s) => el('tr', { class: v._attributeRoll === s.Roll ? 'chosen' : '' }, [
            el('td', { class: 'num' }, [String(s.Roll)]), el('td', { class: 'num' }, [String(s.Strength)]), el('td', { class: 'num' }, [String(s.Heart)]), el('td', { class: 'num' }, [String(s.Wits)]),
            el('td', {}, [button(v._attributeRoll === s.Roll ? 'chosen' : 'Choose', () => { pick(s); redraw(); }, 'ghost tiny')]),
          ]))),
        ]),
        el('div', { class: 'chiprow' }, [button('Roll a Success die', () => {
          const face = 1 + Math.floor(Math.random() * Dice.SUCCESS_SIDES);
          const s = sets.find((x) => x.Roll === face);
          if (s) { pick(s); change(d, { _attributeDie: face }); }
          redraw();
        }), v._attributeDie ? el('span', { class: 'muted small' }, ['rolled ' + v._attributeDie]) : null]),
      ]);
    }
    if (k === 'tns') {
      return el('div', { class: 'creator-out' }, ['Strength', 'Heart', 'Wits'].map((a) => el('span', { class: 'chip' }, [a + ' ' + (v[a] == null ? '—' : v[a]) + ' → TN ', el('b', {}, [String(Sheet.tn(v, a) == null ? '—' : Sheet.tn(v, a))])])));
    }
    if (k === 'derived') {
      if (!c) return need('choose a Heroic Culture');
      if (v.Strength == null) return need('determine your Attributes');
      const ds = fields(c, 'Derived Stats');
      const calc = {};
      ['Endurance', 'Hope', 'Parry'].forEach((n) => { const f = ds[n]; if (f && f.Attribute) calc[n] = (v[f.Attribute] || 0) + (f.Bonus || 0); });
      if (['Endurance', 'Hope', 'Parry'].some((n) => calc[n] != null && v[n] !== calc[n])) setTimeout(() => { change(d, calc); redraw(); }, 0);
      return el('div', { class: 'creator-out' }, ['Endurance', 'Hope', 'Parry'].map((n) => {
        const f = ds[n] || {};
        return el('span', { class: 'chip' }, [n + ' = ' + (f.Attribute || '?').toUpperCase() + ' + ' + f.Bonus + ' = ', el('b', {}, [String(calc[n] == null ? '—' : calc[n])])]);
      }));
    }
    if (k === 'ranks') {
      if (!c) return need('choose a Heroic Culture');
      const ranks = {};
      (D.val(c, 'Skills') || []).forEach((it) => { const f = {}; (it.fields || []).forEach((x) => { f[x.name] = x.value; }); ranks[f.Skill] = f.Rank; });
      const copy = () => change(d, { Skills: v.Skills.map((r) => Object.assign({}, r, { Rank: ranks[r.Skill] != null ? ranks[r.Skill] : r.Rank })), _ranksFrom: c.id });
      const choice = String(D.text(c, 'Combat Proficiency Choice') || '');
      const instruction = String(D.text(c, 'Combat Proficiency Choice Instruction') || '');
      const options = choice.split(/\s+OR\s+/).map((s) => s.trim()).filter(Boolean);
      // the ranks the book prints beside the two lines (^"Combat Proficiencies" DEF { ^"<line>" INTEGER rank })
      const printedRank = fields(c, 'Combat Proficiencies');
      const rankFor = (key) => printedRank[key === '_profA' ? choice : instruction];
      const setProf = (name, rank, key) => {
        const prev = v[key];
        const list = v['Combat Proficiencies'].map((p) => (p.Skill === prev ? Object.assign({}, p, { Rank: 0 }) : p)).map((p) => (p.Skill === name ? Object.assign({}, p, { Rank: rank }) : p));
        change(d, { 'Combat Proficiencies': list, [key]: name });
        redraw();
      };
      // a culture whose record lacks a printed rank (none in the corpus today) lets the player enter it
      const rankIn = (key) => (rankFor(key) != null ? el('b', {}, [String(rankFor(key))]) : el('input', { class: 'text num small', type: 'number', min: '0', max: '6',
        value: v[key] ? String((v['Combat Proficiencies'].find((p) => p.Skill === v[key]) || {}).Rank || '') : '',
        onchange: (ev) => v[key] && setProf(v[key], parseInt(ev.target.value || '0', 10), key) }));
      const profPick = (key, names, label) => el('div', { class: 'chiprow tight' }, [
        el('span', { class: 'muted small', html: E.inline(label) }),
        el('select', { class: 'scope', onchange: (ev) => setProf(ev.target.value, rankFor(key) != null ? rankFor(key) : 0, key) }, [el('option', { value: '' }, ['—'])].concat(names.map((n) => el('option', { value: n, selected: v[key] === n || null }, [n])))),
        el('span', { class: 'muted small' }, ['rank']), rankIn(key),
      ]);
      // the Favoured Skill: one of the two the book underlines (^"Favoured Skill Choices")
      const pair = (D.val(c, 'Favoured Skill Choices') || []).map((x) => String(x.value));
      const setFav = (name) => {
        const keep = callingFavoured(v);
        change(d, { Skills: v.Skills.map((r) => Object.assign({}, r, { Favoured: r.Skill === name || keep.indexOf(r.Skill) !== -1 })), _cultureFavoured: name });
        redraw();
      };
      return el('div', {}, [
        el('div', { class: 'chiprow' }, [button(v._ranksFrom === c.id ? 'Copied — copy again' : 'Copy the ' + c.name + '’s Skill ranks', () => { copy(); redraw(); }, v._ranksFrom === c.id ? 'ghost tiny' : 'tiny')]),
        D.text(c, 'Skills Text') ? el('div', { class: 'small', html: E.inline(D.text(c, 'Skills Text')) }) : null,
        pair.length
          ? el('div', { class: 'chiprow tight' }, [el('span', { class: 'muted small' }, ['Favoured:'])].concat(pair.map((n) => button(n, () => setFav(n), v._cultureFavoured === n ? 'tiny' : 'ghost tiny'))))
          : el('div', { class: 'chiprow tight' }, [el('span', { class: 'muted small' }, ['Favoured:']), el('select', { class: 'scope', onchange: (ev) => setFav(ev.target.value) },
            [el('option', { value: '' }, ['—'])].concat(v.Skills.map((r) => el('option', { value: r.Skill, selected: v._cultureFavoured === r.Skill || null }, [r.Skill + ' ' + (r.Rank || 0)]))))]),
        D.text(c, 'Combat Proficiency Note') ? el('div', { class: 'small', html: E.inline(D.text(c, 'Combat Proficiency Note')) }) : null,
        profPick('_profA', options, choice),
        profPick('_profB', Sheet.proficiencies().map((r) => r.name).filter((n) => n !== v._profA), instruction),
      ]);
    }
    if (k === 'features') {
      if (!c) return need('choose a Heroic Culture');
      const opts = (D.val(c, 'Distinctive Feature Options') || []).map((x) => String(x.value));
      const mine = (v['Distinctive Features'] || []).filter((f) => opts.indexOf(f.name) !== -1);
      const toggle = (name) => {
        const rec = D.byType('Distinctive Feature').find((r) => r.name === name);
        const others = (v['Distinctive Features'] || []).filter((f) => opts.indexOf(f.name) === -1);
        let next = mine.some((f) => f.name === name) ? mine.filter((f) => f.name !== name) : mine.concat([rec ? Sheet.refOf(rec) : { hash: null, name }]);
        if (next.length > FEATURES_TO_CHOOSE) next = next.slice(next.length - FEATURES_TO_CHOOSE);
        change(d, { 'Distinctive Features': others.concat(next) });
        redraw();
      };
      return el('div', {}, [
        D.text(c, 'Distinctive Features Text') ? el('div', { class: 'small', html: E.inline(D.text(c, 'Distinctive Features Text')) }) : null,
        el('div', { class: 'chiprow tight' }, opts.map((n) => button(n, () => toggle(n), mine.some((f) => f.name === n) ? 'tiny' : 'ghost tiny'))),
      ]);
    }
    if (k === 'name') {
      const names = c ? D.prop(c, 'Typical Names') : null;
      return el('div', {}, [
        el('div', { class: 'chiprow tight' }, [
          el('input', { class: 'text', type: 'text', placeholder: 'Name', value: v.Name || '', onchange: (ev) => { change(d, { Name: ev.target.value }); redraw(); } }),
          el('input', { class: 'text num', type: 'number', placeholder: 'Age', value: v.Age == null ? '' : v.Age, onchange: (ev) => change(d, { Age: ev.target.value === '' ? null : parseInt(ev.target.value, 10) }) }),
        ]),
        names ? el('details', {}, [el('summary', { class: 'muted small' }, ['Typical names of the ' + c.name]), E.fields(names.fields)]) : null,
      ]);
    }
    if (k === 'calling') {
      const cl = callingOf(v);
      const opts = cl ? (D.val(cl, 'Favoured Skill Options') || []).map((x) => String(x.value)) : [];
      const chosen = callingFavoured(v);
      const setCalling = (rec) => {
        const e = rec ? D.entity(rec.id) : null;
        const feat = e ? D.text(e, 'Additional Distinctive Feature') : null;
        const oldFeat = cl ? D.text(cl, 'Additional Distinctive Feature') : null;
        const features = (v['Distinctive Features'] || []).filter((f) => f.name !== oldFeat);
        if (feat) features.push((() => { const r = D.byType('Distinctive Feature').find((x) => x.name === feat); return r ? Sheet.refOf(r) : { hash: null, name: feat }; })());
        change(d, { Calling: rec ? Sheet.refOf(rec) : null, 'Shadow Path': e ? D.text(e, 'Shadow Path') || '' : '', 'Distinctive Features': features, _callingFavoured: [],
          Skills: v.Skills.map((r) => Object.assign({}, r, { Favoured: r.Skill === v._cultureFavoured })) });
        redraw();
      };
      const toggleFav = (name) => {
        let next = chosen.indexOf(name) !== -1 ? chosen.filter((x) => x !== name) : chosen.concat([name]);
        if (next.length > CALLING_FAVOURED) next = next.slice(next.length - CALLING_FAVOURED);
        change(d, { _callingFavoured: next, Skills: v.Skills.map((r) => Object.assign({}, r, { Favoured: r.Skill === v._cultureFavoured || next.indexOf(r.Skill) !== -1 })) });
        redraw();
      };
      return el('div', {}, [
        el('div', { class: 'chiprow tight' }, D.byType('Calling').map((r) => button(r.name, () => setCalling(r), v.Calling && v.Calling.hash === r.id ? 'tiny' : 'ghost tiny'))),
        cl ? el('div', {}, [
          D.text(cl, 'Favoured Skills Text') ? el('div', { class: 'small', html: E.inline(D.text(cl, 'Favoured Skills Text')) }) : null,
          el('div', { class: 'chiprow tight' }, opts.map((n) => button(n, () => toggleFav(n), chosen.indexOf(n) !== -1 ? 'tiny' : 'ghost tiny'))),
          el('div', { class: 'small' }, ['Additional Distinctive Feature: ', el('b', {}, [D.text(cl, 'Additional Distinctive Feature') || '']), ' · Shadow Path: ', el('b', {}, [D.text(cl, 'Shadow Path') || ''])]),
        ]) : null,
      ]);
    }
    if (k === 'experience') {
      const spent = v._experienceSpent || 0;
      const left = PREVIOUS_POINTS - spent;
      const row = (key, r, tableId) => {
        const up = costFrom(tableId, r.Rank || 0);
        const down = (r.Rank || 0) > (baseRank(v, key, r.Skill)) ? costFrom(tableId, (r.Rank || 0) - 1) : null;
        return el('div', { class: 'rated-row' }, [
          el('span', { class: 'rated-main' }, [r.Skill]), el('b', {}, [String(r.Rank || 0)]),
          (() => {
            const b = button('+' + (up == null ? '' : ' (' + up + ')'), () => { change(d, { [key]: v[key].map((x) => (x.Skill === r.Skill ? Object.assign({}, x, { Rank: (x.Rank || 0) + 1 }) : x)), _experienceSpent: spent + up }); redraw(); }, 'ghost tiny');
            b.disabled = up == null || up > left;
            return b;
          })(),
          down != null ? button('−', () => { change(d, { [key]: v[key].map((x) => (x.Skill === r.Skill ? Object.assign({}, x, { Rank: (x.Rank || 0) - 1 }) : x)), _experienceSpent: spent - down }); redraw(); }, 'ghost tiny') : null,
        ]);
      };
      if (!v._experienceBase) setTimeout(() => { change(d, { _experienceBase: { Skills: v.Skills.map((r) => [r.Skill, r.Rank || 0]), 'Combat Proficiencies': v['Combat Proficiencies'].map((r) => [r.Skill, r.Rank || 0]) } }); }, 0);
      return el('div', {}, [
        el('div', { class: 'chiprow tight' }, [el('b', {}, [left + ' of ' + PREVIOUS_POINTS + ' points left']), button('Start again from the culture’s ranks', () => { const b = v._experienceBase; if (b) change(d, { Skills: v.Skills.map((r) => Object.assign({}, r, { Rank: (b.Skills.find((x) => x[0] === r.Skill) || [0, r.Rank])[1] })), 'Combat Proficiencies': v['Combat Proficiencies'].map((r) => Object.assign({}, r, { Rank: (b['Combat Proficiencies'].find((x) => x[0] === r.Skill) || [0, r.Rank])[1] })), _experienceSpent: 0 }); else change(d, { _experienceBase: null }); redraw(); }, 'ghost tiny')]),
        el('div', { class: 'two-up' }, [
          el('div', { class: 'rated' }, [el('div', { class: 'prop-k' }, ['Skills · cost per level (', E.link({ hash: SKILL_COSTS, name: 'Skill Costs' }), ')'])].concat(v.Skills.map((r) => row('Skills', r, SKILL_COSTS)))),
          el('div', { class: 'rated' }, [el('div', { class: 'prop-k' }, ['Combat Proficiencies (', E.link({ hash: PROFICIENCY_COSTS, name: 'Combat Proficiency Costs' }), ')'])].concat(v['Combat Proficiencies'].map((r) => row('Combat Proficiencies', r, PROFICIENCY_COSTS)))),
        ]),
      ]);
    }
    if (k === 'gear') {
      const onChange = (name, value) => { change(d, { [name]: value }); redraw(); };
      const S = Sheet.spec();
      const f = (name) => { const s = S.find((x) => x.name === name); return s ? el('div', { class: 'sfield' }, [el('div', { class: 'prop-k' }, [name]), fieldControl(s, v, onChange)]) : null; };
      const rated = v['Combat Proficiencies'].filter((p) => (p.Rank || 0) > 0).map((p) => p.Skill);
      const sol = v['Standard of Living'] || (c ? D.val(c, 'Standard of Living') : null);
      const useful = (D.entity(USEFUL_ITEMS) || {}).table;
      const usefulRow = useful && sol ? useful.rows.find((r) => String(r[0]).split(/\s+or\s+/i).indexOf(sol) !== -1) : null;
      if (c && !v['Standard of Living'] && D.val(c, 'Standard of Living')) setTimeout(() => { change(d, { 'Standard of Living': D.val(c, 'Standard of Living') }); redraw(); }, 0);
      return el('div', {}, [
        E.link({ hash: WAR_GEAR, name: 'War Gear' }),
        el('div', { class: 'muted small' }, ['Rated Combat Proficiencies: ' + (rated.join(', ') || 'none yet') + ' · Brawling needs no rating.']),
        f('War Gear'), f('Armour'), f('Helm'), f('Shield'),
        el('div', { class: 'small' }, ['Standard of Living ', el('b', {}, [sol || '—']), usefulRow ? ' · Useful Items: ' + usefulRow[2] : '']),
        f('Travelling Gear'),
      ]);
    }
    if (k === 'valour') {
      if (v.Valour == null || v.Wisdom == null) setTimeout(() => { change(d, { Valour: v.Valour == null ? STARTING_VALOUR : v.Valour, Wisdom: v.Wisdom == null ? STARTING_WISDOM : v.Wisdom }); redraw(); }, 0);
      const onChange = (name, value) => { change(d, { [name]: value }); redraw(); };
      const S = Sheet.spec();
      return el('div', {}, [
        el('div', { class: 'chiprow tight' }, [el('span', { class: 'chip' }, ['VALOUR ', el('b', {}, [String(v.Valour == null ? STARTING_VALOUR : v.Valour)])]), el('span', { class: 'chip' }, ['WISDOM ', el('b', {}, [String(v.Wisdom == null ? STARTING_WISDOM : v.Wisdom)])]), E.link({ hash: STARTING_REWARD, name: 'Starting Reward and Virtue' })]),
        ['Rewards', 'Virtues'].map((n) => { const s = S.find((x) => x.name === n); return s ? el('div', { class: 'sfield' }, [el('div', { class: 'prop-k' }, [n]), fieldControl(s, v, onChange, n === 'Virtues' ? startingVirtue : null)]) : null; }),
      ]);
    }
    return null;
  }
  // A Virtue a hero starts with: the common ones (a Cultural Virtue names its culture)
  const startingVirtue = (r) => !(r.fields && r.fields.Culture);
  // one field of the sheet, drawn by the sheet's own control, its picks optionally narrowed
  const fieldControl = (s, v, onChange, filter) => Sheet.control(s, v, onChange, { filter });
  const callingFavoured = (v) => v._callingFavoured || [];
  const baseRank = (v, key, skill) => ((v._experienceBase && (v._experienceBase[key] || []).find((x) => x[0] === skill)) || [0, 0])[1];

  function done(step, v) {
    const c = !!v['Heroic Culture'];
    switch (step.kind) {
      case 'blessing': return !!v['Cultural Blessing'];
      case 'attributes': return v.Strength != null && v.Heart != null && v.Wits != null;
      case 'tns': return v.Strength != null;
      case 'derived': return v.Endurance != null && v.Hope != null && v.Parry != null;
      case 'ranks': return c && v._ranksFrom === v['Heroic Culture'].hash && !!v._profA && !!v._profB;
      case 'features': return (v['Distinctive Features'] || []).length >= FEATURES_TO_CHOOSE;
      case 'name': return !!v.Name;
      case 'calling': return !!v.Calling && callingFavoured(v).length === CALLING_FAVOURED;
      case 'experience': return (v._experienceSpent || 0) === PREVIOUS_POINTS;
      case 'gear': return (v['War Gear'] || []).length > 0;
      case 'valour': return (v.Rewards || []).length > 0 && (v.Virtues || []).length > 0;
      default: return true;
    }
  }

  // ── the page ──
  // The page is rebuilt on every edit so the checks and derived values follow the draft; a rebuild
  // replaces the box being typed in, so the focused field is found again by its place among the
  // page's fields and given back its caret, and the scroll stays put.
  function keepFocus(page, rebuild) {
    const fields = () => Array.from(page.querySelectorAll('input, textarea, select'));
    const a = document.activeElement;
    const i = a && page.contains(a) ? fields().indexOf(a) : -1;
    const sel = i !== -1 && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    const y = window.scrollY;
    rebuild();
    window.scrollTo(0, y);
    const b = i === -1 ? null : fields()[i];
    if (!b || b.tagName !== a.tagName || b.type !== a.type) return;
    b.focus({ preventScroll: true });
    if (sel) b.setSelectionRange(sel[0], sel[1]);
    else if (b.type === 'number') { b.type = 'text'; b.setSelectionRange(b.value.length, b.value.length); b.type = 'number'; } // a number box hides its caret: put it at the end
  }
  function render(container, path, ctx) {
    const page = el('div', { class: 'page creator' });
    container.appendChild(page);
    const go = () => {
      page.innerHTML = '';
      const d = draft();
      const v = d.character;
      const redraw = () => keepFocus(page, go);
      const list = Roster.list();
      page.appendChild(el('div', { class: 'chiprow' }, [
        el('h2', { class: 'chapter-h' }, ['Making a Player-hero']),
        el('span', { class: 'muted small' }, [list.length + ' in this browser']),
        el('select', { class: 'scope', onchange: (ev) => { Roster.open(ev.target.value); redraw(); } }, list.map((x) => el('option', { value: x.id, selected: x.id === d.id || null }, [(x.character.Name || 'an unnamed hero') + ' · ' + (x.savedAt || '').slice(0, 10)]))),
        button('New hero', () => { Roster.add(Sheet.blank()); redraw(); }, 'ghost tiny'),
        button('Delete this one', () => { if (confirm('Delete ' + (v.Name || 'this hero') + ' from this browser? Download the file first to keep it.')) { Roster.remove(d.id); redraw(); } }, 'ghost tiny'),
      ]));
      const intro = D.entity(YOUR_CHARACTERS);
      if (intro && intro.desc) page.appendChild(E.prose(intro.desc));
      // the culture comes first: "each player must first choose a Heroic Culture"
      page.appendChild(el('section', { class: 'creator-step' + (v['Heroic Culture'] ? ' done' : '') }, [
        el('div', { class: 'step-text' }, ['Choose a Heroic Culture']),
        // the core's six, then the sourcebooks' (a culture printed in two books is offered from each)
        el('div', { class: 'chiprow tight' }, D.byType('Heroic Culture').map((r) => button(r.name + (r.book !== 'core' ? ' · ' + ((D.indexBook(r.book) || {}).label || r.book) : ''), () => {
          D.ready(r.book).then(() => {
            change(d, { 'Heroic Culture': Sheet.refOf(r), 'Cultural Blessing': '', 'Standard of Living': D.f(r, 'Standard of Living') || null, _ranksFrom: null, _profA: null, _profB: null, _cultureFavoured: null, _attributeRoll: null, _experienceBase: null, _experienceSpent: 0 });
            redraw();
          });
        }, v['Heroic Culture'] && v['Heroic Culture'].hash === r.id ? 'tiny' : 'ghost tiny'))),
        v['Heroic Culture'] ? el('details', {}, [el('summary', { class: 'muted small' }, ['The ' + v['Heroic Culture'].name + ', as the book prints them']), E.render(D.entity(v['Heroic Culture'].hash), { bare: true })]) : null,
      ]));
      let part = null;
      steps().forEach((s) => {
        if (s.part !== part) {
          part = s.part;
          page.appendChild(el('h4', {}, [part]));
          if (part === 'Answer the Call to Adventure') { const e = D.entity(CALL_TO_ADVENTURE); if (e && e.desc) page.appendChild(E.prose(e.desc)); }
        }
        page.appendChild(el('section', { class: 'creator-step' + (done(s, v) ? ' done' : '') }, [
          el('div', { class: 'step-text', html: E.inline(s.text) }),
          control(s, d, redraw),
        ]));
      });
      page.appendChild(el('h4', {}, ['The sheet']));
      page.appendChild(el('div', { class: 'site-reader' }, [Sheet.render(v, (name, value) => { change(d, { [name]: value }); redraw(); })]));
      page.appendChild(el('div', { class: 'chiprow' }, [
        button('Download the character file', () => Sheet.download(cleanOf(v))),
        el('span', { class: 'muted small' }, ['The Loremaster loads it into the Company; a player can bring it to the table.']),
      ]));
    };
    // the core, and the book of the draft's culture when it is a sourcebook's
    const cur = Roster.current();
    const rec = cur && cur.character && cur.character['Heroic Culture'] ? D.record(cur.character['Heroic Culture'].hash) : null;
    const b = ['core'].concat(rec && rec.book !== 'core' ? [rec.book] : []);
    if (!b.every((id) => D.loaded(id))) {
      page.appendChild(el('div', { class: 'loading' }, [Dice.icon('Gandalf Rune', 'spin'), ' Opening the books…']));
      D.ready(b).then(go);
    } else go();
  }
  // the file carries the sheet's fields, not the creator's working notes
  function cleanOf(v) {
    const out = {};
    Object.keys(v).forEach((k) => { if (k[0] !== '_') out[k] = v[k]; });
    return out;
  }

  return { render, steps, draft, done, cleanOf, PREVIOUS_POINTS };
})();
