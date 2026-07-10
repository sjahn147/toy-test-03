export const SCENARIOS = [
  {
    id: 'cellar',
    name: 'The Sighing Cellar',
    description: '작은 지하실. 도적은 상자를 사랑하고, 해골은 소리를 사랑합니다.',
    rooms: [
      { id: 'entry', name: 'Entry Steps', x: -9, z: 0, w: 5, d: 5, kind: 'start' },
      { id: 'hall', name: 'Low Hall', x: -2, z: 0, w: 6, d: 4, kind: 'hall' },
      { id: 'treasure', name: 'Copper Hoard', x: 6, z: -3, w: 5, d: 5, kind: 'treasure' },
      { id: 'crypt', name: 'Mouse Crypt', x: 6, z: 4, w: 6, d: 5, kind: 'crypt' },
      { id: 'well', name: 'Dry Well', x: -2, z: 7, w: 5, d: 5, kind: 'trap' }
    ],
    links: [['entry', 'hall'], ['hall', 'treasure'], ['hall', 'crypt'], ['hall', 'well']],
    agents: [
      { id: 'fighter', name: 'Rana', role: 'fighter', faction: 'party', roomId: 'entry' },
      { id: 'rogue', name: 'Milo', role: 'rogue', faction: 'party', roomId: 'entry' },
      { id: 'cleric', name: 'Sister Pell', role: 'cleric', faction: 'party', roomId: 'entry' },
      { id: 'wizard', name: 'Orwin', role: 'wizard', faction: 'party', roomId: 'entry' },
      { id: 'skel-a', name: 'Skeleton A', role: 'skeleton', faction: 'dungeon', roomId: 'crypt' },
      { id: 'skel-b', name: 'Skeleton B', role: 'skeleton', faction: 'dungeon', roomId: 'crypt' },
      { id: 'gob-a', name: 'Goblin A', role: 'goblin', faction: 'dungeon', roomId: 'treasure' },
      { id: 'mimic', name: 'Mimic A', role: 'mimic', faction: 'dungeon', roomId: 'treasure', hidden: true }
    ],
    props: [
      { id: 'chest-a', type: 'treasure', roomId: 'treasure', label: 'Copper Chest' },
      { id: 'trap-a', type: 'trap', roomId: 'well', armed: true, label: 'Loose Flagstone' }
    ]
  },
  {
    id: 'goblin-nest',
    name: 'The Nervous Goblin Nest',
    description: '고블린은 혼자면 비겁하지만 셋이면 갑자기 역사적 사명을 느낍니다.',
    rooms: [
      { id: 'entry', name: 'Broken Door', x: -10, z: 0, w: 5, d: 5, kind: 'start' },
      { id: 'kitchen', name: 'Stolen Kitchen', x: -3, z: -3, w: 6, d: 5, kind: 'hall' },
      { id: 'barracks', name: 'Goblin Bunks', x: 5, z: -3, w: 6, d: 6, kind: 'lair' },
      { id: 'shrine', name: 'Tiny Bad Shrine', x: 5, z: 5, w: 5, d: 5, kind: 'crypt' },
      { id: 'stash', name: 'Shiny Stash', x: -3, z: 6, w: 5, d: 5, kind: 'treasure' }
    ],
    links: [['entry', 'kitchen'], ['kitchen', 'barracks'], ['barracks', 'shrine'], ['kitchen', 'stash']],
    agents: [
      { id: 'fighter', name: 'Rana', role: 'fighter', faction: 'party', roomId: 'entry' },
      { id: 'rogue', name: 'Milo', role: 'rogue', faction: 'party', roomId: 'entry' },
      { id: 'cleric', name: 'Sister Pell', role: 'cleric', faction: 'party', roomId: 'entry' },
      { id: 'wizard', name: 'Orwin', role: 'wizard', faction: 'party', roomId: 'entry' },
      { id: 'gob-a', name: 'Goblin A', role: 'goblin', faction: 'dungeon', roomId: 'barracks' },
      { id: 'gob-b', name: 'Goblin B', role: 'goblin', faction: 'dungeon', roomId: 'barracks' },
      { id: 'gob-c', name: 'Goblin C', role: 'goblin', faction: 'dungeon', roomId: 'kitchen' },
      { id: 'slime', name: 'Slime A', role: 'slime', faction: 'dungeon', roomId: 'shrine' }
    ],
    props: [
      { id: 'chest-a', type: 'treasure', roomId: 'stash', label: 'Button Jar' },
      { id: 'trap-a', type: 'trap', roomId: 'kitchen', armed: true, label: 'Pan Snare' }
    ]
  },
  {
    id: 'crypt',
    name: 'The Extremely Small Crypt',
    description: '납골당 표본. 해골이 많고 마법사는 시작하자마자 후회합니다.',
    rooms: [
      { id: 'entry', name: 'Cold Stairs', x: -9, z: 1, w: 5, d: 5, kind: 'start' },
      { id: 'nave', name: 'Bone Nave', x: -2, z: 1, w: 7, d: 5, kind: 'crypt' },
      { id: 'ossuary', name: 'Ossuary', x: 7, z: -3, w: 6, d: 6, kind: 'crypt' },
      { id: 'reliquary', name: 'Reliquary', x: 7, z: 5, w: 5, d: 5, kind: 'treasure' }
    ],
    links: [['entry', 'nave'], ['nave', 'ossuary'], ['nave', 'reliquary']],
    agents: [
      { id: 'fighter', name: 'Rana', role: 'fighter', faction: 'party', roomId: 'entry' },
      { id: 'rogue', name: 'Milo', role: 'rogue', faction: 'party', roomId: 'entry' },
      { id: 'cleric', name: 'Sister Pell', role: 'cleric', faction: 'party', roomId: 'entry' },
      { id: 'wizard', name: 'Orwin', role: 'wizard', faction: 'party', roomId: 'entry' },
      { id: 'skel-a', name: 'Skeleton A', role: 'skeleton', faction: 'dungeon', roomId: 'ossuary' },
      { id: 'skel-b', name: 'Skeleton B', role: 'skeleton', faction: 'dungeon', roomId: 'ossuary' },
      { id: 'skel-c', name: 'Skeleton C', role: 'skeleton', faction: 'dungeon', roomId: 'reliquary' },
      { id: 'mimic', name: 'Mimic A', role: 'mimic', faction: 'dungeon', roomId: 'reliquary', hidden: true }
    ],
    props: [
      { id: 'chest-a', type: 'treasure', roomId: 'reliquary', label: 'Reliquary Box' },
      { id: 'trap-a', type: 'trap', roomId: 'nave', armed: true, label: 'Censer Wire' }
    ]
  },
  {
    id: 'sprawling-warren',
    name: 'The Sprawling Warren',
    description: '넓게 퍼진 개미집형 실험 맵. 방이 많지만 수직 레이어 없이 수평으로 읽히도록 만든 확장 표본입니다.',
    useGeneratedMap: true,
    rooms: [],
    links: [],
    agents: [],
    props: []
  }
];
