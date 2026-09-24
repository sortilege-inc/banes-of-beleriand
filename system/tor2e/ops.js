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

  // The Loremaster's own pack state: free notes, the arc, open threads, saved encounters. Never
  // shared: no player may send them, none is in a player's view, and none is forwarded.
  const gmOnly = () => null;
  Ops.register('setGmNotes', (s, text) => { s.gmNotes = String(text || ''); }, null, gmOnly);
  Ops.register('setArc', (s, list) => { s.arc = (list || []).map((x) => Object.assign({}, x)); }, null, gmOnly);
  Ops.register('setThreads', (s, list) => { s.threads = (list || []).map((x) => Object.assign({}, x)); }, null, gmOnly);
  Ops.register('setEncounters', (s, list) => { s.encounters = JSON.parse(JSON.stringify(list || [])); }, null, gmOnly);

  return Ops;
});
