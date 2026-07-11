import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase7.js';

const originalRandom = Math.random;
let randomState = 975318642;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

try {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded))));
  const events = [];
  const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });

  const resources = sim.props.filter(prop => prop.type === 'territory_resource');
  assert.ok(resources.length >= 4, 'territorial resource nodes were not seeded');
  assert.ok([...sim.territorySystem.roomStates.values()].some(state => state.owner), 'lairs did not seed room ownership');

  const factionAgent = sim.agents.find(agent => agent.alive && agent.ecologyFaction && agent.faction === 'dungeon');
  assert.ok(factionAgent, 'missing faction agent');
  const resource = resources.find(prop => {
    const state = sim.territorySystem.roomStates.get(prop.roomId);
    return state?.owner === factionAgent.ecologyFaction;
  }) ?? resources[0];
  const state = sim.territorySystem.roomStates.get(resource.roomId);
  state.owner = factionAgent.ecologyFaction;
  state.control = 90;
  state.contested = false;
  placeInRoom(sim, factionAgent, resource.roomId);
  const stockBefore = resource.stock;
  const supplyBefore = sim.territorySystem.factionSupply.get(factionAgent.ecologyFaction) ?? 0;
  sim.territorySystem.harvestResources(sim);
  assert.ok(resource.stock < stockBefore, 'controlled resource was not harvested');
  assert.ok((sim.territorySystem.factionSupply.get(factionAgent.ecologyFaction) ?? 0) > supplyBefore, 'harvest did not create faction supply');

  const rival = sim.agents.find(agent =>
    agent.alive && agent.faction === 'dungeon' && agent.ecologyFaction && agent.ecologyFaction !== factionAgent.ecologyFaction
  );
  assert.ok(rival, 'missing rival faction agent');
  placeInRoom(sim, rival, resource.roomId);
  for (let i = 0; i < 3; i += 1) sim.territorySystem.updateControl(sim);
  assert.equal(sim.territorySystem.roomStates.get(resource.roomId).contested, true, 'rival factions did not contest the room');

  sim.occupancy.release(rival.id);
  rival.hidden = true;
  state.owner = rival.ecologyFaction;
  state.control = 1;
  for (let i = 0; i < 3; i += 1) sim.territorySystem.updateControl(sim);
  assert.equal(state.owner, factionAgent.ecologyFaction, 'dominant faction failed to capture weakened territory');

  state.control = 100;
  state.contested = false;
  sim.territorySystem.factionSupply.set(factionAgent.ecologyFaction, 12);
  for (let i = 0; i < 4; i += 1) sim.territorySystem.buildFortifications(sim);
  const built = sim.props.filter(prop =>
    ['territory_banner', 'barricade', 'watch_post'].includes(prop.type) && prop.ecologyFaction === factionAgent.ecologyFaction
  );
  assert.ok(built.length >= 1, 'faction supply did not build a fortification');

  for (const prop of built) sim.blockTerritoryProp(prop);
  assert.ok(built.every(prop => prop.territoryBlocked), 'fortification footprints were not registered');

  const snapshot = sim.snapshot();
  assert.ok(snapshot.territory, 'territory snapshot missing');
  assert.ok(Array.isArray(snapshot.territory.rooms), 'territory room snapshot missing');
  assert.ok(Array.isArray(snapshot.territory.supply), 'territory supply snapshot missing');
  assert.ok(sim.metrics().territories > 0, 'territory metrics missing');

  console.log(`phase7 territory smoke passed with ${resources.length} resources, ${built.length} fortifications and ${events.length} events`);
} finally {
  Math.random = originalRandom;
}

function placeInRoom(sim, agent, roomId) {
  sim.occupancy.release(agent.id);
  sim.occupancy.cancelReservation(agent.id);
  agent.roomId = roomId;
  agent.travel = null;
  agent.hidden = false;
  agent.combat = null;
  sim.occupancy.placeAgent(agent, roomId);
}
