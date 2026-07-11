import { App } from './app/App.js';
import { SCENARIOS } from './data/scenarios.js';
import { ContentRegistry } from './content/ContentRegistry.js';
import { validateCampaign } from './content/ContentValidator.js';
import { compileCampaign } from './content/ScenarioCompiler.js';

// authored 캠페인을 fetch → 컴파일 → SCENARIOS에 추가.
// 어떤 실패든 기존 내장 시나리오만으로 부팅한다 (fail-soft).
async function loadSleepingCitadelScenario() {
  const [manifestResponse, catalogResponse] = await Promise.all([
    fetch('./content/campaigns/sleeping-citadel/campaign.manifest.json'),
    fetch('./content/assets/asset-catalog.json')
  ]);
  if (!manifestResponse.ok || !catalogResponse.ok) {
    throw new Error(`content fetch failed (${manifestResponse.status}/${catalogResponse.status})`);
  }
  const manifest = await manifestResponse.json();
  const assetCatalog = await catalogResponse.json();

  const registry = new ContentRegistry();
  registry.registerCampaign(manifest);
  registry.registerAssetCatalog(assetCatalog);
  const validation = validateCampaign(registry, manifest.id);
  if (!validation.ok) {
    throw new Error(`campaign validation failed: ${validation.errors.map(error => error.message).join(' | ')}`);
  }

  const { scenario, report } = compileCampaign({ manifest, assetCatalog });
  if (!SCENARIOS.some(existing => existing.id === scenario.id)) {
    SCENARIOS.push(scenario);
  }
  if (report.warnings.length) {
    console.warn('[main] campaign compiled with warnings', report.warnings);
  }
}

const root = document.getElementById('game-root');
const app = new App(root);
loadSleepingCitadelScenario()
  .catch(error => {
    console.warn('[main] campaign content unavailable; booting with built-in scenarios', error);
  })
  .then(() => app.start());
