// system/tor2e/gm-panes.js — the Loremaster's own panes (the family standard, PLAYBOOK §4b.2, on
// sortilege-vtt-l5r5e I19): Scenes (the campaign's arc — sessions, a card per scene with its beats,
// the questions for the table), Threads (with what happened to each in play), Encounters, and the
// Notes document an instance may name. Overview (premise, rulings, free notes, a search), Places,
// People and Settings are the engine's (engine/gm-panes.js), which registers only what this file
// does not. Everything here is the Loremaster's own pack state (system/tor2e/ops.js: gm, gmNotes,
// arc, threads, encounters — local ops, never sent to a session's room); the text is the GM's small
// Markdown with its SET / OPEN / SOURCE … tags (engine/gm-text.js).
//
// The book prints no encounter-rating formula, so the encounter builder counts: the adversaries
// chosen against the heroes in the Company, and the two rules the core ties to those numbers —
// who handles engagement (Engagement, core p. 96) and whether a hero may take a Rearward stance
// ("Rearward Stance (Ranged Combat)", its sidebar) — each shown in the book's words.
(function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const State = window.VttState;
  const G = window.VttGmText;
  const Bus = window.VttBus;
  const Panels = window.VttPanels;
  const Sys = () => window.VttSystem;
  const S = () => State.state;
  const CFG = window.VttConfig || {};
  const editing = (c) => document.activeElement && /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName) && c.contains(document.activeElement);
  const newId = (p) => State.genId(p);
  const open = (id) => window.TorOpenEntity && window.TorOpenEntity(id);

  // the rules the encounter summary quotes, each the entity that prints it
  const RULES = {
    engagement: { id: '#t3vqihlHUUsdsRQrY8zPXlU', name: 'Engagement' },
    rearward: { entry: '#tj0N5sFY3yitGktrXKknpBs', title: 'Rearward Stance (Ranged Combat)' },   // a GUIDANCE entry on Engagement, not an entity
  };
  const REARWARD_MULTIPLE = 2;   // RULES.rearward: "only if the total number of enemies isn’t more than twice the number of adventurers"

  const redrawOn = (ctx, container, draw) => {
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    ctx.on('gm:reveal', draw);
  };

  // ── Notes: an authored document (the instance names it: VttConfig.notes = { src, title, class, gate })
  // rendered, and the Loremaster's free notes below it. A gate stands in front of the document until
  // passed, once per page load. A .html document is the instance's own fragment, inserted as it is
  // under its class; anything else is Markdown ─────────────────────────────────────────────────────
  let docCache = null;
  let gatePassed = false;
  function renderNotes(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const n = CFG.notes || null;
      if (n && n.src && n.gate && !gatePassed) {
        container.appendChild(el('h4', {}, [n.title || 'Notes']));
        container.appendChild(el('div', { class: 'paper notes-gate' }, [
          n.gate.title ? el('div', { class: 'notes-gate-title' }, [n.gate.title]) : null,
          n.gate.text ? el('p', {}, [n.gate.text]) : null,
          button(n.gate.enter || 'Show', () => { gatePassed = true; draw(); }, 'tiny'),
        ]));
      } else if (n && n.src) {
        const box = el('div', { class: 'paper notes-doc' + (n.class ? ' ' + n.class : '') }, [el('div', { class: 'muted loading' }, ['Reading ' + (n.title || n.src) + '…'])]);
        container.appendChild(el('h4', {}, [n.title || 'Notes']));
        container.appendChild(box);
        const show = (text) => { box.innerHTML = ''; if (/\.html?$/.test(n.src)) box.innerHTML = text; else box.appendChild(E.lore(text)); };
        if (docCache != null) show(docCache);
        else fetch(n.src).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then((t) => { docCache = t; show(t); })
          .catch((e) => { box.innerHTML = ''; box.appendChild(el('div', { class: 'empty' }, ['Could not read ' + n.src + ' (' + e.message + ').'])); });
      }
      container.appendChild(el('h4', {}, ['Free notes', el('span', { class: 'muted small' }, [' · saved with the pack, never sent to players'])]));
      container.appendChild(el('textarea', { class: 'text notes-free', rows: 10, placeholder: 'Jot as you play…', oninput: debounce((ev) => State.commit('setGmNotes', [ev.target.value]), 400) }, [S().gmNotes || '']));
    };
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    draw();
  }

  // ── Scenes: the campaign's arc ─────────────────────────────────────
  // arc = [{ id, title, session, summary, text, sections: [beat], played }]. Sessions are its groups;
  // a session whose scenes are all played folds to one line. The book's adventure keeps its own
  // scenes (the Adventure pane); this is the Loremaster's arc beside it.
  const arc = () => JSON.parse(JSON.stringify(S().arc || []));
  const setArc = (list) => State.commit('setArc', [list]);
  const sessionOpen = {};
  function renderScenes(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const list = arc();
      const played = list.filter((x) => x.played).length;
      container.appendChild(el('h4', {}, ['The arc', el('span', { class: 'muted small' }, [' · ' + list.length + (list.length === 1 ? ' scene, ' : ' scenes, ') + played + ' played'])]));
      if (!list.length) container.appendChild(el('div', { class: 'empty' }, ['No scenes yet — add the first below.']));
      const groups = [];
      list.forEach((x, i) => {
        const g = groups[groups.length - 1];
        if (g && g.name === (x.session || null)) g.items.push([x, i]);
        else groups.push({ name: x.session || null, items: [[x, i]] });
      });
      const opts = {
        redraw: draw, save: setArc, subLabel: 'Beat',
        cls: (x) => 'arc-card' + (x.played ? ' played' : ''),
        badges: (x) => (x.played ? el('span', { class: 'chip' }, ['Played']) : null),
        before: (x) => (x.summary ? el('p', { class: 'arc-summary' }, [x.summary]) : el('span')),
        actions: (x) => button(x.played ? 'Not played' : 'Mark played', () => { const l = arc(); const at = l.findIndex((y) => y.id === x.id); l[at].played = !x.played; setArc(l); }, 'ghost tiny'),
        fields: (d) => el('div', { class: 'chiprow tight' }, [
          el('input', { class: 'text', type: 'text', value: d.session || '', placeholder: 'Session (groups the scenes)', oninput: (ev) => (d.session = ev.target.value.trim() || undefined) }),
          el('input', { class: 'text wide', type: 'text', value: d.summary || '', placeholder: 'One line: what the scene is', oninput: (ev) => (d.summary = ev.target.value.trim() || undefined) }),
        ]),
      };
      const next = list.find((x) => !x.played);
      groups.forEach((g) => {
        const key = g.name || '';
        const allPlayed = g.items.every(([x]) => x.played);
        const isOpen = sessionOpen[key] != null ? sessionOpen[key] : !allPlayed;
        container.appendChild(el('button', { class: 'arc-session' + (allPlayed ? ' played' : ''), type: 'button', 'aria-expanded': isOpen ? 'true' : 'false', onclick: () => { sessionOpen[key] = !isOpen; draw(); } }, [
          el('span', { class: 'gm-caret', 'aria-hidden': 'true' }, [isOpen ? '▾' : '▸']), ' ', g.name || 'Scenes',
          el('span', { class: 'muted small' }, [' · ' + g.items.length + (g.items.length === 1 ? ' scene' : ' scenes') + (allPlayed ? ', played' : '')]),
        ]));
        if (!isOpen) return;
        g.items.forEach(([x, i]) => {
          if (G.open[x.id] == null) G.open[x.id] = !!next && next.id === x.id;
          container.appendChild(G.editingId[x.id] ? G.sectionEditor(x, i, list, opts) : G.sectionView(x, opts));
        });
      });
      // a new scene joins the last session unless named otherwise
      const last = list.length ? list[list.length - 1].session : undefined;
      const t = el('input', { class: 'text', type: 'text', placeholder: 'Add a scene…' });
      container.appendChild(el('div', { class: 'chiprow tight gm-add' }, [t, button('Add', () => {
        if (!t.value.trim()) return;
        const x = { id: newId('arc'), title: t.value.trim(), session: last, text: '', played: false };
        G.editingId[x.id] = true; G.open[x.id] = true;
        setArc(arc().concat([x]));
      }, 'tiny')]));
      // the questions to put to the players, asked or not
      const qs = Object.assign({ note: '', items: [] }, (S().gm || {}).questions || {});
      const setQs = (patch) => State.commit('setGm', ['questions', Object.assign({}, qs, patch)]);
      container.appendChild(el('h4', { 'data-gm-id': 'questions' }, ['Questions for the table', el('span', { class: 'muted small' }, [' · ' + qs.items.filter((x) => !x.asked).length + ' not yet asked'])]));
      container.appendChild(G.note(() => qs.note, (v) => setQs({ note: v }), 'Add a note on the questions', draw));
      container.appendChild(el('ul', { class: 'gm-questions' }, qs.items.map((x, i) => el('li', { class: x.asked ? 'asked' : '', 'data-gm-id': x.id }, [
        el('input', { type: 'checkbox', checked: x.asked || null, title: 'Asked', onchange: (ev) => { const l = qs.items.slice(); l[i] = Object.assign({}, x, { asked: ev.target.checked }); setQs({ items: l }); } }),
        el('span', { class: 'gm-q', html: G.inline(x.text || '') }),
        button('×', () => setQs({ items: qs.items.filter((_, j) => j !== i) }), 'ghost tiny'),
      ]))));
      const nq = el('input', { class: 'text', type: 'text', placeholder: 'Add a question…' });
      container.appendChild(el('div', { class: 'chiprow tight gm-add' }, [nq, button('Add', () => { if (nq.value.trim()) setQs({ items: qs.items.concat([{ id: newId('q'), text: nq.value.trim(), asked: false }]) }); }, 'tiny')]));
      G.reveal(container);
    };
    redrawOn(ctx, container, draw);
    draw();
  }

  // ── Threads: what is in play, and what is held in reserve ───────────
  // threads = [{ id, title, text, sections, open, notes }] — notes are what happened to it in play
  const threads = () => JSON.parse(JSON.stringify(S().threads || []));
  const setThreads = (l) => State.commit('setThreads', [l]);
  function renderThreads(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const ts = threads();
      container.appendChild(el('h4', { 'data-gm-id': 'threads-note' }, ['Threads', el('span', { class: 'muted small' }, [' · ' + ts.filter((x) => x.open !== false).length + ' open, ' + ts.filter((x) => x.open === false).length + ' closed'])]));
      container.appendChild(G.note(() => (S().gm || {}).threadsNote, (v) => State.commit('setGm', ['threadsNote', v]), 'Add a note on the threads', draw));
      const upd = (x, patch) => { const l = threads(); const at = l.findIndex((y) => y.id === x.id); l[at] = Object.assign({}, l[at], patch); setThreads(l); };
      G.sections(container, ts, {
        redraw: draw, save: setThreads, addLabel: 'Open a thread…', fresh: () => ({ open: true }),
        cls: (x) => 'thread' + (x.open === false ? ' closed' : ''),
        badges: (x) => (x.open === false ? el('span', { class: 'chip' }, ['Closed']) : null),
        after: (x) => el('div', { class: 'thread-notes' }, [
          el('div', { class: 'prop-k' }, ['In play']),
          el('textarea', { class: 'text', rows: 2, placeholder: 'What has happened to it at the table…', oninput: debounce((ev) => upd(x, { notes: ev.target.value }), 400) }, [x.notes || '']),
        ]),
        actions: (x) => button(x.open === false ? 'Reopen' : 'Close', () => upd(x, { open: x.open === false }), 'ghost tiny'),
      });
      G.reveal(container);
    };
    redrawOn(ctx, container, draw);
    draw();
  }

  // ── Encounters: the adversaries against the Company, saved, put in a scene; who is in it ──
  const encounters = () => JSON.parse(JSON.stringify(S().encounters || []));
  const setEncounters = (l) => State.commit('setEncounters', [l]);

  // the book's own words for the counts (needs the core in memory)
  function countRules() {
    const eng = D.entity(RULES.engagement.id);
    const paras = eng && eng.desc ? String(eng.desc).split(/\n\n/) : [];
    const steps = ((eng && (eng.props || []).find((p) => p.name === 'Steps')) || { items: [] }).items.map((x) => x.value);
    const g = eng && (eng.guidance || []).find((x) => x.id === RULES.rearward.entry);
    const rear = g ? String(g.text).replace(/\n\n(?=[a-z])/g, ' ').split(/\n\n/).find((p) => /^Player-heroes are allowed to assume a Rearward stance/.test(p)) : null;
    return {
      more: paras.find((p) => /^\*\*MORE ENEMIES THAN PLAYER-HEROES/.test(p)) || null,
      fewer: paras.find((p) => /^\*\*MORE PLAYER-HEROES THAN ENEMIES/.test(p)) || null,
      loremasterSteps: steps.slice(0, 2), playerSteps: steps.slice(2, 4), rear,
    };
  }
  const f = D.f;
  const advLine = (r) => ['AL ' + f(r, 'Attribute Level'), 'Endurance ' + f(r, 'Endurance'), f(r, 'Might') != null ? 'Might ' + f(r, 'Might') : null, f(r, 'Hate') != null ? 'Hate ' + f(r, 'Hate') : f(r, 'Resolve') != null ? 'Resolve ' + f(r, 'Resolve') : null].filter(Boolean).join(' · ');
  let draft = { name: '', adversaries: [] };   // the encounter being built: adversaries [{ id, count }]
  function renderEncounters(container, ctx) {
    let q = '';
    const draw = () => {
      container.innerHTML = '';
      // the encounter builder
      const recs = D.adversaries();
      const byId = (id) => D.record(id);
      container.appendChild(el('h4', {}, ['Encounter']));
      container.appendChild(el('div', { class: 'chiprow tight' }, [el('input', { class: 'text', type: 'text', value: draft.name, placeholder: 'name it to save it', oninput: (ev) => { draft.name = ev.target.value; } })]));
      draft.adversaries.forEach((n, i) => {
        const r = byId(n.id);
        container.appendChild(el('div', { class: 'chiprow tight enc-row' }, [
          el('button', { class: 'ref', type: 'button', onclick: () => open(n.id) }, [r ? r.name : n.id]),
          el('span', { class: 'muted small' }, [(r ? advLine(r) : '') + ' ×']),
          button('−', () => { n.count = Math.max(0, n.count - 1); if (!n.count) draft.adversaries.splice(i, 1); draw(); }, 'ghost tiny'),
          el('b', { class: 'num' }, [String(n.count)]),
          button('+', () => { n.count++; draw(); }, 'ghost tiny'),
        ]));
      });
      const search = el('input', { type: 'search', class: 'search', placeholder: 'Add an adversary from any book…', value: q });
      const hits = el('div');
      const drawHits = () => {
        hits.innerHTML = '';
        if (q.length < 2) return;
        recs.filter((r) => (r.name + ' ' + (f(r, 'Adversary Type') || '')).toLowerCase().indexOf(q) !== -1).slice(0, 12).forEach((r) => hits.appendChild(el('div', { class: 'small' }, [
          button('+ ' + r.name, () => { const x = draft.adversaries.find((y) => y.id === r.id); if (x) x.count++; else draft.adversaries.push({ id: r.id, count: 1 }); q = ''; draw(); }, 'ghost tiny'),
          el('span', { class: 'muted' }, [' ' + [f(r, 'Adversary Type'), advLine(r), (D.indexBook(r.book) || {}).label].filter(Boolean).join(' · ')]),
        ])));
      };
      search.addEventListener('input', debounce(() => { q = search.value.trim().toLowerCase(); drawHits(); }, 150));
      container.appendChild(search);
      container.appendChild(hits);
      drawHits();

      // the counts, and what the book says follows from them
      const heroes = (S().party || []).length;
      const enemies = draft.adversaries.reduce((a, n) => a + n.count, 0);
      const sum = el('div', { class: 'enc-sum' });
      container.appendChild(sum);
      const fill = () => {
        sum.innerHTML = '';
        sum.appendChild(el('div', {}, [el('b', {}, [enemies + (enemies === 1 ? ' adversary' : ' adversaries')]), ' against ', el('b', {}, [heroes + (heroes === 1 ? ' Player-hero' : ' Player-heroes')]), el('span', { class: 'muted small' }, [' in the Company'])]));
        if (!enemies || !heroes) return;
        const r = countRules();
        const lm = enemies > heroes;
        const para = lm ? r.more : r.fewer;
        if (para) sum.appendChild(el('div', { class: 'small enc-band on' }, [el('span', { html: E.inline(para) }), el('ol', { class: 'small' }, (lm ? r.loremasterSteps : r.playerSteps).map((s) => el('li', { html: E.inline(String(s).replace(/^\d+\.\s*/, '')) })))]));
        if (r.rear) sum.appendChild(el('div', { class: 'small enc-band' + (enemies <= heroes * REARWARD_MULTIPLE ? ' on' : '') }, [
          el('b', {}, [enemies <= heroes * REARWARD_MULTIPLE ? 'Rearward allowed · ' : 'No Rearward · ']),
          el('span', { html: E.inline(r.rear) }),
        ]));
        sum.appendChild(el('div', { class: 'muted small' }, ['(', el('a', { class: 'ref', href: '#', onclick: (ev) => { ev.preventDefault(); open(RULES.engagement.id); } }, [RULES.engagement.name]), ')']));
      };
      if (D.loaded('core')) fill(); else { fill(); D.ready('core').then(fill); }

      const sc = Sys().scene && Sys().scene(Sys().currentSceneId());
      container.appendChild(el('div', { class: 'chiprow tight' }, [
        button('Save encounter', () => { if (!draft.adversaries.length) return; const l = encounters(); const nm = draft.name.trim() || ('Encounter ' + (l.length + 1)); l.push({ id: newId('enc'), name: nm, adversaries: draft.adversaries.map((n) => ({ id: n.id, count: n.count })) }); setEncounters(l); }, 'tiny'),
        // every one of them a foe of its own, tracked (system/tor2e/foes.js)
        sc && draft.adversaries.length ? button('Put in ' + sc.name, () => draft.adversaries.forEach((n) => window.TorFoes.add(sc.id, n.id, n.count)), 'ghost tiny') : null,
        draft.adversaries.length ? button('Clear', () => { draft = { name: '', adversaries: [] }; draw(); }, 'ghost tiny') : null,
      ]));
      const saved = encounters();
      if (saved.length) container.appendChild(el('ul', { class: 'items' }, saved.map((x, i) => el('li', {}, [
        el('button', { class: 'ref', type: 'button', onclick: () => { draft = { name: x.name, adversaries: (x.adversaries || []).map((n) => Object.assign({}, n)) }; draw(); } }, [x.name]),
        el('span', { class: 'muted small' }, [' · ' + (x.adversaries || []).reduce((a, n) => a + n.count, 0) + ' adversaries']),
        button('×', () => setEncounters(encounters().filter((_, j) => j !== i)), 'ghost tiny'),
      ]))));

      // who is in the current scene of the adventure
      container.appendChild(el('h4', {}, ['In this scene', el('span', { class: 'muted small', html: sc ? ' · ' + E.inline(sc.name) : ' · no scene' })]));
      const here = sc ? Sys().cast(sc.id) : [];
      if (sc) container.appendChild(window.TorFoes.block(sc.id));
      container.appendChild(here.length || (sc && window.TorFoes.list(sc.id).length) ? el('ul', { class: 'items' }, here.map((r) => el('li', {}, [
        el('button', { class: 'ref', type: 'button', onclick: () => open(r.id) }, [r.name]),
        el('span', { class: 'muted small' }, [' ' + (r.type === 'Adversary' ? advLine(r) : (f(r, 'Occupation') || r.type))]),
      ]))) : el('div', { class: 'muted small' }, ['No one yet — the Adversaries panel, or an encounter’s “Put in”, adds them.']));
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    ctx.on('scene:changed', draw);
    draw();
  }

  // ── People: the campaign's people, and the Loremaster's notes on the heroes ─
  // The engine's People pane (engine/gm-panes.js) without a way to say whom a section is about; here
  // each section's editor names them — a Loremaster character, a patron or an adversary from the
  // books, or a hero of the Company — and the section then shows in the Inspector and the Company.
  function aboutField(d, kind) {
    d.about = (d.about || []).slice();
    const box = el('div', { class: 'chiprow tight gm-about-edit' });
    const draw = () => {
      box.innerHTML = '';
      box.appendChild(el('span', { class: 'prop-k' }, ['About']));
      d.about.forEach((k, i) => {
        const r = kind === 'pc' ? null : D.record(k);
        box.appendChild(el('span', { class: 'chip' }, [r ? r.name : k, el('button', { class: 'ref tiny', type: 'button', title: 'remove', onclick: () => { d.about.splice(i, 1); draw(); } }, ['×'])]));
      });
      if (kind === 'pc') {
        const sel = el('select', { class: 'scope tiny', 'aria-label': 'About a hero' }, [el('option', { value: '' }, ['+ a hero…'])].concat((S().party || []).filter((m) => d.about.indexOf(m.name) === -1).map((m) => el('option', { value: m.name }, [m.name]))));
        sel.addEventListener('change', () => { if (sel.value) { d.about.push(sel.value); draw(); } });
        box.appendChild(sel);
      } else {
        const q = el('input', { type: 'search', class: 'text', placeholder: '+ someone from the books', 'aria-label': 'About someone' });
        const hits = el('span', { class: 'gm-about-hits' });
        q.addEventListener('input', debounce(() => {
          hits.innerHTML = '';
          const t = q.value.trim().toLowerCase();
          if (t.length < 2) return;
          D.records().filter((r) => D.ACTOR_TYPES.indexOf(r.type) !== -1 && r.name.toLowerCase().indexOf(t) !== -1 && d.about.indexOf(r.id) === -1).slice(0, 8)
            .forEach((r) => hits.appendChild(button('+ ' + r.name + ' · ' + r.type, () => { d.about.push(r.id); draw(); }, 'ghost tiny')));
        }, 150));
        box.appendChild(q);
        box.appendChild(hits);
      }
    };
    draw();
    return box;
  }
  function renderPeople(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      container.appendChild(el('h4', { 'data-gm-id': 'people' }, ['The campaign’s people']));
      G.sections(container, G.list('people'), { redraw: draw, save: (l) => G.setList('people', l), addLabel: 'Add someone…', fields: (d) => aboutField(d, 'people') });
      container.appendChild(el('h4', { 'data-gm-id': 'pc' }, ['Behind the heroes', el('span', { class: 'muted small' }, [' · never sent to players'])]));
      G.sections(container, G.list('pc'), { redraw: draw, save: (l) => G.setList('pc', l), addLabel: 'Add a note on a hero…', fields: (d) => aboutField(d, 'pc') });
      G.reveal(container);
    };
    redrawOn(ctx, container, draw);
    draw();
  }

  Panels.register('people', { label: 'People', render: renderPeople });
  Panels.register('scenes', { label: 'Scenes', render: renderScenes });
  Panels.register('threads', { label: 'Threads', render: renderThreads });
  Panels.register('encounters', { label: 'Encounters', render: renderEncounters });
  Panels.register('notes', { label: 'Notes', render: renderNotes });
})();
