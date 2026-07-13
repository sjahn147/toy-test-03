import { StrategyObserverShell } from './StrategyObserverShell.js';
import { OVERLAY_MODES, OVERLAY_LABELS, normalizeOverlayMode } from '../engine/StrategicOverlayModel.js';

export class StrategyObserverShellWP6 extends StrategyObserverShell {
  constructor(options = {}) {
    const { onOverlayMode = () => {}, ...baseOptions } = options;
    super(baseOptions);
    this.onOverlayMode = onOverlayMode;
    this.overlayMode = 'world';
    this.overlaySummary = null;
  }

  mount(options) {
    super.mount(options);
    delete this.screenEl.dataset.shellLayout;
    this.screenEl.dataset.wp6Layout = 'docked';
  }

  installViewportControls() {
    super.installViewportControls();
    this.viewport.insertAdjacentHTML('beforeend', `
      <section class="strategy-overlay-panel" data-wp6-overlay-panel aria-label="Map overlays">
        <div class="strategy-overlay-tabs" role="group" aria-label="Map overlay modes">
          ${OVERLAY_MODES.map((mode, index) => `<button data-overlay-mode="${mode}" class="${mode === this.overlayMode ? 'is-active' : ''}" aria-pressed="${mode === this.overlayMode}" title="${escapeHtml(OVERLAY_LABELS[mode])} overlay${index > 0 ? ` (Shift+${index})` : ''}">${escapeHtml(shortLabel(mode))}</button>`).join('')}
        </div>
        <div class="strategy-overlay-legend" data-overlay-legend>
          <div><b>${escapeHtml(OVERLAY_LABELS[this.overlayMode])}</b><span>Physical world view</span></div>
        </div>
      </section>
      <div class="strategy-mobile-camera-pad" data-wp6-mobile-camera aria-label="Camera controls">
        <button data-wp6-camera="rotate-left" aria-label="Rotate camera left">↶</button>
        <button data-wp6-camera="tilt-up" aria-label="Tilt camera up">↑</button>
        <button data-wp6-camera="rotate-right" aria-label="Rotate camera right">↷</button>
        <button data-wp6-camera="zoom-out" aria-label="Zoom out">−</button>
        <button data-wp6-camera="tilt-down" aria-label="Tilt camera down">↓</button>
        <button data-wp6-camera="zoom-in" aria-label="Zoom in">＋</button>
      </div>
      <div class="strategy-gesture-hint" data-wp6-gesture-hint>one finger pan · two fingers pinch, twist and tilt</div>
    `);
  }

  bindEvents() {
    super.bindEvents();
    this.screenEl.querySelectorAll('[data-overlay-mode]').forEach(button => button.addEventListener('click', () => {
      this.setOverlayMode(button.dataset.overlayMode);
      this.onOverlayMode(this.overlayMode);
    }));
    this.screenEl.querySelectorAll('[data-wp6-camera]').forEach(button => button.addEventListener('click', () => {
      this.callbacks.onCameraAction(button.dataset.wp6Camera);
    }));
  }

  setOverlayMode(mode) {
    this.overlayMode = normalizeOverlayMode(mode);
    this.screenEl?.querySelectorAll('[data-overlay-mode]').forEach(button => {
      const active = button.dataset.overlayMode === this.overlayMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (this.overlaySummary?.mode !== this.overlayMode) {
      this.setOverlaySummary({
        mode: this.overlayMode,
        label: OVERLAY_LABELS[this.overlayMode],
        summary: 'Updating overlay…',
        legend: []
      });
    }
  }

  setOverlaySummary(summary) {
    if (!summary) return;
    this.overlaySummary = summary;
    const host = this.screenEl?.querySelector('[data-overlay-legend]');
    if (!host) return;
    const legend = Array.isArray(summary.legend) ? summary.legend : [];
    host.innerHTML = `
      <div class="strategy-overlay-legend-head"><b>${escapeHtml(summary.label ?? OVERLAY_LABELS[this.overlayMode])}</b><span>${escapeHtml(summary.summary ?? '')}</span></div>
      ${legend.length ? `<div class="strategy-overlay-legend-items">${legend.map(item => `<span data-overlay-cue="${escapeHtml(item.kind ?? '')}"><i></i><b>${escapeHtml(item.label ?? '')}</b><em>${escapeHtml(item.cue ?? '')}</em></span>`).join('')}</div>` : ''}
    `;
  }

  setMobileSurface(surface) {
    super.setMobileSurface(surface);
    const hint = this.screenEl?.querySelector('[data-wp6-gesture-hint]');
    if (hint) hint.hidden = surface !== 'world';
  }
}

function shortLabel(mode) {
  if (mode === 'territory') return 'Territory';
  if (mode === 'population') return 'People';
  if (mode === 'path-intent') return 'Paths';
  return OVERLAY_LABELS[mode];
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
