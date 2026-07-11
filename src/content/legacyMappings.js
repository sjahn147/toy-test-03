// 레거시 Phase 체인 계약의 미러 테이블.
// 원본: src/data/applyPhase5Ecology.js, applyPhase6Ecology.js, applyPhase8SpatialScale.js.
// ScenarioCompiler가 Phase5/6/8 멱등 가드를 선점하므로, 여기 값이 원본과
// 어긋나면 컴파일된 시나리오가 DungeonSimPhase8 기대 shape에서 벗어납니다.

// applyPhase8SpatialScale.js 미러 (post-scale 최소 크기)
export const KIND_MINIMUMS = {
  start: [10.5, 10.5],
  hall: [10.5, 8.5],
  pantry: [9.5, 8.5],
  armory: [10.5, 9.5],
  nest: [10.5, 9.5],
  trap: [9.5, 8.5],
  hatchery: [11.5, 10.5],
  shrine: [9.5, 9.5],
  treasure: [9.5, 9.5],
  lair: [12, 10.5],
  crypt: [11, 9.5],
  gate: [11, 9.5]
};

export const DEFAULT_KIND_MINIMUM = [9.5, 8.5];

export const LEGACY_ROOM_KINDS = Object.keys(KIND_MINIMUMS);

export const POSITION_SCALE = 1.72;
export const SIZE_SCALE = 1.58;

// spatialCapacity 공식 미러: max(1, floor((w - 1.64) * (d - 1.64) / 0.78^2))
export const CAPACITY_MARGIN = 1.64;
export const CAPACITY_CELL = 0.78;

export function spatialCapacity(w, d) {
  return Math.max(1, Math.floor((w - CAPACITY_MARGIN) * (d - CAPACITY_MARGIN) / CAPACITY_CELL ** 2));
}

// apply 체인이 자체 생성하는 ID prefix — 컴파일러 산출물이 쓰면 안 됩니다.
export const RESERVED_ID_PREFIXES = ['territory-resource-', 'facility-', 'ecology-', 'advanced-'];

// applyPhase2Facilities가 추가하는 방 — 컴파일러가 선점 방출하면 Phase2 가드가 오작동합니다.
export const RESERVED_ROOM_IDS = ['expedition-waystation'];

// applyPhase6Ecology.factionFor 미러
export function factionForRole(role) {
  if (['skeleton', 'zombie', 'wraith'].includes(role)) return 'undead-host';
  if (role === 'goblin') return 'goblin-clan';
  if (role === 'orc') return 'red-tusk-tribe';
  if (role === 'kobold') return 'copper-tail-clutch';
  if (role === 'myconid') return 'bluecap-colony';
  if (['spider', 'stirge'].includes(role)) return 'red-wing-brood';
  if (role === 'carrion') return 'carrion-brood';
  if (role === 'parasite') return 'pale-brood';
  if (role === 'slime') return 'slime-bloom';
  if (role === 'ogre') return 'ogre-solitary';
  if (role === 'rat') return 'warren-vermin';
  return `wild-${role}`;
}

// role → 표시 이름 / 크기 (Phase5/6 seedSpecies 미러)
export const SPECIES_TABLE = {
  goblin: { displayName: 'Goblin', size: 'small' },
  skeleton: { displayName: 'Skeleton', size: 'small' },
  zombie: { displayName: 'Zombie', size: 'small' },
  wraith: { displayName: 'Wraith', size: 'small' },
  spider: { displayName: 'Spider', size: 'small' },
  stirge: { displayName: 'Stirge', size: 'tiny' },
  slime: { displayName: 'Slime', size: 'small' },
  rat: { displayName: 'Rat', size: 'tiny' },
  ogre: { displayName: 'Ogre', size: 'large' },
  orc: { displayName: 'Orc', size: 'medium' },
  kobold: { displayName: 'Kobold', size: 'small' },
  myconid: { displayName: 'Myconid', size: 'small' },
  carrion: { displayName: 'Carrion Crawler', size: 'small' },
  parasite: { displayName: 'Pale Parasite', size: 'tiny' },
  mimic: { displayName: 'Mimic', size: 'small' }
};

