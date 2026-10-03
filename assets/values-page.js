(() => {
  const section = document.querySelector('[data-values-situations]');
  const tabs = section?.querySelector('[data-values-tabs]');
  const buttons = [...(tabs?.querySelectorAll('[data-values-tab]') || [])];
  const panels = [...(section?.querySelectorAll('[data-values-panel]') || [])];
  if (!tabs || buttons.length !== panels.length || !buttons.length) return;

  const select = (button, focus = false) => {
    buttons.forEach(tab => {
      const active = tab === button;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.valuesPanel !== button.dataset.valuesTab; });
    if (focus) button.focus();
  };

  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-orientation', 'vertical');
  buttons.forEach((button, index) => {
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', button.id);
    panels[index].tabIndex = 0;
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(buttons[next], true);
    });
  });
  select(buttons[0]);
  section.classList.add('is-interactive');
  tabs.hidden = false;
})();
