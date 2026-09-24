// system/tor2e/table.js — what The One Ring tells the table (engine/vtt.js) and the player's
// page (engine/play.js): which scenes are in play, what can stand on the table, what a token's
// state reads as, and how a character file becomes a member of the Company. The engine never
// asks the corpus directly.
//
// The module in play is one of the books' thirteen adventures — the campaign's first module
// (PLAN.md decision 10). Its scenes come from data/index.js, so the table lists them before the
// book is loaded; a scene's text arrives with its book. The adventures ship no maps: a map is
// whatever image the Loremaster sets on a scene, and who is in a scene is who the Loremaster
// has put there from the books (system op `setSceneCast`).
window.VttSystem = (function () {
  const D = window.TorData;
  const State = window.VttState;
  const S = () => State.state;
  const Sheet = () => window.TorSheet;

  // the adventure in play: the campaign's first module that is an adventure
  function adventureId() {
    const mods = ((S().campaign || {}).modules || []);
    return mods.find((m) => D.adventure(m)) || null;
  }
  const adventure = () => D.adventure(adventureId());

  // scenes from the index: { id, name, phase (its Part), moduleId }
  function scenes() {
    const a = adventure();
    if (!a) return [];
    const ib = D.indexBook(a.book);
    const c = ib && ib.chapters.find((x) => x.file === a.file);
    return ((c && c.scenes) || []).map((s) => ({ id: s.id, name: s.name, phase: s.part, moduleId: a.id }));
  }
  // a scene with its text, once its book is loaded; the index's name and Part until then
  function scene(id) {
    const a = adventure();
    const c = a && D.chapter(a.book, a.file);
    return (c && D.sceneIn(c, id)) || scenes().find((s) => s.id === id) || null;
  }
  function currentSceneId() {
    const a = adventure();
    const cur = a ? (S().current || {})[a.id] : null;
    const all = scenes();
    return (all.find((s) => s.id === cur) || all[0] || {}).id || null;
  }

  // who is in a scene: records (always in memory) — their book loads when opened
  const cast = (sceneId) => ((S().cast || {})[sceneId] || []).map((id) => D.record(id)).filter(Boolean);
  // the names an arc's own CAST block gives (by name only), resolved to records of its book
  function castNamed() {
    const a = adventure();
    const c = a && D.chapter(a.book, a.file);
    if (!c) return [];
    const names = [].concat(...(c.cast || []).map((x) => (x.include || []).map((r) => r.name)));
    return names.map((n) => D.records().find((r) => r.name === n && D.ACTOR_TYPES.indexOf(r.type) !== -1)).filter(Boolean);
  }

  const maps = () => [];
  const mapDef = () => null;
  const defaultMapId = (sceneId) => sceneId;
  const legend = () => null;
  const mapAssets = () => [];

  function tokenSources() {
    const groups = [];
    const party = (S().party || []).map((m) => ({ id: 'tk-' + m.id, label: m.name, kind: 'party', owner: m.id, ref: m.id }));
    if (party.length) groups.push({ label: 'The Company', items: party });
    const sc = scene(currentSceneId());
    // each tracked foe its own token (system/tor2e/foes.js), then the rest of the scene's cast
    const foes = sc && window.TorFoes ? window.TorFoes.list(sc.id).map((x) => ({ id: 'tk-' + x.id, label: window.TorFoes.label(sc.id, x), kind: 'cast', ref: x.rec, foe: x.id, scene: sc.id })) : [];
    const here = sc ? foes.concat(cast(sc.id).map((r) => ({ label: r.name, kind: r.type === 'Adversary' ? 'cast' : 'folk', ref: r.id }))) : [];
    if (here.length) groups.push({ label: sc.name, items: here });
    return groups;
  }

  const COLORS = { party: '#b08a3e', cast: '#9e2b1e', folk: '#4f6b3a', marker: '#8a7a66' };
  const tokenColor = (t) => COLORS[t.kind] || COLORS.marker;
  // a token's word: a hero's current Endurance and Hope; an adversary's printed ratings
  function tokenStatus(t) {
    if (t.kind === 'party') {
      const m = (S().party || []).find((x) => x.id === t.owner);
      return m && Sheet() ? { text: Sheet().statusLine(m), pips: [] } : null;
    }
    const r = t.ref ? D.record(t.ref) : null;
    if (!r) return null;
    const f = r.fields || {};
    // a tracked foe: its own Endurance and Hate (the players' copy holds only whether it is down)
    const x = t.foe && window.TorFoes ? window.TorFoes.byId(t.scene, t.foe) : null;
    if (x) return { text: [x.out ? 'Out' : null, typeof x.endurance === 'number' ? 'Endurance ' + x.endurance + '/' + f.Endurance : null, typeof x.hate === 'number' ? (f.Hate != null ? 'Hate ' : 'Resolve ') + x.hate : null, window.TorFoes.isWeary(x) ? 'Weary' : null, x.wounds ? 'Wounds ' + x.wounds : null].filter(Boolean).join(' · ') || 'Standing', pips: [] };
    if (r.type !== 'Adversary') return { text: f.Occupation || r.type, pips: [] };
    return { text: ['Endurance ' + f.Endurance, f.Hate != null ? 'Hate ' + f.Hate : f.Resolve != null ? 'Resolve ' + f.Resolve : null, 'Parry ' + f.Parry, 'Armour ' + f.Armour].filter(Boolean).join(' · '), pips: [] };
  }

  function selectToken(t) {
    if (t.kind === 'party') window.VttBus.emit('select', { kind: 'party', id: t.owner });
    else if (t.ref) window.VttBus.emit('select', { kind: 'entity', id: t.ref });
  }
  const tokenMenu = () => null;

  // ── the Player-hero: the sheet derived from ACTOR "Player-hero" (system/tor2e/sheet.js) ──
  // The sheet reads the BASE (in the core); until the core is in memory the panel says so and
  // fills in when it arrives.
  const readCharacter = (obj, fileName) => Sheet().readMember(obj, fileName);
  const downloadCharacter = (m) => Sheet().downloadMember(m);
  function liveSheet(m, opts) {
    if (D.loaded('core')) return Sheet().live(m, opts);
    const box = window.VttRender.el('div', { class: 'muted' }, ['Opening the sheet…']);
    D.ready('core').then(() => { if (box.parentNode) box.replaceWith(Sheet().live(m, opts)); });
    return box;
  }
  const memberSubtitle = (m) => (Sheet() ? Sheet().sentence(m.character || {}) : '');

  return {
    get MODULE() { return adventureId(); }, adventureId, adventure, scenes, scene, currentSceneId, cast, castNamed,
    maps, mapDef, defaultMapId, legend, mapAssets,
    tokenSources, tokenColor, tokenStatus, selectToken, tokenMenu,
    liveSheet, readCharacter, downloadCharacter, memberSubtitle,
  };
})();
