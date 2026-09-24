// system/tor2e/panels.js — the Loremaster's panels: Adventure, Company, Inspector,
// Adversaries, Loremaster characters, Tables, Dice, Rules & Book, Log, Campaign. Registered
// into the engine's registry; the shell (engine/app.js) decides where they show. Every word
// of rules text shown comes from the corpus; a book's text loads when a panel first needs it.
(function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.TorData;
  const E = window.TorEntity;
  const Dice = window.TorDice;
  const State = window.VttState;
  const Bus = window.VttBus;
  const Panels = window.VttPanels;
  const Sys = () => window.VttSystem;
  const Sheet = () => window.TorSheet;
  const S = () => State.state;

  // a link inside any rendered entity opens it in the Inspector here, not the reader
  window.TorOpenEntity = (id) => Panels.select({ kind: 'entity', id });

  const bookLabel = (id) => (D.indexBook(id) || {}).label || id;
  const editing = (container) => document.activeElement && /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName) && container.contains(document.activeElement);
  // draw into `box` once a book is in memory
  function whenLoaded(box, bid, fn) {
    if (!bid || D.loaded(bid)) return fn();
    box.appendChild(el('div', { class: 'loading' }, [Dice.icon('Gandalf Rune', 'spin'), ' Opening ' + bookLabel(bid) + '…']));
    D.ready(bid).then(() => { box.innerHTML = ''; fn(); });
  }

  // every roll goes to the Log: who, what, the dice, the outcome in the book's words
  function logRoll(r, who, label, memberId) {
    State.commit('appendLog', [{ at: Date.now(), kind: 'roll', memberId: memberId || null, who: who || 'Loremaster', label: label || '', text: Dice.line(r), ok: r.ok, degree: r.degree }]);
  }
  const rollLine = (x) => el('div', { class: 'roll-line' + (x.ok ? ' ok' : x.ok === false ? ' fail' : '') }, [
    el('span', { class: 'roll-who' }, [x.who || x.kind || 'note']),
    x.label ? el('span', { class: 'roll-what' }, [x.label]) : null,
    el('span', { class: 'roll-text', html: E.inline(x.text || '') }),
  ]);

  // ── Adventure: the adventure in play, its Parts and scenes ─────────
  const progress = (mod, sceneId) => ((S().progress || {})[mod] || {})[sceneId] || { done: false, notes: '' };
  function goTo(sceneId) {
    const a = Sys().adventureId();
    State.commit('setCurrentScene', [a, sceneId]);
    Bus.emit('scene:changed', { moduleId: a, sceneId });
  }
  function setAdventure(cid) {
    const rest = ((S().campaign || {}).modules || []).filter((m) => m !== cid);
    State.commit('setCampaign', [{ modules: [cid].concat(rest) }]);
  }
  function putIn(sceneId, recordId) {
    const ids = ((S().cast || {})[sceneId] || []).slice();
    if (ids.indexOf(recordId) === -1) ids.push(recordId);
    State.commit('setSceneCast', [sceneId, ids]);
  }
  function takeOut(sceneId, recordId) {
    State.commit('setSceneCast', [sceneId, ((S().cast || {})[sceneId] || []).filter((x) => x !== recordId)]);
  }

  function renderAdventure(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const aid = Sys().adventureId();
      const pick = el('select', { class: 'scope wide-select', onchange: (ev) => { if (ev.target.value) setAdventure(ev.target.value); } }, [
        el('option', { value: '' }, ['Choose the adventure in play…']),
      ].concat(D.books().filter((b) => b.counts.arcs).map((b) => el('optgroup', { label: b.label }, D.adventures().filter((a) => a.book === b.id).map((a) => el('option', { value: a.id, selected: a.id === aid || null }, [a.name]))))));
      container.appendChild(el('div', { class: 'chiprow' }, [pick]));
      const a = Sys().adventure();
      if (!a) return container.appendChild(el('div', { class: 'empty' }, ['No adventure in play. The books print thirteen; pick one above, or run the Company from the Rules & Book.']));
      const list = Sys().scenes();
      const cur = Sys().currentSceneId();
      const done = list.filter((s) => progress(a.id, s.id).done).length;
      container.appendChild(el('h4', {}, [a.name, el('span', { class: 'muted small' }, [' · ' + bookLabel(a.book) + ' · ' + done + ' of ' + list.length + ' scenes done'])]));
      let part;
      const rows = el('div', { class: 'scene-list' });
      list.forEach((s) => {
        if (s.phase !== part) {
          part = s.phase;
          rows.appendChild(el('div', { class: 'phase-h', html: E.inline(part || 'Scenes outside the Parts') }));
        }
        const st = progress(a.id, s.id);
        const n = Sys().cast(s.id).length;
        rows.appendChild(el('div', { class: 'scene-row' + (cur === s.id ? ' current' : '') + (st.done ? ' done' : '') }, [
          el('input', { type: 'checkbox', checked: st.done || null, title: 'Done', onchange: (ev) => State.commit('setSceneDone', [a.id, s.id, ev.target.checked]) }),
          el('button', { class: 'scene-link', type: 'button', onclick: () => goTo(s.id), html: E.inline(s.name) }),
          n ? el('span', { class: 'muted small' }, [n + ' in it']) : null,
        ]));
      });
      container.appendChild(rows);

      if (!cur) return;
      const st = progress(a.id, cur);
      const box = el('section', { class: 'scene' });
      container.appendChild(box);
      whenLoaded(box, a.book, () => {
        const sc = Sys().scene(cur);
        const here = Sys().cast(cur);
        const named = Sys().castNamed().filter((r) => !here.some((h) => h.id === r.id));
        box.appendChild(el('h4', {}, ['This scene', sc.part ? el('span', { class: 'muted small', html: ' · ' + E.inline(sc.part) }) : null]));
        box.appendChild(E.block(sc, { onAttack: inspectorAttack }));
        box.appendChild(el('div', { class: 'chiprow tight' }, [
          button('Open on the table', () => window.open(window.VttConfig.pages.table + '?scene=' + encodeURIComponent(cur), (window.VttConfig.channel || 'vtt') + '-table'), 'tiny'),
          el('label', { class: 'small' }, [el('input', { type: 'checkbox', checked: st.done || null, onchange: (ev) => State.commit('setSceneDone', [a.id, cur, ev.target.checked]) }), ' done']),
        ]));
        box.appendChild(el('div', { class: 'prop-k' }, ['In it']));
        box.appendChild(here.length ? el('div', { class: 'chiprow tight' }, here.map((r) => el('span', { class: 'chip' }, [
          el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: r.id }) }, [r.name]),
          el('button', { class: 'ref tiny', type: 'button', title: 'take out', onclick: () => takeOut(cur, r.id) }, ['×']),
        ]))) : el('div', { class: 'muted small' }, ['No one yet. Adversaries and Loremaster characters can be put here from their panels or the Inspector.']));
        if (named.length) box.appendChild(el('div', { class: 'chiprow tight' }, [el('span', { class: 'muted small' }, ['The adventure’s cast:'])].concat(named.map((r) => button('+ ' + r.name, () => putIn(cur, r.id), 'ghost tiny')))));
        box.appendChild(el('div', { class: 'prop-k' }, ['Loremaster’s notes', el('span', { class: 'muted' }, [' · never sent to players'])]));
        box.appendChild(el('textarea', { class: 'text', rows: 5, placeholder: 'What happens here…', oninput: debounce((ev) => State.commit('setSceneNotes', [a.id, cur, ev.target.value]), 400) }, [st.notes || '']));
      });
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', draw);
    ctx.on('scene:changed', draw);
    draw();
  }

  // ── Company ────────────────────────────────────────────────────────
  function characterLoader(label, cls) {
    const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true, multiple: true });
    file.addEventListener('change', () => {
      const files = Array.from(file.files || []);
      Promise.all(files.map((f) => f.text().then((text) => Sys().readCharacter(JSON.parse(text), f.name))))
        .then((members) => {
          members.forEach((m) => State.commit('addPartyMember', [m]));
          if (members.length) Panels.select({ kind: 'party', id: members[members.length - 1].id });
        })
        .catch((e) => alert(e.message))
        .finally(() => (file.value = ''));
    });
    return el('span', {}, [button(label, () => file.click(), cls), file]);
  }
  // The Company's bookkeeping between sessions (system/tor2e/sheet.js endSession / fellowship): the
  // session's 3 Skill points and 3 Adventure points to each hero who attended; the Fellowship
  // phase's Hope and the Shadow the Loremaster allows removed; Yule's.
  let bookkeeping = null;   // 'session' | 'fellowship' — the form open, kept across redraws
  function bookkeepingBlock(party) {
    const box = el('div', { class: 'bookkeeping' });
    box.appendChild(el('div', { class: 'chiprow tight' }, [
      button('End the session…', () => { bookkeeping = bookkeeping === 'session' ? null : 'session'; Bus.emit('state:remote', { view: true }, { local: true }); }, 'ghost tiny'),
      button('Fellowship phase…', () => { bookkeeping = bookkeeping === 'fellowship' ? null : 'fellowship'; Bus.emit('state:remote', { view: true }, { local: true }); }, 'ghost tiny'),
    ]));
    if (bookkeeping === 'session') {
      const boxes = party.map((m) => ({ id: m.id, c: el('input', { type: 'checkbox', checked: true }) }));
      box.appendChild(el('div', { class: 'paper small' }, [
        el('div', {}, ['Each hero who attended earns ' + Sheet().SESSION_SKILL_POINTS + ' Skill points and ' + Sheet().SESSION_ADVENTURE_POINTS + ' Adventure points.']),
        el('div', { class: 'chiprow tight' }, party.map((m, i) => el('label', { class: 'check' }, [boxes[i].c, ' ' + m.name]))),
        button('End the session', () => { Sheet().endSession(boxes.filter((b) => b.c.checked).map((b) => b.id)); bookkeeping = null; Bus.emit('state:remote', { view: true }, { local: true }); }, 'tiny'),
      ]));
    }
    if (bookkeeping === 'fellowship') {
      const shadow = el('select', { class: 'scope tiny' }, [0, 1, 2, 3].slice(0, Sheet().SHADOW_REMOVED_MAX + 1).map((n) => el('option', { value: n }, [n ? 'remove ' + n + ' Shadow' : 'no Shadow removed'])));
      const yule = el('input', { type: 'checkbox' });
      box.appendChild(el('div', { class: 'paper small' }, [
        el('div', {}, ['Every hero recovers Hope equal to HEART (all of it at Yule). At Yule each also earns Skill points equal to WITS and ages a year.']),
        el('div', { class: 'chiprow tight' }, [shadow, el('label', { class: 'check' }, [yule, ' Yule'])]),
        button('Apply to the Company', () => { Sheet().fellowship(party.map((m) => m.id), { shadow: parseInt(shadow.value, 10) || 0, yule: yule.checked }); bookkeeping = null; Bus.emit('state:remote', { view: true }, { local: true }); }, 'tiny'),
      ]));
    }
    return box;
  }
  function renderCompany(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const party = S().party || [];
      container.appendChild(el('div', { class: 'chiprow' }, [characterLoader('Load Player-hero file(s)…', ''), el('span', { class: 'muted small' }, ['made on the site’s “Making a hero”'])]));
      if (!party.length) container.appendChild(el('div', { class: 'empty' }, ['No one in the Company yet.']));
      else if (Sheet()) container.appendChild(bookkeepingBlock(party));
      party.forEach((m) => container.appendChild(el('div', { class: 'member' }, [
        el('button', { class: 'card static-card', type: 'button', onclick: () => Panels.select({ kind: 'party', id: m.id }) }, [
          el('div', { class: 'card-name' }, [m.name]),
          el('div', { class: 'card-sub muted small' }, [Sys().memberSubtitle(m)]),
          Sheet() ? el('div', { class: 'card-desc' }, [Sheet().statusLine(m)]) : null,
        ]),
        el('div', { class: 'member-ops' }, [
          button('file', () => Sys().downloadCharacter(m), 'ghost tiny'),
          button('remove', () => { if (confirm('Remove ' + m.name + ' from the Company?')) State.commit('removePartyMember', [m.id]); }, 'ghost tiny'),
        ]),
      ])));
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  // ── Inspector ──────────────────────────────────────────────────────
  // An adversary's Combat Proficiency pressed anywhere rolls here, in the Inspector's roller,
  // the icons switched (PLAN.md decision 8), and goes to the Log.
  let inspectorRoller = null;
  function inspectorAttack(f, e) {
    Panels.select({ kind: 'entity', id: e.id });
    setTimeout(() => {
      if (!inspectorRoller) return;
      inspectorRoller.set({ rating: f.Rating, tn: '', switched: true, favour: null, weary: false, miserable: false });
      inspectorRoller.label = e.name + ' · ' + (f.Printed || f.Weapon);
      inspectorRoller.querySelector('.roll-btn').click();
    }, 0);
  }
  function renderInspector(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      inspectorRoller = null;
      const sel = Panels.selection();
      if (!sel) return container.appendChild(el('div', { class: 'empty' }, ['Nothing selected. Click a name anywhere: a scene, an adversary, a rule, a Loremaster character.']));
      if (sel.kind === 'entity') {
        const bid = D.bookOf(sel.id);
        whenLoaded(container, bid, () => {
          const e = D.entity(sel.id);
          if (!e) return container.appendChild(el('div', { class: 'empty' }, ['Not in the books: ' + sel.id]));
          const cur = Sys().currentSceneId();
          const sc = cur ? Sys().scene(cur) : null;
          const rec = D.record(e.id);
          const actor = rec && D.ACTOR_TYPES.indexOf(rec.type) !== -1;
          container.appendChild(el('div', { class: 'chiprow tight' }, [
            sc && actor ? button('Put in ' + sc.name, () => putIn(cur, e.id), 'tiny') : null,
            el('a', { class: 'btn ghost tiny', href: './#' + (rec && rec.type === 'Adversary' ? 'adversaries/' : rec && actor ? 'folk/' : 'books/' + e.book + '/') + encodeURIComponent(e.id), target: '_blank' }, ['In the reader']),
          ]));
          container.appendChild(E.render(e, { onAttack: inspectorAttack }));
          if (rec && rec.type === 'Adversary') {
            const r = Dice.roller({ rating: 0, tn: '', switched: true, onRule: (id) => Panels.select({ kind: 'entity', id }), onRoll: (x) => logRoll(x, e.name, r.label || '') });
            r.label = e.name;
            inspectorRoller = r;
            container.appendChild(el('div', { class: 'prop-k' }, ['Roll for ' + e.name]));
            container.appendChild(r);
          }
        });
      } else if (sel.kind === 'party') {
        const m = (S().party || []).find((x) => x.id === sel.id);
        container.appendChild(m ? Sys().liveSheet(m, { gm: true }) : el('div', { class: 'empty' }, ['That hero is no longer in the Company.']));
      } else container.appendChild(el('div', { class: 'empty' }, ['Nothing to show for ' + sel.kind + '.']));
    };
    ctx.on('select', draw);
    ctx.on('state:changed', () => { const sel = Panels.selection(); if (sel && sel.kind === 'party' && !editing(container)) draw(); });
    ctx.on('state:remote', () => { const sel = Panels.selection(); if (sel && sel.kind === 'party') draw(); });
    draw();
  }

  // ── Adversaries and Loremaster characters: records, by name ────────
  function recordPanel(records, meta) {
    return function (container, ctx) {
      let q = '';
      let bk = '';
      container.innerHTML = '';
      const search = el('input', { type: 'search', class: 'search', placeholder: meta.placeholder });
      const books = D.books().filter((b) => records().some((r) => r.book === b.id));
      const scope = el('select', { class: 'scope' }, [el('option', { value: '' }, ['Every book'])].concat(books.map((b) => el('option', { value: b.id }, [b.label]))));
      const list = el('div');
      const drawList = () => {
        list.innerHTML = '';
        const cur = Sys().currentSceneId();
        const all = records().filter((r) => (!bk || r.book === bk) && (!q || (r.name + ' ' + meta.words(r)).toLowerCase().indexOf(q) !== -1));
        list.appendChild(el('div', { class: 'muted small' }, [all.length + ' ' + meta.noun]));
        list.appendChild(el('ul', { class: 'items toc' }, all.map((r) => el('li', {}, [
          el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: r.id }) }, [r.name]),
          el('span', { class: 'muted small' }, [' · ' + meta.line(r)]),
          cur ? el('button', { class: 'ref tiny', type: 'button', title: 'Put in the current scene', onclick: () => putIn(cur, r.id) }, ['+']) : null,
        ]))));
      };
      search.addEventListener('input', debounce(() => { q = search.value.trim().toLowerCase(); drawList(); }, 150));
      scope.addEventListener('change', () => { bk = scope.value; drawList(); });
      container.appendChild(el('div', { class: 'search-row' }, [search, scope]));
      container.appendChild(list);
      drawList();
    };
  }
  const f = D.f;
  const renderAdversaries = recordPanel(D.adversaries, {
    placeholder: 'Find an adversary…', noun: 'adversaries',
    words: (r) => f(r, 'Adversary Type') || '',
    line: (r) => [f(r, 'Adversary Type'), 'AL ' + f(r, 'Attribute Level'), 'Endurance ' + f(r, 'Endurance'), f(r, 'Hate') != null ? 'Hate ' + f(r, 'Hate') : 'Resolve ' + f(r, 'Resolve'), bookLabel(r.book)].filter(Boolean).join(' · '),
  });
  const renderFolk = recordPanel(D.people, {
    placeholder: 'Find a Loremaster character…', noun: 'Loremaster characters and patrons',
    words: (r) => (f(r, 'Occupation') || '') + ' ' + (f(r, 'Location') || ''),
    line: (r) => [r.type === 'Patron' ? 'Patron' : null, f(r, 'Occupation'), bookLabel(r.book)].filter(Boolean).join(' · '),
  });

  // ── Tables: every printed table, rolled on with the die the book labels it with ──
  function renderTables(container, ctx) {
    let q = '';
    const a = Sys().adventure();
    let bk = a ? a.book : 'core';
    container.innerHTML = '';
    const search = el('input', { type: 'search', class: 'search', placeholder: 'Find a table…' });
    const scope = el('select', { class: 'scope' }, D.books().map((b) => el('option', { value: b.id, selected: b.id === bk || null }, [b.label + ' (' + D.tables().filter((t) => t.book === b.id).length + ')'])));
    const list = el('div');
    const drawList = () => {
      list.innerHTML = '';
      whenLoaded(list, bk, () => {
        const all = D.tables().filter((t) => t.book === bk && (!q || (t.name + ' ' + (t.under || '')).toLowerCase().indexOf(q) !== -1));
        const rollable = all.filter((t) => Dice.tableDie((D.entity(t.id) || {}).table));
        list.appendChild(el('div', { class: 'muted small' }, [all.length + ' tables · ' + rollable.length + ' labelled with a die, rolled here']));
        all.forEach((t) => {
          const e = D.entity(t.id);
          const td = e && Dice.tableDie(e.table);
          const out = el('div', { class: 'small' });
          list.appendChild(el('div', { class: 'table-roll' }, [
            el('div', { class: 'chiprow tight' }, [
              el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: t.id }), html: E.inline(t.name) }),
              t.under ? el('span', { class: 'muted small', html: '· ' + E.inline(t.under) }) : null,
              td ? button('Roll ' + (td.die === 'feat' ? 'the Feat die' : 'a Success die'), () => {
                const r = Dice.rollTable(e.table);
                const face = r.mark ? '[' + r.mark + ']' : String(r.face);
                const text = face + ' → ' + (r.row ? r.row.join(' · ') : '(the book prints no row for this result)');
                out.innerHTML = E.inline(text);
                State.commit('appendLog', [{ at: Date.now(), kind: 'table', who: 'Table', label: t.name, text }]);
              }, 'tiny') : null,
            ]),
            out,
          ]));
        });
      });
    };
    search.addEventListener('input', debounce(() => { q = search.value.trim().toLowerCase(); drawList(); }, 150));
    scope.addEventListener('change', () => { bk = scope.value; drawList(); });
    container.appendChild(el('div', { class: 'search-row' }, [search, scope]));
    container.appendChild(list);
    drawList();
  }

  // ── Dice ───────────────────────────────────────────────────────────
  let diceRoller = null;
  function renderDice(container, ctx) {
    container.innerHTML = '';
    if (!diceRoller) diceRoller = Dice.roller({ rating: 2, tn: 14, onRule: (id) => Panels.select({ kind: 'entity', id }), onRoll: (r) => logRoll(r, 'Loremaster', 'a roll') });
    container.appendChild(diceRoller);
  }

  // ── Rules & Book ───────────────────────────────────────────────────
  function renderRules(container, ctx) {
    container.innerHTML = '';
    const input = el('input', { type: 'search', class: 'search', placeholder: 'Search the books… ( / )', autocomplete: 'off' });
    const a = Sys().adventure();
    const scope = el('select', { class: 'scope' }, D.books().map((b) => el('option', { value: b.id, selected: b.id === 'core' || null }, [b.label])));
    const results = el('div', { class: 'results' });
    const browser = el('div', { class: 'browser' });
    function tree(nodes) {
      return el('ul', { class: 'items toc' }, nodes.map((n) => el('li', {}, [
        n.entity ? el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: n.id }), html: E.inline(n.label) })
          : el('span', { class: n.scene ? 'muted' : '', html: E.inline(n.label) }),
        n.kids.length ? el('details', { class: 'chapter' }, [el('summary', { class: 'muted small' }, [n.kids.length + ' under it']), tree(n.kids)]) : null,
      ])));
    }
    function drawBrowser() {
      browser.innerHTML = '';
      whenLoaded(browser, scope.value, () => browser.appendChild(tree(D.outline(scope.value))));
    }
    const run = debounce(() => {
      results.innerHTML = '';
      const q = input.value.trim();
      browser.hidden = !!q;
      if (q.length < 2) return;
      whenLoaded(results, scope.value, () => {
        const hits = D.search(q, [scope.value], 120).filter((e) => !e.block && !e.lore);
        if (!hits.length) return results.appendChild(el('div', { class: 'empty' }, ['Nothing matches in ' + bookLabel(scope.value) + '.']));
        results.appendChild(el('div', { class: 'muted small' }, [hits.length + (hits.length === 1 ? ' result' : ' results')]));
        hits.forEach((e) => results.appendChild(el('div', { class: 'hit' }, [
          el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: e.id }), html: E.inline(e.name) }),
          e.type ? el('span', { class: 'etype' }, [e.type]) : null,
          (() => { const ex = D.excerpt(e, q, 60); return ex ? el('div', { class: 'muted small', html: E.inline(ex) }) : null; })(),
        ])));
      });
    }, 200);
    input.addEventListener('input', run);
    scope.addEventListener('change', () => { drawBrowser(); run(); });
    container.appendChild(el('div', { class: 'search-row' }, [input, scope]));
    container.appendChild(results);
    container.appendChild(browser);
    drawBrowser();
    container.focusSearch = () => input.focus();
    void a;
  }

  // ── Log ────────────────────────────────────────────────────────────
  function renderLog(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const log = (S().log || []).slice().reverse();
      if (!log.length) return container.appendChild(el('div', { class: 'empty' }, ['Nothing logged yet.']));
      log.forEach((x) => container.appendChild(rollLine(x)));
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  // ── Campaign ───────────────────────────────────────────────────────
  function renderCampaign(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const c = S().campaign;
      const name = el('input', { type: 'text', value: c.name || '', class: 'text', onchange: (ev) => State.commit('setCampaign', [{ name: ev.target.value }]) });
      container.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Campaign']), el('div', { class: 'prop-v' }, [name])]));
      const a = Sys().adventure();
      container.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Adventure in play']), el('div', { class: 'prop-v' }, [a ? a.name + ' · ' + bookLabel(a.book) : '—'])]));
      const party = S().party || [];
      container.appendChild(el('h4', {}, ['The Company', el('span', { class: 'muted small' }, [' · saved in the pack'])]));
      container.appendChild(party.length ? el('ul', { class: 'items' }, party.map((m) => el('li', {}, [
        el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'party', id: m.id }) }, [m.name]),
        el('span', { class: 'muted small' }, [' · ' + Sys().memberSubtitle(m)]),
        button('file', () => Sys().downloadCharacter(m), 'ghost tiny'),
      ]))) : el('div', { class: 'empty' }, ['No one yet.']));
      container.appendChild(el('div', { class: 'chiprow' }, [characterLoader('Load Player-hero file(s)…', 'ghost')]));

      const list = State.listCampaigns();
      container.appendChild(el('h4', {}, ['Campaigns in this browser']));
      container.appendChild(el('ul', { class: 'items' }, list.map((row) => el('li', {}, [
        row.id === State.id ? el('b', {}, [row.name || row.id]) : el('button', { class: 'ref', type: 'button', onclick: () => { State.switchTo(row.id); location.reload(); } }, [row.name || row.id]),
        row.id !== State.id ? button('remove', () => { if (confirm('Remove "' + row.name + '" from this browser? Save its pack first if you want it back.')) { State.remove(row.id); draw(); } }, 'ghost tiny') : null,
      ]))));
      const file = el('input', { type: 'file', accept: 'application/json', hidden: true, onchange: (ev) => {
        const fl = ev.target.files[0];
        if (!fl) return;
        fl.text().then((txt) => {
          try { State.importPack(JSON.parse(txt)); location.reload(); } catch (e) { alert(e.message); }
        });
      } });
      container.appendChild(el('div', { class: 'chiprow' }, [
        button('New campaign', () => { const n = prompt('Campaign name'); if (n) { State.create(n, { campaign: { modules: [], books: [] } }); location.reload(); } }),
        button('Save pack (download)', () => State.downloadPack()),
        button('Restore pack…', () => file.click(), 'ghost'),
        file,
      ]));
      container.appendChild(el('p', { class: 'muted small' }, ['A pack is the campaign as an instance: the Company, the adventure’s progress, every note and roll, as JSON. Keep packs with the campaign; this browser is a cache.']));
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    draw();
  }

  Panels.register('adventure', { label: 'Adventure', render: renderAdventure });
  Panels.register('company', { label: 'Company', render: renderCompany });
  Panels.register('inspector', { label: 'Inspector', render: renderInspector });
  Panels.register('adversaries', { label: 'Adversaries', render: renderAdversaries });
  Panels.register('folk', { label: 'Loremaster characters', render: renderFolk });
  Panels.register('tables', { label: 'Tables', render: renderTables });
  Panels.register('dice', { label: 'Dice', render: renderDice });
  Panels.register('rules', { label: 'Rules & Book', render: renderRules });
  Panels.register('log', { label: 'Log', render: renderLog });
  Panels.register('campaign', { label: 'Campaign', render: renderCampaign });

  window.TorPanels = { goTo, setAdventure, putIn, takeOut, logRoll, rollLine, characterLoader };
})();
