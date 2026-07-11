const NAV_TABS = ['factions', 'parties', 'settlements', 'rooms'];
const TIMELINE_FILTERS = ['all', 'combat', 'ecology', 'party', 'settlement', 'logistics', 'discovery'];

export class StrategyObserverShell {
  constructor({
    onPauseToggle = () => {},
    onSpeedChange = () => {},
    onBack = () => {},
    onSelect = () => {},
    onCameraMode = () => {},
    onCameraAction = () => {},
    onTimelineFilter = () => {}
  } = {}) {
    this.callbacks = { onPauseToggle, onSpeedChange, onBack, onSelect, onCameraMode, onCameraAction, onTimelineFilter };
    this.activeTab = 'factions';
    this.timelineFilter = 'all';
    this.mobileSurface = 'world';
    this.paused = false;
    this.speed = 1;
    this.mounted = false;
  }

  mount({ screenEl, viewport, inspectEl }) {
    if (!screenEl || !viewport || !inspectEl) throw new Error('StrategyObserverShell requires screen, viewport and inspector elements');
    this.screenEl = screenEl;
    this.viewport = viewport;
    this.inspectEl = inspectEl;

    const legacyHud = screenEl.querySelector('.hud');
    viewport.querySelector('.legend')?.remove();
    viewport.querySelector('[data-camera-strip]')?.remove();
    legacyHud?.remove();

    screenEl.classList.add('strategy-observer');
    screenEl.innerHTML = '';
    screenEl.insertAdjacentHTML('beforeend', `
      <header class="strategy-topbar" data-strategy-topbar>
        <div class="strategy-clock-controls">
          <button class="strategy-icon-btn" data-shell-action="pause" aria-label="Pause simulation">Ⅱ</button>
          <button class="strategy-speed is-active" data-shell-speed="1">1×</button>
          <button class="strategy-speed" data-shell-speed="2">2×</button>
          <button class="strategy-speed" data-shell-speed="4">4×</button>
          <div class="strategy-time"><b data-shell-time>00:00</b><span data-shell-turn>turn 0</span></div>
        </div>
        <div class="strategy-faction-summary" data-shell-faction></div>
        <div class="strategy-top-actions">
          <button class="strategy-alert" data-shell-alerts>0 alerts</button>
          <button class="strategy-icon-btn" data-shell-action="back" aria-label="Exit observation">×</button>
        </div>
      </header>
      <aside class="strategy-navigator" data-mobile-surface="navigator">
        <div class="strategy-panel-title"><span>World index</span><small>observer</small></div>
        <nav class="strategy-tabs">
          ${NAV_TABS.map(tab => `<button data-shell-tab="${tab}" class="${tab === this.activeTab ? 'is-active' : ''}">${tab}</button>`).join('')}
        </nav>
        <div class="strategy-nav-list" data-shell-nav-list></div>
      </aside>
      <main class="strategy-viewport" data-shell-viewport data-mobile-surface="world"></main>
      <aside class="strategy-inspector" data-mobile-surface="inspector">
        <div class="strategy-panel-title"><span>Context inspector</span><small data-shell-selection-type>none</small></div>
        <div class="strategy-inspector-scroll" data-shell-inspector></div>
      </aside>
      <footer class="strategy-timeline" data-mobile-surface="timeline">
        <div class="strategy-timeline-tools">
          <strong>Chronicle</strong>
          <div class="strategy-timeline-filters">
            ${TIMELINE_FILTERS.map(filter => `<button data-shell-filter="${filter}" class="${filter === this.timelineFilter ? 'is-active' : ''}">${filter}</button>`).join('')}
          </div>
        </div>
        <div class="strategy-timeline-list" data-shell-timeline></div>
      </footer>
      <nav class="strategy-mobile-nav" aria-label="Observer panels">
        <button data-mobile-target="navigator">Index</button>
        <button data-mobile-target="world" class="is-active">World</button>
        <button data-mobile-target="inspector">Inspect</button>
        <button data-mobile-target="timeline">Events</button>
      </nav>
    `);

    this.viewportHost = screenEl.querySelector('[data-shell-viewport]');
    this.inspectorHost = screenEl.querySelector('[data-shell-inspector]');
    this.viewportHost.appendChild(viewport);
    this.inspectorHost.appendChild(inspectEl);
    this.installViewportControls();
    this.bindEvents();
    this.setMobileSurface('world');
    this.mounted = true;
  }

