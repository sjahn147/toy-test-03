const FLOOR_THEMES = [
  {
    name: 'Upper Cellar',
    rooms: [
      ['entry', 'Broken Entry', 'start', -12, 0, 5, 5],
      ['f0-hall', 'Low Hall', 'hall', -5, 0, 6, 4],
      ['f0-pantry', 'Rat Pantry', 'pantry', 2, -4, 5, 5],
      ['f0-armory', 'Borrowed Armory', 'armory', 2, 4, 5, 5],
      ['f0-nest', 'Goblin Nest', 'nest', 9, -4, 6, 5],
      ['f0-trap', 'False Floor', 'trap', 9, 4, 5, 5]
    ],
    links: [['entry', 'f0-hall'], ['f0-hall', 'f0-pantry'], ['f0-hall', 'f0-armory'], ['f0-pantry', 'f0-nest'], ['f0-armory', 'f0-trap']]
  },
  {
    name: 'Hungry Middle',
    rooms: [
      ['f1-stair', 'Crooked Stairs', 'stairs', -8, 0, 5, 5],
      ['f1-gallery', 'Listening Gallery', 'hall', -1, 0, 7, 5],
      ['f1-hatchery', 'Warm Hatchery', 'hatchery', 7, -5, 6, 6],
      ['f1-shrine', 'Bad Little Shrine', 'shrine', 7, 4, 5, 5],
      ['f1-treasure', 'Bright Mistake', 'treasure', 15, 0, 5, 5],
      ['f1-lair', 'Wet Lair', 'lair', -1, 7, 6, 5]
    ],
    links: [['f1-stair', 'f1-gallery'], ['f1-gallery', 'f1-hatchery'], ['f1-gallery', 'f1-shrine'], ['f1-hatchery', 'f1-treasure'], ['f1-shrine', 'f1-lair']]
  },
  {
    name: 'Deep Folly',
    rooms: [
      ['f2-stair', 'Spiral Down', 'stairs', -8, 1, 5, 5],
      ['f2-crypt', 'Mouse Crypt', 'crypt', -1, 1, 7, 5],
      ['f2-ossuary', 'Ossuary School', 'crypt', 7, -4, 6, 6],
      ['f2-mimic', 'Box Court', 'treasure', 7, 5, 6, 5],
      ['f2-hatchery', 'Second Hatchery', 'hatchery', 15, -4, 6, 5],
      ['f2-gate', 'Back Gate', 'gate', 15, 5, 5, 5]
    ],
    links: [['f2-stair', 'f2-crypt'], ['f2-crypt', 'f2-ossuary'], ['f2-crypt', 'f2-mimic'], ['f2-ossuary', 'f2-hatchery'], ['f2-mimic', 'f2-gate']]
  }
];

export function expandScenario(baseScenario) {
  const rooms = [];
  const links = [];
  const props = [];
  const agents = [];
  const variant = Math.floor(Math.random() * 9999);

  FLOOR_THEMES.forEach((floor, floorIndex) => {
    const zShift = floorIndex * 13;
    const xShift = floorIndex % 2 === 0 ? 0 : 1.5;
    for (const [id, name, kind, x, z, w, d] of floor.rooms) {
      rooms.push({
        id,
        name,
        kind,
        floor: floorIndex,
        x: x + xShift,
        z: z + zShift,
        w,
        d,
        spawnWeight: ['hatchery', 'lair', 'nest', 'crypt', 'gate'].includes(kind) ? 2 : 0,
        danger: ['trap', 'hatchery', 'lair', 'crypt'].includes(kind) ? 2 : 1
      });
    }
    links.push(...floor.links);
  });

  links.push(['f0-trap', 'f1-stair'], ['f1-lair', 'f2-stair']);

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
    ['goblin', 'Nib', 'f0-nest'],
    ['goblin', 'Krek', 'f0-nest'],
    ['skeleton', 'Clickjaw', 'f2-crypt'],
    ['skeleton', 'Saint Elbow', 'f2-ossuary'],
    ['slime', 'The Damp Opinion', 'f1-lair'],
    ['mimic', 'A Reasonable Chest', 'f2-mimic']
  ];

  monsterSeeds.forEach(([role, name, roomId], i) => {
    agents.push({ id: `${role}-${variant}-${i}`, name, role, faction: 'dungeon', roomId, hidden: role === 'mimic', level: 1 });
  });

  const propRooms = rooms.filter(r => ['treasure', 'trap', 'armory', 'shrine'].includes(r.kind));
  for (const room of propRooms) {
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
    name: `${baseScenario.name}: ${rooms.length}-room vivarium`,
    description: `${baseScenario.description} This run unfolds across three stacked floors with hatcheries, shrines, traps, lairs, treasure rooms, and exits.`,
    rooms,
    links,
    agents,
    props
  };
}
