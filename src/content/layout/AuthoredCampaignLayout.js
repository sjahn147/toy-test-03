import { cloneSleepingCitadelAuthoredLayout } from './SleepingCitadelAuthoredLayout.js';

const SUPPORTED_CAMPAIGN = 'sleeping-citadel';

export function getAuthoredCampaignLayout(manifest) {
  if (!manifest || manifest.id !== SUPPORTED_CAMPAIGN) return null;
  const layout = cloneSleepingCitadelAuthoredLayout();
  validateAuthoredCampaignLayout(manifest, layout);
  return {
    ...layout,
    centers: new Map(Object.entries(layout.rooms).map(([roomId, placement]) => [roomId, {
      x: placement.x,
      z: placement.z
    }])),
    roomPlacements: new Map(Object.entries(layout.rooms))
  };
}

export function validateAuthoredCampaignLayout(manifest, layout) {
  const manifestRooms = new Map((manifest.rooms ?? []).map(room => [room.id, room]));
  const layoutRooms = new Map(Object.entries(layout?.rooms ?? {}));
  if (manifestRooms.size !== layoutRooms.size) {
    throw new Error(`authored layout room count ${layoutRooms.size} does not match manifest ${manifestRooms.size}`);
  }

  for (const roomId of manifestRooms.keys()) {
    const placement = layoutRooms.get(roomId);
    if (!placement) throw new Error(`authored layout is missing room ${roomId}`);
    for (const field of ['x', 'z', 'floor', 'rotation']) {
      if (!Number.isFinite(placement[field])) throw new Error(`authored layout room ${roomId} has invalid ${field}`);
    }
    if (!Array.isArray(placement.spawnSockets) || placement.spawnSockets.length < 1) {
      throw new Error(`authored layout room ${roomId} has no spawn socket`);
    }
    for (const socket of placement.spawnSockets) {
      if (!socket?.id || socket.roomId !== roomId || !Array.isArray(socket.position) || socket.position.length !== 2) {
        throw new Error(`authored layout room ${roomId} contains an invalid spawn socket`);
      }
    }
  }

  const routeIds = new Set();
  const routePairsByKind = new Map([['ordinary', new Set()], ['conditional', new Set()], ['secret', new Set()]]);
  for (const route of layout.routes ?? []) {
    if (!route?.id || routeIds.has(route.id)) throw new Error(`authored layout has duplicate or missing route id ${route?.id}`);
    routeIds.add(route.id);
    if (!manifestRooms.has(route.from) || !manifestRooms.has(route.to)) {
      throw new Error(`authored route ${route.id} references an unknown endpoint`);
    }
    if (!routePairsByKind.has(route.kind)) throw new Error(`authored route ${route.id} has unsupported kind ${route.kind}`);
    if (!Array.isArray(route.points) || route.points.length < 2) throw new Error(`authored route ${route.id} has no usable polyline`);
    for (const point of route.points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) throw new Error(`authored route ${route.id} contains an invalid point`);
    }
    for (const endpoint of [route.from, route.to]) {
      const port = route.ports?.[endpoint];
      if (!port || !['N', 'S', 'E', 'W'].includes(port.side)) throw new Error(`authored route ${route.id} has no valid port for ${endpoint}`);
    }
    routePairsByKind.get(route.kind).add(pairKey(route.from, route.to));
  }

  const policy = layout.connectionPolicy ?? {};
  const removedBasePairs = new Set(policy.removeBasePairs ?? []);
  const promotedPairs = new Set(policy.promoteConditionalPairs ?? []);
  const expectedOrdinaryPairs = new Set(
    (manifest.connections ?? [])
      .map(([a, b]) => pairKey(a, b))
      .filter(pair => !removedBasePairs.has(pair))
  );
  for (const pair of promotedPairs) expectedOrdinaryPairs.add(pair);

  const expectedConditionalIds = new Set(
    (manifest.conditionalConnections ?? [])
      .filter(route => !promotedPairs.has(pairKey(route.from, route.to)))
      .map(route => route.id)
  );
  const actualConditionalIds = new Set((layout.routes ?? []).filter(route => route.kind === 'conditional').map(route => route.id));

  const expectedSecretIds = new Set((manifest.secretConnections ?? []).map(route => route.id));
  for (const route of policy.addSecretConnections ?? []) expectedSecretIds.add(route.id);
  const actualSecretIds = new Set((layout.routes ?? []).filter(route => route.kind === 'secret').map(route => route.id));

  if (!sameSet(expectedOrdinaryPairs, routePairsByKind.get('ordinary'))) {
    throw new Error('authored ordinary routes do not match the content-directed connection policy');
  }
  if (!sameSet(expectedConditionalIds, actualConditionalIds)) {
    throw new Error('authored conditional routes do not match the content-directed connection policy');
  }
  if (!sameSet(expectedSecretIds, actualSecretIds)) {
    throw new Error('authored secret routes do not match the content-directed connection policy');
  }

  if (layout.entryPolicy !== 'authored-hub' || layout.entryRoomId !== manifest.entryRoomId) {
    throw new Error('Sleeping Citadel must retain A01 as the authored entry hub');
  }
  return true;
}

export function authoredRouteSummary(layout) {
  const routes = layout?.routes ?? [];
  return {
    total: routes.length,
    ordinary: routes.filter(route => route.kind === 'ordinary').length,
    conditional: routes.filter(route => route.kind === 'conditional').length,
    secret: routes.filter(route => route.kind === 'secret').length,
    floors: [...new Set(Object.values(layout?.rooms ?? {}).map(room => room.floor))].sort((a, b) => a - b),
    spawnSockets: Object.values(layout?.rooms ?? {}).reduce((sum, room) => sum + (room.spawnSockets?.length ?? 0), 0)
  };
}

function pairKey(a, b) {
  return [a, b].sort().join('::');
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}
