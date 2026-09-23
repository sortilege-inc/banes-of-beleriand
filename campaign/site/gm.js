// campaign/site/gm.js — Banes of Beleriand's own panel on the Loremaster's table: *Behind the
// Veil*. Loaded at the `gm` stage (engine/instance.js), after the system's panels and before the
// shell mounts them. It holds the Loremaster's campaign state (campaign/docs/veil/, behind a
// spoiler gate — the site is public, so the gate is courtesy, not secrecy) and the Company's
// character files (campaign/docs/company/ `sheet:`), each added to the table in one click.
(function () {
  const { el, button } = window.VttRender;
  const Panels = window.VttPanels;
  const State = window.VttState;
  const Sys = () => window.VttSystem;
  const DOCS = window.BanesDocs || {};
  const GATE = (window.VttConfig.storagePrefix || 'banes-vtt') + ':veil-open';

  const isOpen = () => { try { return sessionStorage.getItem(GATE) === '1'; } catch (e) { return false; } };
  const setOpen = (v) => { try { v ? sessionStorage.setItem(GATE, '1') : sessionStorage.removeItem(GATE); } catch (e) { /* private window */ } };

  function prose(html) {
    const box = el('div', { class: 'prose banes-prose' });
    box.innerHTML = html || '';
    // a [[link]] in the Loremaster's notes opens the page on the site, in its own tab
    box.querySelectorAll('a.doc-link').forEach((a) => {
      const tab = a.getAttribute('data-tab');
      if (tab !== 'veil') { a.setAttribute('href', './#' + tab + '/' + encodeURIComponent(a.getAttribute('data-slug'))); a.setAttribute('target', '_blank'); }
    });
    return box;
  }

  function companyLoader() {
    const heroes = (DOCS.company || []).filter((p) => p.sheet);
    const box = el('div', { class: 'banes-veil-company' }, [el('h4', {}, ['The Company’s character files'])]);
    if (!heroes.length) {
      box.appendChild(el('div', { class: 'empty' }, ['No character files yet (a `sheet:` in campaign/docs/company/).']));
      return box;
    }
    heroes.forEach((p) => {
      const inParty = () => (State.state.party || []).some((m) => m.source && m.source.name === p.sheet);
      const b = button(inParty() ? p.name + ' · at the table' : 'Add ' + p.name, () => {
        fetch(p.sheet).then((x) => x.json()).then((obj) => {
          const m = Sys().readCharacter(obj, p.sheet);
          State.commit('addPartyMember', [m]);
          Panels.select({ kind: 'party', id: m.id });
        }).catch((e) => alert('Could not read ' + p.sheet + ': ' + e.message));
      }, 'ghost tiny');
      if (inParty()) b.disabled = true;
      box.appendChild(el('div', { class: 'chiprow' }, [b]));
    });
    return box;
  }

  function renderVeil(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const veil = DOCS.veil || [];
      container.appendChild(companyLoader());
      container.appendChild(el('h4', {}, ['Behind the Veil']));
      if (!veil.length) {
        container.appendChild(el('div', { class: 'empty' }, ['Nothing written yet (campaign/docs/veil/).']));
        return;
      }
      if (!isOpen()) {
        container.appendChild(el('div', { class: 'banes-gate' }, [
          el('p', { class: 'muted' }, ['The Loremaster’s campaign state — spoilers for the players.']),
          button('Lift the veil', () => { setOpen(true); draw(); }),
        ]));
        return;
      }
      container.appendChild(el('div', { class: 'chiprow' }, [button('Lower the veil', () => { setOpen(false); draw(); }, 'ghost tiny')]));
      veil.forEach((p) => container.appendChild(el('details', { class: 'banes-veil-doc', open: veil.length === 1 || null }, [
        el('summary', {}, [p.title]),
        prose(p.html),
      ])));
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  Panels.register('veil', { label: 'Behind the Veil', render: renderVeil, count: () => (DOCS.veil || []).length });
})();
