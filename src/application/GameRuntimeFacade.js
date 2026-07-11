// UI가 sim 내부 대신 사용하는 단일 런타임 진입점
// (docs/architecture/production-layering.md §4).
// runtime은 update/getSnapshot/dispatch/subscribe를 구현한 어댑터면 무엇이든 됩니다
// (현재는 LegacyPhaseRuntimeAdapter, 이후 네이티브 런타임으로 교체 가능).

import {
  selectGlobalBar,
  selectAgentInspector,
  selectRoomInspector,
  selectSettlementInspector,
  selectTimelineEvents
} from '../presentation/selectors/index.js';

const RUNTIME_METHODS = ['update', 'getSnapshot', 'dispatch', 'subscribe'];
const ALERT_SEVERITIES = new Set(['major', 'critical', 'historic']);

function selectSelection(state, context) {
  if (context.agentId) {
    return { type: 'agent', id: context.agentId, inspector: selectAgentInspector(state, context.agentId) };
  }
  if (context.roomId) {
    return { type: 'room', id: context.roomId, inspector: selectRoomInspector(state, context.roomId) };
  }
  if (context.settlementId) {
    return { type: 'settlement', id: context.settlementId, inspector: selectSettlementInspector(state, context.settlementId) };
  }
  return null;
}

export class GameRuntimeFacade {
  constructor({ runtime } = {}) {
    if (!runtime) throw new Error('GameRuntimeFacade requires a runtime adapter');
    for (const method of RUNTIME_METHODS) {
      if (typeof runtime[method] !== 'function') {
        throw new Error(`runtime adapter is missing "${method}()"`);
      }
    }
    this.runtime = runtime;
  }

  // paused/speed의 소유자는 어댑터입니다. speed 이중 적용을 피하기 위해
  // 여기서는 paused fast-path만 존중하고 dt는 그대로 전달합니다.
  update(dt) {
    if (this.runtime.paused === true) return;
    this.runtime.update(dt);
  }

  getSnapshot() {
    return this.runtime.getSnapshot();
  }

  dispatch(command) {
    return this.runtime.dispatch(command);
  }

  subscribe(listener) {
    return this.runtime.subscribe(listener);
  }

  /**
   * @param {Object} [context]
   * @param {string} [context.agentId]  선택된 에이전트 (agentId > roomId > settlementId 우선)
   * @param {string} [context.roomId]
   * @param {string} [context.settlementId]
   * @param {string} [context.timelineFilter]
   * @param {number} [context.timelineLimit]
   * @returns {{topBar: Object, selection: Object|null, timeline: Object, alerts: Object[]}}
   */
  getViewModel(context = {}) {
    const state = this.getSnapshot();
    return {
      topBar: selectGlobalBar(state),
      selection: selectSelection(state, context),
      timeline: selectTimelineEvents(state, {
        filter: context.timelineFilter ?? 'all',
        limit: context.timelineLimit ?? 50
      }),
      alerts: state.events.filter(event => ALERT_SEVERITIES.has(event.severity))
    };
  }
}
