const ADVANCED_LAIRS = [
  { species: 'zombie', type: 'plague_mortuary', label: 'Plague Mortuary', faction: 'undead-host', preferred: ['crypt', 'shrine', 'trap'], placement: [-1.0, 0.9, -0.08, 0.76], capacity: 5, corpseStock: 1 },
  { species: 'orc', type: 'orc_tribe_camp', label: 'Red Tusk War Camp', faction: 'red-tusk-tribe', preferred: ['gate', 'armory', 'hall'], placement: [1.05, -0.9, 0.1, 0.78], capacity: 4, meatStock: 3, trophyStock: 1 },
  { species: 'myconid', type: 'fungal_garden', label: 'Bluecap Rot Garden', faction: 'bluecap-colony', preferred: ['lair', 'pantry', 'hatchery'], placement: [-1.05, -0.85, -0.04, 0.82], capacity: 5, sporeStock: 2 },
  { species: 'stirge', type: 'blood_roost', label: 'Red-Wing Blood Roost', faction: 'red-wing-brood', preferred: ['hatchery', 'lair', 'crypt'], placement: [1.0, 0.9, 0.18, 0.76], capacity: 7, bloodStock: 1 },
  { species: 'carrion', type: 'carrion_pit', label: 'Carrion Nursery Pit', faction: 'carrion-brood', preferred: ['pantry', 'crypt', 'lair'], placement: [0.95, -0.85, -0.14, 0.8], capacity: 4, carrionStock: 1 },
  { species: 'kobold', type: 'kobold_workshop', label: 'Copper-Tail Trapworks', faction: 'copper-tail-clutch', preferred: ['trap', 'armory', 'hall'], placement: [-0.95, 0.82, 0.12, 0.76], capacity: 5, scrapStock: 3 },
  { species: 'wraith', type: 'cursed_chapel', label: 'Chapel of Unfinished Names', faction: 'undead-host', preferred: ['shrine', 'crypt', 'treasure'], placement: [0.9, 0.75, 0.06, 0.74], capacity: 3, deathEnergy: 1 },
  { species: 'parasite', type: 'parasite_pool', label: 'Pale Larval Cistern', faction: 'pale-brood', preferred: ['hatchery', 'lair', 'trap'], placement: [-0.85, -0.75, 0.08, 0.72], capacity: 6, hostStock: 0 }
];

export function applyPhase6Ecology(source) {
  const scenario = clone(source);
  if (scenario.props.some(prop => prop.type === 'plague_mortuary')) return scenario;

  const candidates = scenario.rooms.filter(room =>
    !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold') && room.kind !== 'start'
  );
  const usage = new Map();
  const lairs = {};

  for (const definition of ADVANCED_LAIRS) {
    const room = chooseRoom(candidates, usage, definition.preferred);
    if (!room) continue;
    usage.set(room.id, (usage.get(room.id) ?? 0) + 1);
    room.tags = [...new Set([...(room.tags ?? []), 'advanced_ecology', 'territory', `${definition.species}_home`])];
    const [ox, oz, rotation, scale] = definition.placement;
    scenario.props.push({
      id: `advanced-${definition.species}-lair`,
      type: definition.type,
      label: definition.label,
      species: definition.species,
      ecologyFaction: definition.faction,
      roomId: room.id,
      placement: { ox, oz, rotation, scale },
      capacity: definition.capacity,
      spawnProgress: 0,
      corpseStock: definition.corpseStock ?? 0,
      meatStock: definition.meatStock ?? 0,
      trophyStock: definition.trophyStock ?? 0,
      sporeStock: definition.sporeStock ?? 0,
      bloodStock: definition.bloodStock ?? 0,
      carrionStock: definition.carrionStock ?? 0,
      scrapStock: definition.scrapStock ?? 0,
      deathEnergy: definition.deathEnergy ?? 0,
      hostStock: definition.hostStock ?? 0
    });
    lairs[definition.species] = room.id;
  }

  const seeds = [
    ['zombie', 1], ['orc', 2], ['myconid', 2], ['stirge', 3],
    ['carrion', 1], ['kobold', 2], ['wraith', 1], ['parasite', 2]
  ];
  for (const [species, count] of seeds) seedSpecies(scenario, species, lairs[species], count, factionFor(species));

  for (const agent of scenario.agents) {
    if (agent.faction !== 'dungeon') continue;
    agent.ecologyFaction ??= factionFor(agent.role);
  }
  scenario.advancedEcologyLairs = lairs;
  return scenario;
}

function chooseRoom(rooms, usage, preferredKinds) {
  const ranked = rooms
    .map(room => ({ room, use: usage.get(room.id) ?? 0, preferred: preferredKinds.indexOf(room.kind) }))
    .sort((a, b) => {
      const ap = a.preferred < 0 ? 99 : a.preferred;
      const bp = b.preferred < 0 ? 99 : b.preferred;
      return a.use - b.use || ap - bp || b.room.w * b.room.d - a.room.w * a.room.d;
    });
  return ranked[0]?.room ?? null;
}

function seedSpecies(scenario, role, roomId, count, ecologyFaction) {
  if (!roomId) return;
  const existing = scenario.agents.filter(agent => agent.role === role).length;
  for (let i = existing; i < count; i += 1) {
    scenario.agents.push({
      id: `${role}-advanced-seed-${i}`,
      name: `${displayName(role)} ${alphabeticLabel(i)}`,
      role,
      faction: 'dungeon',
      ecologyFaction,
      roomId,
      homeRoomId: roomId,
      level: 1,
      size: ['stirge', 'parasite'].includes(role) ? 'tiny' : role === 'orc' ? 'medium' : 'small'
    });
  }
}

export function factionFor(role) {
  if (['skeleton', 'zombie', 'wraith'].includes(role)) return 'undead-host';
  if (['goblin'].includes(role)) return 'goblin-clan';
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

function displayName(role) {
  const names = { myconid: 'Myconid', stirge: 'Stirge', carrion: 'Carrion Crawler', kobold: 'Kobold', wraith: 'Wraith', parasite: 'Pale Parasite', zombie: 'Zombie', orc: 'Orc' };
  return names[role] ?? `${role[0].toUpperCase()}${role.slice(1)}`;
}

function alphabeticLabel(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + value % 26) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
