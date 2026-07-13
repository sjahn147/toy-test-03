const KIND_MINIMUMS = {
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

const POSITION_SCALE = 1.72;
const SIZE_SCALE = 1.58;
const LEGACY_FLOOR_HEIGHT = 2.85;
const MINIMUM_FLOOR_HEIGHT = 5.4;

export function applyPhase8SpatialScale(source) {
  const scenario = clone(source);
  if (scenario.phase8SpatialScaleApplied) {
    scenario.floorHeight = Math.max(Number(scenario.floorHeight) || 0, MINIMUM_FLOOR_HEIGHT);
    scenario.spatialScale = { ...(scenario.spatialScale ?? {}), floorHeight: scenario.floorHeight };
    return scenario;
  }
  if (!scenario.rooms?.length) return scenario;

  const centerX = average(scenario.rooms.map(room => room.x));
  const centerZ = average(scenario.rooms.map(room => room.z));

  scenario.rooms = scenario.rooms.map(room => {
    const [minimumW, minimumD] = KIND_MINIMUMS[room.kind] ?? [9.5, 8.5];
    const oldW = room.w;
    const oldD = room.d;
    const w = round(Math.max(minimumW, oldW * SIZE_SCALE));
    const d = round(Math.max(minimumD, oldD * SIZE_SCALE));
    return {
      ...room,
      x: round(centerX + (room.x - centerX) * POSITION_SCALE),
      z: round(centerZ + (room.z - centerZ) * POSITION_SCALE),
      w,
      d,
      legacyDimensions: { w: oldW, d: oldD },
      spatialCapacity: Math.max(1, Math.floor((w - 1.64) * (d - 1.64) / 0.78 ** 2)),
      tags: [...new Set([...(room.tags ?? []), 'phase8_spacious'])]
    };
  });

  for (const prop of scenario.props ?? []) {
    if (!prop.placement) continue;
    prop.placement = {
      ...prop.placement,
      ox: round((prop.placement.ox ?? 0) * 1.22),
      oz: round((prop.placement.oz ?? 0) * 1.22)
    };
  }

  scenario.floorHeight = round(Math.max(Number(scenario.floorHeight) || LEGACY_FLOOR_HEIGHT, MINIMUM_FLOOR_HEIGHT));
  scenario.phase8SpatialScaleApplied = true;
  scenario.spatialScale = {
    position: POSITION_SCALE,
    size: SIZE_SCALE,
    roomCount: scenario.rooms.length,
    averageArea: round(average(scenario.rooms.map(room => room.w * room.d)))
  };
  scenario.description = `${scenario.description} Phase 8 공간 규격으로 확장되어 거점, 운반대, 대형 전투가 같은 방에서 겹치지 않습니다.`;
  return scenario;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