  installViewportControls() {
    this.viewport.insertAdjacentHTML('beforeend', `
      <div class="strategy-camera-controls" aria-label="Camera controls">
        <button data-shell-camera="fixed" class="is-active" title="Overview camera (R)">Overview</button>
        <button data-shell-camera="follow" title="Follow selected (F)">Follow</button>
        <button data-shell-camera="free" title="Keep current target">Free</button>
        <span class="strategy-camera-divider"></span>
        <button data-shell-camera-action="previous" aria-label="Previous follow target">‹</button>
        <button data-shell-camera-action="focus" title="Focus selection">Focus</button>
        <button data-shell-camera-action="next" aria-label="Next follow target">›</button>
      </div>
      <div class="strategy-world-title"><b data-shell-world-title>Dungeon ecosystem</b><span data-shell-camera-status>overview · scroll to zoom</span></div>
      <div class="strategy-shortcut-hint">F follow · R overview · [ ] cycle · Esc clear</div>
    `);
  }

  bindEvents() {
    this.screenEl.querySelector('[data-shell-action="pause"]')?.addEventListener('click', event => {
      this.paused = !this.paused;
      event.currentTarget.textContent = this.paused ? '▶' : 'Ⅱ';
      this.callbacks.onPauseToggle(this.paused);
    });
    this.screenEl.querySelector('[data-shell-action="back"]')?.addEventListener('click', this.callbacks.onBack);
    this.screenEl.querySelectorAll('[data-shell-speed]').forEach(button => button.addEventListener('click', () => {
      this.speed = Number(button.dataset.shellSpeed) || 1;
      this.screenEl.querySelectorAll('[data-shell-speed]').forEach(item => item.classList.toggle('is-active', item === button));
      this.callbacks.onSpeedChange(this.speed);
    }));
    this.screenEl.querySelectorAll('[data-shell-tab]').forEach(button => button.addEventListener('click', () => {
      this.activeTab = button.dataset.shellTab;
      this.screenEl.querySelectorAll('[data-shell-tab]').forEach(item => item.classList.toggle('is-active', item === button));
      this.renderNavigator(this.lastViewModel?.navigator ?? {});
    }));
    this.screenEl.querySelectorAll('[data-shell-filter]').forEach(button => button.addEventListener('click', () => {
      this.timelineFilter = button.dataset.shellFilter;
      this.screenEl.querySelectorAll('[data-shell-filter]').forEach(item => item.classList.toggle('is-active', item === button));
      this.callbacks.onTimelineFilter(this.timelineFilter);
    }));
    this.screenEl.querySelectorAll('[data-shell-camera]').forEach(button => button.addEventListener('click', () => {
      this.setCameraMode(button.dataset.shellCamera);
      this.callbacks.onCameraMode(button.dataset.shellCamera);
    }));
    this.screenEl.querySelectorAll('[data-shell-camera-action]').forEach(button => button.addEventListener('click', () => {
      this.callbacks.onCameraAction(button.dataset.shellCameraAction);
    }));
    this.screenEl.querySelectorAll('[data-mobile-target]').forEach(button => button.addEventListener('click', () => {
      this.setMobileSurface(button.dataset.mobileTarget);
    }));
    this.screenEl.querySelector('[data-shell-nav-list]')?.addEventListener('click', event => {
      const row = event.target.closest('[data-entity-id]');
      if (!row) return;
      this.callbacks.onSelect({ type: row.dataset.entityType, id: row.dataset.entityId, roomId: row.dataset.roomId || null });
      this.setMobileSurface('inspector');
    });
    this.screenEl.querySelector('[data-shell-timeline]')?.addEventListener('click', event => {
      const row = event.target.closest('[data-room-id]');
      if (row?.dataset.roomId) {
        this.callbacks.onSelect({ type: 'room', id: row.dataset.roomId, roomId: row.dataset.roomId });
        this.setMobileSurface('world');
      }
    });
  }

  setCameraMode(mode) {
    this.screenEl?.querySelectorAll('[data-shell-camera]').forEach(item => item.classList.toggle('is-active', item.dataset.shellCamera === mode));
    setText(this.screenEl, '[data-shell-camera-status]', `${mode} · scroll to zoom`);
  }

  setMobileSurface(surface) {
    this.mobileSurface = surface;
    if (this.screenEl) this.screenEl.dataset.mobileSurface = surface;
    this.screenEl?.querySelectorAll('[data-mobile-target]').forEach(button => button.classList.toggle('is-active', button.dataset.mobileTarget === surface));
  }

