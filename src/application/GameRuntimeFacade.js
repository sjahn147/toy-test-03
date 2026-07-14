import { selectRoomStateMap } from '../presentation/selectors/selectRoomStateMap.js';
import { selectOverlayAvailability } from '../presentation/selectors/selectOverlayAvailability.js';
// UI-facing runtime facade.

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
  selectFactionInspector,
  selectWorldInteractionInspector
} from '../presentation/selectors/index.js';

const RUNTIME_METHODS = ['update', 'getSnapshot', 'dispatch', 'subscribe', 'destroy'];
const ALERT_SEVERITIES = new Set(['major', 'critical', 'historic']);

function selectSelection(state, context, roomStates = null) {
  if (context.agentId) return { type: 'agent', id: context.agentId, inspector: selectAgentInspector(state, context.agentId) };
  if (context.partyId) return { type: 'party', id: context.partyId, inspector: selectPartyInspector(state, context.partyId) };
  if (context.roomId) return { type: 'room', id: context.roomId, inspector: selectRoomInspector(state, context.roomId, roomStates) };
  if (context.settlementId) return { type: 'settlement', id: context.settlementId, inspector: selectSettlementInspector(state, context.settlementId) };
  if (context.factionId) return { type: 'faction', id: context.factionId, inspector: selectFactionInspector(state, context.factionId) };
  if (context.worldTarget) {
    const inspector = selectWorldInteractionInspector(state, context.worldTarget);
    return inspector ? { type: context.worldTarget.type, id: context.worldTarget.id, inspector } : null;
  }
  return null;
}

export class GameRuntimeFacade {
  constructor({ runtime } = {}) {
    if (!runtime) throw new Error('GameRuntimeFacade requires a runtime adapter');
    for (const method of RUNTIME_METHODS) {
      if (typeof runtime[method] !== 'function') throw new Error(`runtime adapter is missing "${method}()"`);
    }
    this.runtime = runtime;
    this.destroyed = false;
    this.previousRoomStates = {};
  }

  update(dt) {
    if (!this.destroyed) this.runtime.update(dt);
  }

  getSnapshot() {
    if (this.destroyed) throw new Error('GameRuntimeFacade is destroyed');
    return this.runtime.getSnapshot();
  }

  dispatch(command) {
    if (this.destroyed) return { ok: false, error: 'game runtime is destroyed' };
    return this.runtime.dispatch(command);
  }

  subscribe(listener) {
    if (this.destroyed) throw new Error('game runtime is destroyed');
    return this.runtime.subscribe(listener);
  }

  getViewModel(context = {}) {
    const state = this.getSnapshot();
    const roomStates = selectRoomStateMap(state, {
      previous: this.previousRoomStates,
      observerFactionId: context.observerFactionId ?? null
    });
    this.previousRoomStates = roomStates;
    const timeline = selectTimelineEvents(state, {
      filter: context.timelineFilter ?? 'all',
      limit: context.timelineLimit ?? 50,
      mode: context.timelineMode ?? 'chronicle',
      locale: context.locale ?? 'en'
    });
    return {
      topBar: selectGlobalBar(state, roomStates),
      observerFaction: selectObserverFactionSummary(state, context.observerFactionId ?? null),
      navigator: {
        factions: selectFactionList(state),
        parties: selectPartyList(state),
        settlements: selectSettlementList(state),
        rooms: selectRoomList(state, roomStates)
      },
      followRoster: selectFollowRoster(state),
      roomStates,
      overlays: selectOverlayAvailability(state, roomStates),
      selection: selectSelection(state, context, roomStates),
      timeline,
      timelineMode: context.timelineMode ?? 'chronicle',
      locale: context.locale ?? 'en',
      alerts: state.events.filter(event =>
        ALERT_SEVERITIES.has(event.severity) && (event.channel ?? 'chronicle') === 'chronicle'
      )
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.runtime.destroy();
  }
}
