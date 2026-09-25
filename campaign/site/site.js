// campaign/site/site.js — Banes of Beleriand's own tabs on the VTT's site, ahead of the books:
// Home, Chronicle, the Company, Dramatis Personae, Timeline, Atlas. Loaded at the `site` stage
// (engine/instance.js), after the system's tabs and before engine/site.js renders, so the
// campaign's Home is the tab the site opens on. The prose is campaign/data/docs.js (built from
// campaign/docs/ by campaign/build/build_docs.py); stat blocks and sheets are the VTT's own
// renderers over the books and the campaign's layer.
(function () {
  const { el } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Sheet = window.TorSheet;
  const CFG = window.VttConfig || {};
  const DOCS = window.BanesDocs || {};
  const Site = () => window.VttSite;

  // the band: the brand opens the campaign, not the shelf
  document.querySelectorAll('a.brand').forEach((a) => a.setAttribute('href', '#home'));
  document.querySelectorAll('.brand-sub').forEach((n) => (n.textContent = 'The One Ring · a campaign'));

  const list = (k) => DOCS[k] || [];
  const bySlug = (k, slug) => list(k).find((p) => p.slug === slug) || null;

  // A doc's HTML, its [[links]] routed through the site's own tabs.
  function prose(html, cls) {
    const box = el('div', { class: 'prose banes-prose' + (cls ? ' ' + cls : '') });
    box.innerHTML = html || '';
    box.querySelectorAll('a.doc-link').forEach((a) => {
      const tab = a.getAttribute('data-tab');
      if (tab) a.setAttribute('href', Site().href(tab, [a.getAttribute('data-slug')]));
      else a.removeAttribute('data-slug');
    });
    return box;
  }
  const empty = (what, where) => el('div', { class: 'empty' }, ['No ' + what + ' recorded yet.', el('span', { class: 'banes-hint' }, [' (campaign/docs/' + where + ')'])]);
  const crumbs = (ctx, tab, title, name) => el('div', { class: 'crumbs' }, [el('a', { href: ctx.href(tab, []) }, [title]), ' › ', name]);
  const portrait = (src, name) => (src ? el('img', { class: 'banes-portrait', src, alt: name || '' }) : null);
  const meta = (bits) => el('div', { class: 'entity-sub' }, [bits.filter(Boolean).join(' · ')]);
  function groups(pages, key, order) {
    const out = [];
    pages.forEach((p) => {
      const g = p[key] || '';
      let grp = out.find((x) => x.name === g);
      if (!grp) out.push((grp = { name: g, pages: [] }));
      grp.pages.push(p);
    });
    if (order) out.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    return out;
  }

  // ── Home ────────────────────────────────────────────────────────────
  function renderHome(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    page.appendChild(el('div', { class: 'hero' }, [
      el('div', { class: 'hero-title' }, [CFG.title || 'The campaign']),
      el('div', { class: 'hero-kicker' }, ['The One Ring · Second Edition']),
    ]));
    if (DOCS.home && DOCS.home.html) {
      const body = prose(DOCS.home.html, 'banes-home');
      const h1 = body.querySelector('h1');
      if (h1 && h1.textContent.trim() === (CFG.title || '').trim()) h1.remove();
      if (body.textContent.trim()) page.appendChild(el('div', { class: 'site-reader solo banes-home-body' }, [body]));
    }
    const idx = D.index();
    const n = (k, one, many) => { const c = list(k).length; return c ? c + ' ' + (c === 1 ? one : many) : 'nothing yet'; };
    const card = (tab, title, sub) => el('a', { class: 'shelf-book banes-card', href: ctx.href(tab, []) }, [el('div', { class: 'shelf-title' }, [title]), el('div', { class: 'shelf-meta' }, [sub])]);
    page.appendChild(el('div', { class: 'shelf' }, [
      card('chronicle', 'The Chronicle', n('chronicle', 'chapter', 'chapters')),
      card('company', 'The Company', n('company', 'Player-hero', 'Player-heroes')),
      card('people', 'Dramatis Personae', n('people', 'person met', 'people met')),
      card('timeline', 'Timeline', timelineBody() ? 'the reckoning of years' : 'nothing yet'),
      card('atlas', 'Atlas', n('atlas', 'place', 'places')),
      // the books' card only where their tab is on (VttConfig.siteBooks / Settings, engine/site.js,
      // which draws the tab bar before this page)
      document.querySelector('#site-tabs a[href="' + ctx.href('books', []) + '"]')
        ? card('books', 'The books', idx.counts.books + ' books · ' + idx.counts.entities + ' entries') : null,
    ]));
  }

  // ── Chronicle ───────────────────────────────────────────────────────
  function renderChronicle(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const all = list('chronicle');
    const ch = path[0] && bySlug('chronicle', path[0]);
    if (ch) {
      const i = all.indexOf(ch);
      page.appendChild(crumbs(ctx, 'chronicle', 'The Chronicle', ch.title));
      const r = el('div', { class: 'site-reader solo banes-chapter' }, [
        ch.part ? el('div', { class: 'hero-kicker banes-part' }, [ch.part]) : null,
        el('h2', { class: 'chapter-h' }, [ch.title]),
        meta([ch.date, ch.played ? 'played ' + ch.played : null]),
        prose(ch.html),
        el('div', { class: 'next banes-paging' }, [
          i > 0 ? el('a', { href: ctx.href('chronicle', [all[i - 1].slug]) }, ['‹ ' + all[i - 1].title]) : el('span'),
          i < all.length - 1 ? el('a', { href: ctx.href('chronicle', [all[i + 1].slug]) }, [all[i + 1].title + ' ›']) : el('span'),
        ]),
      ]);
      page.appendChild(r);
      return;
    }
    page.appendChild(el('h2', { class: 'chapter-h' }, ['The Chronicle']));
    if (!all.length) return page.appendChild(empty('chapters', 'chronicle/'));
    groups(all, 'part').forEach((g) => {
      if (g.name) page.appendChild(el('h4', {}, [g.name]));
      page.appendChild(el('ol', { class: 'banes-toc' }, g.pages.map((p) => el('li', {}, [
        el('a', { href: ctx.href('chronicle', [p.slug]) }, [p.title]),
        p.date ? el('span', { class: 'muted small' }, [' · ' + p.date]) : null,
      ]))));
    });
  }

  // ── people: the Company and the Dramatis Personae ──────────────────
  function personCard(ctx, tab, p) {
    return el('a', { class: 'card banes-person', href: ctx.href(tab, [p.slug]) }, [
      p.portrait ? el('img', { class: 'banes-thumb', src: p.portrait, alt: '' }) : null,
      el('div', {}, [
        el('div', { class: 'card-name' }, [p.name]),
        el('div', { class: 'card-text' }, [[p.epithet, p.culture, p.calling].filter(Boolean).join(' · ')]),
      ]),
    ]);
  }
  function renderCompany(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const p = path[0] && bySlug('company', path[0]);
    if (p) {
      page.appendChild(crumbs(ctx, 'company', 'The Company', p.name));
      const r = el('div', { class: 'site-reader solo banes-person-page' }, [
        portrait(p.portrait, p.name),
        el('h2', { class: 'chapter-h' }, [p.name]),
        meta([p.epithet, p.culture, p.calling, p.player ? 'played by ' + p.player : null]),
        prose(p.html),
      ]);
      page.appendChild(r);
      if (p.sheet) {
        const box = el('div', { class: 'banes-sheet' }, [el('div', { class: 'loading' }, ['Opening the sheet…'])]);
        page.appendChild(box);
        Promise.all([fetch(p.sheet).then((x) => x.json()), D.ready('core')]).then(([obj]) => {
          const v = Sheet.readFile(obj);
          box.innerHTML = '';
          box.appendChild(el('h4', {}, ['The sheet']));
          box.appendChild(Sheet.render(v, null));
          box.appendChild(el('a', { class: 'btn ghost tiny', href: p.sheet, download: '' }, ['Download the character file']));
        }).catch((e) => { box.innerHTML = ''; box.appendChild(el('div', { class: 'empty' }, ['Could not open the sheet: ' + e.message])); });
      }
      return;
    }
    page.appendChild(el('h2', { class: 'chapter-h' }, ['The Company']));
    if (!list('company').length) return page.appendChild(empty('Player-heroes', 'company/'));
    page.appendChild(el('div', { class: 'cards' }, list('company').map((x) => personCard(ctx, 'company', x))));
  }

  const SIDES = [['allies', 'Companions and kin'], ['others', 'Others met'], ['foes', 'Servants of the Shadow']];
  function renderPeople(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const p = path[0] && bySlug('people', path[0]);
    if (p) {
      page.appendChild(crumbs(ctx, 'people', 'Dramatis Personae', p.name));
      page.appendChild(el('div', { class: 'site-reader solo banes-person-page' }, [
        portrait(p.portrait, p.name),
        el('h2', { class: 'chapter-h' }, [p.name]),
        meta([p.epithet, (SIDES.find((s) => s[0] === p.side) || [])[1], p.first ? 'first met: ' + p.first : null]),
        prose(p.html),
      ]));
      if (p.entity) {
        const box = el('div', { class: 'site-reader solo banes-statblock' }, [el('div', { class: 'loading' }, ['Opening the stat block…'])]);
        page.appendChild(box);
        D.fetch(p.entity).then((e) => {
          box.innerHTML = '';
          if (!e) return box.appendChild(el('div', { class: 'empty' }, ['No stat block ' + p.entity + '.']));
          box.appendChild(E.render(e, {}));
        });
      }
      return;
    }
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Dramatis Personae']));
    if (!list('people').length) return page.appendChild(empty('people', 'dramatis-personae/'));
    groups(list('people'), 'side', SIDES.map((s) => s[0])).forEach((g) => {
      page.appendChild(el('h4', {}, [(SIDES.find((s) => s[0] === g.name) || [])[1] || g.name]));
      page.appendChild(el('div', { class: 'cards' }, g.pages.map((x) => personCard(ctx, 'people', x))));
    });
  }

  // ── Timeline and Atlas ──────────────────────────────────────────────
  // timeline.md's body without its own heading (the tab prints one), or null when that is all it holds
  function timelineBody() {
    const body = DOCS.timeline && prose(DOCS.timeline.html);
    const h1 = body && body.querySelector('h1');
    if (h1) h1.remove();
    return body && body.textContent.trim() ? body : null;
  }
  function renderTimeline(container) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const body = timelineBody();
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Timeline']));
    if (!body) return page.appendChild(empty('events', 'timeline.md'));
    page.appendChild(el('div', { class: 'site-reader solo banes-timeline' }, [body]));
  }
  function renderAtlas(container, path, ctx) {
    const page = el('div', { class: 'page' });
    container.appendChild(page);
    const p = path[0] && bySlug('atlas', path[0]);
    if (p) {
      page.appendChild(crumbs(ctx, 'atlas', 'Atlas', p.name));
      page.appendChild(el('div', { class: 'site-reader solo' }, [portrait(p.portrait, p.name), el('h2', { class: 'chapter-h' }, [p.name]), meta([p.region]), prose(p.html)]));
      return;
    }
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Atlas']));
    if (!list('atlas').length) return page.appendChild(empty('places', 'atlas/'));
    groups(list('atlas'), 'region').forEach((g) => {
      if (g.name) page.appendChild(el('h4', {}, [g.name]));
      page.appendChild(el('ul', { class: 'banes-toc' }, g.pages.map((x) => el('li', {}, [el('a', { href: ctx.href('atlas', [x.slug]) }, [x.name])]))));
    });
  }

  const tabs = window.VttSiteTabs = window.VttSiteTabs || [];
  tabs.unshift(
    { id: 'home', label: 'Home', render: renderHome },
    { id: 'chronicle', label: 'Chronicle', render: renderChronicle },
    { id: 'company', label: 'The Company', render: renderCompany },
    { id: 'people', label: 'Dramatis Personae', render: renderPeople },
    { id: 'timeline', label: 'Timeline', render: renderTimeline },
    { id: 'atlas', label: 'Atlas', render: renderAtlas },
  );
})();
