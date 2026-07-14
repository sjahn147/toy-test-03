import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCampaign } from '../src/content/ScenarioCompiler.js';
import { DungeonSim } from '../src/sim/DungeonSim.js';
const manifest=JSON.parse(await read('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const catalog=JSON.parse(await read('../content/assets/asset-catalog.json'));
const {scenario}=compileCampaign({manifest,assetCatalog:catalog});
const sim=new DungeonSim(scenario);
assert.equal(sim.routeState('conn-C15-F26').id,'VC-02');
assert.equal(sim.graph.get('C15').includes('F26'),false);
let result=sim.setRouteState('conn-C15-F26','opened',{source:'test'});
assert.equal(result.ok,true);assert.equal(sim.graph.get('C15').includes('F26'),true);
result=sim.setRouteState('secret-B10-E21','opened',{source:'test'});
assert.equal(result.ok,true);assert.equal(sim.graph.get('B10').includes('E21'),true);
assert.equal(sim.snapshot().verticalConnectors.length,9);
sim.destroy();
console.log('campaign route/connector state smoke passed');
async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8');}
