import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { DungeonSimulation } from '../src/sim/DungeonSimulation.js';

const originalRandom = Math.random;
Math.random = () => 0.91;

try {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded))));
  const sim = new DungeonSimulation(scenario);
  assert.ok(sim.operationsActivitySystem, 'stable simulation did not compose operations activities');

  const destination = [...sim.settlementSystem.settlements.values()].find(settlement => settlement.state === 'active');
  const carrier = sim.agents.find(agent => agent.alive && !agent.departed && !agent.hidden);
  assert.ok(destination && carrier, 'operations fixtures missing');
  placeInRoom(sim, carrier, destination.roomId);

  const cargo = {
    id: 'operations-smoke-cargo',
    resourceType: 'materials',
    amount: 2,
    factionId: destination.factionId,
    originalFactionId: destination.factionId,
    sourceRoomId: destination.roomId,
    destinationSettlementId: destination.id,
    carrierId: carrier.id,
    roomId: destination.roomId,
    state: 'carried',
    droppedAt: null,
    raidedBy: null,
    route: [destination.roomId],
    routeRisk: 0,
    routeSafety: 1,
    routeCut: false,
    escortId: null
  };
  sim.logisticsSystem.cargo.push(cargo);
  carrier.cargoId = cargo.id;
  const materialsBefore = destination.materials ?? 0;
  assert.ok(sim.operationsActivitySystem.beginUnload(carrier, cargo, destination, sim), 'unloading activity did not begin');
  assert.equal(carrier.activity.source, 'operations');
  assert.equal(carrier.activity.type, 'unloading');
  assert.equal(carrier.activity.prop, 'cargo-unloading');
  assert.ok(Number.isFinite(carrier.activity.anchor.ox) && Number.isFinite(carrier.activity.anchor.oz), 'unloading anchor missing');
  sim.time = carrier.activity.endsAt + 0.01;
  sim.operationsActivitySystem.update(0.1, sim);
  assert.equal(carrier.cargoId, null, 'unloading did not release cargo from carrier');
  assert.ok((destination.materials ?? 0) > materialsBefore, 'unloading did not apply cargo to destination');

  const room = sim.rooms.find(candidate => candidate.id === destination.roomId);
  const job = sim.constructionSystem.startConstruction(destination, 'supply_depot', sim, { force: true });
  assert.ok(job && room, 'construction fixture was not created');
  const builder = sim.agents.find(agent => agent.alive && !agent.departed && ['fighter', 'rogue', 'goblin', 'kobold', 'orc'].includes(agent.role)) ?? carrier;
  placeInRoom(sim, builder, job.roomId);
  const progressBefore = job.progress;
  assert.ok(sim.operationsActivitySystem.beginConstruction(builder, job, sim), 'construction operation did not begin');
  assert.equal(builder.activity.source, 'operations');
  assert.ok(['handling-materials', 'building'].includes(builder.activity.type));
  assert.ok(['materials-stack', 'worksite-tools'].includes(builder.activity.prop));
  sim.time = builder.activity.endsAt + 0.01;
  sim.operationsActivitySystem.update(0.1, sim);
  assert.ok(job.progress > progressBefore, 'construction operation did not contribute work');

  sim.operationsActivitySystem.beginConstruction(builder, job, sim);
  builder.combat = { phase: 'windup' };
  sim.operationsActivitySystem.update(0.1, sim);
  assert.equal(builder.activity, null, 'combat did not interrupt operations activity');
  builder.combat = null;

  const snapshot = sim.snapshot();
  const metrics = sim.metrics();
  assert.ok(Array.isArray(snapshot.operations.activities), 'operations snapshot missing');
  assert.ok(Number.isFinite(metrics.activeOperations), 'operations metrics missing');
  console.log(`operations activity smoke passed for ${destination.id} and ${job.id}`);
} finally {
  Math.random = originalRandom;
}

function placeInRoom(sim, agent, roomId) {
  sim.occupancy.release(agent.id);
  sim.occupancy.cancelReservation(agent.id);
  agent.roomId = roomId;
  agent.travel = null;
  agent.combat = null;
  agent.hidden = false;
  agent.departed = false;
  sim.occupancy.placeAgent(agent, roomId);
}
