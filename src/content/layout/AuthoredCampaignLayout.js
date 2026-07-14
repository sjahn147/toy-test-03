import { cloneSleepingCitadelAuthoredLayout } from './SleepingCitadelAuthoredLayout.js';

const SUPPORTED_CAMPAIGN = 'sleeping-citadel';

export function getAuthoredCampaignLayout(manifest) {
  if (!manifest || manifest.id !== SUPPORTED_CAMPAIGN) return null;
  const layout = cloneSleepingCitadelAuthoredLayout();
  validateAuthoredCampaignLayout(manifest, layout);
  return {
    ...layout,
    centers: new Map(Object.entries(layout.rooms).map(([roomId, placement]) => [roomId, { x:placement.x, z:placement.z }])),
    roomPlacements: new Map(Object.entries(layout.rooms))
  };
}

export function validateAuthoredCampaignLayout(manifest, layout) {
  const manifestRooms = new Map((manifest.rooms ?? []).map(room => [room.id, room]));
  const layoutRooms = new Map(Object.entries(layout?.rooms ?? {}));
  if (manifestRooms.size !== layoutRooms.size) throw new Error(`authored layout room count ${layoutRooms.size} does not match manifest ${manifestRooms.size}`);
  const floorIds = new Set((manifest.floors ?? []).map(floor => floor.id));
  if (floorIds.size !== 4) throw new Error('Sleeping Citadel formal map requires exactly four floors');

  for (const [roomId, source] of manifestRooms) {
    const placement = layoutRooms.get(roomId);
    if (!placement) throw new Error(`authored layout is missing room ${roomId}`);
    for (const field of ['x','z','floor','rotation']) if (!Number.isFinite(placement[field])) throw new Error(`authored layout room ${roomId} has invalid ${field}`);
    if (!placement.floorId || !floorIds.has(placement.floorId)) throw new Error(`authored layout room ${roomId} has invalid floorId`);
    if (placement.floorId !== source.floorId || placement.floor !== source.floor) throw new Error(`authored layout room ${roomId} disagrees with manifest floor contract`);
    if (!Array.isArray(placement.spawnSockets) || placement.spawnSockets.length < 1) throw new Error(`authored layout room ${roomId} has no spawn socket`);
  }

  const routeIds = new Set();
  const routePairsByKind = new Map([['ordinary',new Set()],['conditional',new Set()],['secret',new Set()]]);
  for (const route of layout.routes ?? []) {
    if (!route?.id || routeIds.has(route.id)) throw new Error(`authored layout has duplicate or missing route id ${route?.id}`);
    routeIds.add(route.id);
    const from = manifestRooms.get(route.from), to = manifestRooms.get(route.to);
    if (!from || !to) throw new Error(`authored route ${route.id} references an unknown endpoint`);
    if (from.floorId !== to.floorId || route.floorId !== from.floorId) throw new Error(`authored route ${route.id} must remain on one floor`);
    if (route.vertical || route.fromFloor !== route.toFloor || Number(route.elevation ?? 0) !== 0) throw new Error(`authored route ${route.id} violates the horizontal corridor invariant`);
    if ((route.points ?? []).some(point => Number.isFinite(point.yOffset))) throw new Error(`authored route ${route.id} may not use yOffset`);
    if (!routePairsByKind.has(route.kind)) throw new Error(`authored route ${route.id} has unsupported kind ${route.kind}`);
    if (!Array.isArray(route.points) || route.points.length < 2) throw new Error(`authored route ${route.id} has no usable polyline`);
    for (const endpoint of [route.from, route.to]) {
      const port = route.ports?.[endpoint];
      if (!port || !['N','S','E','W'].includes(port.side)) throw new Error(`authored route ${route.id} has no valid port for ${endpoint}`);
    }
    routePairsByKind.get(route.kind).add(pairKey(route.from, route.to));
  }

  const expectedOrdinary = new Set((manifest.connections ?? []).map(([a,b]) => pairKey(a,b)));
  const expectedConditional = new Set((manifest.conditionalConnections ?? []).map(edge => edge.id));
  const expectedSecret = new Set((manifest.secretConnections ?? []).map(edge => edge.id));
  const actualConditional = new Set((layout.routes ?? []).filter(route => route.kind === 'conditional').map(route => route.id));
  const actualSecret = new Set((layout.routes ?? []).filter(route => route.kind === 'secret').map(route => route.id));
  if (!sameSet(expectedOrdinary, routePairsByKind.get('ordinary'))) throw new Error('authored ordinary routes do not match manifest connections');
  if (!sameSet(expectedConditional, actualConditional)) throw new Error('authored conditional routes do not match manifest connections');
  if (!sameSet(expectedSecret, actualSecret)) throw new Error('authored secret routes do not match manifest connections');

  validateConnectors(manifest, layout, manifestRooms);
  if (layout.entryPolicy !== 'authored-hub' || layout.entryRoomId !== manifest.entryRoomId) throw new Error('Sleeping Citadel must retain A01 as the authored entry hub');
  return true;
}

function validateConnectors(manifest, layout, roomById) {
  const manifestConnectors = new Map((manifest.verticalConnectors ?? []).map(connector => [connector.id, connector]));
  const layoutConnectors = new Map((layout.verticalConnectors ?? []).map(connector => [connector.id, connector]));
  if (manifestConnectors.size !== 9 || layoutConnectors.size !== 9) throw new Error('formal floor map requires nine vertical connectors');
  for (const [id, source] of manifestConnectors) {
    const connector = layoutConnectors.get(id);
    if (!connector) throw new Error(`authored layout is missing connector ${id}`);
    for (const landing of [connector.from, connector.to]) {
      const room = roomById.get(landing.roomId);
      if (!room || room.floorId !== landing.floorId) throw new Error(`connector ${id} landing disagrees with room floor`);
      if (!Number.isFinite(landing.position?.x) || !Number.isFinite(landing.position?.z)) throw new Error(`connector ${id} has invalid landing position`);
    }
    if (connector.from.floorId === connector.to.floorId) throw new Error(`connector ${id} must cross floors`);
    if (connector.from.position.x !== connector.to.position.x || connector.from.position.z !== connector.to.position.z) throw new Error(`connector ${id} landings must align in X/Z`);
    if (source.from.roomId !== connector.from.roomId || source.to.roomId !== connector.to.roomId) throw new Error(`connector ${id} disagrees with manifest endpoints`);
  }
}

export function authoredRouteSummary(layout) {
  const routes = layout?.routes ?? [];
  return {
    total: routes.length,
    ordinary: routes.filter(route => route.kind === 'ordinary').length,
    conditional: routes.filter(route => route.kind === 'conditional').length,
    secret: routes.filter(route => route.kind === 'secret').length,
    floors: [...new Set(Object.values(layout?.rooms ?? {}).map(room => room.floor))].sort((a,b) => a-b),
    floorIds: [...new Set(Object.values(layout?.rooms ?? {}).map(room => room.floorId))],
    connectors: layout?.verticalConnectors?.length ?? 0,
    junctions: layout?.junctions?.length ?? 0,
    spawnSockets: Object.values(layout?.rooms ?? {}).reduce((sum,room) => sum + (room.spawnSockets?.length ?? 0), 0)
  };
}

function pairKey(a,b){return[a,b].sort().join('::');}
function sameSet(a,b){if(a.size!==b.size)return false;for(const value of a)if(!b.has(value))return false;return true;}
