// node 전용 콘텐츠 로더 — src/content에서 node:fs를 임포트하는 유일한 파일.
// 브라우저 경로는 fetch()를 사용하고 이 파일을 임포트하지 않습니다.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadCampaignManifest(path) {
  return loadJson(path);
}

export function loadAssetCatalog(path) {
  return loadJson(path);
}

// repo 표준 경로에서 Sleeping Citadel 콘텐츠 일괄 로드
export function loadSleepingCitadel(rootDir) {
  return {
    manifest: loadCampaignManifest(join(rootDir, 'content', 'campaigns', 'sleeping-citadel', 'campaign.manifest.json')),
    assetCatalog: loadAssetCatalog(join(rootDir, 'content', 'assets', 'asset-catalog.json'))
  };
}

// ContentValidator의 options.manifestSchema로 넘길 스키마 로드.
// campaign.schema.json은 Codex가 저작한 $ref 기반 스키마입니다 — validateAgainstSchema는
// $ref를 해석하지 않으므로 최상위 required/타입 정도만 체크되고, 실질적 도메인 검증은
// ContentValidator의 수기 체크가 담당합니다.
export function loadSchemas(rootDir) {
  return {
    campaignManifestSchema: loadJson(join(rootDir, 'content', 'schemas', 'campaign.schema.json')),
    assetCatalogSchema: loadJson(join(rootDir, 'content', 'schemas', 'asset-catalog.schema.json'))
  };
}
