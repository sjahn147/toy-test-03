import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase8.js';
import { graphDistance } from '../src/sim/Pathfinding.js';

const originalRandom = Math.random;
let randomState = 864209753;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

try {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(
    applyPhase6Ecology(
      applyPhase5Ecology(
        applyPhase2Facilities(expanded)
      )
    )
  );
  const events = [];
  const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });
  const settlements = [...sim.settlementSystem.settlements.values()];
  const safeHub = sim.settlementSystem.settlements.get(sim.settlementSystem.safeSettlementId);

  assert.ok(settlements.length >= 10, 'ecology lairs were not registered as settlements');
  assert.ok(safeHub?.indestructible, 'licensed waystation was not registered as a protected settlement');
  assert.ok(safeHub.capacity >= 5, 'safe hub capacity was not initialized');

  const homeless = sim.agents.filter(agent =>
    agent.alive && agent.faction === 'dungeon' && !agent.homeSettlementId && !agent.displaced
  );
  assert.equal(homeless.length, 0, 'active dungeon residents were left without a home or displaced state');

  const habitat = settlements.find(settlement =>
    !settlement.indestructible && settlement.population >= 1 && settlement.species
  );
  assert.ok(habitat, 'no populated monster habitat was available');
  const originalCapacity = habitat.capacity;
  habitat.capacity = habitat.population;
  assert.equal(
    sim.settlementSystem.canSpawn(habitat.species, habitat.roomId, habitat.factionId),
    false,
    'habitat allowed spawning at its population capacity'
  );
  habitat.capacity = originalCapacity;

  const resident = habitat.residentIds
    .map(id => sim.agents.find(agent => agent.id === id))
    .find(agent => agent?.alive && !agent.hidden && !agent.attachedToId);
  assert.ok(resident, 'habitat had no usable resident for return behavior');
  const farRoom = sim.rooms
    .filter(room => !room.tags?.includes('safe_zone') && room.id !== habitat.roomId)
    .sort((a, b) => graphDistance(sim.graph, habitat.roomId, b.id) - graphDistance(sim.graph, habitat.roomId, a.id))[0];
  assert.ok(farRoom, 'no remote room was available for home-return testing');
  placeInRoom(sim, resident, farRoom.id);
  resident.hp = Math.max(1, Math.floor(resident.maxHp * 0.35));
  resident.hunger = 84;
  resident.roamingRange = 1;
  const returnAction = sim.settlementSystem.decide(resident, sim);
  assert.equal(returnAction?.type, 'settlement-return', 'injured remote resident did not return toward its habitat');
  assert.ok((sim.graph.get(resident.roomId) ?? []).includes(returnAction.roomId), 'home return did not choose a legal adjacent step');

  const crowded = settlements.find(settlement =>
    !settlement.indestructible && settlement.population >= 2 && settlement.id !== habitat.id
  ) ?? habitat;
  const crowdedResidents = crowded.residentIds
    .map(id => sim.agents.find(agent => agent.id === id))
    .filter(Boolean);
  assert.ok(crowdedResidents.length >= 2, 'no settlement had enough residents for overcrowding validation');
  crowded.baseCapacity = 1;
  crowded.structuralIntegrity = 100;
  crowded.state = 'active';
  sim.settlementSystem.sync(sim);
  assert.ok(crowded.overcrowded > 0, 'reduced habitat capacity did not produce overcrowding');
  sim.settlementSystem.resolveOvercrowding(sim);
  sim.settlementSystem.sync(sim);
  assert.ok(
    crowded.population <= crowded.capacity || sim.agents.some(agent => agent.displaced || agent.formerSettlementId === crowded.id),
    'overcrowded residents were neither rehomed nor displaced'
  );

  const collapsible = settlements.find(settlement =>
    !settlement.indestructible && settlement.state !== 'ruined' && settlement.id !== crowded.id
  );
  assert.ok(collapsible, 'no settlement was available for collapse validation');
  const formerResidents = [...collapsible.residentIds];
  collapsible.structuralIntegrity = 0;
  sim.settlementSystem.updateSettlementStates(0.75, sim);
  sim.settlementSystem.sync(sim);
  assert.equal(collapsible.state, 'ruined', 'zero-integrity habitat did not become ruined');
  assert.ok(
    formerResidents.every(id => sim.agents.find(agent => agent.id === id)?.homeSettlementId !== collapsible.id),
    'ruined habitat retained assigned residents'
  );

  const oldSafeCapacity = safeHub.capacity;
  const oldGuestCapacity = safeHub.guestCapacity;
  safeHub.capacity = 3;
  safeHub.guestCapacity = 0;
  assert.equal(sim.settlementSystem.canAdmitParty(5, sim), false, 'entry queue ignored safe-hub guest capacity');
  safeHub.capacity = oldSafeCapacity;
  safeHub.guestCapacity = oldGuestCapacity;

  const snapshot = sim.snapshot();
  const metrics = sim.metrics();
  assert.ok(Array.isArray(snapshot.settlement?.settlements), 'settlement snapshot was not exposed');
  assert.ok(Number.isFinite(metrics.habitatPopulation), 'habitat population metric was missing');
  assert.ok(Number.isFinite(metrics.habitatCapacity), 'habitat capacity metric was missing');
  assert.ok(events.some(event => event.includes('ruined habitat')), 'settlement collapse did not emit a readable event');

  console.log(`phase8 settlement smoke passed with ${settlements.length} settlements, ${metrics.displaced} displaced residents and ${events.length} events`);
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
