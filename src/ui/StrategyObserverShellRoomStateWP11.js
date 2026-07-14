import { StrategyObserverShellCameraPhase10 } from './StrategyObserverShellCameraPhase10.js';

const MODES = Object.freeze(['world', 'control', 'population', 'supply', 'danger', 'resources', 'activity']);
const LABELS = Object.freeze({
  en: { world: 'World', control: 'Control', population: 'Population', supply: 'Supply', danger: 'Danger', resources: 'Resources', activity: 'Activity' },
  ko: { world: '월드', control: '점령', population: '인구', supply: '보급', danger: '위험', resources: '자원', activity: '활동' }
});

export class StrategyObserverShellRoomStateWP11 extends StrategyObserverShellCameraPhase10 {
  constructor(options = {}) {
    const { onRoomOverlayMode = () => {}, ...baseOptions } = options;
    super(baseOptions);
    this.onRoomOverlayMode = onRoomOverlayMode;
    this.roomOverlayMode = 'world';
  }

  installViewportControls() {
    super.installViewportControls();
    this.viewport.querySelector('[data-wp6-overlay-panel]')?.remove();
    this.viewport.querySelector('.strategy-overlay-panel')?.remove();
    this.viewport.insertAdjacentHTML('beforeend', `
      <section class="wp11-overlay-toolbar" data-wp11-overlay-toolbar aria-label="Strategic overlays">
        <div class="wp11-overlay-buttons" role="group" aria-label="Strategic overlay mode">
          ${MODES.map(mode => `<button data-room-overlay="${mode}" class="${mode === this.roomOverlayMode ? 'is-active' : ''}" aria-pressed="${mode === this.roomOverlayMode}">${LABELS.en[mode]}</button>`).join('')}
        </div>
        <div class="wp11-overlay-legend" data-wp11-overlay-legend><b>World</b><span>Room control, population and urgent conditions remain visible.</span></div>
      </section>`);
  }

  bindEvents() {
    super.bindEvents();
    this.screenEl?.querySelectorAll('[data-room-overlay]').forEach(button => button.addEventListener('click', () => {
      this.setRoomOverlayMode(button.dataset.roomOverlay);
      this.onRoomOverlayMode(this.roomOverlayMode);
    }));
  }

  setRoomOverlayMode(mode) {
    this.roomOverlayMode = MODES.includes(mode) ? mode : 'world';
    this.screenEl?.querySelectorAll('[data-room-overlay]').forEach(button => {
      const active = button.dataset.roomOverlay === this.roomOverlayMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const locale = this.timelineLocale === 'ko' ? 'ko' : 'en';
    const legend = this.screenEl?.querySelector('[data-wp11-overlay-legend]');
    if (legend) {
      const copy = overlayLegend(this.roomOverlayMode, locale);
      legend.innerHTML = `<b>${escapeHtml(LABELS[locale][this.roomOverlayMode])}</b><span>${escapeHtml(copy)}</span>`;
    }
    if (this.screenEl) this.screenEl.dataset.roomOverlay = this.roomOverlayMode;
    return this.roomOverlayMode;
  }

  setTimelineLocale(locale) {
    super.setTimelineLocale?.(locale);
    const normalized = locale === 'ko' ? 'ko' : 'en';
    this.screenEl?.querySelectorAll('[data-room-overlay]').forEach(button => {
      button.textContent = LABELS[normalized][button.dataset.roomOverlay] ?? button.dataset.roomOverlay;
    });
    this.setRoomOverlayMode(this.roomOverlayMode);
  }

  render(viewModel, options = {}) {
    super.render(viewModel, options);
    const availability = viewModel?.overlays?.availability ?? {};
    this.screenEl?.querySelectorAll('[data-room-overlay]').forEach(button => {
      const available = availability[button.dataset.roomOverlay] !== false;
      button.disabled = !available;
      button.title = available ? '' : 'No data is currently available for this overlay.';
    });
  }
}

function overlayLegend(mode, locale) {
  const ko = locale === 'ko';
  const values = {
    world: ko ? '점령, 인구와 긴급 상태를 기본 정보로 유지합니다.' : 'Room control, population and urgent conditions remain visible.',
    control: ko ? '세력별 점령도, 도전자와 점령 추세를 강조합니다.' : 'Emphasizes owners, challengers and the direction of control.',
    population: ko ? '현재 인구, 수용력, 과밀과 증식 압력을 강조합니다.' : 'Emphasizes current population, capacity, crowding and growth pressure.',
    supply: ko ? '보급 효율, 수송 화물과 봉쇄를 강조합니다.' : 'Emphasizes supply efficiency, cargo movement and blockades.',
    danger: ko ? '교전, 공성, 감염과 환경 위험을 강조합니다.' : 'Emphasizes combat, sieges, infection and environmental hazards.',
    resources: ko ? '방과 정착지에 축적된 주요 자원을 표시합니다.' : 'Shows significant resources stored in rooms and settlements.',
    activity: ko ? '건설, 현장 작업과 영웅 활동을 표시합니다.' : 'Shows construction, field work and hero activity.'
  };
  return values[mode] ?? values.world;
}
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
