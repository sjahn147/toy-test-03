const WARREN_ROOMS = [
  ['entry', 'Broken Entry', 'start', -22, 0, 5, 5],
  ['mud-hall', 'Mud Hall', 'hall', -15, 0, 7, 5],
  ['pantry', 'Rat Pantry', 'pantry', -8, -6, 6, 5],
  ['armory', 'Borrowed Armory', 'armory', -8, 5, 6, 5],
  ['low-crossing', 'Low Crossing', 'hall', -2, 0, 7, 5],
  ['nest-a', 'First Goblin Nest', 'nest', 5, -7, 6, 5],
  ['trap-a', 'False Flagstones', 'trap', 5, 5, 6, 5],
  ['gallery', 'Listening Gallery', 'hall', 11, 0, 7, 5],
  ['hatchery-a', 'Warm Hatchery', 'hatchery', 18, -7, 6, 6],
  ['shrine', 'Bad Little Shrine', 'shrine', 18, 5, 5, 5],
  ['treasure-a', 'Bright Mistake', 'treasure', 25, -3, 5, 5],
  ['lair-a', 'Wet Lair', 'lair', 25, 6, 6, 5],
  ['crypt-a', 'Mouse Crypt', 'crypt', 33, -6, 7, 5],
  ['mimic-court', 'Box Court', 'treasure', 33, 4, 6, 5],
  ['hatchery-b', 'Second Hatchery', 'hatchery', 41, -5, 6, 5],
  ['gate', 'Back Gate', 'gate', 41, 5, 5, 5]
];

const WARREN_LINKS = [
  ['entry', 'mud-hall'],
  ['mud-hall', 'pantry'],
  ['mud-hall', 'armory'],
  ['mud-hall', 'low-crossing'],
  ['low-crossing', 'nest-a'],
  ['low-crossing', 'trap-a'],
  ['low-crossing', 'gallery'],
  ['gallery', 'hatchery-a'],
  ['gallery', 'shrine'],
  ['gallery', 'treasure-a'],
  ['hatchery-a', 'treasure-a'],
  ['shrine', 'lair-a'],
  ['treasure-a', 'crypt-a'],
  ['lair-a', 'mimic-court'],
  ['crypt-a', 'hatchery-b'],
  ['mimic-court', 'gate'],
  ['hatchery-b', 'gate']
];

export function expandScenario(baseScenario) {
  const variant = Math.floor(Math.random() * 9999);
  const rooms = WARREN_ROOMS.map(([id, name, kind, x, z, w, d]) => ({
    id,
    name,
    kind,
    floor: 0,
    x,
    z,
    w,
    d,
    spawnWeight: ['hatchery', 'lair', 'nest', 'crypt', 'gate'].includes(kind) ? 2 : 0,
    danger: ['trap', 'hatchery', 'lair', 'crypt'].includes(kind) ? 2 : 1
  }));
  const links = [...WARREN_LINKS];
  const props = [];
  const agents = [];

  const party = [
    ['fighter', 'Rana'],
    ['rogue', 'Milo'],
    ['cleric', 'Sister Pell'],
    ['wizard', 'Orwin']
  ];

  for (const [role, name] of party) {
    agents.push({ id: role, name, role, faction: 'party', roomId: 'entry', level: 1 });
  }

  const monsterSeeds = [
    ['goblin', 'Goblin A', 'nest-a'],
    ['goblin', 'Goblin B', 'nest-a'],
    ['goblin', 'Goblin C', 'pantry'],
    ['skeleton', 'Skeleton A', 'crypt-a'],
    ['skeleton', 'Skeleton B', 'crypt-a'],
    ['slime', 'Slime A', 'lair-a'],
    ['mimic', 'Mimic A', 'mimic-court'],
    ['ogre', 'Ogre A', 'gate']
  ];

  monsterSeeds.forEach(([role, name, roomId], i) => {
    agents.push({
      id: `${role}-${variant}-${i}`,
      name,
      role,
      faction: 'dungeon',
      roomId,
      hidden: role === 'mimic',
      size: role === 'ogre' ? 'large' : 'small',
      level: 1
    });
  });

  for (const room of rooms) {
    if (room.kind === 'trap') {
      props.push({ id: `trap-${room.id}`, type: 'trap', roomId: room.id, armed: true, label: `${room.name} Mechanism` });
    }
    if (room.kind === 'treasure') {
      props.push({ id: `chest-${room.id}`, type: 'treasure', roomId: room.id, opened: false, label: `${room.name} Chest` });
    }
    if (room.kind === 'armory') {
      props.push({ id: `armory-${room.id}`, type: 'armory', roomId: room.id, used: false, label: `${room.name} Rack` });
    }
    if (room.kind === 'shrine') {
      props.push({ id: `shrine-${room.id}`, type: 'shrine', roomId: room.id, used: false, label: `${room.name}` });
    }
  }

  return {
    ...baseScenario,
    name: `${baseScenario.name}: horizontal vivarium`,
    description: `${baseScenario.description} 수직 층을 없애고 좌우로 길게 펼쳐, 이동 흐름과 둥지 위치가 더 잘 보이게 조정했습니다.`,
    rooms,
    links,
    agents,
    props
  };
}
