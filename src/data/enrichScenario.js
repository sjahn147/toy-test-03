export function enrichScenarioWithFacilities(source) {
  const scenario = clone(source);
  const entry = scenario.rooms.find(room => room.kind === 'start') ?? scenario.rooms[0];
  if (!entry) return scenario;

  entry.tags = unique([...(entry.tags ?? []), 'entrance']);

  const refugeId = `${scenario.id}-waystation`;
  const existingRefuge = scenario.rooms.find(room => room.id === refugeId || room.tags?.includes('safe_zone'));
  const refuge = existingRefuge ?? createWaystation(entry, scenario.rooms, refugeId);

  if (!existingRefuge) {
    scenario.rooms.push(refuge);
    scenario.links.push([entry.id, refuge.id]);
  }

  refuge.tags = unique([
    ...(refuge.tags ?? []),
    'safe_zone',
    'water_source',
    'rest_site',
    'camp_site',
    'merchant',
    'resurrection',
    'sanctuary'
  ]);

  const facilityIds = new Set((scenario.props ?? []).map(prop => prop.id));
  const additions = [
    {
      id: `${scenario.id}-entrance-gate`,
      type: 'dungeon_entrance',
      roomId: entry.id,
      label: 'Dungeon Expedition Gate',
      localX: 0,
      localZ: 0,
      rotation: faceToward(entry, refuge)
    },
    {
      id: `${scenario.id}-water-fountain`,
      type: 'water_fountain',
      roomId: refuge.id,
      label: 'Wayfarer Fountain',
      localX: -2.2,
      localZ: -1.55,
      charges: 12,
      maxCharges: 12,
      refillRate: 0.18
    },
    {
      id: `${scenario.id}-rest-site`,
      type: 'rest_site',
      roomId: refuge.id,
      label: 'Pilgrim Benches',
      localX: 1.85,
      localZ: -1.45,
      rotation: Math.PI
    },
    {
      id: `${scenario.id}-camp-site`,
      type: 'camp_site',
      roomId: refuge.id,
      label: 'Licensed Campfire',
      localX: -1.55,
      localZ: 1.45,
      supplies: 5,
      maxSupplies: 8
    },
    {
      id: `${scenario.id}-merchant-stall`,
      type: 'merchant_stall',
      roomId: refuge.id,
      label: 'Understairs Provisioner',
      localX: 2.05,
      localZ: 1.35,
      rotation: -Math.PI / 2,
      stock: 8
    },
    {
      id: `${scenario.id}-goddess-statue`,
      type: 'goddess_statue',
      roomId: refuge.id,
      label: 'Statue of the Returning Light',
      localX: 0,
      localZ: 0,
      resurrectionCharges: 1,
      maxResurrectionCharges: 1,
      rechargeTime: 95
    }
  ];

  scenario.props ??= [];
  for (const prop of additions) {
    if (!facilityIds.has(prop.id)) scenario.props.push(prop);
  }

  scenario.facilities = {
    entryRoomId: entry.id,
    safeRoomId: refuge.id,
    entrancePropId: `${scenario.id}-entrance-gate`,
    waterPropId: `${scenario.id}-water-fountain`,
    restPropId: `${scenario.id}-rest-site`,
    campPropId: `${scenario.id}-camp-site`,
    merchantPropId: `${scenario.id}-merchant-stall`,
    resurrectionPropId: `${scenario.id}-goddess-statue`
  };

  return scenario;
}

function createWaystation(entry, rooms, id) {
  const others = rooms.filter(room => room.id !== entry.id);
  const avgX = others.length ? others.reduce((sum, room) => sum + room.x, 0) / others.length : entry.x + 1;
  const avgZ = others.length ? others.reduce((sum, room) => sum + room.z, 0) / others.length : entry.z;
  let dx = entry.x - avgX;
  let dz = entry.z - avgZ;
  const length = Math.hypot(dx, dz) || 1;
  dx /= length;
  dz /= length;
  const distance = 8.2;

  return {
    id,
    name: "Pilgrim's Waystation",
    x: entry.x + dx * distance,
    z: entry.z + dz * distance,
    w: 8.4,
    d: 7.4,
    floor: entry.floor ?? 0,
    kind: 'safe',
    tags: ['safe_zone'],
    danger: 0,
    spawnWeight: 0
  };
}

function faceToward(a, b) {
  return Math.atan2(b.x - a.x, b.z - a.z);
}

function unique(values) {
  return [...new Set(values)];
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
