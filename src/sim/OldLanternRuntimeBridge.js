import { DungeonSim } from './DungeonSimPhase8.js';
import { OldLanternInnSystem } from './OldLanternInnSystem.js';

let installed = false;

export function installOldLanternRuntimeBridge() {
  if (installed) return;
  installed = true;

  const baseUpdate = DungeonSim.prototype.update;
  const baseSnapshot = DungeonSim.prototype.snapshot;
  const baseMetrics = DungeonSim.prototype.metrics;

  DungeonSim.prototype.ensureOldLanternInnSystem = function ensureOldLanternInnSystem() {
    if (this.oldLanternInnSystem) return this.oldLanternInnSystem;
    this.oldLanternInnSystem = new OldLanternInnSystem({
      rooms: this.rooms,
      settlementSystem: this.settlementSystem,
      territorySystem: this.territorySystem,
      onEvent: text => this.event(text)
    });
    this.oldLanternInnSystem.initialize(this);
    return this.oldLanternInnSystem;
  };

  DungeonSim.prototype.update = function updateWithOldLantern(dt) {
    const result = baseUpdate.call(this, dt);
    this.ensureOldLanternInnSystem().update(dt, this);
    return result;
  };

  DungeonSim.prototype.snapshot = function snapshotWithOldLantern() {
    return { ...baseSnapshot.call(this), oldLanternInn: this.ensureOldLanternInnSystem().snapshot() };
  };

  DungeonSim.prototype.metrics = function metricsWithOldLantern() {
    return { ...baseMetrics.call(this), ...this.ensureOldLanternInnSystem().metrics() };
  };
}
