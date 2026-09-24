// engine/config.js — where things are. The one file a deployment edits.
window.VttConfig = {
  system: 'tor2e',
  title: 'The One Ring',
  channel: 'sortilege-vtt-tor2e',        // BroadcastChannel name (same-machine windows)
  storagePrefix: 'sortilege-vtt-tor2e',  // localStorage key prefix
  dataGlobal: 'TOR2E',                   // the global data/*.js registers into
  // The pages, relative to the site root; the gm/ pages carry <base href="../"> so every
  // path stays root-relative.
  pages: { site: './', gm: 'gm/', table: 'gm/vtt.html', play: 'gm/play.html' },
  // what a fresh browser opens on until a campaign is created or restored.
  // An instance may add `seed: 'campaign/pack/seed.json'` — a pack whose keys fill what its
  // campaign has never had (its arc, its threads, its encounters), once (engine/state.js seed).
  // An instance may also name the Notes pane's document (system/tor2e/gm-panes.js):
  //   notes: { src: 'campaign/docs/state.html', title: '…', class: '…',
  //            gate: { title: '…', text: '…', enter: '…' } }
  // a .html src is the instance's own fragment, inserted as it is; anything else reads as Markdown.
  defaultCampaign: { name: 'A new company', modules: [], books: [] },
  // the three panels the GM page opens on (engine/app.js)
  defaultSlots: ['adventure', 'company', 'inspector'],
  // An instance (a campaign repo forked from this VTT) declares its own scripts here — its
  // data layer, site tabs, Loremaster panels and styles — and engine/instance.js loads them at
  // the stages the upstream pages mark. Upstream declares none. Shape: engine/instance.js.
  instance: null,
  // The Worker that holds player sessions. Served from localhost the app talks to
  // `wrangler dev`; deployed, to the URL below. Empty = sessions disabled: the owner kept
  // this build private and local (PLAN.md D3).
  worker: {
    deployed: '',
    local: 'http://localhost:8793',
  },
};
window.VttConfig.workerUrl = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? window.VttConfig.worker.local : window.VttConfig.worker.deployed;
