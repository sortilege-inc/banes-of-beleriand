// system/tor2e/ops.js — the ops The One Ring adds to the engine's, registered with the same
// call and shared the same way (engine/ops.js). Loaded by the browser after engine/ops.js,
// and imported by the Worker beside it, so the room applies the very same functions. Ids
// travel in the args; applying an op is deterministic everywhere, and the room never rolls.
//
//   cast   { [sceneId]: [recordIds] }   who the Loremaster has put in a scene of an adventure:
//                                       adversaries and Loremaster characters from the books
//                                       (data/records.js ids). An arc names its cast by name at
//                                       most (one does); the rest is the Loremaster's.
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

  return Ops;
});
