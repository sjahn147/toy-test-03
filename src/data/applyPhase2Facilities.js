export function applyPhase2Facilities(source) {
  const scenario = clone(source);
  const originalEntry = scenario.rooms.find(room => room.kind === 'start') ?? scenario.rooms[0];
  if (!originalEntry || scenario.rooms.some(room => room.id === 'expedition-waystation')) return scenario;

  const oldId = originalEntry.id;
  const thresholdId = `${oldId}-threshold`;
  const neighborId = scenario.links.find(link => link[0] === oldId || link[1] === oldId)?.find(id => id !== oldId);
  const neighbor = scenario.rooms.find(room => room.id === neighborId);

  originalEntry.id = thresholdId;
  originalEntry.name = `${originalEntry.name} Threshold`;
  originalEntry.kind = 'hall';
  originalEntry.tags = [...new Set([...(originalEntry.tags ?? []), 'entrance_threshold'])];

  scenario.links = scenario.links.map(([a, b]) => [a === oldId ? thresholdId : a, b === oldId ? thresholdId : b]);
  scenario.props = scenario.props.map(prop => ({ ...prop, roomId: prop.roomId === oldId ? thresholdId : prop.roomId }));
  scenario.agents = scenario.agents.map(agent => ({
    ...agent,
    roomId: agent.faction === 'party' ? 'expedition-waystation' : agent.roomId === oldId ? thresholdId : agent.roomId
  }));

  const placement = outsidePlacement(originalEntry, neighbor);
  scenario.rooms.push({
    id: 'expedition-waystation',
    name: 'The Licensed Waystation',
    x: placement.x,
    z: placement.z,
    w: 8.4,
    d: 8.4,
    kind: 'start',
    tags: ['entrance', 'safe_zone', 'water_source', 'camp_site', 'merchant', 'resurrection', 'sanctuary']
  });
  scenario.links.unshift(['expedition-waystation', thresholdId]);

  scenario.props.push(
    facility('facility-entrance', 'dungeon_entrance', 'Expedition Gate', 'expedition-waystation', 0, -2.9, 0, 0.72),
    facility('facility-fountain', 'water_fountain', 'Pilgrim Fountain', 'expedition-waystation', -2.5, -0.45, 0.18, 0.72, { maxCharges: 12, refillRate: 0.18 }),
    facility('facility-rest', 'rest_site', 'Pilgrim Benches', 'expedition-waystation', 2.2, -0.35, -0.12, 0.68),
    facility('facility-camp', 'camp_site', 'Licensed Campfire', 'expedition-waystation', -1.65, 2.25, -0.08, 0.68),
    facility('facility-merchant', 'merchant_stall', 'Mara’s Safe-Goods Stall', 'expedition-waystation', 2.25, 2.2, 0.16, 0.62, { stock: 8, maxStock: 8 }),
    facility('facility-statue', 'goddess_statue', 'The Returning Lady', 'expedition-waystation', 0.25, 0.7, 0, 0.7, { maxResurrectionCharges: 1, rechargeTime: 95 })
  );

  return scenario;
}

function facility(id, type, label, roomId, ox, oz, rotation = 0, scale = 1, extra = {}) {
  return { id, type, label, roomId, placement: { ox, oz, rotation, scale }, ...extra };
}

function outsidePlacement(entry, neighbor) {
  if (!neighbor) return { x: entry.x - 9, z: entry.z };
  const dx = neighbor.x - entry.x;
  const dz = neighbor.z - entry.z;
  if (Math.abs(dx) >= Math.abs(dz)) return { x: entry.x - Math.sign(dx || 1) * 9, z: entry.z };
  return { x: entry.x, z: entry.z - Math.sign(dz || 1) * 9 };
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
