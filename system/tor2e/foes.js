// system/tor2e/foes.js — the adversaries of a scene, each one tracked. An encounter of three Orc
// Soldiers is three foes, each with its own Endurance, Hate (or Resolve) and Wounds, read from its
// record and changed in play (system/tor2e/ops.js: setFoes, patchFoe, hitFoe). The rules are the
// core's Adversaries chapter, each number a named constant citing its entity:
//
//   Endurance  "All adversaries are taken out of combat if their Endurance is reduced to zero."
//   Might      "the number of Wounds required to slay a foe outright"; Hate spent a round ≤ Might
//   Hate       spent for (1d); "A creature without Hate or Resolve is considered Weary."
//   Armour     "used by the Loremaster to make a Protection test when the adversary is hit by a
//              Piercing Blow" — a failed test is a Wound
//
// Players see a foe's name and whether it is down, Weary or wounded; the numbers are the
// Loremaster's (ops.js playerFilter).
window.TorFoes = (function () {
  const { el, button } = window.VttRender;
  const D = window.TorData;
  const Dice = window.TorDice;
  const State = () => window.VttState;
  const S = () => State().state;
  const f = D.f;

  const RULES = {
    might: { id: '#tSyZlXEpZ5EGu9N0Xg4Tugy', name: 'Might and Endurance' },
    hate: { id: '#t7o9LrFacnHt60hMlM2c87u', name: 'Hate or Resolve' },
    armour: { id: '#tQqxucNKDLPhyA4R5iNkQ7D', name: 'Armour' },
  };
  const HATE_DICE = 1;   // Hate or Resolve: "reduce an adversary’s Hate or Resolve score to make them gain (1d)"

  const list = (sceneId) => ((S().foes || {})[sceneId] || []);
  const recOf = (x) => D.record(x.rec);
  const scoreOf = (r) => (f(r, 'Hate') != null ? 'Hate' : f(r, 'Resolve') != null ? 'Resolve' : null);
  const maxOf = (r, k) => Number(f(r, k)) || 0;
  // "Orc Soldier 2" when the scene holds more than one of a kind
  function label(sceneId, x) {
    const r = recOf(x);
    const same = list(sceneId).filter((y) => y.rec === x.rec).length;
    return (r ? r.name : x.rec) + (same > 1 ? ' ' + x.n : '');
  }
  const isWeary = (x) => !!x.weary || x.hate === 0;
  const byId = (sceneId, id) => list(sceneId).find((x) => x.id === id) || null;

  // n more of an adversary, numbered after those already there, at their printed values
  function add(sceneId, recId, count) {
    const r = D.record(recId);
    if (!r || r.type !== 'Adversary') return;
    const cur = list(sceneId).map((x) => Object.assign({}, x));
    let n = cur.filter((x) => x.rec === recId).reduce((a, x) => Math.max(a, x.n || 0), 0);
    const k = scoreOf(r);
    for (let i = 0; i < (count || 1); i++) {
      n += 1;
      cur.push({ id: State().genId('foe'), rec: recId, n, endurance: maxOf(r, 'Endurance'), hate: k ? maxOf(r, k) : null, wounds: 0, weary: false, out: false, pierced: null });
    }
    State().commit('setFoes', [sceneId, cur]);
  }
  const remove = (sceneId, id) => State().commit('setFoes', [sceneId, list(sceneId).filter((x) => x.id !== id)]);
  const patch = (sceneId, id, p) => State().commit('patchFoe', [sceneId, id, p]);
  const hit = (sceneId, id, loss, extra) => State().commit('hitFoe', [sceneId, id, loss, extra || null]);
  function logFoe(sceneId, x, text) {
    State().commit('appendLog', [{ at: Date.now(), kind: 'event', who: label(sceneId, x), text, why: 'adversary' }]);
  }

  // the foe's Protection test against a Piercing Blow: the Feat die and its Armour's dice against
  // the Injury, the icons switched for a servant of the Shadow (PLAN decision 8); a failure is a
  // Wound, and Might Wounds slay it
  function protection(sceneId, x, spendHate) {
    const r = recOf(x);
    const inj = x.pierced && x.pierced.injury;
    if (!r || !inj) return;
    const armour = parseInt(String(f(r, 'Armour') || '0'), 10) || 0;
    const spend = spendHate && x.hate > 0;
    const res = Dice.roll({ rating: armour, tn: inj, switched: scoreOf(r) === 'Hate', gain: spend ? HATE_DICE : 0 });
    const p = { pierced: null };
    if (spend) p.hate = x.hate - 1;
    let what = 'the Piercing Blow is turned aside';
    if (res.ok === false) {
      p.wounds = (x.wounds || 0) + 1;
      what = 'Wounded (' + p.wounds + ' of Might ' + maxOf(r, 'Might') + ')';
      if (p.wounds >= (maxOf(r, 'Might') || 1)) { p.out = true; what += ' — slain'; }
    }
    State().commit('appendLog', [{ at: Date.now(), kind: 'roll', who: label(sceneId, x), label: 'Protection against Injury ' + inj + (spend ? ' (1 ' + scoreOf(r) + ')' : ''), text: Dice.line(res), ok: res.ok }]);
    patch(sceneId, x.id, p);
    logFoe(sceneId, x, what);
  }

  // ── the Loremaster's tracker: a row per foe ──
  const spendFlags = {};
  function row(sceneId, x) {
    const r = recOf(x);
    const k = scoreOf(r);
    const step = (key, max, lbl) => el('span', { class: 'foe-count' }, [el('span', { class: 'foe-k' }, [lbl]),
      button('−', () => { const was = x[key] || 0; const v = Math.max(0, was - 1); patch(sceneId, x.id, Object.assign({ [key]: v }, key === 'endurance' && v === 0 ? { out: true } : {})); logFoe(sceneId, x, lbl + ' ' + was + ' → ' + v + (key === 'hate' ? ' (spent)' : '')); }, 'ghost tiny step'),
      el('b', { class: 'foe-v' }, [String(x[key] == null ? '—' : x[key]), max != null ? el('span', { class: 'muted small' }, ['/' + max]) : null]),
      button('+', () => { const was = x[key] || 0; const v = max != null ? Math.min(max, was + 1) : was + 1; patch(sceneId, x.id, Object.assign({ [key]: v }, key === 'endurance' && v > 0 && x.out && !(x.wounds >= maxOf(r, 'Might')) ? { out: false } : {}, key === 'wounds' && v >= (maxOf(r, 'Might') || Infinity) ? { out: true } : {})); logFoe(sceneId, x, lbl + ' ' + was + ' → ' + v); }, 'ghost tiny step')]);
    const hateBox = el('input', { type: 'checkbox', checked: spendFlags[x.id] || null, onchange: (ev) => { spendFlags[x.id] = ev.target.checked; } });
    return el('div', { class: 'foe-row' + (x.out ? ' out' : '') }, [
      el('div', { class: 'foe-head' }, [
        el('button', { class: 'ref', type: 'button', onclick: () => window.TorOpenEntity && window.TorOpenEntity(x.rec) }, [label(sceneId, x)]),
        el('span', { class: 'muted small' }, [' AL ' + f(r, 'Attribute Level') + ' · Parry ' + (f(r, 'Parry') || '—') + ' · Armour ' + (f(r, 'Armour') || '—') + ' · Might ' + (f(r, 'Might') || '—')]),
        x.out ? el('span', { class: 'cond on' }, [(x.wounds || 0) >= maxOf(r, 'Might') ? 'Slain' : 'Out']) : null,
        isWeary(x) ? el('span', { class: 'cond on', title: x.hate === 0 ? 'no ' + k + ' left' : '' }, ['Weary']) : null,
        button('×', () => remove(sceneId, x.id), 'ghost tiny'),
      ]),
      el('div', { class: 'chiprow tight' }, [
        step('endurance', maxOf(r, 'Endurance'), 'Endurance'),
        k ? step('hate', maxOf(r, k), k) : null,
        step('wounds', maxOf(r, 'Might') || null, 'Wounds'),
        button(x.weary ? 'Weary: on' : 'Weary', () => { const was = !!x.weary; patch(sceneId, x.id, { weary: !was }); logFoe(sceneId, x, was ? 'no longer Weary' : 'Weary'); }, 'toggle' + (x.weary ? ' on' : '')),
      ]),
      x.pierced ? el('div', { class: 'chiprow tight foe-pierced' }, [
        el('b', {}, ['Piercing Blow — Protection against Injury ' + x.pierced.injury]),
        k && x.hate > 0 ? el('label', { class: 'check small' }, [hateBox, ' spend 1 ' + k + ' (' + HATE_DICE + 'd)']) : null,
        button('Roll Protection (' + (parseInt(String(f(r, 'Armour') || '0'), 10) || 0) + 'd)', () => protection(sceneId, x, spendFlags[x.id]), 'tiny'),
        button('dismiss', () => patch(sceneId, x.id, { pierced: null }), 'ghost tiny'),
      ]) : null,
    ]);
  }
  function block(sceneId) {
    const xs = list(sceneId);
    const box = el('div', { class: 'foes' });
    if (!xs.length) return box;
    const up = xs.filter((x) => !x.out).length;
    box.appendChild(el('div', { class: 'prop-k' }, ['Adversaries · ' + up + ' of ' + xs.length + ' standing']));
    xs.forEach((x) => box.appendChild(row(sceneId, x)));
    return box;
  }

  return { RULES, list, label, add, remove, patch, hit, block, byId, recOf, isWeary, protection };
})();
