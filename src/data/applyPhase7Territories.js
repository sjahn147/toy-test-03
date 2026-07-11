const RESOURCE_DEFINITIONS = [
  { kind: 'crypt', resource: 'bones', type: 'bone_quarry', label: 'Loose Ossuary Seam' },
  { kind: 'armory', resource: 'scrap', type: 'scrap_heap', label: 'Recoverable Iron Heap' },
  { kind: 'pantry', resource: 'food', type: 'food_cache', label: 'Spoiled Provision Cache' },
  { kind: 'hatchery', resource: 'biomass', type: 'biomass_patch', label: 'Warm Biomass Bed' },
  { kind: 'lair', resource: 'meat', type: 'meat_cache', label: 'Unclaimed Carrion Rack' },
  { kind: 'shrine', resource: 'deathEnergy', type: 'death_font', label: 'Residual Death Font' },
  { kind: 'trap', resource: 'scrap', type: 'scrap_heap', label: 'Broken Mechanism Heap' },
  { kind: 'nest', resource: 'food', type: 'food_cache', label: 'Stolen Food Cache' }
];

export function applyPhase7Territories(source) {
  const scenario = clone(source);
  if (scenario.props.some(prop => prop.type === 'territory_resource')) return scenario;

  const eligible = scenario.rooms.filter(room =>
    !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold') && room.kind !== 'start'
  );

  let sequence = 0;
  for (const room of eligible) {
    const definition = RESOURCE_DEFINITIONS.find(candidate => candidate.kind === room.kind);
    if (!definition) continue;
    room.tags = [...new Set([...(room.tags ?? []), 'territory_claimable'])];
    scenario.props.push({
      id: `territory-resource-${sequence++}`,
      type: 'territory_resource',
      resourceType: definition.resource,
      visualType: definition.type,
      label: definition.label,
      roomId: room.id,
      stock: 4 + (room.danger ?? 1) * 2,
      maxStock: 10,
      regenRate: 0.018 + (room.spawnWeight ?? 0) * 0.006,
      placement: {
        ox: ((sequence % 3) - 1) * 0.72,
        oz: sequence % 2 ? -0.72 : 0.72,
        rotation: (sequence % 5) * 0.27,
        scale: 0.72
      }
    });
  }

  scenario.territoryEnabled = true;
  return scenario;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
