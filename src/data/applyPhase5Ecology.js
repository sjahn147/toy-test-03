const LAIR_DEFINITIONS = [
  { species: 'goblin', type: 'goblin_lair', label: 'Goblin Hearth-Lair', preferred: ['nest', 'pantry', 'lair'], placement: [-1.45, 0.85, -0.12, 0.82] },
  { species: 'skeleton', type: 'ossuary_lair', label: 'Working Ossuary', preferred: ['crypt', 'shrine', 'treasure'], placement: [1.25, 0.85, 0.08, 0.78] },
  { species: 'spider', type: 'spider_lair', label: 'Silk Brood Chamber', preferred: ['hatchery', 'trap', 'crypt'], placement: [0, 0.9, 0.18, 0.82] },
  { species: 'slime', type: 'slime_pool', label: 'Digestive Spawning Pool', preferred: ['lair', 'hatchery', 'pantry'], placement: [-0.95, -0.85, 0.04, 0.84] },
  { species: 'rat', type: 'rat_warren', label: 'Granary Rat Warren', preferred: ['pantry', 'hall', 'nest'], placement: [1.15, -0.95, -0.15, 0.76] },
  { species: 'ogre', type: 'ogre_lair', label: 'Ogre Butcher-Camp', preferred: ['gate', 'lair', 'armory'], placement: [0, 0.2, 0.14, 0.86] }
];

export function applyPhase5Ecology(source) {
  const scenario = clone(source);
  if (scenario.props.some(prop => prop.type === 'goblin_lair')) return scenario;

  const available = scenario.rooms.filter(room =>
    !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold')
  );
  const claimed = new Set();
  const lairs = {};

  for (const definition of LAIR_DEFINITIONS) {
    const room = chooseRoom(available, claimed, definition.preferred) ?? available[0];
    if (!room) continue;
    claimed.add(room.id);
    room.tags = [...new Set([...(room.tags ?? []), 'monster_lair', 'territory', `${definition.species}_home`])];
    room.ecologySpecies = definition.species;
    const [ox, oz, rotation, scale] = definition.placement;
    const prop = {
      id: `ecology-${definition.species}-lair`,
      type: definition.type,
      label: definition.label,
      species: definition.species,
      roomId: room.id,
      placement: { ox, oz, rotation, scale },
      capacity: definition.species === 'rat' ? 8 : definition.species === 'ogre' ? 2 : 5,
      foodStock: definition.species === 'goblin' ? 3 : definition.species === 'ogre' ? 2 : 0,
      biomass: definition.species === 'slime' ? 2 : 0,
      boneStock: definition.species === 'skeleton' ? 3 : 0,
      bloodStock: definition.species === 'spider' ? 1 : 0,
      grainStock: definition.species === 'rat' ? 5 : 0,
      spawnProgress: 0
    };
    scenario.props.push(prop);
    lairs[definition.species] = room.id;
  }

  seedSpecies(scenario, 'rat', lairs.rat, 3);
  seedSpecies(scenario, 'spider', lairs.spider, 2);
  ensureHomeAssignments(scenario, lairs);
  scenario.ecologyLairs = lairs;
  return scenario;
}

function chooseRoom(rooms, claimed, preferredKinds) {
  for (const kind of preferredKinds) {
    const match = rooms.find(room => room.kind === kind && !claimed.has(room.id));
    if (match) return match;
  }
  return rooms.find(room => !claimed.has(room.id));
}

function seedSpecies(scenario, role, roomId, count) {
  if (!roomId) return;
  const existing = scenario.agents.filter(agent => agent.role === role).length;
  for (let i = existing; i < count; i += 1) {
    scenario.agents.push({
      id: `${role}-seed-${i}`,
      name: `${capitalize(role)} ${alphabeticLabel(i)}`,
      role,
      faction: 'dungeon',
      roomId,
      homeRoomId: roomId,
      level: 1,
      size: role === 'rat' ? 'tiny' : 'small'
    });
  }
}

function ensureHomeAssignments(scenario, lairs) {
  for (const agent of scenario.agents) {
    if (agent.faction !== 'dungeon') continue;
    agent.homeRoomId ??= lairs[agent.role] ?? agent.roomId;
  }
}

function alphabeticLabel(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function capitalize(value) {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
