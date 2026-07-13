import assert from 'node:assert/strict';
import { EliteEcologySystem } from '../src/sim/EliteEcologySystem.js';

const site = {
  id: 'site.goblin.D19.core', factionId: 'goblin-clan', species: ['goblin'], roomId: 'D19', type: 'core', tier: 2,
  state: 'active', spawned: 2, localPopulation: 0, capacity: 8, supply: { food: 20, scrap: 20, stolenGoods: 20, powder: 10 }
};
const network = { factionId: 'goblin-clan', coreSiteId: site.id, siteIds: new Set([site.id]), globalPopulation: 1, globalPopulationCap: 30 };
const sim = {
  time: 0,
  agents: [],
  rooms: [{ id: 'D19', w: 21, d: 16 }],
  spawnNetworkSystem: { sites: new Map([[site.id, site]]), networks: new Map([[network.factionId, network]]), coreSite: () => site },
  occupancy: { placed: [], placeAgent(agent, roomId) { this.placed.push([agent.id, roomId]); } },
  combatSystem: { initializeAgent(agent) { agent.combat ??= null; } }
};

const system = new EliteEcologySystem();
system.initialize(sim);
const selected = system.selectSpawnRole(site, network, sim);
assert.ok(selected, 'core site cycle should select a veteran or specialist');
assert.ok(['goblin-tollmaster', 'goblin-scrap-warden', 'goblin-bombardier'].includes(selected.role));
const before = Object.values(site.supply).reduce((a, b) => a + b, 0);
const spawned = system.spawn(selected.role, site, network, sim);
assert.ok(spawned?.alive);
assert.equal(spawned.homeSiteId, site.id);
assert.equal(spawned.ecologyFaction, 'goblin-clan');
assert.ok(spawned.populationCost >= 2);
assert.equal(sim.occupancy.placed.length, 1);
assert.ok(Object.values(site.supply).reduce((a, b) => a + b, 0) < before, 'elite production consumes network resources');

system.onAgentDeath(spawned, sim);
assert.equal(system.metrics().eliteAgentsActive, 0);
console.log('WP7-C elite ecology smoke passed');
