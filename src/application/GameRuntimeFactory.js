import { LegacyPhaseRuntimeAdapter } from '../compat/LegacyPhaseRuntimeAdapter.js';
import { GameRuntimeFacade } from './GameRuntimeFacade.js';

// Single construction point for the production runtime boundary.
// Callers may provide an already-created legacy sim while renderer migration is
// still in progress, or provide a scenario and let the adapter own the sim.
export function createLegacyGameRuntime({ scenario = null, sim = null, createSim = undefined, eventBus = null } = {}) {
  const runtime = sim
    ? LegacyPhaseRuntimeAdapter.fromSim(sim, { eventBus })
    : new LegacyPhaseRuntimeAdapter({ scenario, createSim, eventBus });
  return new GameRuntimeFacade({ runtime });
}