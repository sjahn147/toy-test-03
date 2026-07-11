// 결정론적 zone-cluster 배치. RNG 금지 — 같은 입력이면 항상 같은 좌표.
//
// 알고리즘:
//   (a) zones의 grid {col,row}가 macro-grid 앵커를 정한다.
//   (b) 존 내부는 manifest 순서대로 shelf-packing (한 shelf 최대 3방).
//   (c) 존 bbox를 앵커 (col*PITCH, row*PITCH)에 중심 정렬.
//       PITCH = 모든 존 bbox의 최대 extent + zoneGap.
//   (d) 방별 layoutHint {dx,dz}를 마지막에 더한다.

const DEFAULT_GUTTER = 8;
const DEFAULT_ZONE_GAP = 24;
const ROOMS_PER_SHELF = 3;

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {{ zones: Object[], rooms: Object[], layout?: { gutter?: number, zoneGap?: number } }} input
 * @returns {Map<string, {x: number, z: number}>} roomId → 방 중심 좌표
 */
export function layoutZones({ zones = [], rooms = [], layout = {} } = {}) {
  const gutter = layout?.gutter ?? DEFAULT_GUTTER;
  const zoneGap = layout?.zoneGap ?? DEFAULT_ZONE_GAP;

  const zoneById = new Map(zones.map(zone => [zone.id, zone]));
  const roomsByZone = new Map();
  for (const room of rooms) {
    if (!zoneById.has(room.zoneId)) continue; // 미등록 존은 밸리데이터 몫
    if (!roomsByZone.has(room.zoneId)) roomsByZone.set(room.zoneId, []);
    roomsByZone.get(room.zoneId).push(room);
  }

  // (b) 존 로컬 좌표에서 shelf-packing
  const packed = new Map(); // zoneId → { locals: Map<roomId, {x,z}>, bbox }
  for (const [zoneId, zoneRooms] of roomsByZone) {
    const locals = new Map();
    let cursorX = 0;
    let shelfZ = 0;
    let shelfDepth = 0;
    let inShelf = 0;

    for (const room of zoneRooms) {
      if (inShelf === ROOMS_PER_SHELF) {
        shelfZ += shelfDepth + gutter;
        cursorX = 0;
        shelfDepth = 0;
        inShelf = 0;
      }
      const w = room.size?.w ?? room.w ?? 0;
      const d = room.size?.d ?? room.d ?? 0;
      locals.set(room.id, { x: cursorX + w / 2, z: shelfZ + d / 2, w, d });
      cursorX += w + gutter;
      shelfDepth = Math.max(shelfDepth, d);
      inShelf += 1;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const local of locals.values()) {
      minX = Math.min(minX, local.x - local.w / 2);
      maxX = Math.max(maxX, local.x + local.w / 2);
      minZ = Math.min(minZ, local.z - local.d / 2);
      maxZ = Math.max(maxZ, local.z + local.d / 2);
    }
    packed.set(zoneId, { locals, bbox: { minX, maxX, minZ, maxZ } });
  }

  // (c) PITCH = 전체 존 중 최대 bbox extent + zoneGap
  let maxExtent = 0;
  for (const { bbox } of packed.values()) {
    maxExtent = Math.max(maxExtent, bbox.maxX - bbox.minX, bbox.maxZ - bbox.minZ);
  }
  const pitch = maxExtent + zoneGap;

  const centers = new Map();
  for (const [zoneId, { locals, bbox }] of packed) {
    const zone = zoneById.get(zoneId);
    const anchorX = (zone.grid?.col ?? 0) * pitch;
    const anchorZ = (zone.grid?.row ?? 0) * pitch;
    const offsetX = anchorX - (bbox.minX + bbox.maxX) / 2;
    const offsetZ = anchorZ - (bbox.minZ + bbox.maxZ) / 2;

    for (const room of roomsByZone.get(zoneId)) {
      const local = locals.get(room.id);
      // (d) layoutHint는 마지막에 적용
      const dx = room.layoutHint?.dx ?? 0;
      const dz = room.layoutHint?.dz ?? 0;
      centers.set(room.id, {
        x: round(local.x + offsetX + dx),
        z: round(local.z + offsetZ + dz)
      });
    }
  }

  return centers;
}
