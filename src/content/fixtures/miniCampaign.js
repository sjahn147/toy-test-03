// 개발 self-check용 소형 캠페인 fixture.
// content/campaigns/sleeping-citadel/campaign.manifest.json (Codex 저작) shape을 그대로
// 따릅니다: zones에 macro-grid 없음, factions엔 id/runtimeFactionId/initialRooms/goals만
// 있고 lair/species 정보는 legacyMappings.FACTION_RUNTIME_BINDINGS가 공급합니다.
// 6방 / 2존 / 2세력, 비밀 연결 1개, compat.ecology-guards 두 lair 타입
// (goblin_lair, plague_mortuary)을 흉내내는 표본이지만, 실제 바인딩 테이블은
// campaign.sleeping-citadel용 room id만 알고 있으므로 이 fixture로 compileCampaign을
// 돌리면 lair/agent는 비어 있습니다 — 레이아웃/연결성/스키마 워커 self-check 전용입니다.

export const MINI_CAMPAIGN_MANIFEST = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  id: 'mini-fixture',
  title: { en: 'The Mini Fixture Vault', ko: '미니 표본 금고' },
  status: 'design-complete-runtime-pending',
  entryRoomId: 'A01',
  zones: [
    { id: 'A', name: { en: 'Lantern Gate', ko: '등불 관문' }, zoneKit: 'kit.stone-common', roomIds: ['A01', 'A02', 'A03'] },
    { id: 'B', name: { en: 'Quiet Crypt', ko: '고요한 지하묘' }, zoneKit: 'kit.stone-common', roomIds: ['B01', 'B02', 'B03'] }
  ],
  rooms: [
    { id: 'A01', zoneId: 'A', name: 'Lantern Steps', kind: 'safe-plaza', size: [12, 12], tags: ['entrance', 'safe-zone'], landmarkBundle: 'kit.stone-common', stateVariants: ['normal', 'crowded'] },
    { id: 'A02', zoneId: 'A', name: 'Low Hall', kind: 'passage', size: [12, 9], tags: ['route'], landmarkBundle: 'kit.stone-common', stateVariants: ['normal', 'collapsed'] },
    { id: 'A03', zoneId: 'A', name: 'Button Warren', kind: 'goblin-market', size: [11, 10], tags: ['goblin-settlement'], landmarkBundle: 'kit.stone-common', stateVariants: ['active', 'burned'] },
    { id: 'B01', zoneId: 'B', name: 'Quiet Nave', kind: 'funeral-chapel', size: [12, 10], tags: ['undead-settlement'], landmarkBundle: 'kit.stone-common', stateVariants: ['dormant', 'active'] },
    { id: 'B02', zoneId: 'B', name: 'Coin Niche', kind: 'treasure-vault', size: [10, 10], tags: ['rare-loot'], landmarkBundle: 'kit.stone-common', stateVariants: ['sealed', 'opened'] },
    { id: 'B03', zoneId: 'B', name: 'Moss Shrine', kind: 'chapel', size: [10, 10], tags: ['sanctuary', 'secret-route'], landmarkBundle: 'kit.stone-common', stateVariants: ['dormant', 'reconsecrated'] }
  ],
  connections: [
    ['A01', 'A02'], ['A02', 'A03'], ['A02', 'B01'], ['B01', 'B02'], ['B01', 'B03']
  ],
  secretConnections: [
    { id: 'secret-B03-A03', from: 'B03', to: 'A03', discovery: ['rogue-search'] }
  ],
  factions: [
    { id: 'button-collectors', runtimeFactionId: 'goblin-clan', initialRooms: ['A03'], goals: ['collect-scrap'] },
    { id: 'quiet-choir', runtimeFactionId: 'undead-host', initialRooms: ['B01'], goals: ['restore-chapel'] }
  ],
  validation: { expectedRoomCount: 6, requireLandmarkBundleForEveryRoom: true }
};

// fixture와 짝을 이루는 소형 카탈로그.
export const MINI_ASSET_CATALOG = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  entries: [
    {
      id: 'kit.stone-common',
      kind: 'kit',
      status: 'author',
      priority: 'P0',
      proceduralFallback: { factory: 'AssetRegistryPhase8', recipe: 'stone-common' }
    }
  ]
};
