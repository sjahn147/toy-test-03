import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../src/data/applyPhase8SpatialScale.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase8.js';

const originalRandom = Math.random;
Math.random = () => 0.1;

try {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(applyPhase8SpatialScale(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded)))));
  const events = [];
  const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });
  const settlement = [...sim.settlementSystem.settlements.values()].find(item => !item.indestructible);
  assert.ok(settlement, 'no destructible settlement available');

  sim.territorySystem.factionSupply.set(settlement.factionId, 100);
  settlement.materials = 100;
  const job = sim.constructionSystem.startConstruction(settlement, 'gatehouse', sim, { force: true });
  assert.ok(job, 'gatehouse construction did not start');
  const prop = sim.props.find(item => item.id === job.propId);
  assert.ok(prop?.underConstruction, 'construction prop missing');
  assert.ok(sim.occupancy.snapshot().blocked.some(entry => entry.blockerId === prop.id), 'structure footprint was not blocked');

  job.progress = job.duration;
  sim.constructionSystem.advanceJobs(0.1, sim);
  assert.equal(prop.underConstruction, false, 'construction did not complete');
  assert.equal(prop.integrity, prop.maxIntegrity, 'completed structure lacked full integrity');

  const attacker = sim.agents.find(agent => agent.alive && agent.ecologyFaction && agent.ecologyFaction !== settlement.factionId && !agent.hidden);
  assert.ok(attacker, 'no siege attacker available');
  placeInRoom(sim, attacker, settlement.roomId);
  while (sim.props.includes(prop)) {
    attacker.siegeCooldown = 0;
    sim.constructionSystem.attackStructure(attacker, prop, sim);
  }
  assert.ok(!sim.occupancy.snapshot().blocked.some(entry => entry.blockerId === prop.id), 'destroyed structure left blocked cells');

  const adjacent = sim.graph.get(settlement.roomId) ?? [];
  for (const roomId of adjacent) {
    const state = sim.territorySystem.roomStates.get(roomId);
    if (state) {
      state.owner = attacker.ecologyFaction;
      state.control = 90;
      state.contested = false;
    }
  }
  sim.constructionSystem.updateSupplyStatus(sim);
  assert.equal(settlement.supplyStatus, 'blockaded', 'surrounded settlement was not blockaded');
  assert.equal(settlement.supplyEfficiency, 0, 'blockade did not stop supply efficiency');

  const worker = sim.agents.find(agent => agent.alive && agent.ecologyFaction === settlement.factionId && !agent.hidden);
  const resource = sim.props.find(item => item.type === 'territory_resource');
  assert.ok(worker && resource, 'cargo setup unavailable');
  placeInRoom(sim, worker, resource.roomId);
  const destination = sim.logisticsSystem.findDestination(worker.ecologyFaction, resource.roomId, sim);
  if (destination) {
    const cargo = sim.logisticsSystem.enqueueHarvest({ worker, resourceType: 'scrap', amount: 1, roomId: resource.roomId, factionId: worker.ecologyFaction }, sim);
    assert.equal(cargo, true, 'physical cargo was not created');
    const record = sim.logisticsSystem.cargo[0];
    assert.ok(Array.isArray(record.route) && record.route.length > 0, 'cargo route was not calculated');
    assert.ok(Number.isFinite(record.routeRisk), 'route risk was not calculated');
    assert.ok(Number.isFinite(record.routeSafety), 'route safety was not calculated');
    assert.equal(typeof record.routeCut, 'boolean', 'route cut state was not calculated');
  }

  const metrics = sim.metrics();
  const snapshot = sim.snapshot();
  assert.ok(Array.isArray(snapshot.construction?.structures), 'construction snapshot missing');
  assert.ok(Number.isFinite(metrics.blockadedSettlements), 'blockade metrics missing');
  assert.ok(Number.isFinite(metrics.highRiskRoutes), 'route risk metrics missing');
  assert.ok(events.some(event => event.includes('building') || event.includes('destroyed')), 'construction or siege event missing');
  console.log(`phase8d construction siege smoke passed with ${metrics.completedStructures} structures and ${metrics.blockadedSettlements} blockades`);
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
  agent.queued = false;
  sim.occupancy.placeAgent(agent, roomId);
}
