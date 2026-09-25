// campaign/site/gm.js — Banes of Beleriand's own panel on the Loremaster's table: *Company files*,
// the Company's character files (campaign/docs/company/ `sheet:`), each added to the table in one
// click. Loaded at the `gm` stage (engine/instance.js), after the system's panels and before the
// shell mounts them. The Loremaster's own material is not here: it lives in the GM tabs (Overview,
// Scenes, Threads, People, Places, Notes), in the pack (PLAYBOOK §4b; campaign/PLAN.md O2).
(function () {
  const { el, button } = window.VttRender;
  const Panels = window.VttPanels;
  const State = window.VttState;
  const Sys = () => window.VttSystem;
  const DOCS = window.BanesDocs || {};
  const heroes = () => (DOCS.company || []).filter((p) => p.sheet);

  function renderFiles(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const box = el('div', { class: 'banes-company-files' }, [el('h4', {}, ['The Company’s character files'])]);
      container.appendChild(box);
      if (!heroes().length) {
        box.appendChild(el('div', { class: 'empty' }, ['No character files yet (a `sheet:` in campaign/docs/company/).']));
        return;
      }
      heroes().forEach((p) => {
        const inParty = (State.state.party || []).some((m) => m.source && m.source.name === p.sheet);
        const b = button(inParty ? p.name + ' · at the table' : 'Add ' + p.name, () => {
          fetch(p.sheet).then((x) => x.json()).then((obj) => {
            const m = Sys().readCharacter(obj, p.sheet);
            State.commit('addPartyMember', [m]);
            Panels.select({ kind: 'party', id: m.id });
          }).catch((e) => alert('Could not read ' + p.sheet + ': ' + e.message));
        }, 'ghost tiny');
        if (inParty) b.disabled = true;
        box.appendChild(el('div', { class: 'chiprow' }, [b]));
      });
    };
    ctx.on('state:changed', draw);
    ctx.on('state:remote', draw);
    draw();
  }

  Panels.register('company-files', { label: 'Company files', render: renderFiles, count: () => heroes().length });
})();
