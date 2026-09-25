// engine/config.js — where things are. The one file a deployment edits.
// INSTANCE-OWNED: Banes of Beleriand (merge=ours; see campaign/PLAN.md).
window.VttConfig = {
  system: 'tor2e',
  title: 'Banes of Beleriand',
  channel: 'banes-vtt',                  // BroadcastChannel name (same-machine windows)
  storagePrefix: 'banes-vtt',            // localStorage key prefix
  dataGlobal: 'TOR2E',                   // the global data/*.js registers into
  // The pages, relative to the site root; the gm/ pages carry <base href="../"> so every
  // path stays root-relative.
  pages: { site: './', gm: 'gm/', table: 'gm/vtt.html', play: 'gm/play.html' },
  // what a fresh browser opens on until a campaign is created or restored; the seed (engine/state.js
  // seed) is the Loremaster's material, built by campaign/build/seed_source.py
  defaultCampaign: { name: 'Banes of Beleriand', modules: [], books: [], seed: 'campaign/pack/seed.json' },
  // The campaign's maps (system/tor2e/table.js mapAssets: the table's "maps in the repo…" list;
  // campaign/site/site.js draws them atop the Atlas). From the Foundry world (campaign/PLAN.md U6).
  maps: [
    { label: 'Eriador', image: 'campaign/assets/maps/eriador.webp', preview: 'campaign/assets/maps/eriador-preview.webp' },
    { label: 'Middle-earth', image: 'campaign/assets/maps/middle-earth.webp', preview: 'campaign/assets/maps/middle-earth-preview.webp' },
  ],
  // the three panels the Loremaster's page opens on (engine/app.js)
  defaultSlots: ['scenes', 'company', 'inspector'],
  // What this instance adds to the upstream pages (engine/instance.js): its DSL layer (built by
  // build/build_layer.sh into campaign/data/), its authored prose (campaign/build/build_docs.py →
  // campaign/data/docs.js), the campaign's site tabs and its Loremaster's panel.
  instance: {
    styles: ['campaign/site/campaign.css'],
    stages: {
      data: ['campaign/data/index.js', 'campaign/data/docs.js'],
      site: ['campaign/site/site.js'],
      gm: ['campaign/site/gm.js'],
    },
  },
  // The family standards (PLAYBOOK §4b): the public site's book tabs are off — the GM turns them on,
  // per browser, in the GM page's Settings (engine/site.js) — and a veil stands in front of /gm/
  // (engine/app.js). The GM's own material lives in the GM tabs (engine/gm-panes.js), in the pack.
  siteBooks: false,
  gmGate: {
    title: 'The Loremaster\u2019s table',
    text: 'Beyond is the Loremaster\u2019s material \u2014 the prep, the threads, what the players have not yet found. If you are playing, turn back.',
    enter: 'Enter',
    leave: 'Turn back',
  },
  // The Worker that holds player sessions. Served from localhost the app talks to
  // `wrangler dev`; deployed, to the URL below. Empty = sessions disabled until the owner
  // decides where this instance is served (campaign/PLAN.md O1).
  worker: {
    deployed: '',
    local: 'http://localhost:8795',
  },
};
window.VttConfig.workerUrl = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? window.VttConfig.worker.local : window.VttConfig.worker.deployed;
