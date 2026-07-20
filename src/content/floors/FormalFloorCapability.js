import { roomFloorId, usesFormalFloorArchitecture } from './SleepingCitadelFloorContract.js';

export { usesFormalFloorArchitecture };

export function snapshotForFloorArchitecture(snapshot, scenario, floorId) {
  return usesFormalFloorArchitecture(scenario)
    ? filterSnapshotForFloor(snapshot, floorId)
    : snapshot;
}

export function filterSnapshotForFloor(snapshot, floorId) {
  const rooms = snapshot?.rooms ?? [];
  const roomFloor = new Map(rooms.map(room => [room.id, roomFloorId(room)]));
  const isRoomVisible = roomId => !roomId || roomFloor.get(roomId) === floorId;
  const isConnectorVisible = connector => {
    const fromFloorId = connector?.from?.floorId ?? roomFloor.get(connector?.from?.roomId);
    const toFloorId = connector?.to?.floorId ?? roomFloor.get(connector?.to?.roomId);
    return fromFloorId === floorId || toFloorId === floorId;
  };
  const agentVisible = agent => {
    if (isRoomVisible(agent.roomId)) return true;
    const travel = agent.travel;
    return travel?.kind === 'vertical-connector' && (travel.fromFloorId === floorId || travel.toFloorId === floorId);
  };
  const routeVisible = route => {
    const explicitFloorId = route?.floorId ?? null;
    if (explicitFloorId) return explicitFloorId === floorId;
    return isRoomVisible(route?.from ?? route?.aId) || isRoomVisible(route?.to ?? route?.bId);
  };
  const visibleAgentIds = new Set((snapshot.agents ?? []).filter(agentVisible).map(agent => agent.id));
  const result = {
    ...snapshot,
    rooms: rooms.filter(room => roomFloorId(room) === floorId),
    agents: (snapshot.agents ?? []).filter(agentVisible),
    routes: (snapshot.routes ?? []).filter(routeVisible),
    verticalConnectors: (snapshot.verticalConnectors ?? []).filter(isConnectorVisible),
    props: (snapshot.props ?? []).filter(prop => isRoomVisible(prop.roomId)),
    effects: (snapshot.effects ?? []).filter(effect => isRoomVisible(effect.roomId) || visibleAgentIds.has(effect.agentId))
  };
  result.settlement = filterNested(snapshot.settlement, isRoomVisible, visibleAgentIds);
  result.logistics = filterNested(snapshot.logistics, isRoomVisible, visibleAgentIds);
  result.construction = filterNested(snapshot.construction, isRoomVisible, visibleAgentIds);
  result.siege = filterNested(snapshot.siege, isRoomVisible, visibleAgentIds);
  for (const [key, value] of Object.entries(snapshot ?? {})) {
    if (key in result || !value || typeof value !== 'object') continue;
    if (key.startsWith('hero') || key.includes('outpost') || key.includes('worksite') || key.includes('activity')) result[key] = filterNested(value, isRoomVisible, visibleAgentIds);
  }
  return result;
}

function filterNested(value, isRoomVisible, visibleAgentIds) {
  if (Array.isArray(value)) return value.filter(item => itemVisible(item, isRoomVisible, visibleAgentIds)).map(item => filterNested(item, isRoomVisible, visibleAgentIds));
  if (!value || typeof value !== 'object' || value instanceof Map || value instanceof Set) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, filterNested(child, isRoomVisible, visibleAgentIds)]));
}

function itemVisible(item, isRoomVisible, visibleAgentIds) {
  if (!item || typeof item !== 'object') return true;
  const roomId = item.roomId ?? item.targetRoomId ?? item.sourceRoomId ?? item.homeRoomId ?? item.settlementRoomId;
  if (roomId && !isRoomVisible(roomId)) return false;
  if (item.agentId && !visibleAgentIds.has(item.agentId) && !roomId) return false;
  return true;
}
