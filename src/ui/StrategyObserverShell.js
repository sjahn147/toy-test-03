const NAV_TABS = ['factions', 'parties', 'settlements', 'rooms'];
const TIMELINE_FILTERS = ['all', 'combat', 'ecology', 'party', 'settlement', 'logistics', 'discovery', 'relationship', 'major'];

export class StrategyObserverShell {
  constructor({
    onPauseToggle = () => {},
    onSpeedChange = () => {},
    onBack = () => {},
    onSelect = () => {},
    onCameraMode = () => {},
    onCameraAction = () => {},
    onTimelineFilter = () => {},
    onTimelineEvent = () => {},
    onTogglePin = () => {},
    onAlertOpen = () => {}
  } = {}) {
    this.callbacks = { onPauseToggle, onSpeedChange, onBack, onSelect, onCameraMode, onCameraAction, onTimelineFilter, onTimelineEvent, onTogglePin, onAlertOpen };
    this.activeTab = 'factions';
    this.timelineFilter = 'all';
    this.navigatorQuery = '';
    this.mobileSurface = 'world';
    this.paused = false;
    this.speed = 1;
    this.mounted = false;
    this.pinnedEventIds = new Set();
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
    // 디자인 핸드오프(Route A)의 이머시브 데스크톱 레이아웃은 실사용 중 상태 관리 지연/버벅임과
    // 패널이 늘어져 못생겨지는 문제가 확인되어 중단하고 도킹 레이아웃으로 되돌렸다(2026-07-12).
    // 재검토 시 아래 줄의 주석을 해제하면 된다: screenEl.dataset.shellLayout = 'immersive';
    screenEl.innerHTML = '';
    screenEl.insertAdjacentHTML('beforeend', `
      <header class="strategy-topbar" data-strategy-topbar>
        <div class="strategy-clock-controls">
          <button class="strategy-icon-btn" data-shell-action="pause" aria-label="Pause simulation" aria-pressed="false">Ⅱ</button>
          <button class="strategy-speed is-active" data-shell-speed="1" aria-pressed="true">1×</button>
          <button class="strategy-speed" data-shell-speed="2" aria-pressed="false">2×</button>
          <button class="strategy-speed" data-shell-speed="4" aria-pressed="false">4×</button>
          <div class="strategy-time"><b data-shell-time>00:00</b><span data-shell-turn>turn 0</span></div>
        </div>
        <div class="strategy-faction-summary" data-shell-faction></div>
        <div class="strategy-top-actions">
          <button class="strategy-alert" data-shell-alerts aria-label="Open major alerts">0 alerts</button>
          <button class="strategy-icon-btn" data-shell-action="back" aria-label="Exit observation">×</button>
        </div>
      </header>
      <aside class="strategy-navigator" data-mobile-surface="navigator">
        <div class="strategy-panel-title"><span>World index</span><small data-shell-nav-count>observer</small></div>
        <nav class="strategy-tabs" aria-label="World index categories">
          ${NAV_TABS.map(tab => `<button data-shell-tab="${tab}" class="${tab === this.activeTab ? 'is-active' : ''}" aria-pressed="${tab === this.activeTab}">${tab}</button>`).join('')}
        </nav>
        <label class="strategy-nav-search">
          <span class="sr-only">Search world index</span>
          <input type="search" data-shell-nav-search placeholder="Search ${this.activeTab}" autocomplete="off">
          <kbd>/</kbd>
        </label>
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
          <div class="strategy-timeline-filters" role="group" aria-label="Chronicle filters">
            ${TIMELINE_FILTERS.map(filter => `<button data-shell-filter="${filter}" class="${filter === this.timelineFilter ? 'is-active' : ''}" aria-pressed="${filter === this.timelineFilter}">${filter}</button>`).join('')}
          </div>
        </div>
        <div class="strategy-pinned-events" data-shell-pinned hidden></div>
        <div class="strategy-timeline-list" data-shell-timeline aria-live="polite"></div>
      </footer>
      <nav class="strategy-mobile-nav" aria-label="Observer panels">
        <button data-mobile-target="navigator">Index</button>
        <button data-mobile-target="world" class="is-active">World</button>
        <button data-mobile-target="inspector">Inspect</button>
        <button data-mobile-target="timeline">Events</button>
      </nav>
      <div class="sr-only" aria-live="polite" data-shell-announcer></div>
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
        <button data-shell-camera="fixed" class="is-active" aria-pressed="true" title="Overview camera (R)">Overview</button>
        <button data-shell-camera="follow" aria-pressed="false" title="Follow selected (F)">Follow</button>
        <button data-shell-camera="free" aria-pressed="false" title="Free camera (drag or arrows to pan)">Free</button>
        <span class="strategy-camera-divider"></span>
        <button data-shell-camera-action="previous" aria-label="Previous follow target">‹</button>
        <button data-shell-camera-action="focus" title="Focus selection">Focus</button>
        <button data-shell-camera-action="next" aria-label="Next follow target">›</button>
      </div>
      <div class="strategy-world-title"><b data-shell-world-title>Dungeon ecosystem</b><span data-shell-camera-status>overview · drag or arrows to pan · scroll to zoom</span></div>
      <div class="strategy-shortcut-hint">F follow · R overview · WASD/arrows pan · Q/E rotate · Shift+W/S tilt · [ ] cycle · / search · Esc clear</div>
    `);
  }

