import assert from 'node:assert/strict';
import { DungeonSim as OccupancySim } from '../src/sim/DungeonSimPhase1.js';
import { DungeonSim as Phase8Sim } from '../src/sim/DungeonSimPhase8.js';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../src/data/applyPhase8SpatialScale.js';

const originalRandom = Math.random;
let randomState = 987654321;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

try {
  testInteractionOverflow();
  testPersonalityMemory();
  console.log('phase8e personality and targeted interaction smoke passed');
} finally {
  Math.random = originalRandom;
}

function testInteractionOverflow() {
  const scenario = {
    id: 'interaction-overflow-test',
    name: 'Interaction Overflow Test',
    description: 'Two rooms for targeted landing validation.',
    rooms: [
      { id: 'a', name: 'Approach', x: -4, z: 0, w: 5, d: 5, kind: 'start' },
      { id: 'b', name: 'Packed Room', x: 4, z: 0, w: 5, d: 5, kind: 'hall' }
    ],
    links: [['a', 'b']],
    props: [],
    agents: [
      { id: 'hunter', name: 'Hunter', role: 'goblin', faction: 'dungeon', roomId: 'a' },
      { id: 'target', name: 'Target', role: 'fighter', faction: 'party', roomId: 'b' },
      { id: 'walker', name: 'Walker', role: 'skeleton', faction: 'dungeon', roomId: 'a' }
    ]
  };
  const sim = new OccupancySim(scenario, { onEvent: () => {} });
  const hunter = sim.agents.find(agent => agent.id === 'hunter');
  const target = sim.agents.find(agent => agent.id === 'target');
  const walker = sim.agents.find(agent => agent.id === 'walker');
  const targetCell = sim.occupancy.getAgentCell(target.id);
  const targetGrid = sim.occupancy.grids.get('b');
  assert.ok(targetCell && targetGrid, 'target room occupancy was not initialized');

  for (const cell of targetGrid.cells) {
    if (cell.id === targetCell.cellId) continue;
    sim.occupancy.blockArea('b', cell.x, cell.z, 0.05, `test-block-${cell.id}`);
  }

  const started = sim.beginTravel(hunter, 'b', { interactionTargetId: target.id, interactionType: 'attack' });
  assert.equal(started, true, 'targeted movement could not reserve an interaction overflow landing');
  assert.equal(hunter.travel.destinationCell.overflow, true, 'targeted movement did not mark the overflow reservation');
  sim.advanceTravel(100);
  sim.advanceTravel(100);
  assert.equal(hunter.roomId, 'b', 'targeted mover did not enter the packed room');
  assert.equal(hunter.roomCell?.overflow, true, 'targeted mover did not retain the interaction landing state');

  const ordinaryStarted = sim.beginTravel(walker, 'b');
  assert.equal(ordinaryStarted, false, 'ordinary wandering incorrectly bypassed room capacity');
  assert.equal(walker.blockedMoveRoomId, 'b', 'failed ordinary movement did not record the blocked room');
  assert.ok(walker.blockedMoveUntilTurn >= sim.turn + 2, 'blocked movement retry cooldown was not applied');
  assert.equal(sim.beginTravel(walker, 'b'), false, 'blocked route was immediately retried');
}

function testPersonalityMemory() {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(applyPhase8SpatialScale(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded)))));
  const sim = new Phase8Sim(scenario, { onEvent: () => {} });
  const actor = sim.agents.find(agent => agent.alive && agent.faction === 'party' && !agent.queued);
    ?? sim.agents.find(agent => agent.alive && agent.faction === 'party');
  const enemy = sim.agents.find(agent => agent.alive && agent.faction === 'dungeon' && !agent.hidden);
  assert.ok(actor && enemy, 'personality actors were unavailable');

  const neighbor = (sim.graph.get(actor.roomId) ?? [])[0];
  assert.ok(neighbor, 'personality actor had no adjacent room');
  placeInRoom(sim, enemy, neighbor);
  actor.personality.aggression = 0.95;
  actor.personality.bravery = 0.95;
  actor.personality.loyalty = 0.2;
  actor.lastPersonalityActionAt = -999;
  const action = sim.personalitySystem.decide(actor, sim);
  assert.equal(action?.type, 'personality-move', 'aggressive personality did not deliberately approach an adjacent enemy');
  assert.equal(action?.interactionTargetId, enemy.id, 'personality movement lost its interaction target');

  actor.lastAttackerId = enemy.id;
  actor.lastObservedAttackerId = null;
  sim.personalitySystem.update(2, sim);
  assert.ok(actor.memories.some(memory => memory.type === 'attacked-by' && memory.subjectId === enemy.id), 'attack memory was not recorded');
  assert.ok((actor.relationships[enemy.id] ?? 0) < 0, 'attack memory did not create a negative relationship');

  const snapshot = sim.snapshot();
  const metrics = sim.metrics();
  assert.ok(snapshot.personality?.agents?.length > 0, 'personality snapshot was not exposed');
  assert.ok(metrics.personalityAgents > 0, 'personality metrics were not exposed');
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
