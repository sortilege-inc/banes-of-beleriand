// system/tor2e/ops.js — the ops The One Ring adds to the engine's, registered with the same
// call and shared the same way (engine/ops.js). Loaded by the browser after engine/ops.js,
// and imported by the Worker beside it, so the room applies the very same functions. Ids
// travel in the args; applying an op is deterministic everywhere, and the room never rolls.
//
//   cast   { [sceneId]: [recordIds] }   who the Loremaster has put in a scene of an adventure:
//                                       adversaries and Loremaster characters from the books
//                                       (data/records.js ids). An arc names its cast by name at
//                                       most (one does); the rest is the Loremaster's.
//   party[].versions                    archived copies of a hero (archivePartyVersion,
//                                       advancePartyMember)
//   gmNotes, arc, threads, encounters   the Loremaster's own pack state (setGmNotes …), never shared
// The adventure in play is the campaign's first module (the engine's setCampaign); a scene's
// done / notes / current use the engine's scene ops under the arc's id.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../../engine/ops.js'));
  else factory(root.VttOps);
})(typeof self !== 'undefined' ? self : this, function (Ops) {
  Ops.shared(['cast']);

  Ops.register('setSceneCast', (s, sceneId, ids) => {
    if (!s.cast) s.cast = {};
    s.cast[sceneId] = (ids || []).slice();
  });

  // The adversaries of a scene, each one tracked (system/tor2e/foes.js):
  //   foes { [sceneId]: [{ id, rec, n, endurance, hate, wounds, weary, out, pierced }] }
  // Players see who is there and who is down, never the numbers: the room forwards every foe op to
  // them as the scene's list with Endurance, Hate and Wounds taken out.
  Ops.shared(['foes']);
  const foeView = (f) => ({ id: f.id, rec: f.rec, n: f.n, out: !!f.out, weary: !!f.weary || f.hate === 0, wounded: (f.wounds || 0) > 0 });
  const foesFor = (s, sceneId) => ({ name: 'setFoes', args: [sceneId, ((s.foes || {})[sceneId] || []).map(foeView)] });
  Ops.playerFilter((doc) => {
    if (doc.foes) Object.keys(doc.foes).forEach((k) => { doc.foes[k] = (doc.foes[k] || []).map(foeView); });
    return doc;
  });
  const foe = (s, sceneId, id) => ((s.foes || {})[sceneId] || []).find((x) => x.id === id);
  Ops.register('setFoes', (s, sceneId, list) => {
    if (!s.foes) s.foes = {};
    s.foes[sceneId] = (list || []).map((x) => Object.assign({}, x));
  }, null, (s, a) => foesFor(s, a[0]));
  Ops.register('patchFoe', (s, sceneId, id, patch) => {
    const f = foe(s, sceneId, id);
    if (f && patch) Object.assign(f, patch);
  }, null, (s, a) => foesFor(s, a[0]));
  // a hero's hit: its Endurance loss, and a Piercing Blow awaiting the foe's Protection roll. Any
  // player may send it for their own attack; "All adversaries are taken out of combat if their
  // Endurance is reduced to zero" (Might and Endurance)
  Ops.register('hitFoe', (s, sceneId, id, loss, extra) => {
    const f = foe(s, sceneId, id);
    if (!f) return;
    if (typeof f.endurance === 'number') {
      f.endurance = Math.max(0, f.endurance - (Number(loss) || 0));
      if (f.endurance === 0) f.out = true;
    }
    if (extra && extra.piercing) f.pierced = { injury: extra.piercing, by: extra.by || null };
  }, (s, me) => !!me, (s, a) => foesFor(s, a[0]));

  // A hero's archived versions: a copy of the character and its live state, appended, never
  // edited. A player may archive their own hero.
  Ops.register('archivePartyVersion', (s, id, version) => {
    const m = (s.party || []).find((x) => x.id === id);
    if (!m || !version || !version.id) return;
    if (!m.versions) m.versions = [];
    if (!m.versions.some((x) => x.id === version.id)) m.versions.push(version);
  }, (s, me, a) => a[0] === me);

  // An advancement (the player's Advancement page): the hero as it was is archived as a version,
  // the advanced hero becomes the current one, and the points spent move with it.
  // adv = { version: { id, label, date, character, live }, character, live }. A player may
  // advance their own hero.
  Ops.register('advancePartyMember', (s, id, adv) => {
    const m = (s.party || []).find((x) => x.id === id);
    if (!m || !adv || !adv.character || !adv.version || !adv.version.id) return;
    if (!m.versions) m.versions = [];
    if (!m.versions.some((x) => x.id === adv.version.id)) m.versions.push(adv.version);
    m.character = adv.character;
    if (adv.live) m.live = Object.assign({}, m.live || {}, adv.live);
  }, (s, me, a) => a[0] === me);

  // A printed field of a hero changed by the rules outside advancement (Yule's "aged one year"):
  // the Loremaster's to send.
  Ops.register('patchPartyCharacter', (s, id, patch) => {
    const m = (s.party || []).find((x) => x.id === id);
    if (!m || !patch) return;
    m.character = Object.assign({}, m.character || {}, patch);
  });

  // The Loremaster's own pack state: free notes, the arc, open threads, saved encounters. Never
  // shared: no player may send them, none is in a player's view, and none is forwarded.
  const gmOnly = () => null;
  Ops.register('setGmNotes', (s, text) => { s.gmNotes = String(text || ''); }, null, gmOnly);
  Ops.register('setArc', (s, list) => { s.arc = (list || []).map((x) => Object.assign({}, x)); }, null, gmOnly);
  Ops.register('setThreads', (s, list) => { s.threads = (list || []).map((x) => Object.assign({}, x)); }, null, gmOnly);
  Ops.register('setEncounters', (s, list) => { s.encounters = JSON.parse(JSON.stringify(list || [])); }, null, gmOnly);

  return Ops;
});