export function speciesDisplayName(role) {
  return SPECIES_TABLE[role]?.displayName ?? `${role[0]?.toUpperCase() ?? ''}${role.slice(1)}`;
}

export function speciesSize(role) {
  return SPECIES_TABLE[role]?.size ?? 'small';
}

// 파티 role → 기본 이름 (scenarios.js / generateDungeon.js 미러)
export const PARTY_ROLE_NAMES = {
  fighter: 'Rana',
  rogue: 'Milo',
  cleric: 'Sister Pell',
  wizard: 'Orwin'
};

// lair prop의 stock 필드 zero-fill 세트 (Phase5/6 prop shape 미러)
export const PHASE5_STOCK_FIELDS = ['foodStock', 'biomass', 'boneStock', 'bloodStock', 'grainStock'];
export const PHASE6_STOCK_FIELDS = [
  'corpseStock', 'meatStock', 'trophyStock', 'sporeStock', 'bloodStock',
  'carrionStock', 'scrapStock', 'deathEnergy', 'hostStock'
];

// propType → lair 기본값. phase는 어느 apply 단계의 prop shape를 따르는지 표시.
// placement: [ox, oz, rotation, scale]
export const FACTION_LAIR_DEFAULTS = {
  goblin_lair: { phase: 5, species: 'goblin', label: 'Goblin Hearth-Lair', placement: [-1.45, 0.85, -0.12, 0.82], capacity: 5, stocks: { foodStock: 3 } },
  ossuary_lair: { phase: 5, species: 'skeleton', label: 'Working Ossuary', placement: [1.25, 0.85, 0.08, 0.78], capacity: 5, stocks: { boneStock: 3 } },
  spider_lair: { phase: 5, species: 'spider', label: 'Silk Brood Chamber', placement: [0, 0.9, 0.18, 0.82], capacity: 5, stocks: { bloodStock: 1 } },
  slime_pool: { phase: 5, species: 'slime', label: 'Digestive Spawning Pool', placement: [-0.95, -0.85, 0.04, 0.84], capacity: 5, stocks: { biomass: 2 } },
  rat_warren: { phase: 5, species: 'rat', label: 'Granary Rat Warren', placement: [1.15, -0.95, -0.15, 0.76], capacity: 8, stocks: { grainStock: 5 } },
  ogre_lair: { phase: 5, species: 'ogre', label: 'Ogre Butcher-Camp', placement: [0, 0.2, 0.14, 0.86], capacity: 2, stocks: { foodStock: 2 } },
  plague_mortuary: { phase: 6, species: 'zombie', label: 'Plague Mortuary', placement: [-1.0, 0.9, -0.08, 0.76], capacity: 5, stocks: { corpseStock: 1 } },
  orc_tribe_camp: { phase: 6, species: 'orc', label: 'Red Tusk War Camp', placement: [1.05, -0.9, 0.1, 0.78], capacity: 4, stocks: { meatStock: 3, trophyStock: 1 } },
  fungal_garden: { phase: 6, species: 'myconid', label: 'Bluecap Rot Garden', placement: [-1.05, -0.85, -0.04, 0.82], capacity: 5, stocks: { sporeStock: 2 } },
  blood_roost: { phase: 6, species: 'stirge', label: 'Red-Wing Blood Roost', placement: [1.0, 0.9, 0.18, 0.76], capacity: 7, stocks: { bloodStock: 1 } },
  carrion_pit: { phase: 6, species: 'carrion', label: 'Carrion Nursery Pit', placement: [0.95, -0.85, -0.14, 0.8], capacity: 4, stocks: { carrionStock: 1 } },
  kobold_workshop: { phase: 6, species: 'kobold', label: 'Copper-Tail Trapworks', placement: [-0.95, 0.82, 0.12, 0.76], capacity: 5, stocks: { scrapStock: 3 } },
  cursed_chapel: { phase: 6, species: 'wraith', label: 'Chapel of Unfinished Names', placement: [0.9, 0.75, 0.06, 0.74], capacity: 3, stocks: { deathEnergy: 1 } },
  parasite_pool: { phase: 6, species: 'parasite', label: 'Pale Larval Cistern', placement: [-0.85, -0.75, 0.08, 0.72], capacity: 6, stocks: { hostStock: 0 } }
};

