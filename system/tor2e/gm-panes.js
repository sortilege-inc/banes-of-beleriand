// system/tor2e/gm-panes.js — the Loremaster's three panes (l5r5e I9, ported): Notes, Scenes,
// Threads · Encounters. Everything here is the Loremaster's own pack state (system/tor2e/ops.js:
// gmNotes, arc, threads, encounters) — saved with the pack, never sent to a player.
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

  // ── Scenes: the campaign's own arc — loose and editable, beside the book's adventure ──
  // arc = [{ id, title, text, played }]
  const arc = () => (S().arc || []).map((x) => Object.assign({}, x));
  const setArc = (list) => State.commit('setArc', [list]);
  function renderScenes(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const list = arc();
      const played = list.filter((x) => x.played).length;
      container.appendChild(el('h4', {}, ['The arc', el('span', { class: 'muted small' }, [' · ' + list.length + (list.length === 1 ? ' scene, ' : ' scenes, ') + played + ' played'])]));
      list.forEach((x, i) => {
        const upd = (patch) => { const l = arc(); l[i] = Object.assign({}, l[i], patch); setArc(l); };
        const move = (d) => { const l = arc(); const j = i + d; if (j < 0 || j >= l.length) return; const t = l[i]; l[i] = l[j]; l[j] = t; setArc(l); };
        container.appendChild(el('div', { class: 'arc-scene' + (x.played ? ' played' : '') }, [
          el('div', { class: 'chiprow tight' }, [
            el('input', { type: 'checkbox', checked: x.played || null, title: 'Played', onchange: (ev) => upd({ played: ev.target.checked }) }),
            el('input', { class: 'text arc-title', type: 'text', value: x.title || '', placeholder: 'A scene', oninput: debounce((ev) => upd({ title: ev.target.value }), 400) }),
            button('↑', () => move(-1), 'ghost tiny'), button('↓', () => move(1), 'ghost tiny'),
            button('×', () => { if (confirm('Remove “' + (x.title || 'this scene') + '” from the arc?')) setArc(arc().filter((_, j) => j !== i)); }, 'ghost tiny'),
          ]),
          el('textarea', { class: 'text arc-text', rows: 3, placeholder: 'What it is for, who is in it, what might happen…', oninput: debounce((ev) => upd({ text: ev.target.value }), 400) }, [x.text || '']),
        ]));
      });
      const title = el('input', { class: 'text', type: 'text', placeholder: 'Add a scene…' });
      container.appendChild(el('div', { class: 'chiprow tight' }, [title, button('Add', () => { if (!title.value.trim()) return; setArc(arc().concat([{ id: newId('arc'), title: title.value.trim(), text: '', played: false }])); }, 'tiny')]));
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    draw();
  }

  // ── Threads · Encounters · who is in the scene ──
  const threads = () => (S().threads || []).map((x) => Object.assign({}, x));
  const setThreads = (l) => State.commit('setThreads', [l]);
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

  function renderThreads(container, ctx) {
    let q = '';
    const draw = () => {
      container.innerHTML = '';
      // threads
      const ts = threads();
      container.appendChild(el('h4', {}, ['Threads', el('span', { class: 'muted small' }, [' · ' + ts.filter((x) => x.open !== false).length + ' open'])]));
      ts.forEach((x, i) => {
        const upd = (patch) => { const l = threads(); l[i] = Object.assign({}, l[i], patch); setThreads(l); };
        container.appendChild(el('div', { class: 'thread' + (x.open === false ? ' closed' : '') }, [
          el('div', { class: 'chiprow tight' }, [
            el('input', { class: 'text', type: 'text', value: x.title || '', oninput: debounce((ev) => upd({ title: ev.target.value }), 400) }),
            button(x.open === false ? 'reopen' : 'close', () => upd({ open: x.open === false }), 'ghost tiny'),
            button('×', () => { if (confirm('Remove this thread?')) setThreads(threads().filter((_, j) => j !== i)); }, 'ghost tiny'),
          ]),
          x.open === false ? null : el('textarea', { class: 'text', rows: 2, placeholder: 'Where it stands…', oninput: debounce((ev) => upd({ text: ev.target.value }), 400) }, [x.text || '']),
        ]));
      });
      const tt = el('input', { class: 'text', type: 'text', placeholder: 'Open a thread…' });
      container.appendChild(el('div', { class: 'chiprow tight' }, [tt, button('Add', () => { if (!tt.value.trim()) return; setThreads(threads().concat([{ id: newId('th'), title: tt.value.trim(), text: '', open: true }])); }, 'tiny')]));

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
        sc && draft.adversaries.length ? button('Put in ' + sc.name, () => { const cur = Sys().cast(sc.id).map((r) => r.id); State.commit('setSceneCast', [sc.id, cur.concat(draft.adversaries.map((n) => n.id).filter((id) => cur.indexOf(id) === -1))]); }, 'ghost tiny') : null,
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
      container.appendChild(here.length ? el('ul', { class: 'items' }, here.map((r) => el('li', {}, [
        el('button', { class: 'ref', type: 'button', onclick: () => open(r.id) }, [r.name]),
        el('span', { class: 'muted small' }, [' ' + (r.type === 'Adversary' ? advLine(r) : (f(r, 'Occupation') || r.type))]),
      ]))) : el('div', { class: 'muted small' }, ['No one yet — the Adversaries panel, or an encounter’s “Put in”, adds them.']));
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    ctx.on('scene:changed', draw);
    draw();
  }

  Panels.register('notes', { label: 'Notes', render: renderNotes });
  Panels.register('scenes', { label: 'Scenes', render: renderScenes });
  Panels.register('threads', { label: 'Threads · Encounters', render: renderThreads });
})();
