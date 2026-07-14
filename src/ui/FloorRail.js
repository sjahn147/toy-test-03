export class FloorRail {
  constructor({ root, floors = [], activeFloorId = null, onSelect = () => {}, onPreviewConnector = () => {} } = {}) {
    if (!root) throw new Error('FloorRail requires a root element');
    this.host = root;
    this.floors = floors;
    this.activeFloorId = activeFloorId ?? floors[0]?.id ?? 'F0';
    this.onSelect = onSelect;
    this.onPreviewConnector = onPreviewConnector;
    this.summary = new Map();
    this.mount();
  }

  mount() {
    this.el = document.createElement('nav');
    this.el.className = 'wp13-floor-rail';
    this.el.setAttribute('aria-label', 'Dungeon floors');
    this.el.addEventListener('click', event => {
      const button = event.target.closest?.('[data-floor-id]');
      if (button) this.onSelect(button.dataset.floorId);
    });
    this.host.appendChild(this.el);
    this.render();
  }

  setActiveFloor(floorId) { this.activeFloorId = floorId; this.render(); }
  setSummary(summary = new Map()) { this.summary = summary instanceof Map ? summary : new Map(Object.entries(summary)); this.render(); }

  render() {
    if (!this.el) return;
    this.el.innerHTML = this.floors.map(floor => {
      const state = this.summary.get(floor.id) ?? {};
      const name = localizedName(floor.name);
      const locked = state.locked === true;
      return `<button type="button" data-floor-id="${escapeHtml(floor.id)}" class="wp13-floor-button${floor.id === this.activeFloorId ? ' is-active' : ''}${locked ? ' is-locked' : ''}" aria-pressed="${floor.id === this.activeFloorId}" ${locked ? 'aria-label="Locked floor"' : ''}>
        <span class="wp13-floor-code">${escapeHtml(floor.id)}</span>
        <span class="wp13-floor-copy"><b>${escapeHtml(name)}</b><small>${state.rooms ?? floor.roomIds?.length ?? 0} rooms · ${state.population ?? 0} pop · ${state.connectorActive ?? 0}/${state.connectorTotal ?? 0} lifts</small></span>
        <span class="wp13-floor-alerts" aria-label="${state.alerts ?? 0} alerts">${state.alerts ?? 0}</span>
        ${state.selected ? '<i class="wp13-floor-selected" title="Selected entity">◆</i>' : ''}
      </button>`;
    }).join('');
  }

  destroy() { this.el?.remove(); this.el = null; }
}

export function summarizeFloors({ floors = [], roomStates = {}, agents = [], connectors = [], selection = null } = {}) {
  const roomFloor = new Map();
  for (const floor of floors) for (const roomId of floor.roomIds ?? []) roomFloor.set(roomId, floor.id);
  const summary = new Map(floors.map(floor => [floor.id, { rooms:floor.roomIds?.length ?? 0, population:0, alerts:0, contested:0, locked:false, selected:false, connectorActive:0, connectorTotal:0, connectorBlocked:0 }]));
  for (const state of Object.values(roomStates ?? {})) {
    const floorId = state.floorId ?? roomFloor.get(state.roomId);
    const target = summary.get(floorId); if (!target) continue;
    target.population += state.population?.current ?? 0;
    if (state.ownership?.contested) target.contested += 1;
    if ((state.presentation?.severity ?? 0) >= 3 || state.ownership?.contested || (state.danger?.score ?? 0) >= 0.72) target.alerts += 1;
  }
  for (const agent of agents ?? []) {
    if (!agent.alive || agent.hidden || agent.departed || agent.travel) continue;
    const target = summary.get(roomFloor.get(agent.roomId));
    if (target && !(roomStates?.[agent.roomId]?.population)) target.population += 1;
  }
  const selectedRoomId = resolveSelectionRoom(selection, agents);
  if (selectedRoomId) { const floorId = roomFloor.get(selectedRoomId); if (summary.has(floorId)) summary.get(floorId).selected = true; }
  const accessible = new Set(['F0']);
  for (const connector of connectors ?? []) {
    const active = ['open','working'].includes(connector.state);
    for (const floorId of [connector.from?.floorId, connector.to?.floorId]) {
      const target = summary.get(floorId);
      if (!target) continue;
      target.connectorTotal += 1;
      if (active) target.connectorActive += 1;
      else target.connectorBlocked += 1;
    }
    if (active) { accessible.add(connector.from.floorId); accessible.add(connector.to.floorId); }
  }
  for (const floor of floors) summary.get(floor.id).locked = floor.id !== 'F0' && !accessible.has(floor.id);
  return summary;
}
function resolveSelectionRoom(selection, agents) { if (!selection) return null; if (selection.type === 'room') return selection.id; if (selection.type === 'agent') return agents.find(agent => String(agent.id) === String(selection.id))?.roomId ?? null; return selection.roomId ?? selection.worldTarget?.roomId ?? null; }
function localizedName(name) { if (typeof name === 'string') return name; return name?.ko ?? name?.en ?? ''; }
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