  bindEvents() {
    this.screenEl.querySelector('[data-shell-action="pause"]')?.addEventListener('click', event => {
      this.paused = !this.paused;
      event.currentTarget.textContent = this.paused ? '▶' : 'Ⅱ';
      event.currentTarget.setAttribute('aria-pressed', String(this.paused));
      this.callbacks.onPauseToggle(this.paused);
    });
    this.screenEl.querySelector('[data-shell-action="back"]')?.addEventListener('click', this.callbacks.onBack);
    this.screenEl.querySelector('[data-shell-alerts]')?.addEventListener('click', () => {
      this.setTimelineFilter('major');
      this.setMobileSurface('timeline');
      this.callbacks.onAlertOpen();
    });
    this.screenEl.querySelectorAll('[data-shell-speed]').forEach(button => button.addEventListener('click', () => {
      this.speed = Number(button.dataset.shellSpeed) || 1;
      this.screenEl.querySelectorAll('[data-shell-speed]').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      this.callbacks.onSpeedChange(this.speed);
    }));
    this.screenEl.querySelectorAll('[data-shell-tab]').forEach(button => button.addEventListener('click', () => {
      this.activeTab = button.dataset.shellTab;
      this.navigatorQuery = '';
      const input = this.screenEl.querySelector('[data-shell-nav-search]');
      if (input) { input.value = ''; input.placeholder = `Search ${this.activeTab}`; }
      this.screenEl.querySelectorAll('[data-shell-tab]').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      this.renderNavigator(this.lastViewModel?.navigator ?? {});
    }));
    this.screenEl.querySelector('[data-shell-nav-search]')?.addEventListener('input', event => {
      this.navigatorQuery = event.currentTarget.value.trim().toLowerCase();
      this.renderNavigator(this.lastViewModel?.navigator ?? {});
    });
    this.screenEl.querySelectorAll('[data-shell-filter]').forEach(button => button.addEventListener('click', () => this.setTimelineFilter(button.dataset.shellFilter)));
    this.screenEl.querySelectorAll('[data-shell-camera]').forEach(button => button.addEventListener('click', () => {
      this.setCameraMode(button.dataset.shellCamera);
      this.callbacks.onCameraMode(button.dataset.shellCamera);
    }));
    this.screenEl.querySelectorAll('[data-shell-camera-action]').forEach(button => button.addEventListener('click', () => this.callbacks.onCameraAction(button.dataset.shellCameraAction)));
    this.screenEl.querySelectorAll('[data-mobile-target]').forEach(button => button.addEventListener('click', () => this.setMobileSurface(button.dataset.mobileTarget)));
    this.screenEl.querySelector('[data-shell-nav-list]')?.addEventListener('click', event => {
      const row = event.target.closest('[data-entity-id]');
      if (!row) return;
      this.callbacks.onSelect({ type: row.dataset.entityType, id: row.dataset.entityId, roomId: row.dataset.roomId || null });
      this.setMobileSurface('inspector');
    });
    const handleTimelineClick = event => {
      const pin = event.target.closest('[data-event-pin]');
      const row = event.target.closest('[data-event-id]');
      if (!row) return;
      if (pin) {
        event.stopPropagation();
        this.callbacks.onTogglePin(row.dataset.eventId);
        return;
      }
      this.callbacks.onTimelineEvent({
        id: row.dataset.eventId,
        roomId: row.dataset.roomId || null,
        actorId: row.dataset.actorId || null,
        targetId: row.dataset.targetId || null
      });
      this.setMobileSurface('world');
    };
    this.screenEl.querySelector('[data-shell-timeline]')?.addEventListener('click', handleTimelineClick);
    this.screenEl.querySelector('[data-shell-pinned]')?.addEventListener('click', handleTimelineClick);
  }