  render(viewModel, { worldTitle = null, selectionType = 'none', cameraMode = null } = {}) {
    if (!this.mounted || !viewModel) return;
    this.lastViewModel = viewModel;
    const top = viewModel.topBar ?? {};
    const time = Math.max(0, Math.floor(top.time ?? 0));
    const hours = String(Math.floor(time / 60)).padStart(2, '0');
    const minutes = String(time % 60).padStart(2, '0');
    setText(this.screenEl, '[data-shell-time]', `${hours}:${minutes}`);
    setText(this.screenEl, '[data-shell-turn]', `turn ${top.turn ?? 0}`);
    setText(this.screenEl, '[data-shell-alerts]', `${viewModel.alerts?.length ?? 0} alerts`);
    setText(this.screenEl, '[data-shell-selection-type]', selectionType);
    if (worldTitle) setText(this.screenEl, '[data-shell-world-title]', worldTitle);
    if (cameraMode) this.setCameraMode(cameraMode);
    this.renderFaction(viewModel.observerFaction);
    this.renderNavigator(viewModel.navigator ?? {});
    this.renderTimeline(viewModel.timeline ?? []);
  }

  renderFaction(faction) {
    const host = this.screenEl.querySelector('[data-shell-faction]');
    if (!host) return;
    host.innerHTML = faction ? `
      <div><strong>${escapeHtml(faction.name)}</strong><span>observed faction</span></div>
      <dl>
        <div><dt>population</dt><dd>${faction.population}/${faction.capacity || '—'}</dd></div>
        <div><dt>territory</dt><dd>${faction.territories}</dd></div>
        <div><dt>settlements</dt><dd>${faction.settlements}</dd></div>
        <div><dt>cargo</dt><dd>${faction.carriedCargo}</dd></div>
      </dl>
    ` : '<span class="strategy-empty">No faction data</span>';
  }

  renderNavigator(navigator) {
    const host = this.screenEl.querySelector('[data-shell-nav-list]');
    if (!host) return;
    const rows = Array.isArray(navigator[this.activeTab]) ? navigator[this.activeTab] : [];
    host.innerHTML = rows.length ? rows.slice(0, 80).map(row => navigatorRow(this.activeTab, row)).join('') : '<div class="strategy-empty">No records</div>';
  }

  renderTimeline(events) {
    const host = this.screenEl.querySelector('[data-shell-timeline]');
    if (!host) return;
    host.innerHTML = events.length ? [...events].reverse().slice(0, 30).map(event => `
      <button class="strategy-event severity-${escapeHtml(event.severity)}" ${event.roomId ? `data-room-id="${escapeHtml(event.roomId)}"` : ''}>
        <time>${formatEventTime(event.time)}</time><span>${escapeHtml((event.type ?? 'event').split('.')[0])}</span><p>${escapeHtml(event.text || 'World state changed.')}</p>
      </button>
    `).join('') : '<div class="strategy-empty">The chronicle is quiet.</div>';
  }

  destroy() {
    this.mounted = false;
    this.lastViewModel = null;
  }
}

function navigatorRow(tab, row) {
  if (tab === 'factions') return rowMarkup('faction', row.id, row.name, `${row.population} population · ${row.territories} rooms`, row.threatened ? `${row.threatened} threatened` : 'stable');
  if (tab === 'parties') return rowMarkup('party', row.id, row.name, `${row.memberCount} members · ${row.state}`, row.leaderName ?? 'no leader', row.targetRoomId);
  if (tab === 'settlements') return rowMarkup('settlement', row.id, row.name, `${row.population}/${row.capacity} · ${row.state}`, row.supplyStatus, row.roomId);
  return rowMarkup('room', row.id, row.name, `${row.kind} · ${row.occupantCount} occupants`, row.secret ? 'secret' : row.visited ? 'discovered' : 'unseen', row.id);
}

function rowMarkup(type, id, title, detail, meta, roomId = null) {
  return `<button class="strategy-nav-row" data-entity-type="${escapeHtml(type)}" data-entity-id="${escapeHtml(id)}" ${roomId ? `data-room-id="${escapeHtml(roomId)}"` : ''}><span><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></span><em>${escapeHtml(meta ?? '')}</em></button>`;
}

function setText(root, selector, value) {
  const target = root?.querySelector(selector);
  if (target) target.textContent = value;
}

function formatEventTime(value) {
  const time = Math.max(0, Math.floor(value ?? 0));
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
