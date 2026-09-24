// system/tor2e/combat.js — a combat, as the core's Combat chapter runs it (pp. 93–104): the
// Loremaster starts it for the whole Company (optionally with opening volleys), moves it round by
// round and ends it; each hero chooses a stance at the start of each round (its rules the book's
// own sidebar entries), engages adversaries from the scene, attacks — the Combat Proficiency of the
// weapon against the STRENGTH TN modified by the target's Parry, the stance's (1d) given or taken —
// spends Success icons on the Special Damage the weapon allows, performs the stance's combat task,
// and takes a blow: knocked back once a round for half, a Piercing Blow's Protection roll, a Wound
// and its severity rolled on the book's table.
//
// Every number is a rule the book states in prose, a named constant citing it (RULES, checked by
// build/check_shape.py). Every rules text shown is the corpus's own. A combat lives in each hero's
// live state (`live.combat`), so the room shares it the way it shares Endurance.
window.TorCombat = (function () {
  const { el, button } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Dice = window.TorDice;
  const Sheet = () => window.TorSheet;
  const State = () => window.VttState;
  const Sys = () => window.VttSystem;

  const RULES = {
    sequence: { id: '#tBllHCTC1T6xt547OwSSK82', name: 'Close Quarters Rounds Sequence' }, // stance, engagement, action resolution
    volleys: { id: '#tRxo08fgRTQJPYvDjbqKApb', name: 'Opening Volleys' },           // "a bow or a thrown weapon"; a shield's Parry doubled if aware
    stances: { id: '#tEbA0nLJiKttoTgxEPMypWw', name: 'Stances' },                     // chosen "at the start of each round"
    engagement: { id: '#t3vqihlHUUsdsRQrY8zPXlU', name: 'Engagement' },               // "Player-heroes in Rearward cannot be engaged"
    attack: { id: '#tXXidqHCxwZqRfTtEJhHrJp', name: 'Attack Roll' },                  // STRENGTH TN, modified by the target's Parry
    enduranceLoss: { id: '#tTVhB32XAi4ALdHmN50AZR6', name: 'Endurance Loss' },        // the weapon's Damage; knockback: once a round, half, rounding up
    special: { id: '#tMgYmp8VnkxGKBlkrcETPEg', name: 'Special Damage' },              // Heavy Blow, Fend Off, Pierce, Shield Thrust
    piercing: { id: '#tOpO6Y6BrlaAQENgRRPjfPe', name: 'Piercing Blows' },             // a 10 or a Gandalf rune; Protection against the Injury
    wounds: { id: '#tIOalEv8rLQ1bYeMJVkHcEE', name: 'Wounds' },                       // Wounded; a second Wound: Endurance zero, Dying
    severity: { id: '#toftcah3u8kSKuA5vdCzyb9', name: 'Wound Severity' },             // rolled with the Feat die
    tasks: { id: '#tAfFK1txeNK8FI9wcGcXhTy', name: 'Combat Tasks' },
    swords: { id: '#thXcMxhX4eEGrIMUGgs9M9M', name: 'Swords' },                       // its sidebar "Brawling Attacks": highest Combat Proficiency, lose (1d)
  };
  // the four stance sidebars (GUIDANCE entries, not entities): their text is the book's
  const STANCES = [
    { name: 'Forward', entry: '#tikkdQiGQH2FiALJv3wGvg0', of: RULES.stances.id, task: '#tcjyJKBXRcBaCC4BstbHHTo' },
    { name: 'Open', entry: '#tQOk3LBogYH1KVF6hWT2i0j', of: RULES.stances.id, task: '#tooDwsE2Gd6HiTYecKsxD6V' },
    { name: 'Defensive', entry: '#tTTlV2WLsyB32WqyEkXp7b4', of: RULES.stances.id, task: '#tZJbmiSQKYn7QKxjmiYfHrS' },
    { name: 'Rearward', entry: '#tj0N5sFY3yitGktrXKknpBs', of: RULES.engagement.id, task: '#tkldCIpjNCm4PHblCnvDt2p', ranged: true },
  ];
  const BRAWLING_ENTRY = { entry: '#tflb0X0v8WFNLzRI1bzr4Iw', of: RULES.swords.id };
  const FORWARD_GAIN = 1;          // Forward: "Your attack rolls gain (1d)"
  const DEFENSIVE_LOSE = 1;        // Defensive: "Your attack rolls lose (1d) for each opponent engaging you"
  const BRAWLING_LOSE = 1;         // Brawling Attacks: "suffer a disadvantage: they lose (1d)"
  const HEAVY_TWO_HANDED = 1;      // Heavy Blow: "an additional +1 if you are using a 2-handed weapon"
  const FEND_OFF = { Axes: 1, Brawling: 1, Swords: 2, Spears: 3 };   // Fend Off: "+1 using Axes and all Brawling weapons, +2 using Swords, and by +3 using Spears"
  const PIERCE = { Swords: 1, Bows: 2, Spears: 3 };                  // Pierce: "+1 if using Swords, +2 if using Bows, and by +3 if using Spears"
  const PIERCE_MAX = 10;           // Pierce: "up to a maximum of 10"
  const PIERCING_FACE = 10;        // Piercing Blows: "a 10 or [Gandalf Rune] result on the Feat Die"
  const KNOCKBACK_DIVISOR = 2;     // Endurance Loss: "halve the Endurance loss … (rounding fractions up)"

  const memberNow = (m) => Sheet().memberNow(m.id, m);
  const combatOf = (m) => ((m && m.live) || {}).combat || null;
  const guidance = (x) => { const e = D.entity(x.of); return e && (e.guidance || []).find((g) => g.id === x.entry); };
  const text = (x) => { const g = guidance(x); return g ? g.text : ''; };
  const cite = (rule, label) => el('a', { class: 'ref rule-cite', href: '#', onclick: (ev) => { ev.preventDefault(); if (window.TorOpenEntity) window.TorOpenEntity(rule.id); } }, [label || rule.name]);
  const f = D.f;

  // ── the Loremaster's controls: the Company enters, moves through and leaves a combat ──
  function setCombat(m, combat, why) {
    const mm = memberNow(m);
    State().commit('setPartyLive', [mm.id, { combat }]);
    if (why) Sheet().logEvent(mm, why, 'combat');
  }
  function start(ids, volleys) {
    ids.forEach((id) => { const m = Sheet().memberNow(id); if (m) setCombat(m, { volleys: volleys || 0, round: volleys ? 0 : 1, stance: null, engaged: [], target: null, knockedBack: null }, 'Enters a combat' + (volleys ? ' — ' + volleys + (volleys === 1 ? ' opening volley' : ' opening volleys') : '')); });
  }
  // the next round: an opening volley spent, or the next close quarters round — stances are chosen afresh
  function nextRound(ids) {
    ids.forEach((id) => {
      const m = Sheet().memberNow(id);
      const c = combatOf(m);
      if (!c) return;
      const n = c.volleys > 0 ? Object.assign({}, c, { volleys: c.volleys - 1, round: c.volleys - 1 > 0 ? 0 : 1 }) : Object.assign({}, c, { round: c.round + 1 });
      n.stance = null;
      setCombat(m, n, n.volleys > 0 ? 'Opening volley' : 'Round ' + n.round);
    });
  }
  function end(ids) {
    ids.forEach((id) => { const m = Sheet().memberNow(id); if (m && combatOf(m)) setCombat(m, null, 'The combat ends'); });
  }
  function companyBlock(party) {
    const inIt = party.filter((m) => combatOf(m));
    const box = el('div', { class: 'chiprow tight company-combat' }, [el('span', { class: 'prop-k' }, ['Combat'])]);
    if (!inIt.length) {
      const volleys = el('select', { class: 'scope tiny', 'aria-label': 'Opening volleys' }, [0, 1, 2, 3].map((n) => el('option', { value: n }, [n ? n + (n === 1 ? ' opening volley' : ' opening volleys') : 'no opening volleys'])));
      box.appendChild(volleys);
      box.appendChild(button('Start a combat', () => start(party.map((m) => m.id), parseInt(volleys.value, 10) || 0), 'tiny'));
    } else {
      const c = combatOf(inIt[0]);
      box.appendChild(el('b', {}, [c.volleys > 0 ? 'Opening volleys (' + c.volleys + ' left)' : 'Round ' + c.round]));
      box.appendChild(button(c.volleys > 1 ? 'Next volley' : c.volleys === 1 ? 'Close quarters' : 'Next round', () => nextRound(inIt.map((m) => m.id)), 'tiny'));
      box.appendChild(button('End the combat', () => end(inIt.map((m) => m.id)), 'ghost tiny'));
    }
    box.appendChild(el('span', { class: 'muted small' }, ['(', cite(RULES.sequence, 'the sequence'), ')']));
    return box;
  }

  // ── the hero's side ──
  // a weapon's printed properties, from its typed entity (the core)
  function weaponOf(ref) {
    const r = Sheet().recordOf(ref);
    const e = ref && ref.hash ? D.entity(ref.hash) : null;
    const notes = String(e ? D.val(e, 'Notes') || '' : '');
    const inj = String(f(r, 'Injury') || '');
    const m = /(\d+)\s*\(1h\)\s*\/\s*(\d+)\s*\(2h\)/.exec(inj);
    return {
      ref, name: ref.name, record: r, prof: f(r, 'Proficiency') || '', damage: Number(f(r, 'Damage')) || 0, notes,
      injury1: m ? +m[1] : parseInt(inj, 10) || null, injury2: m ? +m[2] : parseInt(inj, 10) || null,
      either: /1 or 2-handed/.test(notes), twoHanded: /(^|\. )2-handed/.test(notes), ranged: /Ranged weapon/.test(notes), thrown: /Can be thrown/.test(notes),
      noPiercing: /Cannot cause a Piercing Blow/.test(notes), pierceAsSword: /Pierce as if it was a Sword/.test(notes),
    };
  }
  const brawling = (w) => w.prof === 'Brawling';
  // Brawling Attacks: "roll a number of dice equal to their highest Combat Proficiency"
  const highestProficiency = (v) => Math.max(0, ...(v['Combat Proficiencies'] || []).map((p) => p.Rank || 0));
  const ratingFor = (v, w) => (brawling(w) ? highestProficiency(v) : ((v['Combat Proficiencies'] || []).find((p) => p.Skill === w.prof) || {}).Rank || 0);
  const parryOf = (r) => parseInt(String(f(r, 'Parry') || '0').replace('+', ''), 10) || 0;
  const grips = {};   // member id + weapon → '1h' | '2h' (a weapon "Can be used 1 or 2-handed"): the player's choice, kept across redraws
  const gripOf = (m, w) => (w.either ? grips[m.id + '|' + w.name] || '1h' : w.twoHanded ? '2h' : '1h');
  const lastAttack = {};   // member id → the last attack's outcome, for its Success-icon spends
  const blows = {};        // member id → { loss, injury } being entered for a blow taken

  function attack(m, w, target, opts) {
    const mm = memberNow(m);
    const v = Sheet().complete(mm.character || {});
    const c = combatOf(mm) || {};
    const st = STANCES.find((s) => s.name === c.stance);
    const rating = ratingFor(v, w);
    const tn = Sheet().tn(v, 'Strength');
    const parry = target ? parryOf(target) : 0;
    const gain = st && st.name === 'Forward' ? FORWARD_GAIN : 0;
    const lose = (st && st.name === 'Defensive' ? DEFENSIVE_LOSE * (c.engaged || []).length : 0) + (brawling(w) ? BRAWLING_LOSE : 0);
    const grip = gripOf(mm, w);
    const why = ['Attack ' + (target ? target.name : '') + ' with the ' + w.name + (w.either ? ' (' + grip + ')' : ''), gain ? 'Forward: gain (' + gain + 'd)' : null, lose ? 'lose (' + lose + 'd)' : null, parry ? 'Parry +' + parry : null].filter(Boolean).join(' · ');
    lastAttack[mm.id] = null;
    Sheet().rollAbility(mm, why, rating, tn == null ? null : tn + parry, { gain, lose, hope: (opts && opts.hope) || hopeWanted(mm), tag: { after: (r, cur) => { lastAttack[cur.id] = { r, w, target, grip, spent: [] }; afterAttack(cur, lastAttack[cur.id]); } } });
  }
  const hopeFlags = {};   // member id → spend 1 Hope on the next roll (the combat pane's box)
  const hopeWanted = (m) => { const h = !!hopeFlags[m.id]; hopeFlags[m.id] = false; return h; };

  // what a hit does: the Endurance loss, the Special Damage the Success icons may buy, a Piercing Blow
  function outcome(m, a) {
    const v = Sheet().complete(m.character || {});
    const r = a.r;
    const feat = r.kept.auto ? PIERCING_FACE : r.kept.value;
    const pierced = a.spent.filter((x) => x === 'Pierce').length;
    const pierceBy = PIERCE[a.w.pierceAsSword ? 'Swords' : a.w.prof] || 0;
    const featNow = r.kept.mark ? feat : Math.min(PIERCE_MAX, feat + pierced * pierceBy);
    const heavy = a.spent.filter((x) => x === 'Heavy Blow').length;
    const heavyEach = (v.Strength || 0) + (a.grip === '2h' ? HEAVY_TWO_HANDED : 0);
    const loss = a.w.damage + heavy * heavyEach;
    const fend = a.spent.filter((x) => x === 'Fend Off').length * (FEND_OFF[a.w.prof] || 0);
    const piercing = !a.w.noPiercing && (r.kept.auto && r.kept.mark === 'Gandalf Rune' || (!r.kept.mark && featNow >= PIERCING_FACE));
    const injury = a.grip === '2h' ? a.w.injury2 : a.w.injury1;
    const left = r.icons - a.spent.length;
    const options = [];
    if (left > 0) {
      options.push({ name: 'Heavy Blow', gives: '+' + heavyEach + ' Endurance loss' });
      if (!a.w.ranged && FEND_OFF[a.w.prof]) options.push({ name: 'Fend Off', gives: 'Parry +' + FEND_OFF[a.w.prof] + ' this round' });
      if (pierceBy && !r.kept.mark && featNow < PIERCE_MAX) options.push({ name: 'Pierce', gives: 'Feat die ' + featNow + ' → ' + Math.min(PIERCE_MAX, featNow + pierceBy) });
      const shield = (v.Shield && v.Shield.hash) ? v.Shield : null;
      if (shield && a.target && (v.Strength || 0) > (Number(f(a.target, 'Attribute Level')) || 0) && a.spent.indexOf('Shield Thrust') === -1) options.push({ name: 'Shield Thrust', gives: 'the target loses (1d) this round' });
    }
    return { loss, fend, piercing, injury, left, options, featNow };
  }
  function afterAttack(m, a) {
    if (!a.r.ok) { Sheet().logEvent(m, 'Misses' + (a.target ? ' ' + a.target.name : ''), 'attack'); return; }
    const o = outcome(m, a);
    Sheet().logEvent(m, 'Hits' + (a.target ? ' ' + a.target.name : '') + ': Endurance loss ' + o.loss + ' (the ' + a.w.name + '’s Damage)' + (o.piercing ? ' · a Piercing Blow — Protection against Injury ' + o.injury : '') + (a.r.icons ? ' · ' + a.r.icons + ' [Success] to spend' : ''), 'attack');
  }
  function spend(m, name) {
    const a = lastAttack[m.id];
    if (!a) return;
    const before = outcome(m, a);
    if (!before.options.some((x) => x.name === name)) return;
    a.spent.push(name);
    const o = outcome(m, a);
    const what = before.options.find((x) => x.name === name).gives;
    Sheet().logEvent(memberNow(m), 'spends 1 [Success]: ' + name + ' (' + what + ')' + (name === 'Heavy Blow' ? ' — Endurance loss ' + o.loss : '') + (name === 'Pierce' && o.piercing && !before.piercing ? ' — a Piercing Blow: Protection against Injury ' + o.injury : ''), 'attack');
    window.VttBus.emit('state:remote', { view: true }, { local: true });
  }

  // a combat task: the stance's own, its Skill read from its rule ("makes an **AWE** roll")
  function taskOf(st) {
    const e = D.entity(st.task);
    if (!e) return null;
    const rules = ((e.props || []).find((p) => p.name === 'Rules') || { items: [] }).items.map((x) => x.value).join(' ');
    const mm = /makes an? \*\*([A-Z]+)\*\* roll/.exec(rules);
    const skill = mm ? mm[1].charAt(0) + mm[1].slice(1).toLowerCase() : null;
    return { entity: e, name: e.name.split(' — ')[0], skill, rules };
  }
  function performTask(m, st) {
    const mm = memberNow(m);
    const v = Sheet().complete(mm.character || {});
    const t = taskOf(st);
    if (!t || !t.skill) return;
    const row = (v.Skills || []).find((r) => r.Skill === t.skill) || { Rank: 0 };
    const attr = Sheet().attributeOf(t.skill);
    Sheet().logEvent(mm, 'Combat task: ' + t.name + ' (' + t.skill + ')', 'combat');
    Sheet().rollAbility(mm, t.name + ' — ' + t.skill, row.Rank || 0, Sheet().tn(v, attr), { favoured: row.Favoured, hope: hopeWanted(mm) });
  }

  // taking a blow: the loss, or half of it knocked back (once a round); a Piercing Blow's Protection
  // roll against the Injury; on a failure, a Wound and its severity from the book's table
  function takeBlow(m, loss, knocked) {
    const mm = memberNow(m);
    const c = combatOf(mm) || {};
    const l = Sheet().current(mm);
    const n = knocked ? Math.ceil(loss / KNOCKBACK_DIVISOR) : loss;
    const p = { endurance: Math.max(0, (l.endurance || 0) - n) };
    Sheet().change(mm, p, knocked ? 'knocked back: half of ' + loss + ', rounded up — the next main action recovers the fighting position' : 'a blow');
    if (knocked) State().commit('setPartyLive', [mm.id, { combat: Object.assign({}, c, { knockedBack: c.round }) }]);
  }
  function protection(m, injury) {
    const mm = memberNow(m);
    const v = Sheet().complete(mm.character || {});
    const prot = Sheet().protectionOf(v);
    Sheet().rollAbility(mm, 'Protection against Injury ' + injury, prot, injury, { hope: hopeWanted(mm), tag: { after: (r, cur) => { if (r.ok === false) wound(cur); } } });
  }
  function wound(m) {
    const l = Sheet().current(m);
    if (l.wounded) {   // Wounds: a second Wound — Endurance zero, Dying
      Sheet().change(m, { endurance: 0, dying: true }, 'a second Wound');
      return;
    }
    const t = (D.entity(RULES.severity.id) || {}).table;
    const r = t ? Dice.rollTable(t) : null;
    const face = r ? (r.mark ? '[' + r.mark + ']' : String(r.face)) : null;
    if (!r || !r.row) { Sheet().change(m, { wounded: true }, 'Wounded'); return; }
    const kind = r.row[1];
    const p = { wounded: true };
    if (r.mark === 'Eye of Sauron') Object.assign(p, { endurance: 0, dying: true });
    else if (!r.mark) p.injury = r.face + (r.face === 1 ? ' day' : ' days');
    Sheet().change(m, p, 'Wounded — Wound Severity ' + face + ': ' + kind);
    State().commit('appendLog', [{ at: Date.now(), kind: 'table', who: 'Table', label: RULES.severity.name, text: face + ' → ' + r.row.join(' · '), memberId: m.id }]);
  }

  // ── the pane ──
  function pane(m, opts) {
    const o = opts || {};
    const c = combatOf(m);
    if (!c) return null;
    const v = Sheet().complete(m.character || {});
    const box = el('div', { class: 'combat-pane' });
    const redraw = () => window.VttBus.emit('state:remote', { view: true }, { local: true });
    const volley = c.volleys > 0;
    box.appendChild(el('div', { class: 'combat-head' }, [
      el('h3', {}, [volley ? 'Opening volleys' : 'Round ' + c.round]),
      el('span', { class: 'muted small' }, ['Parry ' + (v.Parry == null ? '—' : v.Parry) + (v.Shield && v.Shield.hash ? ' · ' + v.Shield.name + ' +' + (f(Sheet().recordOf(v.Shield), 'Parry Modifier') || 0) + (volley ? ', doubled if aware' : '') : '') + ' · ', cite(RULES.sequence, 'the sequence')]),
    ]));
    // the hero's latest roll, its dice drawn (an attack, a task or a Protection roll is rolled from here)
    const last = Sheet().logOf(m).filter((x) => x.kind === 'roll').slice(-1)[0];
    if (last) box.appendChild(el('div', { class: 'roll-line last-roll' + (last.ok ? ' ok' : last.ok === false ? ' fail' : '') }, [el('span', { class: 'roll-who' }, [last.label || 'a roll']), el('span', { class: 'roll-text', html: E.inline(last.text || '') })]));
    const hope = el('label', { class: 'check small' }, [el('input', { type: 'checkbox', checked: hopeFlags[m.id] || null, onchange: (ev) => { hopeFlags[m.id] = ev.target.checked; } }), ' spend 1 Hope on the next roll']);
    // the stance (close quarters only)
    if (!volley) {
      box.appendChild(el('div', { class: 'track-name' }, ['Stance', c.stance ? null : el('span', { class: 'muted small' }, [' · choose one for this round'])]));
      box.appendChild(el('div', { class: 'stance-pick' }, STANCES.map((s) => button(s.name, () => {
        const mm = memberNow(m);
        const cc = combatOf(mm);
        const patch = { stance: s.name };
        if (s.ranged) patch.engaged = [];   // "Player-heroes in Rearward cannot be engaged"
        State().commit('setPartyLive', [mm.id, { combat: Object.assign({}, cc, patch) }]);
        Sheet().logEvent(mm, 'Takes a ' + s.name + ' stance', 'combat');
      }, 'stance-btn' + (c.stance === s.name ? ' on' : '')))));
      const st = STANCES.find((s) => s.name === c.stance);
      if (st) box.appendChild(el('div', { class: 'small stance-rule', html: E.inline(text(st)).replace(/\n\n/g, '<br>') }));
    }
    // engagement: adversaries from the scene
    const sid = Sys() && Sys().currentSceneId ? Sys().currentSceneId() : null;
    const here = sid && Sys().cast ? Sys().cast(sid).filter((r) => r.type === 'Adversary') : [];
    const engaged = (c.engaged || []).map((id) => D.record(id)).filter(Boolean);
    // at close quarters a hero attacks one of those engaged with them; shooting, any adversary
    const shooting = volley || c.stance === 'Rearward';
    const target = shooting ? D.record(c.target) : (engaged.find((r) => r.id === c.target) || engaged[0] || null);
    if (!shooting) {
      const pick = el('select', { class: 'scope', 'aria-label': 'Engage an adversary' }, [el('option', { value: '' }, [here.length ? 'Engage an adversary…' : 'No adversary in this scene'])].concat(here.filter((r) => (c.engaged || []).indexOf(r.id) === -1).map((r) => el('option', { value: r.id }, [r.name]))));
      pick.addEventListener('change', () => {
        if (!pick.value) return;
        pick.blur();   // a focused field holds the panel's redraw (panels' `editing`); this one is done
        const mm = memberNow(m);
        const cc = combatOf(mm);
        State().commit('setPartyLive', [mm.id, { combat: Object.assign({}, cc, { engaged: (cc.engaged || []).concat([pick.value]), target: cc.target || pick.value }) }]);
        Sheet().logEvent(mm, 'Engages ' + (D.record(pick.value) || {}).name, 'combat');
      });
      box.appendChild(el('div', { class: 'track-name' }, ['Engaged', el('span', { class: 'muted small' }, [' · ', cite(RULES.engagement)])]));
      box.appendChild(el('div', { class: 'engaged' }, [pick, engaged.map((r) => el('div', { class: 'engaged-foe' + (target && target.id === r.id ? ' target' : '') }, [
        el('button', { class: 'ref', type: 'button', title: 'Attack this one', onclick: () => { const mm = memberNow(m); State().commit('setPartyLive', [mm.id, { combat: Object.assign({}, combatOf(mm), { target: r.id }) }]); } }, [r.name]),
        el('span', { class: 'muted small' }, [' AL ' + f(r, 'Attribute Level') + ' · Parry ' + (f(r, 'Parry') || '—') + ' · Armour ' + (f(r, 'Armour') || '—')]),
        button('×', () => { const mm = memberNow(m); const cc = combatOf(mm); const left = (cc.engaged || []).filter((x) => x !== r.id); State().commit('setPartyLive', [mm.id, { combat: Object.assign({}, cc, { engaged: left, target: cc.target === r.id ? left[0] || null : cc.target }) }]); Sheet().logEvent(mm, 'No longer engaged with ' + r.name, 'combat'); }, 'ghost tiny'),
      ]))]));
    } else if (here.length) {
      // Rearward and the opening volleys: any adversary may be shot at
      const pick = el('select', { class: 'scope', 'aria-label': 'Target' }, [el('option', { value: '' }, ['Target…'])].concat(here.map((r) => el('option', { value: r.id, selected: target && target.id === r.id || null }, [r.name + ' · Parry ' + (f(r, 'Parry') || '—')]))));
      pick.addEventListener('change', () => { pick.blur(); const mm = memberNow(m); State().commit('setPartyLive', [mm.id, { combat: Object.assign({}, combatOf(mm), { target: pick.value || null }) }]); });
      box.appendChild(el('div', { class: 'track-name' }, ['Target']));
      box.appendChild(pick);
    }
    // attacks: close combat weapons in the three close stances; bows and thrown weapons in Rearward and the volleys
    const ranged = shooting;
    const weapons = (v['War Gear'] || []).filter((x) => x && x.hash).map(weaponOf).filter((w) => (ranged ? w.ranged || w.thrown : !w.ranged));
    box.appendChild(el('div', { class: 'track-name' }, ['Attack', el('span', { class: 'muted small' }, [' · ', cite(RULES.attack, 'STRENGTH TN + the target’s Parry')])]));
    box.appendChild(hope);
    const needStance = !volley && !c.stance;
    box.appendChild(weapons.length ? el('div', { class: 'combat-weapons' }, weapons.map((w) => {
      const tn = Sheet().tn(v, 'Strength');
      return el('div', { class: 'cw-row' }, [
        button('Attack with the ' + w.name, () => attack(m, w, target), 'btn' + (needStance ? ' disabled' : '')),
        w.either ? el('span', { class: 'grip' }, ['1h', '2h'].map((g) => button(g, () => { grips[m.id + '|' + w.name] = g; redraw(); }, 'toggle' + (gripOf(m, w) === g ? ' on' : '')))) : null,
        el('span', { class: 'muted small' }, [' ' + ratingFor(v, w) + 'd' + (brawling(w) ? ' (Brawling: highest proficiency, lose (1d))' : '') + ' · TN ' + (tn == null ? '—' : tn + (target ? parryOf(target) : 0)) + ' · Damage ' + w.damage + ' · Injury ' + ((gripOf(m, w) === '2h' ? w.injury2 : w.injury1) || '—')]),
      ]);
    })) : el('div', { class: 'muted small' }, [ranged ? 'No bow or thrown weapon on the sheet.' : 'No close combat weapon on the sheet.']));
    if (needStance) box.querySelectorAll('.combat-weapons button.btn').forEach((b) => { b.disabled = true; b.title = 'Choose a stance first'; });
    // the last attack's Success icons
    const a = lastAttack[m.id];
    if (a && a.r.ok) {
      const oc = outcome(m, a);
      box.appendChild(el('div', { class: 'attack-out' }, [
        el('div', {}, [el('b', {}, ['Endurance loss ' + oc.loss]), a.target ? ' to ' + a.target.name : '', oc.fend ? ' · Parry +' + oc.fend + ' this round' : '',
          oc.piercing ? el('span', { class: 'pierce' }, [' · a Piercing Blow: Protection against Injury ' + oc.injury]) : null]),
        oc.left ? el('div', { class: 'chiprow tight' }, [el('span', { class: 'small' }, [oc.left + ' ', Dice.icon('Success', 'small'), ' to spend: ']), oc.options.map((x) => button(x.name + ' (' + x.gives + ')', () => spend(m, x.name), 'ghost tiny')), el('span', { class: 'muted small' }, ['(', cite(RULES.special), ')'])]) : null,
      ]));
    }
    // the stance's combat task
    const st = STANCES.find((s) => s.name === c.stance);
    const t = st ? taskOf(st) : null;
    if (t && t.skill) {
      const b = button(t.name + ' (' + t.skill + ')', () => performTask(m, st), 'ghost');
      b.title = [t.entity.desc, t.rules].filter(Boolean).join('\n\n');
      box.appendChild(el('div', { class: 'track-name' }, ['Combat task', el('span', { class: 'muted small' }, [' · ', cite(RULES.tasks, 'the main action')])]));
      box.appendChild(el('div', {}, [b, el('details', { class: 'small' }, [el('summary', { class: 'muted' }, ['what it does']), el('div', { html: E.inline(t.entity.desc || '').replace(/\n\n/g, '<br>') })])]));
    }
    // taking a blow: the loss and the Injury tapped in, not typed (kept across redraws)
    const blow = blows[m.id] || (blows[m.id] = { loss: 0, injury: 14 });
    const count = (label, key, lo) => el('span', { class: 'count' }, [el('span', { class: 'count-k' }, [label]),
      button('−', () => { blow[key] = Math.max(lo, blow[key] - 1); redraw(); }, 'ghost tiny step'), el('b', { class: 'count-v' }, [String(blow[key])]), button('+', () => { blow[key] += 1; redraw(); }, 'ghost tiny step')]);
    const knockedThisRound = c.knockedBack != null && c.knockedBack === c.round;
    box.appendChild(el('div', { class: 'track-name' }, ['Hit', el('span', { class: 'muted small' }, [' · ', cite(RULES.enduranceLoss), ' · ', cite(RULES.piercing)])]));
    box.appendChild(el('div', { class: 'take-blow' }, [
      el('div', { class: 'chiprow tight' }, [count('Endurance loss', 'loss', 0),
        button('Take it', () => { const n = blow.loss; blow.loss = 0; if (n) takeBlow(m, n, false); }, 'ghost tiny'),
        button('Knocked back (half)', () => { const n = blow.loss; blow.loss = 0; if (n) takeBlow(m, n, true); }, 'ghost tiny' + (knockedThisRound || volley ? ' disabled' : ''))]),
      el('div', { class: 'chiprow tight' }, [count('Injury', 'injury', 1), button('Piercing Blow: Protection', () => protection(m, blow.injury), 'ghost tiny')]),
    ]));
    if (knockedThisRound || volley) box.querySelectorAll('.take-blow button.disabled').forEach((b) => { b.disabled = true; b.title = volley ? 'Knockback is a close quarters rule' : 'Once each round'; });
    void o;
    return box;
  }

  return { RULES, STANCES, BRAWLING_ENTRY, combatOf, start, nextRound, end, companyBlock, pane, attack, weaponOf, ratingFor, outcome, spend, takeBlow, protection, wound, taskOf, performTask, lastAttack };
})();
