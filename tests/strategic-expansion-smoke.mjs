import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase8.js';
import { graphDistance } from '../src/sim/Pathfinding.js';

const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
const expanded = base.useGeneratedMap ? expandScenario(base) : base;
const scenario = applyPhase7Territories(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded))));
const events = [];
const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });

const party = [...sim.partySystem.parties.values()][0];
const members = party.memberIds.map(id => sim.agents.find(agent => agent.id === id)).filter(Boolean);
const leader = members.find(member => member.id === party.leaderId) ?? members[0];
const safeHub = sim.settlementSystem.settlements.get(sim.settlementSystem.safeSettlementId);
assert.ok(party && leader && safeHub, 'party expansion fixtures missing');

const campRooms = sim.rooms
  .filter(room => room.w * room.d >= 30 && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold'))
  .filter(room => graphDistance(sim.graph, safeHub.roomId, room.id) >= 3)
  .sort((a, b) => graphDistance(sim.graph, safeHub.roomId, a.id) - graphDistance(sim.graph, safeHub.roomId, b.id));
const firstRoom = campRooms[0];
const secondRoom = campRooms.find(room => graphDistance(sim.graph, firstRoom?.id, room.id) >= 3);
assert.ok(firstRoom && secondRoom, 'relay camp rooms missing');

preparePartyCamp(sim, party, members, firstRoom.id, safeHub.id);
assert.equal(sim.expeditionSystem.canEstablishCamp(party, members, firstRoom.id, sim), true, 'first camp was rejected');
sim.expeditionSystem.establishCamp(leader, firstRoom.id, sim);
assert.equal(sim.expeditionSystem.activePartyCamps(party).length, 1, 'first camp was not tracked');

preparePartyCamp(sim, party, members, secondRoom.id, party.baseSettlementId);
assert.equal(sim.expeditionSystem.canEstablishCamp(party, members, secondRoom.id, sim, { allowRelay: true }), true, 'relay camp was rejected');
sim.expeditionSystem.establishCamp(leader, secondRoom.id, sim, { allowRelay: true });
assert.equal(sim.expeditionSystem.activePartyCamps(party).length, 2, 'second relay camp was not established');

const monsterFixture = findMonsterFixture(sim);
assert.ok(monsterFixture, 'monster expansion fixture missing');
const { factionId, pioneer, origin, targetRoom } = monsterFixture;
placeInRoom(sim, pioneer, targetRoom.id);
const targetState = sim.territorySystem.roomStates.get(targetRoom.id);
targetState.owner = factionId;
targetState.control = 64;
targetState.contested = false;
origin.materials = Math.max(5, origin.materials ?? 0);
sim.territorySystem.factionSupply.set(factionId, 12);

const plan = {
  id: 'test-monster-expansion',
  key: `faction:${factionId}`,
  kind: 'monster',
  mode: 'securing',
  factionId,
  partyId: null,
  pioneerId: pioneer.id,
  originSettlementId: origin.id,
  targetRoomId: targetRoom.id,
  objective: 'forward-outpost',
  issuedAt: sim.time,
  expiresAt: sim.time + 90
};
sim.strategicExpansionSystem.plans.set(plan.key, plan);
assert.equal(sim.strategicExpansionSystem.canEstablishMonsterOutpost(plan, pioneer, sim), true, 'valid monster outpost was rejected');
assert.equal(sim.strategicExpansionSystem.establishMonsterOutpost(plan, pioneer, sim), true, 'monster outpost establishment failed');

const outpost = [...sim.settlementSystem.settlements.values()].find(settlement => settlement.type === 'forward-outpost' && settlement.roomId === targetRoom.id);
assert.ok(outpost, 'monster forward outpost settlement missing');
assert.equal(outpost.factionId, factionId, 'monster outpost faction mismatch');
assert.equal(pioneer.homeSettlementId, outpost.id, 'pioneer was not rehomed to the outpost');
assert.equal(pioneer.activity?.type, 'guarding-outpost', 'pioneer activity did not transition to garrisoning');
assert.ok(sim.props.some(prop => prop.settlementId === outpost.id), 'monster outpost world prop missing');
assert.ok(sim.occupancy.snapshot().blocked.some(entry => entry.blockerId?.startsWith('monster-forward-outpost-')), 'monster outpost footprint was not blocked');

const snapshot = sim.snapshot();
const metrics = sim.metrics();
assert.ok(Array.isArray(snapshot.expansion?.plans), 'expansion plans were not exposed in snapshot');
assert.ok(metrics.monsterForwardOutposts >= 1, 'monster outpost metric missing');
assert.ok(events.some(event => event.includes('forward outpost')), 'expansion event was not emitted');

console.log(`strategic expansion smoke passed with ${sim.expeditionSystem.activePartyCamps(party).length} party camps and ${metrics.monsterForwardOutposts} monster outpost`);

function preparePartyCamp(sim, party, members, roomId, baseSettlementId) {
  for (const hostile of sim.agents.filter(agent => agent.faction === 'dungeon' && agent.roomId === roomId)) hostile.hidden = true;
  for (const member of members) placeInRoom(sim, member, roomId);
  party.endurance = 100;
  party.expeditionTime = 70;
  party.provisions = 14;
  party.water = 12;
  party.medicine = 4;
  party.materials = 8;
  party.baseSettlementId = baseSettlementId;
  party.campCooldown = 0;
  const territory = sim.territorySystem.roomStates.get(roomId);
  territory.owner = null;
  territory.control = 0;
  territory.contested = false;
  territory.challenger = null;
}

function findMonsterFixture(sim) {
  const settlements = [...sim.settlementSystem.settlements.values()].filter(settlement =>
    !settlement.indestructible && settlement.state !== 'ruined' && (settlement.materials ?? 0) >= 0
  );
  for (const origin of settlements) {
    const pioneer = sim.agents.find(agent => agent.alive && agent.faction === 'dungeon' && agent.ecologyFaction === origin.factionId && ['goblin', 'kobold', 'orc', 'ogre', 'skeleton', 'zombie'].includes(agent.role));
    if (!pioneer) continue;
    const targetRoom = sim.rooms.find(room =>
      room.w * room.d >= 20 &&
      !room.tags?.includes('safe_zone') &&
      !room.tags?.includes('entrance_threshold') &&
      ![...sim.settlementSystem.settlements.values()].some(settlement => settlement.roomId === room.id && settlement.state !== 'ruined') &&
      !sim.agents.some(agent => agent.alive && !agent.hidden && agent.ecologyFaction && agent.ecologyFaction !== origin.factionId && agent.roomId === room.id)
    );
    if (targetRoom) return { factionId: origin.factionId, pioneer, origin, targetRoom };
  }
  return null;
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
