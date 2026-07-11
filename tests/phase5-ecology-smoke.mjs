import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase5.js';

const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren');
const scenario = applyPhase5Ecology(applyPhase2Facilities(expandScenario(base)));
const events = [];
const sim = new DungeonSim(scenario, { onEvent: event => events.push(event.text) });

const requiredLairs = ['goblin_lair', 'ossuary_lair', 'spider_lair', 'slime_pool', 'rat_warren', 'ogre_lair'];
for (const type of requiredLairs) {
  assert.ok(sim.props.some(prop => prop.type === type), `missing ecology prop ${type}`);
}
assert.ok(sim.agents.filter(agent => agent.role === 'rat').length >= 2, 'rat population was not seeded');
assert.ok(sim.agents.filter(agent => agent.role === 'spider').length >= 1, 'spider population was not seeded');

const goblin = sim.agents.find(agent => agent.role === 'goblin' && agent.alive);
assert.ok(goblin, 'missing goblin corpse source');
const corpseRoom = goblin.roomId;
sim.finalizeDeath(null, goblin);
assert.equal(goblin.alive, false, 'finalized goblin should be dead');
assert.ok(sim.ecosystem.corpses.some(corpse => corpse.sourceId === goblin.id), 'death did not create a corpse resource');

const slime = sim.agents.find(agent => agent.role === 'slime' && agent.alive);
assert.ok(slime, 'missing slime corpse consumer');
sim.occupancy.release(slime.id);
slime.roomId = corpseRoom;
slime.travel = null;
sim.occupancy.placeAgent(slime, corpseRoom);
slime.hunger = 90;
const corpse = sim.ecosystem.corpses.find(candidate => candidate.sourceId === goblin.id);
const slimeLair = sim.ecosystem.lairs.get('slime');
const biomassBefore = slimeLair.biomass;
assert.equal(sim.ecosystem.resolve(slime, { type: 'eco-consume-corpse', corpseId: corpse.id }, sim), true);
assert.ok(slimeLair.biomass > biomassBefore, 'slime did not convert corpse to biomass');
assert.ok(!sim.ecosystem.corpses.some(candidate => candidate.id === corpse.id), 'consumed corpse remained in world state');

const ogre = sim.agents.find(agent => agent.role === 'ogre' && agent.alive);
const rat = sim.agents.find(agent => agent.role === 'rat' && agent.alive);
assert.ok(ogre && rat, 'missing predator or prey');
sim.occupancy.release(rat.id);
rat.roomId = ogre.roomId;
rat.travel = null;
sim.occupancy.placeAgent(rat, ogre.roomId);
ogre.hunger = 95;
assert.equal(sim.ecosystem.resolve(ogre, { type: 'eco-devour', targetId: rat.id }, sim), true);
assert.equal(rat.alive, false, 'predated rat remained alive');
assert.ok(!sim.ecosystem.corpses.some(candidate => candidate.sourceId === rat.id), 'devoured prey incorrectly produced a corpse');

sim.ecosystem.tryReproduction(sim);
assert.ok(sim.ecosystem.pendingSpawns.length > 0, 'lair resources did not create a staged birth');
assert.ok(sim.ecosystem.pendingSpawns.every(spawn => spawn.progress === 0 && spawn.duration > 0), 'birth did not begin as a timed omen');

const spider = sim.agents.find(agent => agent.role === 'spider' && agent.alive);
const host = sim.agents.find(agent => agent.faction === 'party');
assert.ok(spider && host, 'missing spider or adventurer host');
host.queued = false;
host.departed = false;
host.alive = true;
host.downed = true;
host.bleedout = 12;
host.hidden = false;
host.roomId = spider.roomId;
host.travel = null;
sim.occupancy.release(host.id);
sim.occupancy.placeAgent(host, spider.roomId);
assert.equal(sim.ecosystem.resolve(spider, { type: 'eco-cocoon', targetId: host.id }, sim), true);
assert.equal(host.hosted, true, 'downed adventurer was not converted into a living host');
assert.ok(spider.carryingHostId, 'spider did not carry the host');
assert.equal(sim.ecosystem.hosts.length, 1, 'host entity was not recorded');

spider.roomId = spider.homeRoomId;
spider.travel = null;
sim.ecosystem.updateCarriedHosts(sim);
assert.equal(sim.ecosystem.hosts[0].deposited, true, 'host was not deposited at the spider lair');
assert.ok(sim.ecosystem.pendingSpawns.some(spawn => spawn.sourceHostId === sim.ecosystem.hosts[0].id), 'deposited host did not begin spider development');

const snapshot = sim.snapshot();
assert.ok(snapshot.ecology, 'ecology snapshot missing');
assert.ok(Array.isArray(snapshot.ecology.corpses), 'corpse snapshot missing');
assert.ok(Array.isArray(snapshot.ecology.hosts), 'host snapshot missing');
assert.ok(Array.isArray(snapshot.ecology.pendingSpawns), 'spawn omen snapshot missing');

console.log(`phase5 ecology smoke passed with ${events.length} events and ${snapshot.ecology.pendingSpawns.length} developing births`);
