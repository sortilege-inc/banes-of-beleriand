// system/tor2e/entity.js — one entity, as the book holds it.
//
// Generic by design: an entity is rendered from its own text, properties, table and sidebars,
// so a rule, a Heroic Culture, a Virtue and a Loremaster character all come out without this
// file naming any of them. Every string shown is the book's; the only words added are the
// property names (the corpus's own labels too) and a few labels of this tool's.
//
// Two things are drawn rather than printed, the string in data/ untouched:
//   * the book's Markdown emphasis (`*…*`, `**…**`) — set as emphasis;
//   * the rules icons ("[Success]", "[Eye of Sauron]", "[Gandalf Rune]") — drawn as glyphs.
// An Adversary is drawn as the book's stat block: its line of ratings, then each printed
// Combat Proficiency (a button that rolls it when the page provides a roller, opts.onAttack),
// then its Fell Abilities.
window.TorEntity = (function () {
  const { el, esc } = window.VttRender;
  const D = window.TorData;
  const Dice = () => window.TorDice;

  // Said as the entity's opening quotation, not listed as a field.
  const QUOTES = ['Epigraph'];
  // An Adversary's printed line of ratings, in the book's order.
  const STAT_LINE = ['Attribute Level', 'Endurance', 'Might', 'Hate', 'Resolve', 'Parry', 'Armour'];
  const ACTOR_HEAD = ['Name', 'Adversary Type', 'Occupation', 'Distinctive Features', 'Location', 'Fellowship Bonus', 'Advantage'];

  // ── the text ───────────────────────────────────────────────────────
  function inline(s) {
    let h = esc(s);
    h = h.replace(Dice().TOKEN, (m, word) => Dice().tokenHtml(word));
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, '$1<i>$2</i>');
    return h;
  }

  // \n\n is a paragraph break, \n a line break; nothing is added or reflowed.
  function prose(text, cls) {
    if (text == null || text === '') return null;
    const wrap = el('div', { class: cls || 'prose' });
    String(text).split(/\n\s*\n/).forEach((p) => wrap.appendChild(el('p', { html: inline(p).replace(/\n/g, '<br>') })));
    return wrap;
  }

  // A .lore chapter: Markdown as the conversion wrote it (headings, rules, emphasis; a single
  // newline a soft wrap, a blank line a paragraph). The HTML comment header is the
  // conversion's note, not the book's text, and is not shown.
  function lore(text) {
    const wrap = el('div', { class: 'prose lore' });
    String(text).replace(/<!--[\s\S]*?-->/g, '').split(/\n\s*\n/).forEach((block) => {
      const b = block.replace(/^\n+|\n+$/g, '');
      if (!b) return;
      const h = /^(#{1,4})\s+(.*)$/.exec(b);
      if (h && b.indexOf('\n') === -1) return wrap.appendChild(el('h' + Math.min(6, h[1].length + 2), { html: inline(h[2]) }));
      if (/^-{3,}$/.test(b.trim())) return wrap.appendChild(el('hr'));
      wrap.appendChild(el('p', { html: inline(b.replace(/\n/g, ' ')) }));
    });
    return wrap;
  }

  // A reference to another entity: a link when the reader can open it, the name otherwise.
  function link(ref) {
    const label = (ref && ref.name) || '';
    if (!ref || !ref.hash) return el('span', {}, [label]);
    return el('a', {
      class: 'ref', href: '#', onclick: (ev) => {
        ev.preventDefault();
        if (window.TorOpenEntity) window.TorOpenEntity(ref.hash);
      },
    }, [label]);
  }

  // ── values ─────────────────────────────────────────────────────────
  function defLine(fs) {
    return el('span', { class: 'defline' }, (fs || []).map((f, i) => [i ? ' · ' : null,
      el('span', { class: 'muted small' }, [f.name + ' ']),
      f.vk === 'ref' ? link(f.ref) : f.vk === 'list' ? (f.items || []).map((x) => x.value).join(', ') : el('span', { html: inline(f.value == null ? '' : String(f.value)) })]));
  }

  function value(p) {
    if (p.vk === 'ref') return link(p.ref);
    if (p.vk === 'list') {
      if (!p.items || !p.items.length) return null;
      const steps = p.name === 'Steps';
      return el(steps ? 'ol' : 'ul', { class: 'items' + (steps ? ' steps' : '') }, p.items.map((it) => el('li', {}, [
        it.vk === 'ref' ? link(it) : it.vk === 'def' ? defLine(it.fields) : el('span', { html: inline(String(it.value)) }),
      ])));
    }
    if (p.vk === 'def') return fields(p.fields);
    if (p.value === undefined) return null;
    if (typeof p.value === 'boolean') return el('span', {}, [p.value ? 'yes' : 'no']);
    if (typeof p.value === 'number') return el('span', { class: 'num-v' }, [String(p.value)]);
    return prose(String(p.value), 'prose');
  }

  function fields(list) {
    return el('div', { class: 'fields' }, (list || []).map((f) => {
      const v = value(f);
      return v ? el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, [f.name]), el('div', { class: 'prop-v' }, [v])]) : null;
    }));
  }

  // A type's declaration (the BASE), not an instance's value.
  function isDeclaration(p) {
    return p.value === undefined && p.vk !== 'list' && p.vk !== 'def';
  }
  function declRow(p) {
    const what = p.vk === 'ref' ? (p.ref && p.ref.name) : p.vk === 'enum' ? 'one of ' + (p.options || []).join(', ') : [p.type || p.vk, p.min != null ? 'min ' + p.min : null, p.max != null ? 'max ' + p.max : null].filter(Boolean).join(' ');
    return el('div', { class: 'prop decl' }, [
      el('div', { class: 'prop-k' }, [p.name]),
      el('div', { class: 'prop-v muted small' }, [[what, p.required ? 'required' : null, p.default != null ? 'default ' + p.default : null].filter(Boolean).join(' · ')]),
    ]);
  }

  // ── a printed table, cell for cell ─────────────────────────────────
  function table(t, note) {
    if (!t) return null;
    return el('div', { class: 'table-wrap' }, [el('table', { class: 'printed' }, [
      t.columns && t.columns.length ? el('thead', {}, [el('tr', {}, t.columns.map((c) => el('th', { html: inline(String(c)) })))]) : null,
      el('tbody', {}, t.rows.map((r) => el('tr', {}, r.map((c) => el('td', { html: inline(String(c)) }))))),
    ]), note ? el('div', { class: 'table-note', html: inline(note) }) : null]);
  }

  // A table's typed rows (ENTRIES): what a tool reads. Shown folded under the printed table,
  // since they repeat its cells; shown open when there is no printed table.
  function entries(list, open) {
    if (!list || !list.length) return null;
    const rows = el('ul', { class: 'items entries' }, list.map((r) => el('li', {}, [
      r.vk === 'entity' ? link({ hash: r.id, name: r.name }) : [el('b', {}, [r.name]), ' ', defLine(r.fields)],
    ])));
    return open ? rows : el('details', { class: 'entries-fold' }, [el('summary', { class: 'muted small' }, [list.length + ' typed rows']), rows]);
  }

  // §22 GUIDANCE: the sidebar beside what it concerns.
  function guidance(g) {
    return el('aside', { class: 'guidance' }, [
      el('div', { class: 'guidance-k' }, [g.name || 'Sidebar']),
      g.text ? prose(g.text) : el('div', { class: 'muted small' }, ['(the sidebar’s title only; the corpus carries no text for it)']),
    ]);
  }

  // ── an actor's stat block ──────────────────────────────────────────
  function statLine(e) {
    const cells = STAT_LINE.map((k) => {
      const v = D.val(e, k);
      return v == null ? null : el('div', { class: 'stat' }, [el('div', { class: 'stat-k' }, [k]), el('div', { class: 'stat-v' }, [String(v)])]);
    }).filter(Boolean);
    return cells.length ? el('div', { class: 'statline' }, cells) : null;
  }
  function proficiencies(e, onAttack) {
    const p = D.prop(e, 'Combat Proficiencies');
    if (!p || !(p.items || []).length) return null;
    return el('div', { class: 'profs' }, [el('div', { class: 'prop-k' }, ['Combat Proficiencies'])].concat(p.items.map((it) => {
      const f = {};
      (it.fields || []).forEach((x) => { f[x.name] = x.vk === 'list' ? (x.items || []).map((i) => i.value) : x.value; });
      const printed = f.Printed || f.Weapon;
      if (!onAttack || f.Rating == null) return el('div', { class: 'prof' }, [printed]);
      return el('button', { type: 'button', class: 'prof pool', title: 'Roll ' + f.Weapon + ' (' + f.Rating + ')', onclick: () => onAttack(f, e) }, [printed]);
    })));
  }
  function fellAbilities(e) {
    const p = D.prop(e, 'Fell Abilities');
    if (!p || !(p.items || []).length) return null;
    return el('div', { class: 'fell' }, [el('div', { class: 'prop-k' }, ['Fell Abilities'])].concat(p.items.map((it) => {
      const f = {};
      (it.fields || []).forEach((x) => { f[x.name] = x.value; });
      return el('p', {}, [el('b', {}, [f.Name + '. ']), el('span', { html: inline(f.Description || '') })]);
    })));
  }
  const isActor = (e) => D.ACTOR_TYPES.indexOf(e.type) !== -1;

  function subline(e) {
    const bits = [];
    if (e.type && e.type !== 'Table') bits.push(e.type);
    const tv = D.text(e, 'Adversary Type') || D.text(e, 'Occupation');
    if (tv) bits.push(tv);
    const b = D.indexBook(e.book);
    if (b) bits.push(b.label);
    return bits.filter(Boolean).join(' · ');
  }

  // The whole entity: its heading, its quotation, its text, its fields, its table, its
  // sidebars, and what hangs under it.   opts: { bare, noKids, depth, onAttack }
  function render(e, opts) {
    const o = opts || {};
    const depth = o.depth || 0;
    const actor = isActor(e);
    const box = el('article', { class: 'entity' + (e.type ? ' type-' + e.type.toLowerCase().replace(/[^a-z]+/g, '-') : '') + (depth ? ' depth-' + Math.min(depth, 4) : '') });
    if (!o.bare) {
      box.appendChild(el(depth ? 'h' + Math.min(6, 3 + depth) : 'h3', { class: 'entity-h', html: inline(e.name) }));
      if (!depth) {
        const sub = subline(e);
        if (sub) box.appendChild(el('div', { class: 'entity-sub' }, [sub]));
      }
    }
    const props = e.props || [];
    props.filter((p) => QUOTES.indexOf(p.name) !== -1 && p.value).forEach((p) => {
      box.appendChild(el('blockquote', { class: 'epigraph' }, [prose(String(p.value))]));
    });

    let skip = QUOTES.slice();
    if (actor) {
      const feats = D.val(e, 'Distinctive Features');
      box.appendChild(el('div', { class: 'actor-head' }, [
        feats && feats.length ? el('div', { class: 'features' }, [feats.map((x) => x.value).join(', ')]) : null,
      ]));
      const sl = statLine(e);
      if (sl) box.appendChild(sl);
      const pr = proficiencies(e, o.onAttack);
      if (pr) box.appendChild(pr);
      const fa = fellAbilities(e);
      if (fa) box.appendChild(fa);
      skip = skip.concat(STAT_LINE, ['Combat Proficiencies', 'Fell Abilities', 'Distinctive Features', 'Name']);
    }

    if (e.desc) box.appendChild(prose(e.desc));

    const inBase = e.file === 'tor2e-0.5-core-base.ttrpg';   // the BASE declares; nothing there is a value but a fixed one
    const grid = el('div', { class: 'fields' });
    props.filter((p) => skip.indexOf(p.name) === -1).forEach((p) => {
      if (inBase && isDeclaration(p)) return grid.appendChild(declRow(p));
      const v = value(p);
      if (!v) return;
      grid.appendChild(el('div', { class: 'prop' + (ACTOR_HEAD.indexOf(p.name) !== -1 ? ' head' : '') }, [el('div', { class: 'prop-k' }, [p.name]), el('div', { class: 'prop-v' }, [v])]));
    });
    if (grid.childNodes.length) box.appendChild(grid);

    const t = table(e.table, D.text(e, 'Note'));
    if (t) box.appendChild(t);
    const en = entries(e.entries, !e.table);
    if (en) box.appendChild(en);
    (e.guidance || []).forEach((g) => box.appendChild(guidance(g)));

    const kids = D.children(e.id);
    if (kids.length && !o.noKids) kids.forEach((k) => box.appendChild(render(k, { depth: depth + 1, onAttack: o.onAttack })));
    return box;
  }

  // ── an adventure's blocks: a SCENE, a LOCATION, a Part, a frame's beat ─
  function block(b, opts) {
    const o = opts || {};
    const box = el('section', { class: 'block block-' + String(b.kw).toLowerCase(), id: b.id ? 'b-' + b.id.replace(/^#/, '') : null }, [
      el('h4', { class: 'block-k' }, [{ SCENE: 'Scene', LOCATION: 'Location', PHASE: 'Part', ENTRY: 'Beat' }[b.kw] || b.kw, b.type ? ' · ' + b.type : '']),
      b.name ? el('h3', { class: 'block-h', html: inline(b.name) }) : null,
    ]);
    if (b.desc) box.appendChild(prose(b.desc));
    const rest = (b.props || []);
    if (rest.length) box.appendChild(fields(rest));
    const t = table(b.table);
    if (t) box.appendChild(t);
    const en = entries(b.entries, !b.table);
    if (en) box.appendChild(en);
    (b.guidance || []).forEach((g) => box.appendChild(guidance(g)));
    if (!o.noEntities) (b.entities || []).map(D.entity).filter(Boolean).forEach((e) => box.appendChild(render(e, { depth: 1, onAttack: o.onAttack })));
    return box;
  }

  // A card for a grid: the name, one line of what it is, the start of its text.
  function card(e, onclick, meta) {
    const t = e.desc || '';
    return el('button', { class: 'card', type: 'button', onclick }, [
      el('div', { class: 'card-name', html: inline(e.name) }),
      meta ? el('div', { class: 'card-meta' }, [meta]) : null,
      t ? el('div', { class: 'card-text', html: inline(t.split(/\n\s*\n/)[0]) }) : null,
    ]);
  }

  return { render, block, card, prose, lore, inline, link, table, guidance, fields, value, statLine, isActor };
})();
