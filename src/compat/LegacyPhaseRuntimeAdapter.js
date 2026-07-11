// 기존 Phase 체인 sim을 정규화 런타임 인터페이스(update/getSnapshot/dispatch/subscribe/destroy)로
// 감싸는 호환 어댑터 (docs/architecture/production-layering.md §4).
// GameRuntimeFacade는 이 어댑터만 알고, sim 내부 구조는 알지 못합니다.

import { DungeonSim as DungeonSimPhase8 } from '../sim/DungeonSimPhase8.js';
import { createWorldEvent } from '../domain/eventContract.js';
import { dispatchCommand } from '../application/observerCommands.js';
import { WorldEventBus } from '../application/WorldEventBus.js';
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
  constructor({ scenario, createSim = defaultCreateSim, sim = null, eventBus = null } = {}) {
    this.paused = false;
    this.speed = 1;
    this.eventSeq = 0;
    this.destroyed = false;
    this.ownsSim = !sim;
    this.eventBus = eventBus ?? new WorldEventBus({ limit: EVENT_BUFFER_LIMIT });
    this.previousOnEvent = null;
    this.attachedEventHandler = null;

    if (sim) {
      this.sim = sim;
      this.attachToExistingSim(sim);
      return;
    }

    const pendingEvents = [];
    this.sim = createSim(scenario, {
      onEvent: payload => {
        if (this.sim) this.recordLegacyEvent(payload);
        else pendingEvents.push(payload);
      }
    });
    for (const payload of pendingEvents) this.recordLegacyEvent(payload);
  }

  // 화면 코드가 이미 만든 sim 인스턴스를 감쌉니다.
  static fromSim(sim, options = {}) {
    if (!sim) throw new Error('fromSim requires a sim instance');
    return new LegacyPhaseRuntimeAdapter({ ...options, sim });
  }

  // 기존 onEvent를 체이닝합니다. 덮어쓸 수 없는 sim이면
  // 이벤트 스트림 없이 스냅샷/커맨드만 제공하도록 degrade합니다.
  attachToExistingSim(sim) {
    try {
      this.previousOnEvent = typeof sim.onEvent === 'function' ? sim.onEvent : null;
      this.attachedEventHandler = payload => {
        if (this.previousOnEvent) this.previousOnEvent(payload);
        this.recordLegacyEvent(payload);
      };
      sim.onEvent = this.attachedEventHandler;
    } catch {
      this.previousOnEvent = null;
      this.attachedEventHandler = null;
    }
  }

  // 레거시 onEvent 페이로드({text, time, turn, ...meta})를
  // eventContract.js의 WorldEvent(type 'legacy.log')로 감쌉니다.
  recordLegacyEvent(payload) {
    if (this.destroyed) return null;
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
      return null;
    }

    this.eventBus.publish(event);
    return event;
  }

  update(dt) {
    if (this.destroyed || this.paused) return;
    const scaled = (Number.isFinite(dt) ? dt : 0) * this.speed;
    if (scaled <= 0) return;
    this.sim.update(scaled);
  }

  getSnapshot() {
    if (this.destroyed) throw new Error('LegacyPhaseRuntimeAdapter is destroyed');
    let metrics = null;
    try {
      metrics = this.sim.metrics();
    } catch {
      metrics = null;
    }
    return normalizeLegacySnapshot(this.sim.snapshot(), {
      events: this.eventBus.history(),
      metrics,
      turn: Number.isFinite(this.sim.turn) ? this.sim.turn : null
    });
  }

  dispatch(command) {
    if (this.destroyed) return { ok: false, error: 'runtime adapter is destroyed' };
    return dispatchCommand({ sim: this.sim, adapter: this }, command);
  }

  subscribe(listener) {
    return this.eventBus.subscribe(listener);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.attachedEventHandler && this.sim?.onEvent === this.attachedEventHandler) {
      try {
        this.sim.onEvent = this.previousOnEvent;
      } catch {
        // 읽기 전용 onEvent 구현은 복구할 수 없으므로 그대로 둡니다.
      }
    }

    if (this.ownsSim && typeof this.sim?.destroy === 'function') {
      try {
        this.sim.destroy();
      } catch {
        // legacy sim teardown failure must not leak event listeners.
      }
    }

    this.eventBus.destroy();
    this.attachedEventHandler = null;
    this.previousOnEvent = null;
  }
}