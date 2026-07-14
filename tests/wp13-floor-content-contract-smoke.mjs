import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCampaign } from '../src/content/ScenarioCompiler.js';
import { getAuthoredCampaignLayout, authoredRouteSummary } from '../src/content/layout/AuthoredCampaignLayout.js';

const manifest = JSON.parse(await read('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const catalog = JSON.parse(await read('../content/assets/asset-catalog.json'));
assert.deepEqual(manifest.floors.map(floor => [floor.id, floor.roomIds.length]), [['F0',5],['B1',27],['B2',28],['B3',3]]);
assert.equal(manifest.verticalConnectors.length, 9);
assert.equal(new Set(manifest.rooms.map(room => room.floorId)).size, 4);
for (const room of manifest.rooms) assert.ok(['F0','B1','B2','B3'].includes(room.floorId));

const layout = getAuthoredCampaignLayout(manifest);
const summary = authoredRouteSummary(layout);
assert.equal(summary.connectors, 9);
assert.deepEqual(summary.floors, [-3,-2,-1,0]);
assert.ok(summary.junctions >= 0);
for (const route of layout.routes) {
  assert.equal(route.vertical, false, `${route.id} must be horizontal`);
  assert.equal(route.fromFloor, route.toFloor, `${route.id} crosses floor indices`);
  assert.equal(route.floorId, layout.rooms[route.from].floorId);
  assert.equal(route.floorId, layout.rooms[route.to].floorId);
  assert.equal(route.elevation, 0);
  assert.equal(route.points.some(point => 'yOffset' in point), false);
}
for (const connector of layout.verticalConnectors) {
  assert.notEqual(connector.from.floorId, connector.to.floorId);
  assert.deepEqual(connector.from.position, connector.to.position);
}
const { scenario, report } = compileCampaign({ manifest, assetCatalog:catalog });
assert.equal(report.missingBundles.length, 0);
assert.equal(scenario.rooms.length, 63);
assert.equal(scenario.floors.length, 4);
assert.equal(scenario.verticalConnectors.length, 9);
assert.ok(scenario.routes.length > 70);
console.log('WP13 floor content contract smoke passed');
async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8');}
