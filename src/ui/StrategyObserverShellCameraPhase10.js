import { StrategyObserverShellWP6 } from './StrategyObserverShellWP6.js';

export class StrategyObserverShellCameraPhase10 extends StrategyObserverShellWP6 {
  constructor(options = {}) {
    const { onCameraSettings = () => {}, ...baseOptions } = options;
    super(baseOptions);
    this.onCameraSettings = onCameraSettings;
    this.cameraState = { mode: 'free', label: null };
    this.cameraSettings = null;
  }

  installViewportControls() {
    super.installViewportControls();
    this.viewport.querySelector('.strategy-camera-controls')?.remove();
    this.viewport.querySelector('.strategy-world-title')?.remove();
    this.viewport.querySelector('.strategy-shortcut-hint')?.remove();
    this.viewport.querySelector('[data-wp6-mobile-camera]')?.remove();
    this.viewport.querySelector('[data-wp6-gesture-hint]')?.remove();
    this.viewport.insertAdjacentHTML('beforeend', `
      <div class="strategy-camera-controls strategy-camera-controls-v10" aria-label="Strategy camera controls">
        <button data-shell-camera="free" class="is-active" aria-pressed="true" title="Free camera (F)">Free</button>
        <button data-shell-camera="focus" aria-pressed="false" title="Focus selected unit or object (F)">Focus</button>
        <span class="strategy-camera-divider"></span>
        <button data-shell-camera-action="previous" aria-label="Previous unit (Left arrow)">‹</button>
        <button data-shell-camera-action="frame" title="Frame selection (Home)">Frame</button>
        <button data-shell-camera-action="next" aria-label="Next unit (Right arrow)">›</button>
        <details class="strategy-camera-settings" data-camera-settings>
          <summary aria-label="Camera settings">⚙</summary>
          <div class="strategy-camera-settings-panel">
            <label><span>Rotate</span><input data-camera-setting="rotateSensitivity" type="range" min="0.45" max="2.2" step="0.05" value="1"></label>
            <label><span>Pan</span><input data-camera-setting="panSensitivity" type="range" min="0.45" max="2.2" step="0.05" value="1"></label>
            <label><span>Zoom</span><input data-camera-setting="zoomSensitivity" type="range" min="0.45" max="2.2" step="0.05" value="1"></label>
            <label class="strategy-camera-check"><input data-camera-setting="invertY" type="checkbox"><span>Invert vertical orbit</span></label>
            <label class="strategy-camera-check"><input data-camera-setting="edgeScroll" type="checkbox"><span>Edge scrolling</span></label>
            <label class="strategy-camera-check"><input data-camera-setting="reducedMotion" type="checkbox"><span>Reduced motion</span></label>
          </div>
        </details>
      </div>
      <div class="strategy-camera-status" data-camera-status>
        <b data-camera-mode-label>FREE</b><span data-camera-target-label>WASD move · LMB orbit · RMB pan · MMB/wheel zoom · F focus</span>
      </div>
      <div class="strategy-world-title"><b data-shell-world-title>Dungeon ecosystem</b><span>right drag or WASD to move · scroll to zoom toward cursor</span></div>
      <div class="strategy-shortcut-hint">F focus/free · ← → units · Shift+← → heroes · Home frame · Q/E rotate · / search</div>
    `);
  }

  bindEvents() {
    super.bindEvents();
    const navigator = this.screenEl.querySelector('[data-shell-nav-list]');
    navigator?.addEventListener('dblclick', event => {
      const row = event.target.closest('[data-entity-id]');
      if (!row) return;
      event.preventDefault();
      this.callbacks.onSelect({
        type: row.dataset.entityType,
        id: row.dataset.entityId,
        roomId: row.dataset.roomId || null,
        cameraIntent: 'focus'
      });
      this.setMobileSurface('world');
    });
    this.screenEl.querySelectorAll('[data-camera-setting]').forEach(input => {
      input.addEventListener('input', () => this.emitCameraSettings());
      input.addEventListener('change', () => this.emitCameraSettings());
    });
  }

  emitCameraSettings() {
    const values = {};
    this.screenEl?.querySelectorAll('[data-camera-setting]').forEach(input => {
      values[input.dataset.cameraSetting] = input.type === 'checkbox' ? input.checked : Number(input.value);
    });
    this.cameraSettings = values;
    this.onCameraSettings(values);
  }

  setCameraSettings(settings = {}) {
    this.cameraSettings = { ...settings };
    this.screenEl?.querySelectorAll('[data-camera-setting]').forEach(input => {
      const value = settings[input.dataset.cameraSetting];
      if (value === undefined) return;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = String(value);
    });
  }

  setCameraMode(mode) {
    const normalized = mode === 'focus' || mode === 'follow' ? 'focus' : 'free';
    this.setCameraState({ ...this.cameraState, mode: normalized });
  }

  setCameraState(state = {}) {
    this.cameraState = { ...this.cameraState, ...state };
    const mode = this.cameraState.mode === 'focus' ? 'focus' : 'free';
    this.screenEl?.querySelectorAll('[data-shell-camera]').forEach(button => {
      const active = button.dataset.shellCamera === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const locale = this.timelineLocale ?? 'en';
    const korean = locale === 'ko';
    const bilingual = locale === 'bilingual';
    const modeLabel = mode === 'focus'
      ? korean ? '추적' : bilingual ? '추적 · FOCUS' : 'FOCUS'
      : korean ? '자유' : bilingual ? '자유 · FREE' : 'FREE';
    const hint = mode === 'focus'
      ? `${this.cameraState.label ?? (korean ? '선택 대상' : 'selection')} · ${korean ? '←/→ 대상 전환 · F 자유 카메라' : '←/→ switch unit · F free camera'}`
      : korean
        ? 'WASD 이동 · 왼쪽 회전 · 오른쪽 이동 · 가운데/휠 확대 · F 추적'
        : 'WASD move · LMB orbit · RMB pan · MMB/wheel zoom · F focus';
    setText(this.screenEl, '[data-camera-mode-label]', modeLabel);
    setText(this.screenEl, '[data-camera-target-label]', hint);
    if (this.screenEl) this.screenEl.dataset.cameraMode = mode;
  }

  setTimelineLocale(locale) {
    super.setTimelineLocale(locale);
    this.setCameraState(this.cameraState);
  }
}

function setText(root, selector, value) {
  const target = root?.querySelector(selector);
  if (target) target.textContent = value;
}
