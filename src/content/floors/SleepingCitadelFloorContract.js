export const FLOOR_IDS = Object.freeze(['F0', 'B1', 'B2', 'B3']);
export const FLOOR_INDEX = Object.freeze({ F0: 0, B1: -1, B2: -2, B3: -3 });

export function usesFormalFloorArchitecture(scenario) {
  const floors = scenario?.floors ?? scenario?.meta?.floors ?? [];
  return Boolean(
    scenario?.meta?.authoredPhysicalLayout === true
    && Array.isArray(floors)
    && floors.length > 0
  );
}

export function normalizeFloorDefinitions(floors = []) {
  const list = (floors ?? []).map((floor, order) => ({
    id: String(floor.id),
    index: Number.isFinite(floor.index) ? floor.index : FLOOR_INDEX[floor.id] ?? -order,
    elevation: Number.isFinite(floor.elevation) ? floor.elevation : (Number.isFinite(floor.index) ? floor.index : FLOOR_INDEX[floor.id] ?? -order) * 5.4,
    name: floor.name ?? { en: floor.id, ko: floor.id },
    roomIds: [...(floor.roomIds ?? [])],
    cameraProfile: floor.cameraProfile ?? 'default',
    ambientProfile: floor.ambientProfile ?? 'default'
  }));
  list.sort((a, b) => b.index - a.index);
  return list;
}

export function usesFormalFloorArchitecture(scenario) {
  const floors = scenario?.floors ?? scenario?.meta?.floors ?? [];
  return scenario?.meta?.authoredPhysicalLayout === true
    && Array.isArray(floors)
    && floors.length > 0;
}

export function floorByRoom(scenario) {
  const map = new Map();
  for (const room of scenario?.rooms ?? []) map.set(room.id, room.floorId ?? floorIdFromIndex(room.floor));
  return map;
}

export function floorIdFromIndex(index) {
  return Object.entries(FLOOR_INDEX).find(([, value]) => value === Number(index))?.[0] ?? `F${Number(index)}`;
}

export function floorIndexFromId(floorId) {
  return FLOOR_INDEX[floorId] ?? 0;
}

export function activeFloorRooms(snapshot, floorId) {
  return (snapshot?.rooms ?? []).filter(room => (room.floorId ?? floorIdFromIndex(room.floor)) === floorId);
}

export function roomFloorId(room, roomById = null) {
  if (!room) return null;
  if (typeof room === 'string') room = roomById?.get?.(room) ?? null;
  return room?.floorId ?? floorIdFromIndex(room?.floor ?? 0);
}
