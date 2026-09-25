// system/tor2e/site.js — what The One Ring puts on the site: the books, the adventures, the
// Bestiary, the Loremaster's folk, making a Player-hero, the dice, and search. Every word of
// rules text comes from titterpig-dsl-tor2e/0.5 through data/; this file decides what is
// listed where. A book's text is loaded when a tab first needs it (TorData.ready).
window.VttSiteTabs = (function () {
  const { el, debounce } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Dice = window.TorDice;
  const Site = () => window.VttSite;

  // a link inside any rendered entity opens that entity in the reader
  window.TorOpenEntity = (id) => {
    const b = D.bookOf(id);
    if (b) Site().go('books', [b, id]);
    else D.fetch(id).then((e) => e && Site().go('books', [e.book, id]));
  };
  const openRule = (id) => window.TorOpenEntity(id);

  const loading = (what) => el('div', { class: 'loading' }, [Dice.icon('Gandalf Rune', 'spin'), ' Opening ' + what + '…']);
  function withBooks(page, ids, what, fn) {
    const need = (Array.isArray(ids) ? ids : [ids]).filter((id) => !D.loaded(id));
    if (!need.length) return fn();
    page.appendChild(loading(what));
    D.ready(ids).then(() => {
      page.innerHTML = '';
      fn();
    }).catch((e) => { page.innerHTML = ''; page.appendChild(el('div', { class: 'empty' }, [e.message])); });
  }
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');
  const bookLabel = (id) => (D.indexBook(id) || {}).label || id;

  // ── a roll made on the site: a tray at the foot of the page ────────
  let tray = null;
  function trayRoll(opts, autoRoll) {
    if (!tray) {
      tray = el('div', { class: 'tray' });
      document.body.appendChild(tray);
    }
    tray.innerHTML = '';
    tray.appendChild(el('div', { class: 'tray-h' }, [opts.label || 'Roll', el('button', { type: 'button', class: 'btn ghost tiny', onclick: () => { tray.remove(); tray = null; } }, ['close'])]));
    const r = Dice.roller(Object.assign({ onRule: openRule }, opts, { label: null }));
    tray.appendChild(r);
    if (autoRoll) r.querySelector('.roll-btn').click();
  }
  // an adversary's printed Combat Proficiency, rolled by the Loremaster: the icons switched
  const onAttack = (f, e) => trayRoll({ rating: f.Rating, tn: '', switched: true, label: e.name + ' · ' + (f.Printed || f.Weapon) }, true);

  // ── the shelf ──────────────────────────────────────────────────────
  function renderShelf(page, ctx) {
    const idx = D.index();
    const rc = idx.counts.records || {};
    page.appendChild(el('div', { class: 'hero' }, [
      el('div', { class: 'hero-title' }, ['The One Ring']),
      el('div', { class: 'hero-kicker' }, ['Second Edition · the books at the table']),
      el('p', { class: 'hero-sub' }, [
        String(idx.counts.books) + ' books generated verbatim from the corpus: ',
        String(idx.counts.entities) + ' entries, ',
        String(D.adventures().length) + ' adventures, ',
        String(rc.Adversary || 0) + ' adversaries, ',
        String((rc['Loremaster Character'] || 0) + (rc.Patron || 0)) + ' Loremaster characters and patrons.',
      ]),
    ]));
    const shelf = el('div', { class: 'shelf' });
    D.books().forEach((b) => {
      const c = b.counts;
      shelf.appendChild(el('a', { class: 'shelf-book' + (b.id === 'core' ? ' core' : '') + (b.kind === 'campaign' ? ' campaign' : ''), href: ctx.href('books', [b.id]) }, [
        el('div', { class: 'shelf-title' }, [b.label]),
        el('div', { class: 'shelf-meta' }, [
          [c.chapters + ' chapters', c.entities + ' entries', c.arcs ? c.arcs + (c.arcs === 1 ? ' adventure' : ' adventures') : null].filter(Boolean).join(' · '),
        ]),
        el('div', { class: 'shelf-size' }, [kb(b.bytes)]),
      ]));
    });
    page.appendChild(shelf);
  }

  // ── the reader ─────────────────────────────────────────────────────
  function contains(n, id) {
    return n.kids.some((k) => k.id === id || contains(k, id));
  }
  function outlineTree(bid, nodes, openId, ctx, depth) {
    return el('ul', { class: 'toc' + (depth ? '' : ' toc-top') }, nodes.map((n) => {
      const open = openId && (n.id === openId || contains(n, openId));
      const a = el('a', { class: 'ref' + (n.id === openId ? ' active' : '') + (n.scene ? ' scene' : ''), href: ctx.href('books', [bid, n.id]), html: E.inline(n.label) });
      if (n.chapter && !n.scene && n.page != null) a.insertBefore(el('span', { class: 'toc-page' }, [String(n.page)]), a.firstChild);
      return el('li', {}, [
        n.kids.length ? el('details', { open: open || null }, [el('summary', {}, [a]), outlineTree(bid, n.kids, openId, ctx, (depth || 0) + 1)]) : a,
      ]);
    }));
  }
  function contentsOf(bid, n, ctx, title) {
    if (!n || !n.kids.length) return null;
    return el('div', { class: 'contents' }, [
      el('h4', {}, [title || 'In this section']),
      el('ul', { class: 'items' }, n.kids.map((k) => el('li', {}, [el('a', { class: 'ref', href: ctx.href('books', [bid, k.id]), html: E.inline(k.label) })]))),
    ]);
  }

  const DEEP = 8;           // more nested headings than this: the text, then a list of what is under it
  function readingPage(bid, n, ctx) {
    const wrap = el('div', {});
    const t = D.trail(bid, n.id);
    wrap.appendChild(el('div', { class: 'crumbs' }, t.slice(0, -1).map((x, i) => [i ? ' › ' : null, el('a', { href: ctx.href('books', [bid, x.id]), html: E.inline(x.label) })])));
    if (n.scene) {
      if (n.scene.part) wrap.appendChild(el('div', { class: 'entity-sub' }, [n.scene.part]));
      wrap.appendChild(E.block(n.scene, { onAttack }));
      wrap.appendChild(el('div', { class: 'next' }, ['The whole adventure: ', el('a', { class: 'ref', href: ctx.href('adventures', [n.chapter.cid, n.scene.id]) }, [n.chapter.name])]));
      return wrap;
    }
    if (n.chapter) {
      const c = n.chapter;
      if (c.kind === 'arc' || c.kind === 'frame') {
        wrap.appendChild(adventurePage(bid, c, ctx));
        return wrap;
      }
      wrap.appendChild(el('h2', { class: 'chapter-h' }, [n.label]));
      wrap.appendChild(el('div', { class: 'entity-sub' }, [[bookLabel(bid), c.page != null ? 'from page ' + c.page : null, c.kind === 'lore' ? 'the setting, transcribed' : null].filter(Boolean).join(' · ')]));
      if (c.kind === 'lore') {
        wrap.appendChild(E.lore(c.text));
        return wrap;
      }
      if (n.kids.length <= 3) n.kids.forEach((k) => wrap.appendChild(E.render(k.entity, { noKids: k.kids.length > DEEP, onAttack })));
      else wrap.appendChild(contentsOf(bid, n, ctx, 'In this chapter'));
      return wrap;
    }
    const deep = n.kids.length > DEEP;
    wrap.appendChild(E.render(n.entity, { noKids: deep, onAttack }));
    if (deep) wrap.appendChild(contentsOf(bid, n, ctx));
    // the next heading, so a chapter reads on
    const flat = [];
    const walk = (ns) => ns.forEach((x) => { flat.push(x); walk(x.kids); });
    walk(D.outline(bid));
    const i = flat.findIndex((x) => x.id === n.id);
    let j = i + 1;
    if (!deep) while (j < flat.length && contains(n, flat[j].id)) j++;
    if (flat[j]) wrap.appendChild(el('div', { class: 'next' }, ['Next: ', el('a', { class: 'ref', href: ctx.href('books', [bid, flat[j].id]), html: E.inline(flat[j].label) })]));
    return wrap;
  }

  function renderBooks(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const bid = path[0] && D.indexBook(path[0]) ? path[0] : null;
    if (!bid) return renderShelf(page, ctx);
    const meta = D.indexBook(bid);
    withBooks(page, bid, meta.label, () => {
      page.appendChild(el('div', { class: 'crumbs' }, [el('a', { href: ctx.href('books', []) }, ['The books']), ' › ', meta.label]));
      const openId = path[1] && D.node(bid, path[1]) ? path[1] : null;
      const results = el('div', { class: 'results' });
      const q = el('input', { type: 'search', class: 'search', placeholder: 'Search ' + meta.label + '…' });
      q.addEventListener('input', debounce(() => showHits(results, q.value.trim(), [bid], ctx), 250));
      const toc = el('nav', { class: 'site-toc' }, [q, results, outlineTree(bid, D.outline(bid), openId, ctx, 0)]);
      const n = openId ? D.node(bid, openId) : null;
      const body = el('div', { class: 'site-reader' }, [n ? readingPage(bid, n, ctx) : bookFront(bid, meta, ctx)]);
      page.appendChild(el('div', { class: 'reader' }, [toc, body]));
      const active = toc.querySelector('a.active');
      if (active) setTimeout(() => active.scrollIntoView({ block: 'center' }), 0);
    });
  }

  function bookFront(bid, meta, ctx) {
    const c = meta.counts;
    return el('div', {}, [
      el('h2', { class: 'chapter-h' }, [meta.label]),
      el('div', { class: 'entity-sub' }, [[c.chapters + ' chapters', c.entities + ' entries', c.arcs ? c.arcs + (c.arcs === 1 ? ' adventure' : ' adventures') : null].filter(Boolean).join(' · ')]),
      el('div', { class: 'contents' }, [
        el('h4', {}, ['Contents']),
        el('ul', { class: 'items chapters' }, D.outline(bid).map((n) => el('li', {}, [
          el('a', { class: 'ref', href: ctx.href('books', [bid, n.id]), html: E.inline(n.label) }),
          n.page != null ? el('span', { class: 'muted small' }, [' · p. ' + n.page]) : null,
        ]))),
      ]),
    ]);
  }

  function hitHref(h, ctx) {
    if (h.block && h.block.id) return ctx.href('books', [h.book, 'sc:' + h.block.id]);
    return ctx.href('books', [h.book, h.id]);
  }
  function showHits(results, term, bookIds, ctx) {
    results.innerHTML = '';
    if (term.length < 2) return;
    const hits = D.search(term, bookIds, 2000);
    const shown = hits.slice(0, 80);
    results.appendChild(el('div', { class: 'muted small' }, [hits.length + ' hits' + (hits.length > shown.length ? ' — the first ' + shown.length : '')]));
    shown.forEach((h) => {
      const ex = D.excerpt(h, term, 60);
      results.appendChild(el('div', { class: 'hit' }, [
        el('a', { class: 'ref', href: hitHref(h, ctx), html: E.inline(h.name || (h.chapter && h.chapter.name) || '') }),
        el('span', { class: 'etype' }, [(h.block ? (h.block.kw === 'SCENE' ? 'scene · ' : 'location · ') : '') + bookLabel(h.book)]),
        ex ? el('div', { class: 'muted small', html: E.inline(ex) }) : null,
      ]));
    });
  }

  // ── an adventure, as the book prints it ────────────────────────────
  function adventurePage(bid, c, ctx) {
    const wrap = el('div', { class: 'adventure' });
    wrap.appendChild(el('h2', { class: 'chapter-h' }, [c.name]));
    wrap.appendChild(el('div', { class: 'entity-sub' }, [[c.kind === 'frame' ? 'Campaign focus' : 'Adventure', bookLabel(bid), c.page != null ? 'from page ' + c.page : null].filter(Boolean).join(' · ')]));
    const props = {};
    (c.props || []).forEach((p) => { props[p.name] = p; });
    if (props.Epigraph && props.Epigraph.value) wrap.appendChild(el('blockquote', { class: 'epigraph' }, [E.prose(String(props.Epigraph.value))]));
    if (c.desc) wrap.appendChild(E.prose(c.desc));
    // the numbered Parts, each with its scenes, as a contents
    if ((c.phases || []).length) {
      wrap.appendChild(el('h4', {}, ['The Parts']));
      wrap.appendChild(el('ol', { class: 'parts' }, c.phases.map((p) => el('li', {}, [
        el('b', { html: E.inline(p.name) }),
        p.desc ? E.prose(p.desc) : null,
        (p.scenes || []).length ? el('ul', { class: 'items' }, p.scenes.map((sid) => {
          const s = (c.scenes || []).find((x) => x.id === sid);
          return el('li', {}, [el('a', { class: 'ref', href: '#b-' + String(sid).replace(/^#/, ''), onclick: (ev) => { ev.preventDefault(); const t = document.getElementById('b-' + String(sid).replace(/^#/, '')); if (t) t.scrollIntoView({ behavior: 'smooth' }); } , html: E.inline(s ? s.name : sid) })]);
        })) : null,
      ]))));
    }
    if ((c.cast || []).length) {
      wrap.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Cast']), el('div', { class: 'prop-v' }, [c.cast.map((x) => (x.include || []).map((r) => r.name).join(', ')).join('; ')])]));
    }
    // then the text. An adventure with Parts reads Part by Part — each Part's scenes in turn —
    // then its locations (the map's key) and whatever else it prints; the file writes every
    // LOCATION ahead of the scenes. One without Parts (a Landmark) reads in the file's order.
    let seq = c.seq || [];
    if ((c.phases || []).length) {
      const inPart = D.scenesOf(c).filter((s) => s.part);
      const partOf = {};
      inPart.forEach((s) => { partOf[s.id] = s.part; });
      let lastPart = null;
      seq = seq.filter((s) => s.t === 'prop').concat(
        inPart.map((s) => ({ t: 'scene', id: s.id })),
        seq.filter((s) => s.t === 'scene' && !partOf[s.id]),
        seq.filter((s) => s.t === 'location' || s.t === 'entity' || s.t === 'entry'));
      seq = seq.reduce((out, s) => {
        if (s.t === 'scene' && partOf[s.id] && partOf[s.id] !== lastPart) {
          lastPart = partOf[s.id];
          out.push({ t: 'part', name: lastPart });
        }
        if (s.t === 'location' && lastPart !== '§loc') {
          lastPart = '§loc';
          out.push({ t: 'heading', name: 'Locations' });
        }
        out.push(s);
        return out;
      }, []);
    }
    seq.forEach((s) => {
      if (s.t === 'part') return wrap.appendChild(el('h3', { class: 'part-h', html: E.inline(s.name) }));
      if (s.t === 'heading') return wrap.appendChild(el('h3', { class: 'part-h' }, [s.name]));
      if (s.t === 'prop') {
        const p = props[s.name];
        if (!p || p.name === 'Epigraph') return;
        wrap.appendChild(el('div', { class: 'fields' }, [el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, [p.name]), el('div', { class: 'prop-v' }, [E.value(p)])])]));
      } else if (s.t === 'location') wrap.appendChild(E.block(c.locations[s.i], { onAttack }));
      else if (s.t === 'scene') {
        const sc = D.sceneIn(c, s.id);
        if (sc) wrap.appendChild(E.block(sc, { onAttack }));
      } else if (s.t === 'entry') wrap.appendChild(E.block(c.entries[s.i], { onAttack }));
      else if (s.t === 'entity') {
        const e = D.entity(s.id);
        if (e) wrap.appendChild(E.render(e, { depth: 1, onAttack }));
      }
    });
    (c.guidance || []).forEach((g) => wrap.appendChild(E.guidance(g)));
    return wrap;
  }

  function renderAdventures(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const a = path[0] ? D.adventure(path[0]) || D.frames().find((f) => f.id === path[0]) : null;
    if (!a) {
      page.appendChild(el('h2', { class: 'chapter-h' }, ['Adventures']));
      page.appendChild(el('p', { class: 'muted' }, ['The adventures the books print as scenes and locations, and Moria’s campaign focuses. Each runs as a module at the Loremaster’s table.']));
      const byBook = {};
      D.adventures().concat(D.frames().map((f) => Object.assign({ frame: true }, f))).forEach((x) => { (byBook[x.book] = byBook[x.book] || []).push(x); });
      Object.keys(byBook).forEach((bid) => {
        page.appendChild(el('h4', {}, [bookLabel(bid)]));
        page.appendChild(el('div', { class: 'cards' }, byBook[bid].map((x) => el('a', { class: 'card', href: ctx.href('adventures', [x.id]) }, [
          el('div', { class: 'card-name' }, [x.name]),
          el('div', { class: 'card-meta' }, [(x.frame ? 'campaign focus' : 'adventure') + (x.page != null ? ' · p. ' + x.page : '')]),
        ]))));
      });
      return;
    }
    withBooks(page, a.book, bookLabel(a.book), () => {
      const c = D.chapter(a.book, a.file);
      page.appendChild(el('div', { class: 'crumbs' }, [el('a', { href: ctx.href('adventures', []) }, ['Adventures']), ' › ', a.name, ' · ', el('a', { href: ctx.href('books', [a.book, 'ch:' + a.file]) }, ['in the book'])]));
      page.appendChild(el('div', { class: 'site-reader solo' }, [adventurePage(a.book, c, ctx)]));
      if (path[1]) setTimeout(() => { const t = document.getElementById('b-' + String(path[1]).replace(/^#/, '')); if (t) t.scrollIntoView(); }, 0);
    });
  }

  // ── the Bestiary and the Loremaster's folk: records, before any book is loaded ──
  const lists = { adversaries: { q: '', book: '', kind: '' }, folk: { q: '', book: '', kind: '' } };
  function recordList(page, ctx, tab, opts) {
    const st = lists[tab];
    const all = opts.records;
    const q = el('input', { type: 'search', class: 'search', placeholder: 'A name…', value: st.q });
    const books = D.books().filter((b) => all.some((r) => r.book === b.id));
    const bk = el('select', { class: 'scope' }, [el('option', { value: '' }, ['Every book'])].concat(books.map((b) => el('option', { value: b.id, selected: st.book === b.id || null }, [b.label + ' (' + all.filter((r) => r.book === b.id).length + ')']))));
    const kinds = Array.from(new Set(all.map(opts.kind).filter(Boolean))).sort();
    const kd = el('select', { class: 'scope' }, [el('option', { value: '' }, [opts.kindLabel])].concat(kinds.map((k) => el('option', { value: k, selected: st.kind === k || null }, [k]))));
    const count = el('span', { class: 'muted small' });
    const body = el('tbody');
    function apply() {
      const t = st.q.toLowerCase();
      const rows = all.filter((r) => (!st.book || r.book === st.book) && (!st.kind || opts.kind(r) === st.kind) && (!t || r.name.toLowerCase().indexOf(t) !== -1));
      count.textContent = rows.length + ' of ' + all.length;
      body.innerHTML = '';
      rows.forEach((r) => body.appendChild(el('tr', {}, [
        el('td', {}, [el('a', { class: 'ref', href: ctx.href(tab, [r.id]) }, [r.name])]),
      ].concat(opts.cols.map((c) => el('td', { class: c.cls || '' }, [String(c.v(r) == null ? '' : c.v(r))])), [el('td', { class: 'muted small' }, [bookLabel(r.book)])]))));
    }
    q.addEventListener('input', debounce(() => { st.q = q.value.trim(); apply(); }, 150));
    bk.addEventListener('change', () => { st.book = bk.value; apply(); });
    kd.addEventListener('change', () => { st.kind = kd.value; apply(); });
    page.appendChild(el('div', { class: 'chiprow' }, [q, bk, kd, count]));
    page.appendChild(el('div', { class: 'table-wrap' }, [el('table', { class: 'records' }, [
      el('thead', {}, [el('tr', {}, ['Name'].concat(opts.cols.map((c) => c.h), ['Book']).map((h) => el('th', {}, [h])))]),
      body,
    ])]));
    apply();
  }
  function recordPage(page, ctx, tab, title, id) {
    const r = D.record(id);
    page.appendChild(el('div', { class: 'crumbs' }, [el('a', { href: ctx.href(tab, []) }, [title]), ' › ', r.name]));
    withBooks(page, r.book, bookLabel(r.book), () => {
      page.appendChild(el('div', { class: 'crumbs' }, [el('a', { href: ctx.href(tab, []) }, [title]), ' › ', r.name, ' · ', el('a', { href: ctx.href('books', [r.book, id]) }, ['in the book'])]));
      page.appendChild(el('div', { class: 'site-reader solo' }, [E.render(D.entity(id), { onAttack })]));
      if (r.type === 'Adversary') page.appendChild(el('p', { class: 'muted small' }, ['Press a Combat Proficiency to roll it as the Loremaster does, the Feat die’s icons switched (', el('a', { class: 'ref', href: '#', onclick: (ev) => { ev.preventDefault(); openRule(Dice.RULES.adversary.id); } }, ['Feat Die Results for Adversaries']), '). Set the TN in the tray.']));
    });
  }
  function renderAdversaries(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    if (path[0] && D.record(path[0])) return recordPage(page, ctx, 'adversaries', 'Adversaries', path[0]);
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Adversaries']));
    page.appendChild(el('p', { class: 'muted' }, ['Every stat block the books print. Open one to roll its Combat Proficiencies.']));
    const f = D.f;
    recordList(page, ctx, 'adversaries', {
      records: D.adversaries(), kind: (r) => f(r, 'Adversary Type'), kindLabel: 'Every kind',
      cols: [
        { h: 'Kind', v: (r) => f(r, 'Adversary Type') },
        { h: 'Attribute Level', v: (r) => f(r, 'Attribute Level'), cls: 'num' },
        { h: 'Endurance', v: (r) => f(r, 'Endurance'), cls: 'num' },
        { h: 'Might', v: (r) => f(r, 'Might'), cls: 'num' },
        { h: 'Hate / Resolve', v: (r) => (f(r, 'Hate') != null ? f(r, 'Hate') + ' Hate' : f(r, 'Resolve') != null ? f(r, 'Resolve') + ' Resolve' : ''), cls: 'num' },
        { h: 'Parry', v: (r) => f(r, 'Parry'), cls: 'num' },
        { h: 'Armour', v: (r) => f(r, 'Armour'), cls: 'num' },
      ],
    });
  }
  function renderFolk(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    if (path[0] && D.record(path[0])) return recordPage(page, ctx, 'folk', 'Loremaster characters', path[0]);
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Loremaster characters and patrons']));
    const f = D.f;
    recordList(page, ctx, 'folk', {
      records: D.people(), kind: (r) => r.type, kindLabel: 'Characters and patrons',
      cols: [
        { h: 'Occupation', v: (r) => f(r, 'Occupation') },
        { h: 'Where', v: (r) => f(r, 'Location') },
        { h: 'Fellowship Bonus', v: (r) => f(r, 'Fellowship Bonus'), cls: 'num' },
      ],
    });
  }

  // ── the dice ───────────────────────────────────────────────────────
  function renderDice(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    page.appendChild(el('h2', { class: 'chapter-h' }, ['The dice']));
    page.appendChild(el('div', { class: 'dice-page' }, [Dice.roller({ rating: 2, tn: 14, onRule: openRule })]));
    const rules = el('div', { class: 'site-reader solo dice-rules' });
    page.appendChild(rules);
    withBooks(rules, 'core', 'the Core Rules', () => {
      ['feat', 'success', 'degree', 'favoured', 'illFavoured', 'weary', 'miserable'].forEach((k) => {
        const e = D.entity(Dice.RULES[k].id);
        if (e) rules.appendChild(E.render(e, { noKids: true }));
      });
    });
  }

  // ── search ─────────────────────────────────────────────────────────
  const searchState = { q: '' };
  function renderSearch(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    if (path[0]) searchState.q = path[0];
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Search the books']));
    const loadedNote = el('div', { class: 'muted small' });
    const recHits = el('div', { class: 'results' });
    const results = el('div', { class: 'results' });
    const q = el('input', { type: 'search', class: 'search wide', placeholder: 'A rule, a place, a name…', value: searchState.q });
    const loadAll = el('button', { type: 'button', class: 'btn ghost tiny', onclick: () => { loadAll.disabled = true; loadAll.textContent = 'Opening every book…'; D.readyAll().then(run); } }, ['Search every book (' + kb(D.books().reduce((s, b) => s + b.bytes, 0)) + ')']);
    const recHref = (r) => (r.type === 'Adversary' ? ctx.href('adversaries', [r.id]) : r.type === 'Loremaster Character' || r.type === 'Patron' ? ctx.href('folk', [r.id]) : ctx.href('books', [r.book, r.id]));
    function run() {
      const t = searchState.q;
      const n = D.loadedBooks().length;
      loadedNote.textContent = n ? 'Full text of the ' + n + ' open ' + (n === 1 ? 'book' : 'books') + ': ' + D.loadedBooks().map(bookLabel).join(', ') + '.' : 'No book is open yet: typed entries are found by name below. Open the books to search the full text.';
      loadAll.hidden = n === D.books().length;
      recHits.innerHTML = '';
      const rs = D.searchRecords(t);
      if (rs.length) {
        recHits.appendChild(el('h4', {}, ['By name']));
        rs.slice(0, 60).forEach((r) => recHits.appendChild(el('div', { class: 'hit' }, [
          el('a', { class: 'ref', href: recHref(r) }, [r.name]),
          el('span', { class: 'etype' }, [r.type]),
          el('span', { class: 'muted small' }, [' · ' + bookLabel(r.book)]),
        ])));
      }
      showHits(results, t, null, ctx);
    }
    q.addEventListener('input', debounce(() => { searchState.q = q.value.trim(); run(); }, 250));
    page.appendChild(q);
    page.appendChild(el('div', { class: 'chiprow' }, [loadedNote, loadAll]));
    page.appendChild(recHits);
    page.appendChild(results);
    run();
    setTimeout(() => q.focus(), 0);
  }

  return [
    { id: 'books', label: 'The books', render: renderBooks, books: true },
    { id: 'adventures', label: 'Adventures', render: renderAdventures, books: true },
    { id: 'create', label: 'Making a hero', render: (c, path, ctx) => (window.TorCreator ? window.TorCreator.render(c, path, ctx) : c.appendChild(el('div', { class: 'page empty' }, ['Coming with the character sheet (M4).']))) },
    { id: 'adversaries', label: 'Adversaries', render: renderAdversaries },
    { id: 'folk', label: 'Loremaster characters', render: renderFolk },
    { id: 'dice', label: 'Dice', render: renderDice },
    { id: 'search', label: 'Search', render: renderSearch, books: true },
  ];
})();
