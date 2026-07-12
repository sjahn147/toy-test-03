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
let state = 271828182;
Math.random = () => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 0x100000000;
};

try {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const legacyArea = expanded.rooms.reduce((sum, room) => sum + room.w * room.d, 0) / expanded.rooms.length;
  const scenario = applyPhase7Territories(applyPhase8SpatialScale(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded)))));
  const scaledArea = scenario.rooms.reduce((sum, room) => sum + room.w * room.d, 0) / scenario.rooms.length;

  assert.ok(scenario.phase8SpatialScaleApplied, 'spatial scale decorator was not applied');
  assert.ok(scaledArea > legacyArea * 2, 'room area did not increase enough for logistics and settlements');
  assert.ok(scenario.rooms.every(room => room.w >= 9.5 && room.d >= 8.4), 'legacy narrow rooms remained after scaling');
  assert.ok(scenario.rooms.every(room => room.spatialCapacity >= 80), 'expanded rooms did not expose sufficient walkable capacity');

  const events = [];
  const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });
  const resource = sim.props.find(prop => prop.type === 'territory_resource');
  assert.ok(resource, 'no territorial resource node was available');
  const worker = sim.agents.find(agent =>
    agent.alive && agent.faction === 'dungeon' && agent.ecologyFaction && !agent.hidden && !agent.cargoId
  );
  assert.ok(worker, 'no unencumbered logistics worker was available');

  placeInRoom(sim, worker, resource.roomId);
  const territory = sim.territorySystem.roomStates.get(resource.roomId);
  territory.owner = worker.ecologyFaction;
  territory.control = 90;
  territory.contested = false;
  const destination = sim.logisticsSystem.findDestination(worker.ecologyFaction, resource.roomId);
  assert.ok(destination, 'worker faction had no active settlement destination');

  const supplyBefore = sim.territorySystem.factionSupply.get(worker.ecologyFaction) ?? 0;
  const stockBefore = resource.stock;
  const cargoCountBefore = sim.logisticsSystem.cargo.length;
  sim.harvestPhysicalResources(sim);
  assert.ok(resource.stock < stockBefore, 'physical harvest did not consume resource stock');
  assert.equal(sim.logisticsSystem.cargo.length, cargoCountBefore + 1, 'physical harvest did not add exactly one cargo shipment');
  const harvestedCargo = sim.logisticsSystem.cargo.find(cargo => cargo.id === worker.cargoId);
  assert.ok(harvestedCargo, 'new physical cargo was not assigned to the harvesting worker');
  assert.equal(sim.territorySystem.factionSupply.get(worker.ecologyFaction) ?? 0, supplyBefore, 'supply was credited before delivery');

  placeInRoom(sim, worker, destination.roomId);
  const delivery = sim.logisticsSystem.decide(worker, sim);
  assert.equal(delivery?.type, 'logistics-deliver', 'carrier did not recognize destination settlement');
  sim.logisticsSystem.resolve(worker, delivery, sim);
  assert.equal(sim.logisticsSystem.cargo.some(cargo => cargo.id === harvestedCargo.id), false, 'delivered cargo remained in transit');
  assert.equal(sim.logisticsSystem.cargo.length, cargoCountBefore, 'delivery did not restore the pre-harvest cargo count');
  assert.ok((sim.territorySystem.factionSupply.get(worker.ecologyFaction) ?? 0) > supplyBefore, 'delivery did not credit faction supply');

  placeInRoom(sim, worker, resource.roomId);
  resource.stock = Math.max(2, resource.stock);
  const secondCargoCountBefore = sim.logisticsSystem.cargo.length;
  sim.harvestPhysicalResources(sim);
  assert.equal(sim.logisticsSystem.cargo.length, secondCargoCountBefore + 1, 'second physical harvest did not add cargo');
  const dropped = sim.logisticsSystem.cargo.find(cargo => cargo.id === worker.cargoId);
  assert.ok(dropped, 'second cargo was not assigned to the worker');
  sim.logisticsSystem.dropForAgent(worker, sim);
  assert.equal(dropped.state, 'dropped', 'carrier loss did not leave physical cargo on the floor');
  sim.occupancy.release(worker.id);
  worker.hidden = true;

  const rival = sim.agents.find(agent => agent.alive && agent.ecologyFaction && agent.ecologyFaction !== worker.ecologyFaction && !agent.hidden);
  assert.ok(rival, 'no rival raider was available');
  placeInRoom(sim, rival, dropped.roomId);
  sim.logisticsSystem.collectDroppedCargo(sim);
  assert.equal(dropped.state, 'carried', 'rival failed to collect dropped cargo');
  assert.equal(dropped.factionId, rival.ecologyFaction, 'dropped cargo did not change ownership after theft');
  assert.equal(rival.cargoId, dropped.id, 'raider did not visibly carry stolen cargo');

  const metrics = sim.metrics();
  const snapshot = sim.snapshot();
  assert.ok(Array.isArray(snapshot.logistics?.cargo), 'logistics snapshot missing');
  assert.ok(metrics.cargoInTransit >= 1, 'cargo metrics missing');
  assert.ok(sim.occupancy.snapshot().grids.reduce((sum, grid) => sum + grid.cells.length, 0) > 1000, 'expanded rooms did not produce enough occupancy cells');

  console.log(`phase8c logistics smoke passed with average room area ${scaledArea.toFixed(1)}, ${metrics.cargoInTransit} cargo in transit and ${events.length} events`);
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
