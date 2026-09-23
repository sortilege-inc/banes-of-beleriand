// system/tor2e/data.js — accessors over the generated corpus (window.TOR2E from data/*.js).
// The only file that knows the data's shape; the reader, the tabs, the panels, the dice and
// the sheet ask here.
//
// Three things worth saying about this corpus:
//   * It is nine books (3.6 MB). data/index.js and data/records.js come with every page; a
//     book's entities arrive when something asks for them (TorData.ready → engine/data.js).
//   * The BASE declares its types, so a Heroic Culture, an Adversary or a Virtue is a RECORD
//     known by the type it EXTENDS; records.js lists every one with a few fields, so a list can
//     be drawn before its book is loaded.
//   * An adventure is an .arc chapter: its document order (`seq`) interleaves its own
//     properties, LOCATIONs, SCENEs and entities as printed; its FLOW's Parts list SCENE_REFs.
window.TorData = (function () {
  const EMPTY = { books: {}, entities: {}, loaded: {}, index: { books: [], types: [], counts: {} }, records: [] };
  const T = () => window.TOR2E || EMPTY;
  const Data = () => window.VttData;

  const index = () => T().index || EMPTY.index;
  const books = () => (index().books || []).slice();
  const indexBook = (id) => (index().books || []).find((b) => b.id === id) || null;
  const book = (id) => T().books[id] || null;
  const loaded = (id) => !!book(id);
  const entity = (id) => T().entities[id] || null;
  const records = () => T().records || [];
  let recIndex = null;
  const record = (id) => {
    if (!recIndex) {
      recIndex = {};
      records().forEach((r) => { recIndex[r.id] = r; });
    }
    return recIndex[id] || null;
  };
  const byType = (type) => records().filter((r) => r.type === type);

  // Load one or more books; resolves when their entities are in memory.
  function ready(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter((id) => id && indexBook(id));
    return Data().ready(list, ['main']);
  }
  const readyAll = () => ready(books().map((b) => b.id));
  const loadedBooks = () => books().filter((b) => loaded(b.id)).map((b) => b.id);

  // Which book an id lives in, before that book is loaded: a record knows; so does a scene's arc.
  function bookOf(id) {
    const e = entity(id);
    if (e) return e.book;
    const r = record(id);
    return r ? r.book : null;
  }
  function fetch(id) {
    if (entity(id)) return Promise.resolve(entity(id));
    const b = bookOf(id);
    if (!b) return Promise.resolve(null);
    return ready(b).then(() => entity(id));
  }

  function children(id) {
    const e = entity(id);
    return e ? e.children.map(entity).filter(Boolean) : [];
  }

  function prop(e, name) {
    return (e && (e.props || []).find((p) => p.name === name)) || null;
  }
  function val(e, name) {
    const p = prop(e, name);
    if (!p) return undefined;
    if (p.vk === 'scalar' || p.vk === 'enum') return p.value;
    if (p.vk === 'ref') return p.ref;
    if (p.vk === 'list') return p.items;
    return p;
  }
  const text = (e, name) => {
    const v = val(e, name);
    return typeof v === 'string' ? v : null;
  };
  // a def-valued field's own fields as { name: value } (Derived Stats › Endurance, …)
  function fieldsOf(p) {
    const out = {};
    ((p && p.fields) || []).forEach((f) => { out[f.name] = f.vk === 'def' ? fieldsOf(f) : f.vk === 'list' ? f.items : f.value; });
    return out;
  }

  // Every entity of a set of loaded books, each book's chapters in order, depth first.
  function all(bookIds) {
    const out = [];
    (bookIds || loadedBooks()).forEach((bid) => {
      const b = book(bid);
      if (!b) return;
      const walk = (ids) => ids.forEach((id) => { const e = entity(id); if (e) { out.push(e); walk(e.children); } });
      b.chapters.forEach((c) => {
        walk(c.roots || []);
        blocksOf(c).forEach((blk) => walk(blk.entities || []));
      });
    });
    return out;
  }

  // The BASE's declaration of a type (the core must be loaded): the top-level entity of the
  // BASE file whose name is the type's.
  const BASE_FILE = 'tor2e-0.5-core-base.ttrpg';
  function declaration(name) {
    const b = book('core');
    if (!b) return null;
    const c = b.chapters.find((x) => x.file === BASE_FILE);
    return c ? (c.roots || []).map(entity).find((e) => e && e.name === name) || null : null;
  }
  // an entity's type chain, nearest first (a Patron EXTENDS the Loremaster Character)
  function typeChain(name) {
    const out = [];
    let d = declaration(name);
    while (d && out.indexOf(d) === -1) {
      out.push(d);
      d = d.type ? declaration(d.type) : null;
    }
    return out;
  }

  // ── chapters ───────────────────────────────────────────────────────
  // The chapter's title is its file's NAME, "<Book> - <Chapter>", shown as its last segment;
  // an adventure's and a frame's NAME is the title itself; a lore chapter's is its first
  // heading line; an actor chapter's is this build's label.
  function chapterTitle(c) {
    if (c.kind === 'lore') return String(c.name || c.file).replace(/^#\s+/, '');
    const n = String(c.name || c.file);
    if (c.kind === 'arc' || c.kind === 'frame' || c.kind === 'actors') return n;
    const parts = n.split(' - ');
    return parts[parts.length - 1];
  }
  const blocksOf = (c) => [].concat(c.scenes || [], c.locations || [], c.entries || []);
  function chapter(bid, file) {
    const b = book(bid);
    return b ? b.chapters.find((c) => c.file === file) || null : null;
  }

  // ── a book's outline: chapters, then each chapter's entity tree ────
  // An adventure's chapter lists its Parts (or, with no FLOW, its scenes) and its locations;
  // an actor chapter its actors in name order.
  const outlineCache = {};
  function outline(bid) {
    if (outlineCache[bid]) return outlineCache[bid].roots;
    const b = book(bid);
    if (!b) return [];
    const map = {};
    const build = (e, parent, depth) => {
      const n = { id: e.id, entity: e, label: e.name, depth, parent, kids: [] };
      map[e.id] = n;
      children(e.id).forEach((k) => n.kids.push(build(k, n, depth + 1)));
      return n;
    };
    const roots = b.chapters.map((c) => {
      const n = { id: 'ch:' + c.file, chapter: c, label: chapterTitle(c), page: c.page, depth: 0, parent: null, kids: [] };
      map[n.id] = n;
      let ids = (c.roots || []).slice();
      if (c.kind === 'actors') ids.sort((x, y) => (entity(x) || {}).name.localeCompare((entity(y) || {}).name));
      if (c.kind === 'arc') {
        scenesOf(c).forEach((s) => {
          const sn = { id: 'sc:' + s.id, scene: s, chapter: c, label: s.name, depth: 1, parent: n, kids: [] };
          map[sn.id] = sn;
          n.kids.push(sn);
          (s.entities || []).map(entity).filter(Boolean).forEach((e) => sn.kids.push(build(e, sn, 2)));
        });
        ids = ids.filter((id) => !map[id]);
      }
      ids.map(entity).filter(Boolean).forEach((e) => n.kids.push(build(e, n, 1)));
      return n;
    });
    outlineCache[bid] = { roots, map };
    return roots;
  }
  function node(bid, id) {
    outline(bid);
    return (outlineCache[bid] && outlineCache[bid].map[id]) || null;
  }
  function trail(bid, id) {
    const out = [];
    let n = node(bid, id);
    while (n) {
      out.unshift(n);
      n = n.parent;
    }
    return out;
  }

  // ── adventures ─────────────────────────────────────────────────────
  // Every .arc chapter across the books, from the index (no book needs to be loaded to list).
  function adventures() {
    const out = [];
    books().forEach((b) => (b.chapters || []).forEach((c) => {
      if (c.kind === 'arc') out.push({ id: c.cid, book: b.id, file: c.file, name: c.name, page: c.page });
    }));
    return out;
  }
  const frames = () => {
    const out = [];
    books().forEach((b) => (b.chapters || []).forEach((c) => { if (c.kind === 'frame') out.push({ id: c.cid, book: b.id, file: c.file, name: c.name, page: c.page }); }));
    return out;
  };
  const adventure = (cid) => adventures().find((a) => a.id === cid) || null;
  function arcChapter(cid) {
    const a = adventure(cid);
    return a ? chapter(a.book, a.file) : null;
  }
  // The arc's scenes in reading order: each Part's SCENE_REFs in turn, then the scenes no Part
  // names, in document order. A scene read that way carries its Part's name.
  function scenesOf(c) {
    if (!c) return [];
    const byId = {};
    (c.scenes || []).forEach((s) => { byId[s.id] = s; });
    const out = [];
    const seen = new Set();
    (c.phases || []).forEach((p) => (p.scenes || []).forEach((id) => {
      if (byId[id] && !seen.has(id)) {
        seen.add(id);
        out.push(Object.assign({ part: p.name }, byId[id]));
      }
    }));
    (c.scenes || []).forEach((s) => { if (!seen.has(s.id)) out.push(Object.assign({ part: null }, s)); });
    return out;
  }
  const sceneIn = (c, sid) => scenesOf(c).find((s) => s.id === sid) || null;

  // ── records ────────────────────────────────────────────────────────
  const ACTOR_TYPES = ['Adversary', 'Loremaster Character', 'Patron'];
  const adversaries = () => byType('Adversary');
  const people = () => records().filter((r) => r.type === 'Loremaster Character' || r.type === 'Patron');
  const tables = () => byType('Table');
  const f = (r, k) => (r && r.fields ? r.fields[k] : undefined);

  // ── search (the loaded books, and the records always) ──────────────
  function searchText(e) {
    const parts = [e.name, e.desc || ''];
    const pv = (p) => {
      if ((p.vk === 'scalar' || p.vk === 'enum') && typeof p.value === 'string') parts.push(p.value);
      if (p.vk === 'list') (p.items || []).forEach((it) => {
        if (it.vk === 'scalar') parts.push(String(it.value));
        if (it.vk === 'def') (it.fields || []).forEach(pv);
      });
      if (p.vk === 'def') (p.fields || []).forEach(pv);
    };
    (e.props || []).forEach(pv);
    (e.entries || []).forEach((r) => (r.fields || []).forEach(pv));
    if (e.table) e.table.rows.forEach((r) => parts.push(r.join(' ')));
    (e.guidance || []).forEach((g) => parts.push((g.name || '') + ' ' + (g.text || '')));
    return parts.join('\n');
  }
  const cache = new Map();
  function search(query, bookIds, limit) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const hits = [];
    const test = (e, id) => {
      let t = cache.get(id);
      if (t === undefined) {
        t = searchText(e).toLowerCase();
        cache.set(id, t);
      }
      const inName = e.name.toLowerCase().indexOf(q) !== -1;
      return inName ? 0 : t.indexOf(q) !== -1 ? 1 : -1;
    };
    (bookIds || loadedBooks()).forEach((bid) => {
      const b = book(bid);
      if (!b) return;
      const walk = (ids) => ids.forEach((id) => {
        const e = entity(id);
        if (!e) return;
        const s = test(e, id);
        if (s >= 0) hits.push({ e, score: s });
        walk(e.children);
      });
      b.chapters.forEach((c) => {
        if (c.kind === 'lore' && c.text.toLowerCase().indexOf(q) !== -1) hits.push({ e: { id: 'ch:' + c.file, name: chapterTitle(c), book: bid, lore: c }, score: 1 });
        walk(c.roots || []);
        (c.scenes || []).concat(c.locations || []).forEach((blk) => {
          const pseudo = { id: blk.id ? 'sc:' + blk.id : 'ch:' + c.file, name: blk.name || '', desc: blk.desc, props: blk.props, guidance: blk.guidance, table: blk.table, entries: blk.entries, book: bid, block: blk, chapter: c };
          const s = test(pseudo, bid + '|' + c.file + '|' + (blk.id || blk.name) + '|' + (blk.desc || '').slice(0, 20));
          if (s >= 0) hits.push({ e: pseudo, score: s });
          walk(blk.entities || []);
        });
      });
    });
    hits.sort((a, b) => a.score - b.score);
    return hits.slice(0, limit || 200).map((h) => h.e);
  }
  function excerpt(e, query, n) {
    const t = e.lore ? e.lore.text : searchText(e);
    const i = t.toLowerCase().indexOf(String(query).toLowerCase());
    if (i < 0) return null;
    const a = Math.max(0, i - (n || 60));
    const b = Math.min(t.length, i + String(query).length + (n || 60));
    return (a ? '…' : '') + t.slice(a, b).replace(/\n+/g, ' ') + (b < t.length ? '…' : '');
  }
  const searchRecords = (query) => {
    const q = String(query || '').trim().toLowerCase();
    return q.length < 2 ? [] : records().filter((r) => r.name.toLowerCase().indexOf(q) !== -1);
  };

  return {
    T, index, books, indexBook, book, loaded, loadedBooks, entity, records, record, byType, ready, readyAll,
    bookOf, fetch, children, prop, val, text, fieldsOf, all, declaration, typeChain, chapterTitle, chapter,
    blocksOf, outline, node, trail, adventures, frames, adventure, arcChapter, scenesOf, sceneIn,
    ACTOR_TYPES, adversaries, people, tables, f, search, excerpt, searchRecords,
  };
})();