// lair가 배치된 방에 붙는 태그 (Phase5/6 미러)
export function lairRoomTags(phase, species) {
  return phase === 6
    ? ['advanced_ecology', 'territory', `${species}_home`]
    : ['monster_lair', 'territory', `${species}_home`];
}

// Phase5/6 seedSpecies의 이름 라벨 미러 (0 → A, 25 → Z, 26 → AA ...)
export function alphabeticLabel(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

// --- content/campaigns/sleeping-citadel/campaign.manifest.json (Codex 저작) 바인딩 ---
// 이 manifest는 zones에 macro-grid를, factions에 lair/species/startingAgents를
// 싣지 않은 "design-complete-runtime-pending" 문서입니다. 아래 테이블이 그 gap을
// 메워 ScenarioCompiler가 실행 가능한 시나리오를 만들도록 합니다. manifest 파일
// 자체는 건드리지 않고, 여기서만 room bible/campaign overview 태그를 근거로
// 런타임 바인딩을 결정합니다.

// zone id(단일 문자) → macro-grid 앵커. docs/campaigns/sleeping-citadel-overview.md §3
// 지리 배치를 그대로 반영 (관문 서쪽 → 중앙시장 → 성소 동쪽).
export const GRID_BY_ZONE = {
  A: { col: 0, row: 1 }, B: { col: 1, row: 1 }, C: { col: 1, row: 0 },
  D: { col: 2, row: 0 }, E: { col: 3, row: 2 }, F: { col: 3, row: 0 },
  G: { col: 3, row: 1 }, H: { col: 2, row: 2 }, I: { col: 2, row: 1 },
  J: { col: 4, row: 1 }, K: { col: 4, row: 0 }, L: { col: 5, row: 1 },
  M: { col: 6, row: 1 }
};

// 방의 서술적 kind(예: "safe-plaza", "goblin-market") → 레거시 kind enum.
// 모든 63개 값을 명시적으로 매핑 — 추측성 부분 문자열 매칭을 피합니다.
// 각 매핑은 KIND_MINIMUMS를 만족하는지 확인된 상태입니다 (WP 통합 시 검증 스크립트로 재확인).
export const DESCRIPTIVE_KIND_MAP = {
  'safe-plaza': 'start', 'registry': 'hall', 'gate': 'gate', 'storehouse': 'pantry',
  'descent': 'hall', 'dormitory': 'hall', 'kitchen': 'pantry', 'water-room': 'hall',
  'courtyard': 'hall', 'chapel': 'shrine', 'reservoir': 'hall', 'granary': 'pantry',
  'cellar': 'pantry', 'machinery': 'hall', 'passage': 'hall', 'workshop': 'hall',
  'scrap-yard': 'hall', 'kobold-workshop': 'lair', 'goblin-market': 'lair', 'magazine': 'pantry',
  'cloister': 'crypt', 'funeral-chapel': 'shrine', 'ossuary': 'crypt', 'tomb': 'crypt',
  'death-well': 'shrine', 'spore-field': 'hall', 'glasshouse': 'hall', 'fungal-forest': 'lair',
  'gardener-room': 'hall', 'fungal-core': 'lair', 'silk-passage': 'hall', 'host-storage': 'hall',
  'spider-nursery': 'hatchery', 'vertical-well': 'hall', 'boss-nest': 'lair',
  'inn-common-room': 'hall', 'inn-kitchen': 'pantry', 'inn-guest-wing': 'hall', 'inn-cellar': 'pantry',
  'secret-office': 'hall', 'market-plaza': 'hall', 'customs-house': 'hall', 'auction-hall': 'treasure',
  'neutral-water': 'hall', 'secret-junction': 'hall', 'training-yard': 'hall', 'armory': 'armory',
  'meat-store': 'pantry', 'arena': 'hall', 'war-hall': 'lair', 'laboratory': 'hall',
  'parasite-vats': 'lair', 'observatory': 'hall', 'summoning-room': 'hall', 'emergency-route': 'hall',
  'antechamber': 'hall', 'treasure-vault': 'treasure', 'banquet-hall': 'hall', 'throne-room': 'treasure',
  'royal-bedchamber': 'hall', 'final-gate': 'gate', 'sanctum': 'shrine', 'final-boss-room': 'lair'
};

export function mapRoomKind(descriptiveKind, roomId, entryRoomId) {
  if (roomId === entryRoomId) return 'start';
  return DESCRIPTIVE_KIND_MAP[descriptiveKind] ?? 'hall';
}

// faction.id → 런타임 바인딩. manifest의 factions[]는 id/runtimeFactionId/initialRooms/goals만
// 가지므로, 실제 파티 구성원과 생태 lair(species/propType/capacity/stocks/assetBundle)는
// 여기서 room bible 태그를 근거로 결정론적으로 공급합니다.
export const FACTION_RUNTIME_BINDINGS = {
  'lantern-compact': {
    kind: 'party',
    startingAgents: [
      { id: 'fighter', role: 'fighter' },
      { id: 'rogue', role: 'rogue' },
      { id: 'cleric', role: 'cleric' },
      { id: 'wizard', role: 'wizard' }
    ]
  },
  'brass-button-market': {
    kind: 'ecology',
    lairs: [{ roomId: 'D19', propType: 'goblin_lair', species: 'goblin', assetBundle: 'habitat.goblin-hearth', capacity: 5, stocks: { foodStock: 3 } }]
  },
  'copper-tail-clutch': {
    kind: 'ecology',
    lairs: [{ roomId: 'D18', propType: 'kobold_workshop', species: 'kobold', assetBundle: 'habitat.kobold-trapworks', capacity: 5, stocks: { scrapStock: 3 } }]
  },
  'red-tusk-host': {
    kind: 'ecology',
    lairs: [{ roomId: 'J50', propType: 'orc_tribe_camp', species: 'orc', assetBundle: 'habitat.orc-war-camp', capacity: 4, stocks: { meatStock: 3, trophyStock: 1 } }]
  },
  'choir-unfinished-names': {
    kind: 'ecology',
    lairs: [
      { roomId: 'E22', propType: 'plague_mortuary', species: 'zombie', assetBundle: 'habitat.plague-mortuary', capacity: 5, stocks: { corpseStock: 1 } },
      { roomId: 'E23', propType: 'ossuary_lair', species: 'skeleton', assetBundle: 'habitat.ossuary', capacity: 5, stocks: { boneStock: 3 } }
    ]
  },
  'bluecap-communion': {
    kind: 'ecology',
    lairs: [{ roomId: 'F30', propType: 'fungal_garden', species: 'myconid', assetBundle: 'habitat.fungal-colony', capacity: 5, stocks: { sporeStock: 2 } }]
  },
  'red-silk-brood': {
    kind: 'ecology',
    lairs: [{ roomId: 'G33', propType: 'spider_lair', species: 'spider', assetBundle: 'habitat.spider-brood', capacity: 5, stocks: { bloodStock: 1 } }]
  }
};

// manifest에 없는 기초 개체군(쥐/슬라임) — 자원 태그가 명시된 방에 배치.
// C11 reservoir 태그 "slime", C12 granary 태그 "rat-warren"과 정확히 일치합니다.
export const WILDLIFE_BINDINGS = [
  { lairRoomId: 'C12', propType: 'rat_warren', species: 'rat', count: 3, stocks: { grainStock: 5 } },
  { lairRoomId: 'C11', propType: 'slime_pool', species: 'slime', count: 2, stocks: { biomass: 2 } }
];
