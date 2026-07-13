// Compatibility adapter from the Phase-chain simulation to the production runtime.
// WP9-A adds a Chronicle editorial boundary between raw simulation messages and UI events.

import { DungeonSim as DungeonSimPhase8 } from '../sim/DungeonSimPhase8.js';
import { createWorldEvent } from '../domain/eventContract.js';
import { dispatchCommand } from '../application/observerCommands.js';
import { WorldEventBus } from '../application/WorldEventBus.js';
import { LegacyChronicleBridge } from '../application/LegacyChronicleBridge.js';
import { ChronicleEditorializer } from '../application/ChronicleEditorializer.js';
import { normalizeLegacySnapshot } from './normalizeLegacySnapshot.js';

const EVENT_BUFFER_LIMIT = 360;

function defaultCreateSim(scenario, { onEvent } = {}) {
  return new DungeonSimPhase8(scenario, { onEvent });
}

export class LegacyPhaseRuntimeAdapter {
  constructor({
    scenario,
    createSim = defaultCreateSim,
    sim = null,
    eventBus = null,
    chronicleBridge = null,
    chronicleEditorializer = null
  } = {}) {
    this.paused = false;
    this.speed = 1;
    this.eventSeq = 0;
    this.destroyed = false;
    this.ownsSim = !sim;
    this.eventBus = eventBus ?? new WorldEventBus({ limit: EVENT_BUFFER_LIMIT });
    this.chronicleBridge = chronicleBridge ?? new LegacyChronicleBridge();
    this.chronicleEditorializer = chronicleEditorializer ?? new ChronicleEditorializer();
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

  static fromSim(sim, options = {}) {
    if (!sim) throw new Error('fromSim requires a sim instance');
    return new LegacyPhaseRuntimeAdapter({ ...options, sim });
  }

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

  recordLegacyEvent(payload) {
    if (this.destroyed) return null;
    let descriptor;
    try {
      descriptor = this.chronicleBridge.translate(payload, { sim: this.sim });
    } catch {
      descriptor = null;
    }
    if (!descriptor) return null;
    const now = eventTime(payload, this.sim);
    const ready = this.chronicleEditorializer.ingest(descriptor, now);
    let last = null;
    for (const item of ready) last = this.publishDescriptor(item, now, payload);
    return last;
  }

  publishDescriptor(descriptor, now, payload = null) {
    let event;
    try {
      event = createWorldEvent({
        id: `chronicle-${this.eventSeq++}`,
        time: Number.isFinite(now) ? now : (this.sim?.time ?? 0),
        type: descriptor.type,
        severity: descriptor.severity,
        channel: descriptor.channel,
        salience: descriptor.salience,
        actorIds: descriptor.actorIds,
        targetIds: descriptor.targetIds,
        roomId: descriptor.roomId,
        factionIds: descriptor.factionIds,
        tags: descriptor.tags,
        localizationKey: descriptor.localizationKey,
        detailKey: descriptor.detailKey,
        params: {
          ...descriptor.params,
          turn: payload && typeof payload === 'object' ? payload.turn ?? descriptor.params?.turn ?? null : descriptor.params?.turn ?? null
        },
        fallbackText: descriptor.fallbackText,
        dedupeKey: descriptor.dedupeKey,
        aggregateKey: descriptor.aggregateKey,
        variantSeed: descriptor.variantSeed,
        debug: descriptor.debug
      });
    } catch {
      return null;
    }
    this.eventBus.publish(event);
    return event;
  }

  flushChronicle({ force = false } = {}) {
    if (this.destroyed) return [];
    const now = this.sim?.time ?? 0;
    const ready = this.chronicleEditorializer.flush(now, { force });
    return ready.map(descriptor => this.publishDescriptor(descriptor, now)).filter(Boolean);
  }

  update(dt) {
    if (this.destroyed || this.paused) return;
    const scaled = (Number.isFinite(dt) ? dt : 0) * this.speed;
    if (scaled <= 0) return;
    this.sim.update(scaled);
    this.flushChronicle();
  }

  getSnapshot() {
    if (this.destroyed) throw new Error('LegacyPhaseRuntimeAdapter is destroyed');
    this.flushChronicle();
    let metrics = null;
    try {
      metrics = this.sim.metrics();
    } catch {
      metrics = null;
    }
    return normalizeLegacySnapshot(this.sim.snapshot(), {
      events: this.eventBus.history(),
      metrics: {
        ...(metrics ?? {}),
        chronicle: this.chronicleEditorializer.snapshot()
      },
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
    this.flushChronicle({ force: true });
    this.destroyed = true;

    if (this.attachedEventHandler && this.sim?.onEvent === this.attachedEventHandler) {
      try {
        this.sim.onEvent = this.previousOnEvent;
      } catch {
        // Read-only legacy hooks cannot be restored.
      }
    }

    if (this.ownsSim && typeof this.sim?.destroy === 'function') {
      try {
        this.sim.destroy();
      } catch {
        // Teardown failures must not leak listeners.
      }
    }

    this.chronicleEditorializer.reset();
    this.eventBus.destroy();
    this.attachedEventHandler = null;
    this.previousOnEvent = null;
  }
}

function eventTime(payload, sim) {
  if (payload && typeof payload === 'object' && Number.isFinite(payload.time)) return payload.time;
  return Number.isFinite(sim?.time) ? sim.time : 0;
}
