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
let randomState = 19790517;
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
  const members = party.memberIds.map(id => sim.agents.find(agent => agent.id === id)).filter(Boolean);
  const leader = members.find(member => member.id === party.leaderId) ?? members[0];
  const safeHub = sim.settlementSystem.settlements.get(sim.settlementSystem.safeSettlementId);
  assert.ok(party && leader && safeHub && members.length >= 3, 'camp-life fixtures missing');

  const campRoom = sim.rooms
    .filter(room => room.w * room.d >= 30 && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold'))
    .sort((a, b) => graphDistance(sim.graph, safeHub.roomId, b.id) - graphDistance(sim.graph, safeHub.roomId, a.id))[0];
  assert.ok(campRoom, 'no field camp room available');
  for (const hostile of sim.agents.filter(agent => agent.faction === 'dungeon' && agent.roomId === campRoom.id)) hostile.hidden = true;
  for (const member of members) placeInRoom(sim, member, campRoom.id);

  party.endurance = 72;
  party.expeditionTime = 70;
  party.provisions = 12;
  party.water = 10;
  party.materials = 8;
  party.baseSettlementId = safeHub.id;
  party.campCooldown = 0;
  const territory = sim.territorySystem.roomStates.get(campRoom.id);
  territory.owner = null;
  territory.control = 0;
  territory.contested = false;
  sim.expeditionSystem.establishCamp(leader, campRoom.id, sim);
  const camp = sim.settlementSystem.settlements.get(party.baseSettlementId);
  assert.equal(camp?.type, 'field-camp', 'field camp was not established');

  members.forEach((member, index) => {
    member.hunger = index === 0 ? 72 : 48 + index * 4;
    member.fatigue = index === 1 ? 82 : 58 + index * 3;
    member.hp = Math.max(1, Math.floor(member.maxHp * (index === 1 ? 0.58 : 0.76)));
    member.activity = null;
  });

  sim.campLifeSystem.update(2, sim);
  const assigned = members.map(member => member.activity).filter(activity => activity?.source === 'camp-life');
  assert.ok(assigned.length >= 3, 'camp routine did not assign visible activities');
  assert.ok(assigned.some(activity => activity.type === 'guarding'), 'camp routine did not maintain a sentry');
  assert.ok(assigned.some(activity => activity.type === 'cooking'), 'camp routine did not assign a cook');
  assert.ok(assigned.every(activity => activity.anchor && Number.isFinite(activity.anchor.ox) && Number.isFinite(activity.anchor.oz)), 'camp activities lacked authored anchors');
  assert.ok(assigned.every(activity => activity.prop), 'camp activities lacked visible props');
  assert.equal(new Set(assigned.map(activity => activity.anchor.slotId)).size, assigned.length, 'camp activities overlapped the same semantic anchor');

  const cook = members.find(member => member.activity?.type === 'cooking');
  const provisionsBefore = party.provisions;
  const waterBefore = party.water;
  sim.time = cook.activity.endsAt + 0.01;
  sim.campLifeSystem.updateActivities(sim);
  assert.ok((camp.mealServings ?? 0) >= 3, 'cooking did not produce meal servings');
  assert.ok(party.provisions < provisionsBefore && party.water < waterBefore, 'cooking did not consume expedition supplies');

  const eater = members.find(member => member.activity?.type === 'eating') ?? members.find(member => member.activity == null && member.id !== cook.id);
  if (!eater.activity) sim.campLifeSystem.assignActivity(eater, 'eating', camp, sim, { group: 'party', partyId: party.id });
  const hungerBefore = eater.hunger;
  sim.time = eater.activity.endsAt + 0.01;
  sim.campLifeSystem.updateActivities(sim);
  assert.ok(eater.hunger < hungerBefore, 'eating did not reduce hunger');

  const sleeper = members.find(member => member.activity?.type === 'sleeping') ?? members.find(member => member.activity == null && member.id !== cook.id && member.id !== eater.id);
  if (!sleeper.activity) sim.campLifeSystem.assignActivity(sleeper, 'sleeping', camp, sim, { group: 'party', partyId: party.id });
  const fatigueBefore = sleeper.fatigue;
  const hpBefore = sleeper.hp;
  sim.time = sleeper.activity.endsAt + 0.01;
  sim.campLifeSystem.updateActivities(sim);
  assert.ok(sleeper.fatigue < fatigueBefore && sleeper.hp >= hpBefore, 'sleeping did not restore the agent');

  const guard = members.find(member => member.activity?.type === 'guarding') ?? members.find(member => member.activity == null);
  if (!guard.activity) sim.campLifeSystem.assignActivity(guard, 'guarding', camp, sim, { group: 'party', partyId: party.id });
  const controlBefore = territory.control;
  sim.time = guard.activity.endsAt + 0.01;
  sim.campLifeSystem.updateActivities(sim);
  assert.ok(territory.control > controlBefore, 'sentry duty did not stabilize occupation control');
  assert.ok((camp.guardReadiness ?? 0) > 0.35, 'sentry duty did not improve guard readiness');

  sim.campLifeSystem.assignActivity(leader, 'resting', camp, sim, { group: 'party', partyId: party.id });
  leader.combat = { phase: 'windup' };
  sim.campLifeSystem.updateActivities(sim);
  assert.equal(leader.activity, null, 'combat did not interrupt camp life safely');
  leader.combat = null;

  const snapshot = sim.snapshot();
  const metrics = sim.metrics();
  assert.ok(Array.isArray(snapshot.campLife?.activities), 'camp-life snapshot was not exposed');
  assert.ok(Number.isFinite(metrics.campLifeActivities), 'camp-life metrics were not exposed');
  assert.ok(events.some(event => event.includes('guarded camp routine')), 'camp routine did not emit a readable event');
  assert.ok(events.some(event => event.includes('hot meal')), 'meal completion did not emit a readable event');

  console.log(`camp life immersion smoke passed with ${assigned.length} anchored activities, ${camp.mealServings ?? 0} servings and ${Math.round(territory.control)} control`);
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