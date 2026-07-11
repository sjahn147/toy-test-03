const MODES = [
  ['normal', 'World'],
  ['territory', 'Territory'],
  ['supply', 'Supply'],
  ['danger', 'Danger']
];

export class StrategyOverlayToolbar {
  constructor({ onChange = () => {} } = {}) {
    this.onChange = onChange;
    this.active = 'normal';
  }

  mount(viewport) {
    this.host = document.createElement('div');
    this.host.className = 'strategy-overlay-toolbar';
    this.host.setAttribute('role', 'group');
    this.host.setAttribute('aria-label', 'World overlays');
    this.host.innerHTML = MODES.map(([id, label]) => `<button data-overlay-mode="${id}" aria-pressed="${id === this.active}">${label}</button>`).join('');
    this.host.addEventListener('click', event => {
      const button = event.target.closest('[data-overlay-mode]');
      if (!button || button.disabled) return;
      this.setActive(button.dataset.overlayMode);
      this.onChange(this.active);
    });
    viewport.appendChild(this.host);
  }

  render({ active = 'normal', availability = {} } = {}) {
    this.active = active;
    this.host?.querySelectorAll('[data-overlay-mode]').forEach(button => {
      const id = button.dataset.overlayMode;
      const available = id === 'normal' || availability[id]?.available !== false;
      button.disabled = !available;
      button.classList.toggle('is-active', id === active);
      button.setAttribute('aria-pressed', String(id === active));
      const count = availability[id]?.count;
      button.title = Number.isFinite(count) ? `${count} rooms or records` : '';
    });
  }

  setActive(mode) {
    this.active = MODES.some(([id]) => id === mode) ? mode : 'normal';
    this.render({ active: this.active });
  }

  destroy() { this.host?.remove(); this.host = null; }
}
