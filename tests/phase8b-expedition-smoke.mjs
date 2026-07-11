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
let randomState = 314159265;
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
  const party = [...sim.partySystem.parties.values()][0];
  assert.ok(party, 'no adventurer party was initialized');
  sim.expeditionSystem.initializeParty(party);

  assert.ok(party.provisions > 0 && party.water > 0, 'party expedition supplies were not initialized');
  assert.ok(party.endurance > 0, 'party endurance was not initialized');

  const members = party.memberIds.map(id => sim.agents.find(agent => agent.id === id)).filter(Boolean);
  const leader = members.find(member => member.id === party.leaderId) ?? members[0];
  assert.ok(leader, 'party leader missing');
  const safeHub = sim.settlementSystem.settlements.get(sim.settlementSystem.safeSettlementId);
  assert.ok(safeHub, 'safe hub missing');

  const deepRoom = sim.rooms
    .filter(room => room.w * room.d >= 30 && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold'))
    .sort((a, b) => graphDistance(sim.graph, safeHub.roomId, b.id) - graphDistance(sim.graph, safeHub.roomId, a.id))[0];
  assert.ok(deepRoom && graphDistance(sim.graph, safeHub.roomId, deepRoom.id) >= 3, 'no sufficiently deep camp room was available');

  for (const monster of sim.agents.filter(agent => agent.faction === 'dungeon' && agent.roomId === deepRoom.id)) monster.hidden = true;
  for (const member of members) placeInRoom(sim, member, deepRoom.id);

  const provisionsBefore = party.provisions;
  const waterBefore = party.water;
  const enduranceBefore = party.endurance;
  sim.expeditionSystem.updatePartyCondition(party, sim);
  assert.ok(party.provisions < provisionsBefore, 'field expedition did not consume provisions');
  assert.ok(party.water < waterBefore, 'field expedition did not consume water');
  assert.ok(party.endurance < enduranceBefore, 'field expedition did not consume endurance');
  assert.ok(members.every(member => member.ecologyFaction === 'adventurer-expedition'), 'adventurers were not registered as a territorial faction');

  party.endurance = 10;
  party.provisions = 1;
  party.water = 0.8;
  const retreat = sim.expeditionSystem.decide(leader, sim);
  assert.equal(retreat?.type, 'expedition-move', 'depleted expedition did not begin retreating');
  assert.ok((sim.graph.get(leader.roomId) ?? []).includes(retreat.roomId), 'retreat did not choose a legal adjacent room');

  party.endurance = 100;
  party.expeditionTime = 70;
  party.provisions = 12;
  party.water = 10;
  party.medicine = 4;
  party.materials = 6;
  party.baseSettlementId = safeHub.id;
  party.campCooldown = 0;
  const territory = sim.territorySystem.roomStates.get(deepRoom.id);
  territory.owner = null;
  territory.control = 0;
  territory.contested = false;

  assert.equal(sim.expeditionSystem.canEstablishCamp(party, members, deepRoom.id, sim), true, 'valid deep room was rejected for field camp construction');
  sim.expeditionSystem.establishCamp(leader, deepRoom.id, sim);

  const campProp = sim.props.find(prop => prop.type === 'adventurer_field_camp' && prop.roomId === deepRoom.id);
  const camp = [...sim.settlementSystem.settlements.values()].find(settlement => settlement.type === 'field-camp' && settlement.roomId === deepRoom.id);
  assert.ok(campProp, 'field camp world prop was not created');
  assert.ok(camp, 'field camp was not registered as a settlement');
  assert.equal(camp.capacity, 4, 'field camp capacity was not initialized');
  assert.equal(party.baseSettlementId, camp.id, 'party did not adopt the new field camp as its base');
  assert.equal(territory.owner, 'adventurer-expedition', 'field camp did not claim adventurer territorial control');
  assert.ok(sim.occupancy.snapshot().blocked.some(entry => entry.blockerId === campProp.id), 'field camp footprint was not blocked');

  leader.hp = Math.max(1, Math.floor(leader.maxHp * 0.3));
  leader.fatigue = 92;
  const hpBefore = leader.hp;
  const campEnduranceBefore = party.endurance;
  sim.expeditionSystem.restAtSettlement(leader, camp.id, sim);
  assert.ok(leader.hp > hpBefore, 'field camp rest did not restore health');
  assert.ok(leader.fatigue < 92, 'field camp rest did not reduce fatigue');
  assert.ok(party.endurance > campEnduranceBefore, 'field camp rest did not extend expedition endurance');

  for (const member of members) placeInRoom(sim, member, safeHub.roomId);
  const resupplyBefore = party.provisions;
  sim.expeditionSystem.updatePartyCondition(party, sim);
  assert.ok(party.provisions > resupplyBefore, 'safe hub did not replenish expedition provisions');

  const snapshot = sim.snapshot();
  const metrics = sim.metrics();
  assert.ok(Array.isArray(snapshot.expedition?.parties), 'expedition snapshot was not exposed');
  assert.ok(metrics.fieldCamps >= 1, 'field camp metric was not exposed');
  assert.ok(events.some(event => event.includes('established a field camp')), 'field camp construction did not emit a readable event');

  console.log(`phase8b expedition smoke passed with ${metrics.fieldCamps} field camp, ${party.provisions.toFixed(1)} provisions and ${events.length} events`);
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