  setTimelineFilter(filter) {
    this.timelineFilter = filter;
    this.screenEl?.querySelectorAll('[data-shell-filter]').forEach(item => {
      const active = item.dataset.shellFilter === filter;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    this.callbacks.onTimelineFilter(filter);
  }

  focusNavigatorSearch() {
    this.setMobileSurface('navigator');
    this.screenEl?.querySelector('[data-shell-nav-search]')?.focus();
  }

  setCameraMode(mode) {
    this.screenEl?.querySelectorAll('[data-shell-camera]').forEach(item => {
      const active = item.dataset.shellCamera === mode;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    const status = mode === 'follow'
      ? 'follow · drag to orbit · idle to auto-orbit · scroll to zoom'
      : `${mode} · drag or arrows to pan · Q/E to rotate · scroll to zoom`;
    setText(this.screenEl, '[data-shell-camera-status]', status);
  }

  setMobileSurface(surface) {
    this.mobileSurface = surface;
    if (this.screenEl) this.screenEl.dataset.mobileSurface = surface;
    this.screenEl?.querySelectorAll('[data-mobile-target]').forEach(button => button.classList.toggle('is-active', button.dataset.mobileTarget === surface));
  }

  render(viewModel, { worldTitle = null, selectionType = 'none', selectionId = null, cameraMode = null, pinnedEventIds = [] } = {}) {
    if (!this.mounted || !viewModel) return;
    this.lastViewModel = viewModel;
    this.selectionType = selectionType;
    this.selectionId = selectionId;
    this.pinnedEventIds = new Set(pinnedEventIds);
    const top = viewModel.topBar ?? {};
    const time = Math.max(0, Math.floor(top.time ?? 0));
    setText(this.screenEl, '[data-shell-time]', `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`);
    setText(this.screenEl, '[data-shell-turn]', `turn ${top.turn ?? 0}`);
    const alertCount = viewModel.alerts?.length ?? 0;
    const alerts = this.screenEl.querySelector('[data-shell-alerts]');
    if (alerts) {
      alerts.textContent = `${alertCount} alert${alertCount === 1 ? '' : 's'}`;
      alerts.classList.toggle('has-critical', viewModel.alerts?.some(event => ['critical', 'historic'].includes(event.severity)) ?? false);
    }
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
    host.innerHTML = faction ? `<div><strong>${escapeHtml(faction.name)}</strong><span>observed faction</span></div><dl><div><dt>population</dt><dd>${faction.population}/${faction.capacity || '—'}</dd></div><div><dt>territory</dt><dd>${faction.territories}</dd></div><div><dt>settlements</dt><dd>${faction.settlements}</dd></div><div><dt>cargo</dt><dd>${faction.carriedCargo}</dd></div></dl>` : '<span class="strategy-empty">No faction data</span>';
  }

  renderNavigator(navigator) {
    const host = this.screenEl.querySelector('[data-shell-nav-list]');
    if (!host) return;
    const source = Array.isArray(navigator[this.activeTab]) ? navigator[this.activeTab] : [];
    const rows = this.navigatorQuery ? source.filter(row => searchableText(row).includes(this.navigatorQuery)) : source;
    setText(this.screenEl, '[data-shell-nav-count]', `${rows.length}/${source.length}`);
    host.innerHTML = rows.length ? rows.slice(0, 80).map(row => navigatorRow(this.activeTab, row, this.selectionType, this.selectionId)).join('') : `<div class="strategy-empty">No ${escapeHtml(this.activeTab)} match “${escapeHtml(this.navigatorQuery)}”.</div>`;
  }

  renderTimeline(events) {
    const host = this.screenEl.querySelector('[data-shell-timeline]');
    const pinnedHost = this.screenEl.querySelector('[data-shell-pinned]');
    if (!host || !pinnedHost) return;
    const newest = [...events].reverse();
    const pinned = newest.filter(event => this.pinnedEventIds.has(String(event.id)));
    pinnedHost.hidden = pinned.length === 0;
    pinnedHost.innerHTML = pinned.length ? `<strong>Pinned</strong>${pinned.map(event => eventMarkup(event, true)).join('')}` : '';
    host.innerHTML = newest.length ? newest.slice(0, 40).map(event => eventMarkup(event, this.pinnedEventIds.has(String(event.id)))).join('') : '<div class="strategy-empty">The chronicle is quiet.</div>';
  }

  announce(message) { setText(this.screenEl, '[data-shell-announcer]', message); }

  destroy() {
    this.mounted = false;
    this.lastViewModel = null;
    this.pinnedEventIds.clear();
  }
}

function navigatorRow(tab, row, selectionType, selectionId) {
  if (tab === 'factions') return rowMarkup('faction', row.id, row.name, `${row.population} population · ${row.territories} rooms`, row.threatened ? `${row.threatened} threatened` : 'stable', null, selectionType, selectionId);
  if (tab === 'parties') return rowMarkup('party', row.id, row.name, `${row.memberCount} members · ${row.state}`, row.leaderName ?? 'no leader', row.targetRoomId, selectionType, selectionId);
  if (tab === 'settlements') return rowMarkup('settlement', row.id, row.name, `${row.population}/${row.capacity} · ${row.state}`, row.supplyStatus, row.roomId, selectionType, selectionId);
  return rowMarkup('room', row.id, row.name, `${row.kind} · ${row.occupantCount} occupants`, row.secret ? 'secret' : row.visited ? 'discovered' : 'unseen', row.id, selectionType, selectionId);
}

function rowMarkup(type, id, title, detail, meta, roomId, selectionType, selectionId) {
  const selected = type === selectionType && String(id) === String(selectionId);
  return `<button class="strategy-nav-row${selected ? ' is-selected' : ''}" data-entity-type="${escapeHtml(type)}" data-entity-id="${escapeHtml(id)}" ${roomId ? `data-room-id="${escapeHtml(roomId)}"` : ''} aria-current="${selected ? 'true' : 'false'}"><span><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></span><em>${escapeHtml(meta ?? '')}</em></button>`;
}

function eventMarkup(event, pinned) {
  const severity = event.severity ?? 'ambient';
  const focusable = event.roomId || event.actorId || event.targetId;
  return `<article class="strategy-event severity-${escapeHtml(severity)}${focusable ? ' is-focusable' : ''}" data-event-id="${escapeHtml(event.id)}" ${event.roomId ? `data-room-id="${escapeHtml(event.roomId)}"` : ''} ${event.actorId ? `data-actor-id="${escapeHtml(event.actorId)}"` : ''} ${event.targetId ? `data-target-id="${escapeHtml(event.targetId)}"` : ''} tabindex="0"><time>${formatEventTime(event.time)}</time><span>${escapeHtml((event.type ?? 'event').split('.')[0])}</span><button class="strategy-event-pin${pinned ? ' is-pinned' : ''}" data-event-pin aria-label="${pinned ? 'Unpin' : 'Pin'} event" aria-pressed="${pinned}">◆</button><p>${escapeHtml(event.text || 'World state changed.')}</p></article>`;
}

function searchableText(row) { return Object.values(row ?? {}).filter(value => ['string', 'number'].includes(typeof value)).join(' ').toLowerCase(); }
function setText(root, selector, value) { const target = root?.querySelector(selector); if (target) target.textContent = value; }
function formatEventTime(value) { const time = Math.max(0, Math.floor(value ?? 0)); return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`; }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
