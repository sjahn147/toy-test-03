import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAuthoredCampaignLayout } from '../src/content/layout/AuthoredCampaignLayout.js';
import { getCampaignSpawnNetwork } from '../src/content/spawn/SpawnNetworkCatalog.js';
import { SpawnNetworkSystem } from '../src/sim/SpawnNetworkSystem.js';

const manifest = JSON.parse(await readFile(new URL('./sleeping-citadel-manifest-min.json', import.meta.url), 'utf8'));
manifest.entryRoomId = 'A01';
const layout = getAuthoredCampaignLayout(manifest);
const spawnNetwork = getCampaignSpawnNetwork(manifest);
const rooms = manifest.rooms.map(room => ({
  id: room.id,
  name: room.id,
  w: room.size[0],
  d: room.size[1],
  tags: room.id[0] === 'A' ? ['safe_zone'] : [],
  ...layout.rooms[room.id]
}));
const graph = graphFrom(layout.routes.filter(route => route.kind === 'ordinary').map(route => [route.from, route.to]));
const events = [];
const sim = {
  rooms,
  graph,
  agents: [
    { id: 'party-1', name: 'Rana', role: 'fighter', faction: 'party', alive: true, roomId: 'A01' },
    { id: 'goblin-1', name: 'Goblin A', role: 'goblin', faction: 'dungeon', ecologyFaction: 'goblin-clan', alive: true, roomId: 'D19' }
  ],
  ecosystem: { corpses: [] },
  spawnEcologyMonster(species, roomId) {
    const agent = { id: `basic-${species}-${this.agents.length}`, name: `${species} spawn`, role: species, faction: 'dungeon', alive: true, roomId };
    this.agents.push(agent);
    return agent;
  },
  spawnAdvancedMonster(species, roomId) {
    const agent = { id: `advanced-${species}-${this.agents.length}`, name: `${species} spawn`, role: species, faction: 'dungeon', alive: true, roomId };
    this.agents.push(agent);
    return agent;
  }
};
const system = new SpawnNetworkSystem({ scenario: { meta: { spawnNetwork } }, onEvent: (text, meta) => events.push({ text, meta }) });
sim.spawnNetworkSystem = system;
system.initialize(sim);
assert.equal(sim.agents[1].homeSiteId, 'site.goblin.D19.core');
assert.equal(system.activeSites().length, 24);

// Isolate one finite field camp and prove telegraph -> spawn -> site identity.
for (const site of system.sites.values()) site.state = 'dormant';
const camp = system.sites.get('site.kobold.C14.repair-post');
camp.state = 'active';
camp.requiresSupplyRoute = false;
camp.spawnCharges = 1;
camp.supply.scrap = 2;
for (let i = 0; i < 5; i += 1) system.update(1.1, sim);
const newborn = sim.agents.find(agent => agent.birthSiteId === camp.id);
assert.ok(newborn, 'field camp must create a new agent after a visible telegraph');
assert.equal(newborn.homeSiteId, camp.id);
assert.equal(newborn.factionCapitalRoomId, 'D18');
assert.ok(events.some(event => event.meta?.type === 'spawn-site-telegraph'));
assert.ok(events.some(event => event.meta?.type === 'spawn-site-birth'));

// A party standing on the socket suppresses pop-in spawning.
for (const site of system.sites.values()) site.state = 'dormant';
const blocked = system.sites.get('site.goblin.D17.salvage-post');
blocked.state = 'active';
blocked.requiresSupplyRoute = false;
blocked.spawnCharges = 1;
blocked.supply.food = 2;
sim.agents.push({ id: 'party-block', name: 'Observer', role: 'fighter', faction: 'party', alive: true, roomId: blocked.roomId });
const before = sim.agents.length;
for (let i = 0; i < 6; i += 1) system.update(1.1, sim);
assert.equal(sim.agents.length, before);

// Three unattended corpses can leak a late-game undead site into a non-safe front room.
for (const site of system.sites.values()) site.state = 'dormant';
sim.agents = sim.agents.filter(agent => agent.id !== 'party-block');
sim.ecosystem.corpses = [0, 1, 2].map(index => ({ id: `corpse-${index}`, roomId: 'B09' }));
for (let i = 0; i < 5; i += 1) system.update(1.1, sim);
assert.ok([...system.sites.values()].some(site => site.roomId === 'B09' && site.factionId === 'undead-host' && site.type === 'emergent'));

// A supplied field camp is abandoned when the active graph is cut long enough.
const isolatedConfig = structuredClone(spawnNetwork);
const isolatedSystem = new SpawnNetworkSystem({ scenario: { meta: { spawnNetwork: isolatedConfig } } });
const isolatedSim = { ...sim, graph: new Map(rooms.map(room => [room.id, new Set()])), agents: [] };
isolatedSystem.initialize(isolatedSim);
const isolatedSite = isolatedSystem.sites.get('site.kobold.C14.repair-post');
for (let i = 0; i < 22; i += 1) isolatedSystem.update(1.1, isolatedSim);
assert.equal(isolatedSite.state, 'abandoned');
assert.ok(isolatedSystem.metrics().spawnSitesAbandoned >= 1);

console.log(JSON.stringify({ events: events.length, sites: system.sites.size, metrics: system.metrics() }, null, 2));

function graphFrom(links) {
  const graph = new Map();
  for (const [a, b] of links) {
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a).add(b);
    graph.get(b).add(a);
  }
  return graph;
}
