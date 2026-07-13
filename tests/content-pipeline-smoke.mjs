import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSleepingCitadel, loadSchemas } from '../src/content/loadContentNode.js';
import { ContentRegistry } from '../src/content/ContentRegistry.js';
import { validateCampaign, validateCompiledScenario } from '../src/content/ContentValidator.js';
import { compileCampaign } from '../src/content/ScenarioCompiler.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../src/data/applyPhase8SpatialScale.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase8.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const originalRandom = Math.random;
let randomState = 864209753;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

try {
  // --- 1. authored 콘텐츠 로드 ---
  const { manifest, assetCatalog } = loadSleepingCitadel(ROOT);
  const { campaignManifestSchema } = loadSchemas(ROOT);
  assert.equal(manifest.schemaVersion, 1, 'campaign manifest schemaVersion is not 1');
  assert.equal(assetCatalog.schemaVersion, 1, 'asset catalog schemaVersion is not 1');
  console.log('content load ok');

  // --- 2. 레지스트리 ---
  const registry = new ContentRegistry();
  registry.registerCampaign(manifest);
  registry.registerAssetCatalog(assetCatalog);
  assert.equal(registry.zones.size, 13, 'registry did not index 13 zones');
  assert.equal(registry.rooms.size, 63, 'registry did not index 63 rooms');
  assert.equal(registry.factions.size, 7, 'registry did not index 7 factions');
  // See the WP7 route-reclassification note further down: secret 6->7, conditional 4->3.
  assert.equal((manifest.secretConnections ?? []).length, 7, 'campaign does not have 7 secret connections');
  assert.equal((manifest.conditionalConnections ?? []).length, 3, 'campaign does not have 3 conditional connections');
  assert.throws(() => registry.registerCampaign(manifest), /duplicate campaign id/, 'duplicate campaign registration did not throw');
  console.log('registry ok');

  // --- 3. strict 밸리데이션 ---
  const validation = validateCampaign(registry, manifest.id, { strict: true, manifestSchema: campaignManifestSchema });
  assert.equal(validation.ok, true, `strict campaign validation failed: ${validation.errors.map(e => `${e.code}: ${e.message}`).join(' | ')}`);
  console.log('strict validation ok');

  // --- 4. 컴파일 결정론 ---
  const first = compileCampaign({ manifest, assetCatalog });
  const second = compileCampaign({ manifest, assetCatalog });
  assert.deepEqual(first, second, 'compileCampaign is not deterministic');
  console.log('compile determinism ok');

  // --- 5. 컴파일 산출물 shape ---
  const { scenario, report } = first;
  assert.equal(scenario.rooms.length, 63, 'compiled scenario does not have 63 rooms');
  for (const room of scenario.rooms) {
    for (const field of ['x', 'z', 'w', 'd']) {
      assert.ok(Number.isFinite(room[field]), `room "${room.id}" has non-finite ${field}`);
    }
    assert.ok(room.spatialCapacity >= 1, `room "${room.id}" spatialCapacity < 1`);
  }
  assert.equal(scenario.phase8SpatialScaleApplied, true, 'compiler did not pre-empt phase8 spatial scale');
  assert.ok(scenario.links.length >= 80, `expected at least 80 links, got ${scenario.links.length}`);
  // WP7 reclassified two routes: E25-L56 promoted conditional -> ordinary
  // (now a formal cathedral entrance), and ordinary B10-E21 replaced by a new
  // secret-B10-E21 (a hidden funeral stair). Net: conditional 4 -> 3, secret
  // 6 -> 7, ordinary count unchanged (documented in WP7_IMPLEMENTATION.md).
  assert.equal(scenario.secretLinks.length, 7, 'compiled scenario does not preserve 7 secret links');
  assert.equal(report.stats.conditionalConnections, 3, 'compiled scenario does not report 3 conditional connections');
  const party = scenario.agents.filter(agent => agent.faction === 'party');
  assert.equal(party.length, 4, 'compiled scenario does not have a party of 4');
  assert.ok(party.every(agent => agent.roomId === manifest.entryRoomId), 'party does not start at the entrance room');
  assert.equal(report.missingBundles.length, 0, `unresolved prop bundles: ${report.missingBundles.join(', ')}`);
  const compiledCheck = validateCompiledScenario(scenario);
  assert.equal(compiledCheck.ok, true, `compiled scenario validation failed: ${compiledCheck.errors.map(e => `${e.code}: ${e.message}`).join(' | ')}`);
  console.log('compiled shape ok');

  // --- 6. end-to-end: 화면과 같은 순서의 라이브 apply 체인 ---
  // 컴파일러가 Phase5/6(휴리스틱 lair 배치)과 Phase8(공간 스케일)을 선점하므로
  // 세 단계 모두 방/prop 수가 변하지 않는 no-op이어야 함.
  const started = Date.now();
  const phase2 = applyPhase2Facilities(scenario);
  const phase5 = applyPhase5Ecology(phase2);
  assert.equal(phase5.rooms.length, phase2.rooms.length, 'applyPhase5Ecology changed room count (heuristic not suppressed)');
  assert.equal(phase5.props.length, phase2.props.length, 'applyPhase5Ecology changed prop count (heuristic not suppressed)');
  const phase6 = applyPhase6Ecology(phase5);
  assert.equal(phase6.rooms.length, phase5.rooms.length, 'applyPhase6Ecology changed room count (heuristic not suppressed)');
  assert.equal(phase6.props.length, phase5.props.length, 'applyPhase6Ecology changed prop count (heuristic not suppressed)');
  const phase8 = applyPhase8SpatialScale(phase6);
  assert.equal(phase8.rooms.length, phase6.rooms.length, 'applyPhase8SpatialScale changed room count');
  assert.equal(phase8.props.length, phase6.props.length, 'applyPhase8SpatialScale changed prop count');
  assert.ok(
    phase8.rooms.every((room, index) => room.w === phase6.rooms[index].w && room.d === phase6.rooms[index].d),
    'applyPhase8SpatialScale rescaled pre-scaled room sizes'
  );
  const runtimeScenario = applyPhase7Territories(phase8);
  console.log('apply chain no-op guards ok');

  const events = [];
  const sim = new DungeonSim(runtimeScenario, { onEvent: event => events.push(event.text) });
  for (let i = 0; i < 150; i += 1) sim.update(0.12);
  const metrics = sim.metrics();
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      assert.ok(Number.isFinite(value), `metric "${key}" is not finite`);
    }
  }
  // snapshot()은 렌더러/UI가 매 프레임 호출하는 경로 — metrics()만으로는 놓친
  // 크래시(예: OldLantern settlement의 buildings 누락)를 잡는다.
  const snapshot = sim.snapshot();
  assert.ok(Array.isArray(snapshot.settlement?.settlements), 'settlement snapshot missing');
  for (const settlement of snapshot.settlement.settlements) {
    assert.ok(Array.isArray(settlement.buildings), `settlement "${settlement.id}" has no buildings array in snapshot`);
  }
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 60000, `campaign run exceeded 60s budget (${elapsed}ms)`);
  console.log(`150-tick campaign run ok in ${elapsed}ms with ${events.length} events`);

  console.log(`content pipeline smoke passed with ${scenario.rooms.length} rooms, ${scenario.links.length} links and ${report.stats.props} compiled props`);
} finally {
  Math.random = originalRandom;
}
