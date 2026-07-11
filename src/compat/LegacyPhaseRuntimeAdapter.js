// 기존 Phase 체인 sim을 정규화 런타임 인터페이스(update/getSnapshot/dispatch/subscribe)로
// 감싸는 호환 어댑터 (docs/architecture/production-layering.md §4).
// GameRuntimeFacade는 이 어댑터만 알고, sim 내부 구조는 알지 못합니다.

import { DungeonSim as DungeonSimPhase8 } from '../sim/DungeonSimPhase8.js';
import { createWorldEvent } from '../domain/eventContract.js';
import { dispatchCommand } from '../application/observerCommands.js';
import { normalizeLegacySnapshot } from './normalizeLegacySnapshot.js';

const EVENT_BUFFER_LIMIT = 200;

function defaultCreateSim(scenario, { onEvent } = {}) {
  return new DungeonSimPhase8(scenario, { onEvent });
}

function sanitizeParams(params) {
  const result = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') continue;
    result[key] = value;
  }
  return result;
}

export class LegacyPhaseRuntimeAdapter {
  constructor({ scenario, createSim = defaultCreateSim, sim = null } = {}) {
    this.paused = false;
    this.speed = 1;
    this.events = [];
    this.eventSeq = 0;
    this.listeners = new Set();

    if (sim) {
      this.sim = sim;
      this.attachToExistingSim(sim);
    } else {
      this.sim = createSim(scenario, { onEvent: payload => this.recordLegacyEvent(payload) });
    }
  }

  // 화면 코드가 이미 만든 sim 인스턴스를 감쌉니다.
  static fromSim(sim) {
    if (!sim) throw new Error('fromSim requires a sim instance');
    return new LegacyPhaseRuntimeAdapter({ sim });
  }

  // 기존 onEvent를 체이닝합니다. 덮어쓸 수 없는 sim이면
  // 이벤트 스트림 없이 스냅샷/커맨드만 제공하도록 degrade합니다.
  attachToExistingSim(sim) {
    try {
      const previous = typeof sim.onEvent === 'function' ? sim.onEvent : null;
      sim.onEvent = payload => {
        if (previous) previous(payload);
        this.recordLegacyEvent(payload);
      };
    } catch {
      // onEvent가 접근 불가한 sim: 이벤트 없이 동작
    }
  }

  // 레거시 onEvent 페이로드({text, time, turn, ...meta})를
  // eventContract.js의 WorldEvent(type 'legacy.log')로 감쌉니다.
  recordLegacyEvent(payload) {
    const meta = payload && typeof payload === 'object' ? payload : { text: String(payload ?? '') };
    const { text, time, turn, type, sourceId, targetId, ...rest } = meta;
    let event;
    try {
      event = createWorldEvent({
        id: `legacy-${this.eventSeq++}`,
        time: Number.isFinite(time) ? time : (this.sim?.time ?? 0),
        type: 'legacy.log',
        severity: 'ambient',
        actorIds: typeof sourceId === 'string' ? [sourceId] : [],
        targetIds: typeof targetId === 'string' ? [targetId] : [],
        params: sanitizeParams({ turn, legacyType: type ?? null, ...rest }),
        fallbackText: typeof text === 'string' ? text : ''
      });
    } catch {
      return; // 계약 위반 페이로드는 버립니다
    }

    this.events.push(event);
    if (this.events.length > EVENT_BUFFER_LIMIT) {
      this.events.splice(0, this.events.length - EVENT_BUFFER_LIMIT);
    }
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 리스너 오류가 sim 진행을 막지 않도록 무시
      }
    }
  }

  update(dt) {
    if (this.paused) return;
    const scaled = (Number.isFinite(dt) ? dt : 0) * this.speed;
    if (scaled <= 0) return;
    this.sim.update(scaled);
  }

  getSnapshot() {
    let metrics = null;
    try {
      metrics = this.sim.metrics();
    } catch {
      metrics = null;
    }
    return normalizeLegacySnapshot(this.sim.snapshot(), {
      events: this.events,
      metrics,
      turn: Number.isFinite(this.sim.turn) ? this.sim.turn : null
    });
  }

  dispatch(command) {
    return dispatchCommand({ sim: this.sim, adapter: this }, command);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('subscribe requires a listener function');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
