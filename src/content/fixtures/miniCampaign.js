// 개발 self-check용 소형 캠페인 fixture.
// 6방 / 2존 / 2세력, 비밀 연결 1개, compat.ecology-guards 두 lair 타입
// (goblin_lair, plague_mortuary) 포함 — campaign.manifest.schema.json 준수.

export const MINI_CAMPAIGN_MANIFEST = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  id: 'campaign.mini-fixture',
  name: 'The Mini Fixture Vault',
  description: '콘텐츠 파이프라인 self-check용 6방 표본.',
  entranceRoomId: 'room.mini-fixture.gate.lantern-steps',
  layout: { gutter: 8, zoneGap: 24 },
  zones: [
    { id: 'zone.mini-fixture.gate', code: 'A', name: 'Lantern Gate', grid: { col: 0, row: 0 }, kit: 'kit.stone-common', tags: ['entrance'] },
    { id: 'zone.mini-fixture.crypt', code: 'B', name: 'Quiet Crypt', grid: { col: 1, row: 0 }, kit: 'kit.stone-common', tags: [] }
  ],
  rooms: [
    {
      id: 'room.mini-fixture.gate.lantern-steps',
      code: 'A01',
      zoneId: 'zone.mini-fixture.gate',
      name: 'Lantern Steps',
      size: { w: 12, d: 12 },
      kind: 'start',
      tags: ['entrance'],
      functions: ['spawn'],
      propBundles: [],
      stateVariants: ['normal'],
      danger: 0,
      spawnWeight: 0
    },
    {
      id: 'room.mini-fixture.gate.low-hall',
      code: 'A02',
      zoneId: 'zone.mini-fixture.gate',
      name: 'Low Hall',
      size: { w: 12, d: 9 },
      kind: 'hall',
      tags: [],
      propBundles: ['prop.chest.copper', 'kit.stone-common'],
      danger: 1,
      spawnWeight: 0
    },
    {
      id: 'room.mini-fixture.gate.button-warren',
      code: 'A03',
      zoneId: 'zone.mini-fixture.gate',
      name: 'Button Warren',
      size: { w: 11, d: 10 },
      kind: 'nest',
      tags: [],
      danger: 2,
      spawnWeight: 2
    },
    {
      id: 'room.mini-fixture.crypt.quiet-nave',
      code: 'B01',
      zoneId: 'zone.mini-fixture.crypt',
      name: 'Quiet Nave',
      size: { w: 12, d: 10 },
      kind: 'crypt',
      tags: [],
      danger: 2,
      spawnWeight: 2
    },
    {
      id: 'room.mini-fixture.crypt.coin-niche',
      code: 'B02',
      zoneId: 'zone.mini-fixture.crypt',
      name: 'Coin Niche',
      size: { w: 10, d: 10 },
      kind: 'treasure',
      tags: [],
      propBundles: ['prop.trap.flagstone', 'prop.unregistered.sample'],
      danger: 1,
      spawnWeight: 0,
      layoutHint: { dx: 1, dz: -1 }
    },
    {
      id: 'room.mini-fixture.crypt.moss-shrine',
      code: 'B03',
      zoneId: 'zone.mini-fixture.crypt',
      name: 'Moss Shrine',
      size: { w: 10, d: 10 },
      kind: 'shrine',
      tags: [],
      danger: 1,
      spawnWeight: 1,
      settlementCandidate: { scale: 'small', capacity: 4 }
    }
  ],
  connections: [
    { from: 'room.mini-fixture.gate.lantern-steps', to: 'room.mini-fixture.gate.low-hall', kind: 'normal' },
    { from: 'room.mini-fixture.gate.low-hall', to: 'room.mini-fixture.gate.button-warren', kind: 'normal' },
    { from: 'room.mini-fixture.gate.low-hall', to: 'room.mini-fixture.crypt.quiet-nave', kind: 'normal' },
    { from: 'room.mini-fixture.crypt.quiet-nave', to: 'room.mini-fixture.crypt.coin-niche', kind: 'normal' },
    { from: 'room.mini-fixture.crypt.quiet-nave', to: 'room.mini-fixture.crypt.moss-shrine', kind: 'normal' },
    { from: 'room.mini-fixture.crypt.moss-shrine', to: 'room.mini-fixture.gate.button-warren', kind: 'secret', discovery: 'hidden', note: '이끼 뒤 무너진 배수로' }
  ],
  factions: [
    {
      id: 'faction.mini-fixture.button-collectors',
      name: 'Button Collectors',
      kind: 'ecology',
      species: 'goblin',
      legacyEcologyFaction: 'goblin-clan',
      homeRoomId: 'room.mini-fixture.gate.button-warren',
      lair: { propType: 'goblin_lair', assetBundle: 'kit.stone-common', capacity: 5, stocks: { foodStock: 3 } },
      startingAgents: [{ role: 'goblin', count: 2 }]
    },
    {
      id: 'faction.mini-fixture.quiet-choir',
      name: 'Quiet Choir',
      kind: 'ecology',
      species: 'zombie',
      legacyEcologyFaction: 'undead-host',
      homeRoomId: 'room.mini-fixture.crypt.quiet-nave',
      lair: { propType: 'plague_mortuary', capacity: 4, stocks: { corpseStock: 1 } },
      startingAgents: [
        { role: 'zombie', count: 1 },
        { id: 'sc-choir-cantor', role: 'skeleton', name: 'Cantor Hesh' }
      ]
    }
  ],
  wildlife: [
    { species: 'rat', lairRoomId: 'room.mini-fixture.crypt.coin-niche', propType: 'rat_warren', count: 2, stocks: { grainStock: 4 } }
  ]
};

// fixture와 짝을 이루는 소형 카탈로그 — legacyProp 매핑/미매핑/미등록
// 세 경로를 모두 연습할 수 있게 구성 (prop.unregistered.sample은 의도적 누락).
export const MINI_ASSET_CATALOG = {
  schemaVersion: 1,
  contentVersion: '0.1.0',
  entries: [
    {
      id: 'kit.stone-common',
      kind: 'kit',
      status: 'REUSE',
      priority: 'P0',
      proceduralFallback: { factory: 'AssetRegistryPhase8', recipe: 'stone-common' }
    },
    {
      id: 'prop.chest.copper',
      kind: 'diorama',
      status: 'REUSE',
      priority: 'P1',
      proceduralFallback: { factory: 'AssetRegistryPhase8', recipe: 'treasure-chest' },
      legacyProp: { type: 'treasure', label: 'Copper Chest' },
      footprint: { shape: 'rect', width: 1.2, depth: 0.8 }
    },
    {
      id: 'prop.trap.flagstone',
      kind: 'diorama',
      status: 'REUSE',
      priority: 'P1',
      proceduralFallback: { factory: 'AssetRegistryPhase8', recipe: 'floor-trap' },
      legacyProp: { type: 'trap', label: 'Loose Flagstone' },
      footprint: { shape: 'circle', radius: 0.6 }
    }
  ]
};
