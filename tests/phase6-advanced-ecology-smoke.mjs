import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase6.js';

const originalRandom = Math.random;
let randomState = 246813579;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

try {
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded)));
  const events = [];
  const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });

  const requiredLairs = [
    'plague_mortuary', 'orc_tribe_camp', 'fungal_garden', 'blood_roost',
    'carrion_pit', 'kobold_workshop', 'cursed_chapel', 'parasite_pool'
  ];
  const requiredRoles = ['zombie', 'orc', 'myconid', 'stirge', 'carrion', 'kobold', 'wraith', 'parasite'];
  for (const type of requiredLairs) assert.ok(sim.props.some(prop => prop.type === type), `missing ${type}`);
  for (const role of requiredRoles) assert.ok(sim.agents.some(agent => agent.role === role), `missing ${role}`);

  const orc = active(sim, 'orc');
  assert.equal(orc.maxHp, 22, 'advanced orc stats were not normalized');
  assert.equal(orc.attack, 6, 'advanced orc attack was not normalized');
  assert.equal(orc.hp, orc.maxHp, 'advanced orc did not begin at full health');
  assert.ok(sim.advancedEcology.territories.size > 0, 'territory map was not initialized');

  const zombie = active(sim, 'zombie');
  const goblinA = active(sim, 'goblin');
  const zombieStock = sim.advancedEcology.lairs.get('zombie').corpseStock;
  sim.finalizeDeath(null, goblinA);
  const plagueCorpse = sim.ecosystem.corpses.find(corpse => corpse.sourceId === goblinA.id);
  assert.ok(plagueCorpse, 'combat death did not create a corpse for plague use');
  assert.equal(sim.advancedEcology.resolve(zombie, { type: 'zombie-claim-corpse', corpseId: plagueCorpse.id }, sim), true);
  assert.ok(sim.advancedEcology.lairs.get('zombie').corpseStock > zombieStock, 'zombie did not bank corpse stock');
  assert.ok(!sim.ecosystem.corpses.some(corpse => corpse.id === plagueCorpse.id), 'claimed plague corpse remained visible');

  const myconid = active(sim, 'myconid');
  const ratA = active(sim, 'rat');
  sim.finalizeDeath(null, ratA);
  const fungalCorpse = sim.ecosystem.corpses.find(corpse => corpse.sourceId === ratA.id);
  const sporeBefore = sim.advancedEcology.lairs.get('myconid').sporeStock;
  sim.advancedEcology.resolve(myconid, { type: 'myconid-decompose', corpseId: fungalCorpse.id }, sim);
  assert.ok(sim.advancedEcology.lairs.get('myconid').sporeStock > sporeBefore, 'myconid did not convert corpse to spores');

  const carrion = active(sim, 'carrion');
  const skeleton = active(sim, 'skeleton');
  sim.finalizeDeath(null, skeleton);
  const carrionCorpse = sim.ecosystem.corpses.find(corpse => corpse.sourceId === skeleton.id);
  const carrionBefore = sim.advancedEcology.lairs.get('carrion').carrionStock;
  sim.advancedEcology.resolve(carrion, { type: 'carrion-feed', corpseId: carrionCorpse.id }, sim);
  assert.ok(sim.advancedEcology.lairs.get('carrion').carrionStock > carrionBefore, 'carrion crawler did not bank carrion');

  const stirge = active(sim, 'stirge');
  const hostA = party(sim, 0);
  placeTogether(sim, stirge, hostA);
  const hpBeforeStirge = hostA.hp;
  sim.advancedEcology.resolve(stirge, { type: 'stirge-attach', targetId: hostA.id }, sim);
  assert.equal(stirge.hidden, true, 'attached stirge was not replaced by attachment rendering state');
  assert.equal(sim.advancedEcology.attachments.length, 1, 'stirge attachment was not recorded');
  sim.advancedEcology.updateAttachments(1.6, sim);
  assert.ok(hostA.hp < hpBeforeStirge, 'attached stirge did not drain health');
  sim.advancedEcology.updateAttachments(6.5, sim);
  assert.equal(sim.advancedEcology.attachments.length, 0, 'stirge failed to detach after feeding');
  assert.equal(stirge.hidden, false, 'detached stirge did not return to the room');

  const sleepingHost = party(sim, 1);
  placeTogether(sim, myconid, sleepingHost);
  sim.advancedEcology.resolve(myconid, { type: 'spore-burst' }, sim);
  assert.ok(sleepingHost.sporeSleep > 0, 'myconid spore burst did not apply sleep');

  const parasiteA = active(sim, 'parasite');
  const infectedHost = party(sim, 2);
  infectedHost.hp = Math.max(1, Math.floor(infectedHost.maxHp * 0.4));
  placeTogether(sim, parasiteA, infectedHost);
  sim.advancedEcology.resolve(parasiteA, { type: 'parasite-infect', targetId: infectedHost.id }, sim);
  assert.equal(infectedHost.infected, true, 'parasite infection flag missing');
  assert.equal(sim.advancedEcology.infections.length, 1, 'parasite infection state missing');
  const safeRoom = sim.rooms.find(room => room.tags?.includes('safe_zone'));
  assert.ok(safeRoom, 'safe room missing');
  placeInRoom(sim, infectedHost, safeRoom.id);
  sim.advancedEcology.updateInfections(0.5, sim);
  assert.equal(infectedHost.infected, false, 'sanctuary failed to remove parasite infection');

  const parasiteB = active(sim, 'parasite');
  const burstHost = party(sim, 3);
  burstHost.hp = Math.max(1, Math.floor(burstHost.maxHp * 0.4));
  placeTogether(sim, parasiteB, burstHost);
  sim.advancedEcology.resolve(parasiteB, { type: 'parasite-infect', targetId: burstHost.id }, sim);
  const infection = sim.advancedEcology.infections.find(item => item.targetId === burstHost.id);
  assert.ok(infection, 'second parasite infection missing');
  sim.advancedEcology.updateInfections(infection.duration + 0.1, sim);
  assert.equal(burstHost.downed, true, 'completed parasite infection did not down the host');
  assert.ok(sim.advancedEcology.pendingSpawns.filter(spawn => spawn.species === 'parasite').length >= 2, 'infection did not stage larval births');

  const kobold = active(sim, 'kobold');
  const koboldLair = sim.advancedEcology.lairs.get('kobold');
  koboldLair.scrapStock = 5;
  const trapRoom = (sim.graph.get(kobold.homeRoomId) ?? []).find(roomId => !sim.rooms.find(room => room.id === roomId)?.tags?.includes('safe_zone'));
  assert.ok(trapRoom, 'no legal room for kobold trap');
  sim.advancedEcology.resolve(kobold, { type: 'kobold-build-trap', roomId: trapRoom }, sim);
  const trap = sim.advancedEcology.traps[0];
  assert.ok(trap, 'kobold did not build a trap');
  const trapTarget = party(sim, 0);
  for (const member of sim.agents.filter(agent => agent.faction === 'party' && agent.id !== trapTarget.id)) {
    member.hidden = true;
    sim.occupancy.release(member.id);
  }
  placeInRoom(sim, trapTarget, trapRoom);
  trapTarget.hp = trapTarget.maxHp;
  const hpBeforeTrap = trapTarget.hp;
  sim.advancedEcology.updateTraps(0.1, sim);
  assert.ok(trapTarget.hp < hpBeforeTrap, 'kobold trap did not deal damage');
  assert.ok(trapTarget.webbed > 0, 'kobold trap did not restrain the target');

  const wraith = active(sim, 'wraith');
  const drainTarget = party(sim, 1);
  placeTogether(sim, wraith, drainTarget);
  const deathEnergyBefore = sim.advancedEcology.lairs.get('wraith').deathEnergy;
  sim.advancedEcology.resolve(wraith, { type: 'wraith-drain', targetId: drainTarget.id }, sim);
  assert.ok(sim.advancedEcology.lairs.get('wraith').deathEnergy > deathEnergyBefore, 'wraith drain did not create death energy');

  const ratB = active(sim, 'rat');
  placeTogether(sim, orc, ratB);
  orc.hunger = 95;
  const meatBefore = sim.advancedEcology.lairs.get('orc').meatStock;
  sim.advancedEcology.resolve(orc, { type: 'orc-devour', targetId: ratB.id }, sim);
  assert.equal(ratB.alive, false, 'orc prey remained alive');
  assert.ok(sim.advancedEcology.lairs.get('orc').meatStock > meatBefore, 'orc did not bank meat after predation');

  const rivalKobold = active(sim, 'kobold');
  const contestRoom = sim.rooms.find(room =>
    !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold') && room.kind !== 'start' &&
    !sim.agents.some(agent =>
      agent.alive && !agent.hidden && agent.faction === 'dungeon' && agent.id !== orc.id && agent.id !== rivalKobold.id && agent.roomId === room.id
    )
  )?.id ?? sim.rooms.find(room => !room.tags?.includes('safe_zone') && room.kind !== 'start')?.id;
  assert.ok(contestRoom, 'no room available for territory test');
  for (const occupant of sim.agents.filter(agent =>
    agent.alive && agent.faction === 'dungeon' && agent.id !== orc.id && agent.id !== rivalKobold.id && agent.roomId === contestRoom
  )) {
    occupant.hidden = true;
    sim.occupancy.release(occupant.id);
  }
  placeInRoom(sim, orc, contestRoom);
  placeInRoom(sim, rivalKobold, contestRoom);
  sim.advancedEcology.updateTerritories(sim);
  assert.equal(sim.advancedEcology.territories.get(contestRoom).contested, true, 'rival factions did not contest a shared room');
  sim.occupancy.release(rivalKobold.id);
  rivalKobold.roomId = rivalKobold.homeRoomId;
  rivalKobold.hidden = true;
  for (let i = 0; i < 5; i += 1) sim.advancedEcology.updateTerritories(sim);
  assert.equal(sim.advancedEcology.territories.get(contestRoom).ownerFaction, orc.ecologyFaction, 'dominant faction failed to capture the room');

  const zombieLair = sim.advancedEcology.lairs.get('zombie');
  zombieLair.corpseStock = 2;
  sim.advancedEcology.tryReproduction(sim);
  assert.ok(sim.advancedEcology.pendingSpawns.some(spawn => spawn.species === 'zombie'), 'advanced lair resources did not begin a birth');

  const snapshot = sim.snapshot();
  assert.ok(snapshot.advancedEcology, 'advanced ecology snapshot missing');
  assert.ok(Array.isArray(snapshot.advancedEcology.territories), 'territory snapshot missing');
  assert.ok(Array.isArray(snapshot.advancedEcology.traps), 'trap snapshot missing');
  assert.ok(Array.isArray(snapshot.advancedEcology.infections), 'infection snapshot missing');

  console.log(`phase6 advanced ecology smoke passed with ${events.length} events, ${snapshot.advancedEcology.territories.length} territories and ${snapshot.advancedEcology.pendingSpawns.length} births`);
} finally {
  Math.random = originalRandom;
}

function active(sim, role) {
  const agent = sim.agents.find(candidate => candidate.role === role && candidate.alive && !candidate.departed && !candidate.hidden);
  assert.ok(agent, `missing active ${role}`);
  return agent;
}

function party(sim, index) {
  const members = sim.agents.filter(agent => agent.faction === 'party');
  const agent = members[index % members.length];
  assert.ok(agent, 'missing party member');
  agent.queued = false;
  agent.departed = false;
  agent.alive = true;
  agent.downed = false;
  agent.hidden = false;
  agent.travel = null;
  return agent;
}

function placeTogether(sim, source, target) {
  placeInRoom(sim, target, source.roomId);
}

function placeInRoom(sim, agent, roomId) {
  sim.occupancy.release(agent.id);
  sim.occupancy.cancelReservation(agent.id);
  agent.roomId = roomId;
  agent.travel = null;
  agent.hidden = false;
  sim.occupancy.placeAgent(agent, roomId);
}
