// system/tor2e/player.js — the player's copy of the live sheet (engine/play.js asks for
// liveSheet(m, { player: true })): compact — taps, not typed numbers; no working shown — and, on a
// phone (≤ 640px, assets/css/tor2e-gm.css), one tab at a time behind a bar at the bottom:
//
//   Play     the hero, Endurance / Hope / Shadow / Fatigue, the conditions, the rests, the hero's
//            features (Calling, Distinctive Features, Virtues, Rewards …) as cards that open to the
//            book's text, and Advancement (a page of its own)
//   Combat   while the Loremaster has the Company in one (system/tor2e/combat.js)
//   Roll     the roll in the table's order: what it is for, its TN and dice, Hope, then Roll
//   Gear     war gear, armour, Load, the player's own notes
//
// Wider screens show every block at once. The rules are the sheet's (TorSheet) and the combat's
// (TorCombat); the Advancement page reads its prices from the core's Experience Points Costs table.
window.TorPlayer = (function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Dice = window.TorDice;
  const Sheet = () => window.TorSheet;
  const Combat = () => window.TorCombat;
  const State = () => window.VttState;

  const RULES = {
    costs: { id: '#tGBoXCeiYJZWCqA8tao5vFI', name: 'Experience Points Costs' },   // the new level or rank → its Skill or Adventure point cost
    updates: { id: '#ty8ByvDXekeuuyLg4SXNva5', name: 'Perform Updates' },          // one rank in each Skill and Combat Proficiency; VALOUR or WISDOM, not both; a new rank brings a Reward or a Virtue
  };
  const RANK_MAX = 6;   // Experience Points Costs: six rows, the sixth [Success] the last

  const memberNow = (m) => Sheet().memberNow(m.id, m);
  const redraw = () => window.VttBus.emit('state:remote', { view: true }, { local: true });
  const change = (m, p, why) => Sheet().change(memberNow(m), p, why);

  // ── compact controls ──
  function stepper(label, cur, max, onSet, extra) {
    return el('div', { class: 'track' }, [
      el('span', { class: 'track-name' }, [label]),
      el('span', { class: 'track-v' }, [el('b', {}, [String(cur == null ? '—' : cur)]), max != null ? el('span', { class: 'muted' }, [' / ' + max]) : null]),
      el('button', { class: 'step dec', type: 'button', 'aria-label': label + ' down', onclick: () => onSet(Math.max(0, (cur || 0) - 1)) }, ['−']),
      el('span', { class: 'track-bar' }, [max ? el('span', { class: 'track-fill', style: 'width:' + Math.max(0, Math.min(100, Math.round(100 * (cur || 0) / max))) + '%' }) : null]),
      el('button', { class: 'step inc', type: 'button', 'aria-label': label + ' up', onclick: () => onSet(max != null ? Math.min(max, (cur || 0) + 1) : (cur || 0) + 1) }, ['+']),
      extra || null,
    ]);
  }
  const toggle = (label, on, fn) => button(label, fn, 'toggle' + (on ? ' on' : ''));

  // ── the features: cards that open to the book's text ──
  const openCards = {};   // member id + ref → open, kept across redraws
  function card(m, ref, kind) {
    const key = m.id + '|' + (ref.hash || ref.name);
    const det = el('details', { class: 'feature-card', open: openCards[key] || null });
    det.appendChild(el('summary', {}, [el('span', { class: 'feature-name' }, [ref.name]), el('span', { class: 'feature-kind' }, [kind])]));
    det.addEventListener('toggle', () => {
      openCards[key] = det.open;
      if (det.open && !det.querySelector('.feature-body')) fill();
    });
    const fill = () => {
      const body = el('div', { class: 'feature-body' });
      det.appendChild(body);
      const bid = ref.hash ? D.bookOf(ref.hash) : null;
      const draw = () => { body.innerHTML = ''; const e = ref.hash ? D.entity(ref.hash) : null; body.appendChild(e ? E.render(e) : el('div', { class: 'muted' }, ['Not in the books.'])); };
      if (!bid || D.loaded(bid)) draw();
      else { body.appendChild(el('div', { class: 'muted' }, ['Opening…'])); D.ready(bid).then(draw); }
    };
    if (det.open) fill();
    return det;
  }
  function features(m, v) {
    const cards = [];
    if (v.Calling && v.Calling.hash) cards.push(card(m, v.Calling, 'Calling'));
    (v['Distinctive Features'] || []).filter((x) => x && x.name).forEach((x) => cards.push(card(m, x, 'Distinctive Feature')));
    (v.Virtues || []).filter((x) => x && x.name).forEach((x) => cards.push(card(m, x, 'Virtue')));
    (v.Rewards || []).filter((x) => x && x.name).forEach((x) => cards.push(card(m, x, 'Reward')));
    const lines = [];
    if (v['Cultural Blessing']) lines.push(el('div', { class: 'feature-line' }, [el('span', { class: 'track-name' }, ['Cultural Blessing']), ' ', v['Cultural Blessing']]));
    if (v['Shadow Path']) lines.push(el('div', { class: 'feature-line' }, [el('span', { class: 'track-name' }, ['Shadow Path']), ' ', v['Shadow Path']]));
    if ((v.Flaws || []).filter(Boolean).length) lines.push(el('div', { class: 'feature-line' }, [el('span', { class: 'track-name' }, ['Flaws']), ' ', v.Flaws.filter(Boolean).join(', ')]));
    return el('div', { class: 'features' }, [cards, lines]);
  }

  // ── the roll, in the table's order ──
  const picked = {};   // member id → { kind: 'skill'|'valour'|'wisdom', name }
  const hopeOn = {};   // member id → spend 1 Hope on this roll
  function rollOf(m, v) {
    const p = picked[m.id];
    if (!p) return null;
    const S = Sheet();
    if (p.kind === 'valour') return { what: 'Valour', rating: v.Valour || 0, tn: S.tn(v, 'Heart'), attr: 'HEART' };
    if (p.kind === 'wisdom') return { what: 'Wisdom', rating: v.Wisdom || 0, tn: S.tn(v, 'Wits'), attr: 'WITS' };
    const row = (v.Skills || []).find((r) => r.Skill === p.name) || { Rank: 0 };
    const attr = S.attributeOf(p.name);
    return { what: p.name, rating: row.Rank || 0, tn: S.tn(v, attr), attr: String(attr || '').toUpperCase(), favoured: !!row.Favoured };
  }
  function rollPane(m, v) {
    const S = Sheet();
    const l = S.current(m);
    const rr = rollOf(m, v);
    const inspired = l.inspired;
    const hopeDice = hopeOn[m.id] ? (inspired ? 2 : 1) : 0;
    const box = el('div', { class: 'roll-pane' });
    box.appendChild(el('div', { class: 'roll-what' }, [rr ? rr.what : 'Choose what to roll']));
    box.appendChild(el('div', { class: 'roll-dice-count' }, [rr ? 'TN ' + (rr.tn == null ? '—' : rr.tn) + ' · Feat die' + (rr.favoured ? 's (Favoured)' : '') + ' + ' + (rr.rating + hopeDice) + 'd' + (S.isWeary(m) ? ' · Weary' : '') + (S.isMiserable(m) ? ' · Miserable' : '') : '—']));
    // the list: the Skills under their Attribute, then VALOUR and WISDOM
    const list = el('div', { class: 'skill-list' });
    ['Strength', 'Heart', 'Wits'].forEach((a) => {
      list.appendChild(el('div', { class: 'sg-h' }, [a.toUpperCase() + ' · TN ' + (S.tn(v, a) == null ? '—' : S.tn(v, a))]));
      (v.Skills || []).filter((r) => S.attributeOf(r.Skill) === a).forEach((r) => {
        const on = picked[m.id] && picked[m.id].kind === 'skill' && picked[m.id].name === r.Skill;
        list.appendChild(el('button', { type: 'button', class: 'sk-row' + (on ? ' on' : '') + (r.Favoured ? ' fav' : ''), onclick: () => { picked[m.id] = { kind: 'skill', name: r.Skill }; redraw(); window.scrollTo(0, 0); } }, [
          el('span', {}, [r.Skill, r.Favoured ? el('span', { class: 'fav-mark', title: 'Favoured' }, [' ◆']) : null]), el('span', { class: 'sk-dots' }, ['●'.repeat(r.Rank || 0) + '○'.repeat(Math.max(0, RANK_MAX - (r.Rank || 0)))]),
        ]));
      });
    });
    list.appendChild(el('div', { class: 'sg-h' }, ['VALOUR · WISDOM']));
    [['valour', 'Valour', v.Valour, 'HEART'], ['wisdom', 'Wisdom', v.Wisdom, 'WITS']].forEach(([k, name, n, attr]) => {
      const on = picked[m.id] && picked[m.id].kind === k;
      list.appendChild(el('button', { type: 'button', class: 'sk-row' + (on ? ' on' : ''), onclick: () => { picked[m.id] = { kind: k }; redraw(); window.scrollTo(0, 0); } }, [el('span', {}, [name + ' ', el('span', { class: 'muted' }, ['vs ' + attr])]), el('span', { class: 'sk-dots' }, [String(n || 0)])]));
    });
    if (l.hope > 0) box.appendChild(el('div', { class: 'roll-row' }, [el('span', { class: 'roll-row-k' }, ['Spend 1 Hope (+' + (inspired ? 2 : 1) + 'd)']), toggle(hopeOn[m.id] ? 'Yes' : 'No', !!hopeOn[m.id], () => { hopeOn[m.id] = !hopeOn[m.id]; redraw(); })]));
    box.appendChild(el('button', { type: 'button', class: 'btn roll-go', disabled: rr ? null : true, onclick: () => rollNow(m) }, ['Roll']));
    return { head: box, list };
  }
  function rollNow(m) {
    const r = rollOf(memberNow(m), Sheet().complete(memberNow(m).character || {}));
    if (!r) return false;
    const hope = !!hopeOn[m.id];
    hopeOn[m.id] = false;   // before the roll: its log entry redraws the page
    Sheet().rollAbility(memberNow(m), r.what, r.rating, r.tn, { favoured: r.favoured, hope });
    return true;
  }
  // the player's own rolls, newest first
  function rollLog(m) {
    const rows = Sheet().logOf(m).filter((x) => x.kind === 'roll').slice(-5).reverse();
    return el('div', { class: 'roll-log' }, rows.map((x) => el('div', { class: 'roll-line' + (x.ok ? ' ok' : x.ok === false ? ' fail' : '') }, [el('span', { class: 'roll-who' }, [x.label || 'a roll']), el('span', { class: 'roll-text', html: E.inline(x.text || '') })])));
  }

  // ── gear ──
  function gearPane(m, v) {
    const S = Sheet();
    const C = Combat();
    const rows = (v['War Gear'] || []).filter((x) => x && x.hash).map((w) => {
      const wo = C.weaponOf(w);
      const g = C.gripOf(memberNow(m), wo);
      return el('div', { class: 'gear-row' }, [el('b', {}, [w.name]), el('span', { class: 'muted small' }, [[wo.prof + ' ' + C.ratingFor(v, wo) + 'd', 'Damage ' + wo.damage, 'Injury ' + ((g === '2h' ? wo.injury2 : wo.injury1) || '—') + (wo.either ? ' (' + g + ')' : ''), 'Load ' + (D.f(wo.record, 'Load') || 0)].join(' · ')]), C.gripControl(m, wo)]);
    });
    const piece = (k) => (v[k] && v[k].hash ? el('div', { class: 'gear-row' }, [el('b', {}, [v[k].name]), el('span', { class: 'muted small' }, [[D.f(S.recordOf(v[k]), 'Protection') ? 'Protection ' + D.f(S.recordOf(v[k]), 'Protection') : null, D.f(S.recordOf(v[k]), 'Parry Modifier') != null ? 'Parry +' + D.f(S.recordOf(v[k]), 'Parry Modifier') : null, 'Load ' + (D.f(S.recordOf(v[k]), 'Load') || 0)].filter(Boolean).join(' · ')])]) : null);
    const l = S.current(m);
    return el('div', { class: 'gear-pane' }, [
      el('div', { class: 'track-name' }, ['War gear']), rows.length ? rows : el('div', { class: 'muted' }, ['None.']),
      el('div', { class: 'track-name' }, ['Armour']), piece('Armour'), piece('Helm'), piece('Shield'),
      el('div', { class: 'gear-sum' }, ['Protection ' + S.protectionOf(v) + 'd · Parry ' + (v.Parry == null ? '—' : v.Parry) + ' · Load ' + S.loadTotal(m) + ' (gear ' + S.gearLoad(v) + ', Treasure carried ' + l.treasureCarried + ' of ' + (v.Treasure || 0) + ', Fatigue ' + l.fatigue + ')']),
      stepper('Treasure carried', l.treasureCarried, v.Treasure || 0, (n) => change(m, { treasureCarried: n })),
      v['Travelling Gear'] ? el('div', {}, [el('div', { class: 'track-name' }, ['Travelling gear']), el('div', {}, [v['Travelling Gear']])]) : null,
      el('div', { class: 'gear-sum' }, ['Standard of Living ' + (v['Standard of Living'] || '—') + ' · Treasure ' + (v.Treasure || 0)]),
      el('div', { class: 'player-notes' }, [el('div', { class: 'track-name' }, ['Notes']),
        el('textarea', { class: 'text', rows: 8, placeholder: 'Your notes — only you and the Loremaster see them', oninput: debounce((ev) => State().commit('setPartyPlayerNotes', [m.id, ev.target.value]), 400) }, [memberNow(m).playerNotes || ''])]),
    ]);
  }

  // ── the sheet ──
  const PANES = [['play', 'Play'], ['combat', 'Combat'], ['roll', 'Roll'], ['gear', 'Gear']];
  const paneOf = {};
  const inCombat = {};
  function sheet(m, header, versionPicker) {
    const S = Sheet();
    const v = S.complete(m.character || {});
    const l = S.current(m);
    const box = el('div', { class: 'sheet live player' });
    const add = (node, pane) => { if (node) { node.setAttribute('data-pane', pane); box.appendChild(node); } return node; };
    add(header(m, v, versionPicker), 'play');
    add(el('div', { class: 'trackers' }, [
      stepper('Endurance', l.endurance, v.Endurance, (n) => change(m, { endurance: n })),
      stepper('Hope', l.hope, v.Hope, (n) => change(m, { hope: n })),
      stepper('Shadow', l.shadow, null, (n) => change(m, { shadow: n }), l.scars ? el('span', { class: 'muted small scars' }, ['+ ' + l.scars + (l.scars === 1 ? ' Scar' : ' Scars')]) : null),
      stepper('Fatigue', l.fatigue, null, (n) => change(m, { fatigue: n })),
    ]), 'play');
    add(el('div', { class: 'chiprow tight conditions compact' }, [
      S.isWeary(m) ? el('span', { class: 'cond on' }, ['Weary']) : null,
      S.isMiserable(m) ? el('span', { class: 'cond on' }, ['Miserable']) : null,
      S.isUnconscious(m) ? el('span', { class: 'cond on' }, ['Unconscious']) : null,
      toggle('Wounded', l.wounded, () => change(m, { wounded: !l.wounded })),
      toggle('Dying', l.dying, () => change(m, { dying: !l.dying })),
      toggle('Inspired', l.inspired, () => change(m, { inspired: !l.inspired })),
      l.injury ? el('span', { class: 'cond' }, ['Injury: ' + l.injury]) : null,
    ]), 'play');
    add(el('div', { class: 'chiprow tight rests' }, [
      button('Short rest', () => change(m, { endurance: Math.min(v.Endurance || 0, (l.endurance || 0) + (l.wounded ? 0 : (v.Strength || 0))) }, 'a short rest' + (l.wounded ? ' (Wounded: none recovered)' : '')), 'ghost'),
      button('Prolonged rest', () => change(m, { endurance: l.wounded ? Math.min(v.Endurance || 0, (l.endurance || 0) + (v.Strength || 0)) : v.Endurance }, 'a prolonged rest' + (l.wounded ? ' (Wounded: STRENGTH recovered)' : '')), 'ghost'),
    ]), 'play');
    add(features(m, v), 'play');
    const x = S.xp(m);
    add(el('div', { class: 'advance-open' }, [button('Advancement', () => openAdvancement(m), 'btn'), el('span', { class: 'muted small' }, [x.sp.available + ' Skill points · ' + x.ap.available + ' Adventure points'])]), 'play');
    const fight = Combat().pane(m, { player: true });
    if (fight) add(fight, 'combat');
    const rp = rollPane(m, v);
    add(rp.head, 'roll');
    const r = S.rollerFor(m);
    r.classList.add('compact');
    add(r, 'roll');   // the dice of the last roll, under the Roll button
    add(rp.list, 'roll');
    add(rollLog(m), 'roll');
    add(gearPane(m, v), 'gear');
    panes(m, box, !!fight);
    return box;
  }
  function panes(m, box, fight) {
    if (fight && !inCombat[m.id]) paneOf[m.id] = 'combat';   // the Loremaster starts a combat: its tab opens
    if (!fight && paneOf[m.id] === 'combat') paneOf[m.id] = 'play';
    inCombat[m.id] = fight;
    const nav = el('nav', { class: 'pane-nav', 'aria-label': 'Sheet sections' });
    const show = (p, scroll) => {
      paneOf[m.id] = p;
      box.setAttribute('data-show', p);
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.getAttribute('data-for') === p));
      if (scroll) window.scrollTo(0, 0);
    };
    PANES.filter(([p]) => p !== 'combat' || fight).forEach(([p, label]) => nav.appendChild(el('button', { type: 'button', 'data-for': p, onclick: () => {
      // on the Roll tab, with a roll chosen, the bar's own Roll rolls it
      if (p === 'roll' && paneOf[m.id] === 'roll' && picked[m.id]) { rollNow(m); window.scrollTo(0, 0); } else show(p, true);
    } }, [label])));
    box.appendChild(nav);
    show(paneOf[m.id] || 'play', false);
    const rb = nav.querySelector('[data-for="roll"]');
    if (rb) rb.classList.toggle('go', paneOf[m.id] === 'roll' && !!picked[m.id]);
  }

  // ── Advancement: a page of its own over the player's sheet. Exit leaves the hero as it was;
  // Save archives it as "Before advancement" and makes the advanced hero the current one (op
  // advancePartyMember). The prices are the core's table; the limits are Perform Updates' ──
  function costs() {
    const e = D.entity(RULES.costs.id);
    const out = { level: {}, rank: {} };
    ((e && e.entries) || []).forEach((row) => {
      const n = (String(row.name).match(/\[Success\]/g) || []).length;
      const fv = (k) => ((row.fields || []).find((x) => x.name === k) || {}).value;
      const cost = Number(fv('Skill or Adventure Point Cost'));
      if (n && cost) out.level[n] = cost;
      const rk = Number(fv('New Valour or Wisdom Rank'));
      if (rk && cost) out.rank[rk] = cost;
    });
    return out;
  }
  function openAdvancement(m) {
    if (document.querySelector('.advance-page')) return;
    const S = Sheet();
    const mm = memberNow(m);
    const was = S.complete(mm.character || {});
    const next = JSON.parse(JSON.stringify(was));
    const x0 = S.xp(mm);
    const price = costs();
    const buys = [];   // { pool, kind, name, to, cost, gift }
    const page = el('div', { class: 'advance-page', role: 'dialog', 'aria-label': 'Advancement' });
    const close = () => { page.remove(); document.body.classList.remove('advancing'); };
    const spent = (pool) => buys.filter((b) => b.pool === pool).reduce((a, b) => a + b.cost, 0);
    const avail = (pool) => x0[pool].available - spent(pool);
    const bought = (kind, name) => buys.find((b) => b.kind === kind && b.name === name);
    const vwBought = () => buys.find((b) => b.kind === 'valour' || b.kind === 'wisdom');
    const undo = (kind, name) => {
      const i = buys.findIndex((b) => b.kind === kind && b.name === name);
      if (i === -1) return;
      const b = buys.splice(i, 1)[0];
      if (kind === 'skill') next.Skills.find((r) => r.Skill === name).Rank = b.to - 1;
      if (kind === 'proficiency') next['Combat Proficiencies'].find((r) => r.Skill === name).Rank = b.to - 1;
      if (kind === 'valour') next.Valour = b.to - 1;
      if (kind === 'wisdom') next.Wisdom = b.to - 1;
      draw();
    };
    const save = () => {
      if (avail('sp') < 0 || avail('ap') < 0 || !buys.length) return;
      if (buys.some((b) => (b.kind === 'valour' || b.kind === 'wisdom') && !b.gift)) return;
      const when = new Date().toISOString().slice(0, 10);
      buys.forEach((b) => {
        if (b.kind === 'valour') next.Rewards = (next.Rewards || []).concat([b.gift]);
        if (b.kind === 'wisdom') next.Virtues = (next.Virtues || []).concat([b.gift]);
      });
      const lines = buys.map((b) => ({ cost: b.cost, pool: b.pool, what: b.name + ' ' + (b.to - 1) + ' → ' + b.to + (b.gift ? ' (' + b.gift.name + ')' : ''), when }));
      const now = memberNow(m);
      const version = { id: State().genId('v'), label: 'Before advancement', date: when, character: JSON.parse(JSON.stringify(now.character || {})), live: JSON.parse(JSON.stringify(now.live || {})) };
      State().commit('advancePartyMember', [m.id, { version, character: next, live: { spSpent: x0.sp.spent + spent('sp'), apSpent: x0.ap.spent + spent('ap'), xpLedger: x0.ledger.concat(lines) } }]);
      S.logEvent(memberNow(m), 'Advances: ' + lines.map((q) => q.what + ' (' + q.cost + (q.pool === 'sp' ? ' Skill' : ' Adventure') + ' points)').join(', '), 'advancement');
      close();
    };
    const row = (label, n, onMinus, onPlus, note) => el('div', { class: 'adv-row' }, [
      el('span', { class: 'adv-k' }, [label]),
      el('span', { class: 'stepper' }, [
        el('button', { class: 'step', type: 'button', disabled: onMinus ? null : true, onclick: onMinus || null }, ['−']),
        el('b', { class: 'step-v' }, [String(n)]),
        el('button', { class: 'step', type: 'button', disabled: onPlus ? null : true, onclick: onPlus || null }, ['+']),
      ]),
      el('span', { class: 'adv-cost muted small' }, [note || '']),
    ]);
    // one rank per Skill / Combat Proficiency per Fellowship phase; a cost the points can pay
    const rankRow = (kind, pool, r) => {
      const n = r.Rank || 0;
      const mine = bought(kind, r.Skill);
      const cost = price.level[n + 1];
      const can = !mine && n < RANK_MAX && cost && avail(pool) >= cost;
      return row(r.Skill, n, mine ? () => undo(kind, r.Skill) : null, can ? () => { r.Rank = n + 1; buys.push({ pool, kind, name: r.Skill, to: n + 1, cost }); draw(); } : null,
        mine ? mine.cost + ' spent' : n < RANK_MAX && cost ? '+1 · ' + cost : '');
    };
    function draw() {
      page.innerHTML = '';
      page.appendChild(el('div', { class: 'adv-bar' }, [button('Exit', close, 'ghost'), el('h2', {}, ['Advancement']), button('Save', save, 'btn adv-save')]));
      const body = el('div', { class: 'adv-body' });
      page.appendChild(body);
      body.appendChild(el('div', { class: 'adv-sec' }, [el('h3', {}, ['Points']),
        el('div', { class: 'adv-row' + (avail('sp') < 0 ? ' over' : '') }, [el('span', { class: 'adv-k' }, ['Skill points to spend']), el('b', { class: 'adv-n' }, [String(avail('sp'))]), el('span', {})]),
        el('div', { class: 'adv-row' + (avail('ap') < 0 ? ' over' : '') }, [el('span', { class: 'adv-k' }, ['Adventure points to spend']), el('b', { class: 'adv-n' }, [String(avail('ap'))]), el('span', {})]),
      ]));
      body.appendChild(el('div', { class: 'adv-sec' }, [el('h3', {}, ['Skills · Skill points']), ['Strength', 'Heart', 'Wits'].map((a) => el('div', { class: 'adv-group' }, [
        el('div', { class: 'track-name' }, [a.toUpperCase()]), next.Skills.filter((r) => S.attributeOf(r.Skill) === a).map((r) => rankRow('skill', 'sp', r)),
      ]))]));
      body.appendChild(el('div', { class: 'adv-sec' }, [el('h3', {}, ['Combat Proficiencies · Adventure points']), next['Combat Proficiencies'].map((r) => rankRow('proficiency', 'ap', r))]));
      // VALOUR or WISDOM, not both; each new rank brings a Reward (Valour) or a Virtue (Wisdom)
      const vw = vwBought();
      const vwRow = (kind, name, key, giftType) => {
        const n = next[key] || 0;
        const mine = vw && vw.kind === kind ? vw : null;
        const cost = price.rank[n + 1];
        const can = !vw && n < RANK_MAX && cost && avail('ap') >= cost;
        const rr = row(name, n, mine ? () => undo(kind, name) : null, can ? () => { next[key] = n + 1; buys.push({ pool: 'ap', kind, name, to: n + 1, cost, gift: null }); draw(); } : null,
          mine ? mine.cost + ' spent' : n < RANK_MAX && cost ? '+1 · ' + cost : '');
        if (!mine) return rr;
        const have = new Set(((kind === 'valour' ? next.Rewards : next.Virtues) || []).map((q) => q.hash));
        const opts = D.byType(giftType).filter((r) => !have.has(r.id));
        const sel = el('select', { class: 'scope', 'aria-label': 'Choose a ' + giftType }, [el('option', { value: '' }, ['Choose a ' + giftType + '…'])].concat(opts.map((r) => el('option', { value: r.id, selected: mine.gift && mine.gift.hash === r.id || null }, [r.name + (r.book !== 'core' ? ' · ' + ((D.indexBook(r.book) || {}).label || r.book) : '')]))));
        sel.addEventListener('change', () => { const r = D.record(sel.value); mine.gift = r ? { hash: r.id, name: r.name } : null; draw(); });
        return el('div', {}, [rr, el('div', { class: 'adv-add' }, [sel])]);
      };
      body.appendChild(el('div', { class: 'adv-sec' }, [el('h3', {}, ['Valour or Wisdom · Adventure points']),
        vwRow('valour', 'Valour', 'Valour', 'Reward'), vwRow('wisdom', 'Wisdom', 'Wisdom', 'Virtue'),
      ]));
      body.appendChild(el('div', { class: 'adv-sec muted small' }, [(() => { const e = D.entity(RULES.updates.id); const rules = ((e && e.props) || []).find((p) => p.name === 'Rules'); return rules ? rules.items.map((q) => el('p', { html: E.inline(q.value) })) : null; })()]));
      const ok = buys.length && avail('sp') >= 0 && avail('ap') >= 0 && !buys.some((b) => (b.kind === 'valour' || b.kind === 'wisdom') && !b.gift);
      page.querySelector('.adv-save').disabled = ok ? null : true;
    }
    document.body.appendChild(page);
    document.body.classList.add('advancing');
    draw();
    window.scrollTo(0, 0);
  }

  return { sheet, openAdvancement, costs, RULES };
})();
