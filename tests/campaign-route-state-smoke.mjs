import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCampaign } from '../src/content/ScenarioCompiler.js';
import { DungeonSim } from '../src/sim/DungeonSim.js';
import { normalizeLegacySnapshot } from '../src/compat/normalizeLegacySnapshot.js';

const manifest = JSON.parse(await source('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const catalog = JSON.parse(await source('../content/assets/asset-catalog.json'));
const { scenario } = compileCampaign({ manifest, assetCatalog: catalog });
const events = [];
const sim = new DungeonSim(scenario, { onEvent: event => events.push(event) });

assert.equal(sim.routeState('secret-B08-H39').state, 'hidden');
assert.equal(sim.graph.get('B08').includes('H39'), false);
assert.equal(sim.topology.connectionById.has('secret-B08-H39'), false);

let result = sim.setRouteState('secret-B08-H39', 'discovered', { source: 'test' });
assert.equal(result.ok, true);
assert.equal(sim.graph.get('B08').includes('H39'), false);
result = sim.setRouteState('secret-B08-H39', 'opened', { source: 'test' });
assert.equal(result.ok, true);
assert.equal(sim.graph.get('B08').includes('H39'), true);
assert.equal(sim.topology.connectionById.has('secret-B08-H39'), true);

const agent = sim.agents[0];
agent.roomId = 'B08';
agent.travel = null;
sim.beginTravel(agent, 'H39');
assert.equal(agent.travel.connectionId, 'secret-B08-H39');
sim.setRouteState('secret-B08-H39', 'collapsed', { source: 'test' });
assert.equal(agent.travel, null, 'closing an active route must cancel travel safely');
assert.equal(agent.roomId, 'B08');
assert.equal(agent.mood, 'route-blocked');

assert.equal(sim.graph.get('C15').includes('F26'), false);
sim.setRouteState('conn-C15-F26', 'opened');
assert.equal(sim.graph.get('C15').includes('F26'), true);

const raw = sim.snapshot();
assert.equal(raw.routes.length, 90);
// secret-B08-H39 round-trips hidden -> opened -> collapsed, net zero (it was
// never counted active while hidden, and collapsed is inactive too); the
// conditional conn-C15-F26 genuinely transitions locked -> opened, which is
// its one traversable state, so it adds one newly-active link on top of the
// 80-route ordinary baseline.
assert.equal(raw.links.length, 81, 'the newly opened conditional route adds one active link over the ordinary baseline');
assert.ok(raw.routeGraphVersion > 1);
const normalized = normalizeLegacySnapshot(raw, { events });
assert.equal(Object.keys(normalized.entities.connections).length, 90);
assert.equal(normalized.entities.connections['conn-C15-F26'].state, 'opened');
assert.equal(normalized.entities.connections['secret-B08-H39'].state, 'collapsed');
assert.ok(events.some(event => event.type === 'route-state'));

sim.destroy();
console.log('campaign route state smoke passed');

async function source(relativePath) { return readFile(new URL(relativePath, import.meta.url), 'utf8'); }
