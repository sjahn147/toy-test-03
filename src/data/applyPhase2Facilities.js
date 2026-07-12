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

  // 컴파일된 캠페인 시나리오는 이미 공간 스케일이 적용된 상태(phase8SpatialScaleApplied)라
  // 이후의 applyPhase8SpatialScale이 no-op이 된다. 그 경우 여기서 추가하는 waystation은
  // 스케일을 받지 못해 8.4×8.4로 남고, 시설 프롭이 셀을 막아 파티가 입장하지 못한다.
  // 이미 스케일된 시나리오면 waystation을 post-scale 크기(SIZE_SCALE)로, 시설 배치는
  // 같은 오프셋 배율(1.22)로 저작해 레거시 경로와 동일한 공간을 확보한다.
  const SIZE_SCALE = 1.58;
  const OFFSET_SCALE = 1.22;
  const scaled = source.phase8SpatialScaleApplied === true;
  const offsetScale = scaled ? OFFSET_SCALE : 1;
  // 스케일 안 된 레거시 경로는 8.4를 유지해 이후 applyPhase8SpatialScale이 13.27로 만든다.
  // 이미 스케일된 캠페인 경로는 여기서 직접 post-scale 크기로 만든다(scale은 no-op).
  const wayW = scaled ? round(Math.max(10.5, 8.4 * SIZE_SCALE)) : 8.4;
  const wayD = scaled ? round(Math.max(10.5, 8.4 * SIZE_SCALE)) : 8.4;

  const placement = outsidePlacement(originalEntry, neighbor, wayW);
  const waystation = {
    id: 'expedition-waystation',
    name: 'The Licensed Waystation',
    x: placement.x,
    z: placement.z,
    w: wayW,
    d: wayD,
    kind: 'start',
    tags: ['entrance', 'safe_zone', 'water_source', 'camp_site', 'merchant', 'resurrection', 'sanctuary']
  };
  if (scaled) {
    // 스케일된 캠페인 방들과 shape를 맞춘다 (applyPhase8SpatialScale 미러).
    waystation.legacyDimensions = { w: 8.4, d: 8.4 };
    waystation.spatialCapacity = Math.max(1, Math.floor((wayW - 1.64) * (wayD - 1.64) / 0.78 ** 2));
    waystation.tags.push('phase8_spacious');
  }
  scenario.rooms.push(waystation);
  scenario.links.unshift(['expedition-waystation', thresholdId]);

  const fx = offsetScale;
  scenario.props.push(
    facility('facility-entrance', 'dungeon_entrance', 'Expedition Gate', 'expedition-waystation', 0, -2.9 * fx, 0, 0.72),
    facility('facility-fountain', 'water_fountain', 'Pilgrim Fountain', 'expedition-waystation', -2.5 * fx, -0.45 * fx, 0.18, 0.72, { maxCharges: 12, refillRate: 0.18 }),
    facility('facility-rest', 'rest_site', 'Pilgrim Benches', 'expedition-waystation', 2.2 * fx, -0.35 * fx, -0.12, 0.68),
    facility('facility-camp', 'camp_site', 'Licensed Campfire', 'expedition-waystation', -1.65 * fx, 2.25 * fx, -0.08, 0.68),
    facility('facility-merchant', 'merchant_stall', 'Mara’s Safe-Goods Stall', 'expedition-waystation', 2.25 * fx, 2.2 * fx, 0.16, 0.62, { stock: 8, maxStock: 8 }),
    facility('facility-statue', 'goddess_statue', 'The Returning Lady', 'expedition-waystation', 0.25 * fx, 0.7 * fx, 0, 0.7, { maxResurrectionCharges: 1, rechargeTime: 95 })
  );

  return scenario;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function facility(id, type, label, roomId, ox, oz, rotation = 0, scale = 1, extra = {}) {
  return { id, type, label, roomId, placement: { ox, oz, rotation, scale }, ...extra };
}

function outsidePlacement(entry, neighbor, wayW = 8.4) {
  // threshold와 waystation이 겹치지 않도록 실제 방 크기 기반 오프셋을 쓴다
  // (과거 고정 9는 스케일된 대형 threshold에서 겹쳤다).
  const gap = entry.w / 2 + wayW / 2 + 3;
  if (!neighbor) return { x: entry.x - gap, z: entry.z };
  const dx = neighbor.x - entry.x;
  const dz = neighbor.z - entry.z;
  if (Math.abs(dx) >= Math.abs(dz)) return { x: entry.x - Math.sign(dx || 1) * gap, z: entry.z };
  return { x: entry.x, z: entry.z - Math.sign(dz || 1) * gap };
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
