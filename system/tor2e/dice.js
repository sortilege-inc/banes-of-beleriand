// system/tor2e/dice.js — The One Ring's dice: one Feat die (d12) and a number of Success
// dice (d6), totalled against a Target Number. Every number here is a rule the core states
// in prose; each is a named constant citing the entity whose sentence says it (RULES, ids
// checked by build/check_shape.py). The roller's words for the outcome are the book's own
// (Degree of Success: "a success", "a great success", "an extraordinary success").
//
// The book's rules icons, which the conversion writes as "[Success]", "[Eye of Sauron]" and
// "[Gandalf Rune]", are drawn as glyphs (assets/icons/, drawn for this tool); the token
// stays the glyph's title and accessible name, and the string in data/ is untouched.
window.TorDice = (function () {
  const { el, esc } = window.VttRender;

  // The rules the roller follows — the entity that states each, in the core.
  const RULES = {
    dice: { id: '#t1dGiseGf3bzn7pwzefq7QC', name: 'The One Ring Dice' },          // sidebar: "the 11 is the Eye of Sauron … the 12 is a Gandalf rune"; "the 6 has an Elvish [Success]"
    roll: { id: '#to0WqrVaIo4NY9yXci59xne', name: 'Make the Roll' },              // "Roll one Feat Die, plus a number of Success Dice equal to the rating"; "equal to or greater than the TN, the roll is a success"
    feat: { id: '#tggVAcxEvwXcSO1XphdHKFB', name: 'How to Read the Feat Dice' },  // rune: succeeds regardless; eye: counts as a zero
    success: { id: '#tm28feOTYvXBsLYwwDgHbfd', name: 'How to Read the Success Dice' },
    tn: { id: '#tKd6xRjM9pCh60ZGUr4Soiz', name: 'Target Numbers' },               // "Each Attribute TN is equal to 20 minus its corresponding Attribute score."
    degree: { id: '#tVPPyhWx1lDY9L88DgdvLOQ', name: 'Degree of Success' },
    favoured: { id: '#trWjoqVYtgKEYz0tiY4KWjU', name: 'Favoured Rolls' },         // two Feat dice, keep the best
    illFavoured: { id: '#tfZAQhqxpTxyhIHLnFJvGyy', name: 'Ill-favoured Rolls' },  // two Feat dice, keep the worst; both at once: roll one
    bonus: { id: '#tS3YJIvd4NrN1M1WNrMhcbO', name: 'Bonus Success Dice' },         // gain (1d); Hope; Inspired gains (2d)
    penalty: { id: '#te8NspnMHTHtHtT17mt5fVy', name: 'Penalty Success Dice' },     // lose (1d), "down to a minimum of zero Success dice"
    miserable: { id: '#t5acr5LycILksPtj0SAMjUa', name: 'Miserable' },             // an Eye of Sauron: the action fails
    weary: { id: '#tCVoMpzriWoxltgxAJDCt8W', name: 'Weary' },                     // Success dice showing 1, 2 or 3 count as zero
    adversary: { id: '#t7o9LrFacnHt60hMlM2c87u', name: 'Hate or Resolve' },       // its sidebar "Feat Die Results for Adversaries": the two icons switched
  };

  const FEAT_SIDES = 12;     // RULES.dice: a 12-sided Feat die
  const EYE = 11;            // RULES.dice: "the 11 is the Eye of Sauron symbol"
  const RUNE = 12;           // RULES.dice: "the 12 is a Gandalf rune"
  const SUCCESS_SIDES = 6;   // RULES.dice: 6-sided Success dice
  const SUCCESS_ICON = 6;    // RULES.dice: "the 6 has an Elvish [Success]"
  const WEARY_MAX = 3;       // RULES.weary: "an outlined number (1, 2, or 3)"
  const TN_BASE = 20;        // RULES.tn: "20 minus its corresponding Attribute score"
  const MAX_RATING = 6;      // RULES.roll: "a value ranging from 1 to 6"

  const tnOf = (attribute) => (attribute == null || attribute === '' ? null : TN_BASE - Number(attribute));

  // ── the icons ──────────────────────────────────────────────────────
  const ICONS = { 'Success': 'success', 'Eye of Sauron': 'eye-of-sauron', 'Gandalf Rune': 'gandalf-rune' };
  const TOKEN = /\[(Success|Eye of Sauron|Gandalf Rune)\]/g;
  const iconUrl = (word) => new URL('assets/icons/' + ICONS[word] + '.svg', document.baseURI).href;
  function tokenHtml(word) {
    return '<span class="rune rune-' + ICONS[word] + '" role="img" aria-label="' + esc(word) + '" title="' + esc(word) + '" style="--rune:url(&quot;' + esc(iconUrl(word)) + '&quot;)"></span>';
  }
  const icon = (word, cls) => el('span', { class: 'rune rune-' + ICONS[word] + (cls ? ' ' + cls : ''), role: 'img', 'aria-label': word, title: word, style: '--rune:url("' + iconUrl(word) + '")' });

  // ── a roll ─────────────────────────────────────────────────────────
  const d = (n) => 1 + Math.floor(Math.random() * n);

  // A Feat die face read for a hero (RULES.feat) or, switched, for a servant of the Shadow
  // (RULES.adversary): 'auto' is the automatic success, 'zero' the face that counts as 0.
  function readFeat(face, switched) {
    if (face === RUNE) return switched ? { face, value: 0, mark: 'Gandalf Rune', zero: true } : { face, value: 0, mark: 'Gandalf Rune', auto: true };
    if (face === EYE) return switched ? { face, value: 0, mark: 'Eye of Sauron', auto: true } : { face, value: 0, mark: 'Eye of Sauron', zero: true, eye: true };
    return { face, value: face };
  }
  // best first: the automatic success, then 10 … 1, then the zero
  const rank = (f) => (f.auto ? 100 : f.zero ? -1 : f.value);

  // opts: { rating, tn, favour: 'favoured'|'ill'|null, weary, miserable, gain, lose, switched }
  function roll(opts) {
    const o = opts || {};
    const favoured = o.favour === 'favoured';
    const ill = o.favour === 'ill';
    const two = favoured !== ill && (favoured || ill);          // RULES.illFavoured sidebar: both at once → one
    const feats = [readFeat(d(FEAT_SIDES), o.switched)];
    if (two) feats.push(readFeat(d(FEAT_SIDES), o.switched));
    let kept = feats[0];
    if (two) kept = feats.slice().sort((a, b) => (favoured ? rank(b) - rank(a) : rank(a) - rank(b)))[0];
    const n = Math.max(0, Math.min(MAX_RATING, Number(o.rating) || 0) + (Number(o.gain) || 0) - (Number(o.lose) || 0));   // RULES.penalty: minimum zero
    const success = [];
    for (let i = 0; i < n; i++) {
      const face = d(SUCCESS_SIDES);
      const zeroed = !!o.weary && face <= WEARY_MAX;            // RULES.weary
      success.push({ face, value: zeroed ? 0 : face, icon: face === SUCCESS_ICON, zeroed });
    }
    const total = kept.value + success.reduce((s, x) => s + x.value, 0);
    const icons = success.filter((x) => x.icon).length;
    const tn = o.tn == null || o.tn === '' ? null : Number(o.tn);
    let ok;
    let why = null;
    if (o.miserable && kept.eye) { ok = false; why = 'miserable'; }   // RULES.miserable
    else if (kept.auto) { ok = true; why = 'auto'; }                   // RULES.feat
    else ok = tn == null ? null : total >= tn;                          // RULES.roll
    const degree = ok ? (icons >= 2 ? 'extraordinary' : icons === 1 ? 'great' : 'success') : null;   // RULES.degree
    return { feats, kept, success, total, icons, tn, ok, why, degree, favour: two ? o.favour : null, rating: Number(o.rating) || 0, dice: n, switched: !!o.switched, weary: !!o.weary, miserable: !!o.miserable };
  }

  // The outcome in the book's words (RULES.degree, RULES.roll).
  const DEGREE_WORDS = { success: 'a success', great: 'a great success', extraordinary: 'an extraordinary success' };
  function verdict(r) {
    if (r.ok == null) return 'total ' + r.total;
    if (!r.ok) return r.why === 'miserable' ? 'failed — Miserable, and the Eye came up' : 'failed';
    return DEGREE_WORDS[r.degree] + (r.why === 'auto' ? ' (the ' + r.kept.mark + ')' : '');
  }
  // one line for the log
  function line(r) {
    const feat = r.feats.map((f) => (f.mark ? '[' + f.mark + ']' : String(f.face))).join('/');
    const sd = r.success.map((s) => (s.icon ? '6[Success]' : s.zeroed ? s.face + '→0' : String(s.face))).join(' ');
    return 'Feat ' + feat + (sd ? ' + ' + sd : '') + ' = ' + r.total + (r.tn != null ? ' vs TN ' + r.tn : '') + ' — ' + verdict(r);
  }

  // ── the faces, drawn ───────────────────────────────────────────────
  function featFace(f, kept) {
    return el('span', { class: 'die feat' + (kept ? ' kept' : ' dropped') + (f.auto ? ' auto' : '') + (f.zero ? ' zero' : ''), title: f.mark || String(f.face) }, [f.mark ? icon(f.mark) : String(f.face)]);
  }
  function successFace(s) {
    return el('span', { class: 'die success' + (s.face <= WEARY_MAX ? ' outline' : '') + (s.zeroed ? ' zeroed' : '') + (s.icon ? ' icon' : ''), title: s.zeroed ? s.face + ', counted as zero (Weary)' : String(s.face) }, [String(s.face), s.icon ? icon('Success', 'small') : null]);
  }
  function faces(r) {
    return el('div', { class: 'faces' }, [
      ...r.feats.map((f) => featFace(f, f === r.kept)),
      r.success.length ? el('span', { class: 'plus' }, ['+']) : null,
      ...r.success.map(successFace),
    ]);
  }

  // ── the roller: a small form over roll() ───────────────────────────
  // opts: { rating, tn, label, favour, weary, miserable, switched, onRoll(r), onRule(id) }
  // The form stays in the DOM across redraws of its owner (a caller may keep it: rollerFor).
  function roller(opts) {
    const o = Object.assign({ rating: 2, tn: 14 }, opts || {});
    const ruleLink = (r, label) => el('a', { class: 'ref rule-cite', href: '#', title: r.name, onclick: (ev) => { ev.preventDefault(); if (o.onRule) o.onRule(r.id); } }, [label || r.name]);
    const num = (v, min, max) => el('input', { type: 'number', class: 'num', min: String(min), max: String(max), value: v == null ? '' : String(v) });
    const rating = num(o.rating, 0, MAX_RATING);
    const tn = num(o.tn, 0, 30);
    const gain = num(0, 0, 6);
    const lose = num(0, 0, 6);
    const favour = el('select', { class: 'scope' }, [['', 'normal'], ['favoured', 'Favoured'], ['ill', 'Ill-favoured']].map((x) => el('option', { value: x[0], selected: (o.favour || '') === x[0] || null }, [x[1]])));
    const box = (label, on, rule) => {
      const c = el('input', { type: 'checkbox', checked: on || null });
      return { c, node: el('label', { class: 'check' }, [c, ' ', label, rule ? [' ', el('span', { class: 'muted small' }, ['(', ruleLink(rule, 'rule'), ')'])] : null]) };
    };
    const weary = box('Weary', o.weary, RULES.weary);
    const miserable = box('Miserable', o.miserable, RULES.miserable);
    const switched = box('A servant of the Shadow rolls (icons switched)', o.switched, RULES.adversary);
    const out = el('div', { class: 'roll-out' });
    const btn = el('button', { type: 'button', class: 'btn roll-btn' }, ['Roll']);
    const form = el('div', { class: 'roller' }, [
      o.label ? el('div', { class: 'roller-h' }, [o.label]) : null,
      el('div', { class: 'roller-row' }, [
        el('label', {}, ['Rating ', rating]), el('label', {}, ['TN ', tn]),
        el('label', {}, [ruleLink(RULES.favoured, 'Favour'), ' ', favour]),
        el('label', {}, [ruleLink(RULES.bonus, 'gain'), ' (', gain, 'd)']),
        el('label', {}, [ruleLink(RULES.penalty, 'lose'), ' (', lose, 'd)']),
      ]),
      el('div', { class: 'roller-row' }, [weary.node, miserable.node, switched.node]),
      el('div', { class: 'roller-row' }, [btn, el('span', { class: 'muted small' }, [ruleLink(RULES.roll), ' · ', ruleLink(RULES.degree)])]),
      out,
    ]);
    btn.addEventListener('click', () => {
      const r = roll({ rating: rating.value, tn: tn.value, favour: favour.value || null, weary: weary.c.checked, miserable: miserable.c.checked, switched: switched.c.checked, gain: gain.value, lose: lose.value });
      out.innerHTML = '';
      out.appendChild(faces(r));
      out.appendChild(el('div', { class: 'verdict ' + (r.ok ? 'ok' : r.ok === false ? 'fail' : '') }, [
        el('b', {}, [String(r.total)]), r.tn != null ? ' vs TN ' + r.tn + ' — ' : ' — ', verdict(r),
        r.icons ? el('span', { class: 'muted small' }, [' · ' + r.icons + ' ', icon('Success', 'small')]) : null,
      ]));
      if (o.onRoll) o.onRoll(r);
    });
    form.set = (v) => {
      if (v.rating != null) rating.value = String(v.rating);
      if (v.tn != null) tn.value = String(v.tn);
      if (v.favour !== undefined) favour.value = v.favour || '';
      if (v.weary !== undefined) weary.c.checked = !!v.weary;
      if (v.miserable !== undefined) miserable.c.checked = !!v.miserable;
      if (v.switched !== undefined) switched.c.checked = !!v.switched;
    };
    return form;
  }

  // ── a printed table rolled on ──────────────────────────────────────
  // A table whose rows the book labels with Feat die faces ([Eye of Sauron], 1–10,
  // [Gandalf Rune], or ranges "2–3") or Success die faces (1–6) is rolled with that die and
  // read off the row the face falls in. A table labelled any other way is not rolled here.
  function facesOf(cell) {
    const c = String(cell).trim();
    if (c === '[Eye of Sauron]') return [EYE];
    if (c === '[Gandalf Rune]') return [RUNE];
    let m = /^(\d{1,2})$/.exec(c);
    if (m) return [+m[1]];
    m = /^(\d{1,2})\s*[–-]\s*(\d{1,2})$/.exec(c);
    if (m && +m[1] <= +m[2]) {
      const out = [];
      for (let i = +m[1]; i <= +m[2]; i++) out.push(i);
      return out;
    }
    return null;
  }
  function tableDie(t) {
    if (!t || !t.rows || !t.rows.length) return null;
    const sets = t.rows.map((r) => facesOf(r[0]));
    if (sets.some((x) => !x)) return null;
    const all = [].concat(...sets);
    const feat = all.some((f) => f > SUCCESS_SIDES);
    if (!feat && all.some((f) => f < 1)) return null;
    return { die: feat ? 'feat' : 'success', sides: feat ? FEAT_SIDES : SUCCESS_SIDES, sets };
  }
  // → { face, mark, row (the printed row, or null when the book prints none for that face) }
  function rollTable(t) {
    const td = tableDie(t);
    if (!td) return null;
    const face = d(td.sides);
    const i = td.sets.findIndex((s) => s.indexOf(face) !== -1);
    const mark = td.die === 'feat' && face === EYE ? 'Eye of Sauron' : td.die === 'feat' && face === RUNE ? 'Gandalf Rune' : null;
    return { die: td.die, face, mark, row: i === -1 ? null : t.rows[i], index: i };
  }

  return { tableDie, rollTable, RULES, FEAT_SIDES, EYE, RUNE, SUCCESS_SIDES, SUCCESS_ICON, WEARY_MAX, TN_BASE, MAX_RATING, tnOf, TOKEN, tokenHtml, icon, roll, verdict, line, faces, roller };
})();
