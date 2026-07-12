// 공용 던전 아키텍처 에셋 ID — 순수 데이터 (THREE 의존 없음).
// CommonDungeonArchitectureAssetPack.js는 THREE를 import하므로 node 스모크 테스트에서
// 로드할 수 없습니다. ID 상수만 필요한 곳(테스트, 검증기)은 이 모듈을 import합니다.

export const COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS = Object.freeze([
  'environment.room-floor',
  'environment.wall-segment',
  'environment.door-frame',
  'environment.corridor'
]);

export const COMMON_DUNGEON_ARCHITECTURE_PACK_ID = 'environment.common-dungeon-architecture';
