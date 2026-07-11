// UI가 sim 내부 대신 사용하는 단일 런타임 진입점
// (docs/architecture/production-layering.md §4).

import {
  selectGlobalBar,
  selectAgentInspector,
  selectRoomInspector,
  selectSettlementInspector,
  selectPartyInspector,
  selectTimelineEvents,
  selectFactionList,
  selectPartyList,
  selectSettlementList,
  selectRoomList,
  selectFollowRoster,
  selectObserverFactionSummary,
  selectOverlayAvailability,
  selectTerritoryOverlay,
  selectSupplyOverlay,
  selectDangerOverlay
} from '../presentation/selectors/index.js';

const RUNTIME_METHODS = ['update', 'getSnapshot', 'dispatch', 'subscribe', 'destroy'];
const ALERT_SEVERITIES = new Set(['major', 'critical', 'historic']);

function selectSelection(state, context) {
  if (context.agentId) return { type: 'agent', id: context.agentId, inspector: selectAgentInspector(state, context.agentId) };
  if (context.partyId) return { type: 'party', id: context.partyId, inspector: selectPartyInspector(state, context.partyId) };
  if (context.roomId) return { type: 'room', id: context.roomId, inspector: selectRoomInspector(state, context.roomId) };
  if (context.settlementId) return { type: 'settlement', id: context.settlementId, inspector: selectSettlementInspector(state, context.settlementId) };
  return null;
}

function selectOverlay(state, mode) {
  if (mode === 'territory') return selectTerritoryOverlay(state);
  if (mode === 'supply') return selectSupplyOverlay(state);
  if (mode === 'danger') return selectDangerOverlay(state);
  return [];
}

export class GameRuntimeFacade {
  constructor({ runtime } = {}) {
    if (!runtime) throw new Error('GameRuntimeFacade requires a runtime adapter');
    for (const method of RUNTIME_METHODS) {
      if (typeof runtime[method] !== 'function') throw new Error(`runtime adapter is missing "${method}()"`);
    }
    this.runtime = runtime;
    this.destroyed = false;
  }

  update(dt) { if (!this.destroyed) this.runtime.update(dt); }
  getSnapshot() {
    if (this.destroyed) throw new Error('GameRuntimeFacade is destroyed');
    return this.runtime.getSnapshot();
  }
  dispatch(command) {
    if (this.destroyed) return { ok: false, error: 'game runtime is destroyed' };
    return this.runtime.dispatch(command);
  }
  subscribe(listener) {
    if (this.destroyed) throw new Error('GameRuntimeFacade is destroyed');
    return this.runtime.subscribe(listener);
  }

  getViewModel(context = {}) {
    const state = this.getSnapshot();
    const overlayMode = context.overlayMode ?? 'normal';
    return {
      topBar: selectGlobalBar(state),
      observerFaction: selectObserverFactionSummary(state, context.observerFactionId ?? null),
      navigator: {
        factions: selectFactionList(state),
        parties: selectPartyList(state),
        settlements: selectSettlementList(state),
        rooms: selectRoomList(state)
      },
      followRoster: selectFollowRoster(state),
      selection: selectSelection(state, context),
      timeline: selectTimelineEvents(state, {
        filter: context.timelineFilter ?? 'all',
        limit: context.timelineLimit ?? 50
      }),
      alerts: state.events.filter(event => ALERT_SEVERITIES.has(event.severity)),
      overlays: {
        active: overlayMode,
        availability: selectOverlayAvailability(state),
        rooms: selectOverlay(state, overlayMode)
      }
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.runtime.destroy();
  }
}
