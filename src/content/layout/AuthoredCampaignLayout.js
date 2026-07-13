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
  }

  const routeIds = new Set();
  for (const route of layout.routes ?? []) {
    if (!route?.id || routeIds.has(route.id)) throw new Error(`authored layout has duplicate or missing route id ${route?.id}`);
    routeIds.add(route.id);
    if (!manifestRooms.has(route.from) || !manifestRooms.has(route.to)) {
      throw new Error(`authored route ${route.id} references an unknown endpoint`);
    }
    if (!['ordinary', 'conditional', 'secret'].includes(route.kind)) {
      throw new Error(`authored route ${route.id} has unsupported kind ${route.kind}`);
    }
    if (!Array.isArray(route.points) || route.points.length < 2) {
      throw new Error(`authored route ${route.id} has no usable polyline`);
    }
    for (const point of route.points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) {
        throw new Error(`authored route ${route.id} contains an invalid point`);
      }
    }
    for (const endpoint of [route.from, route.to]) {
      const port = route.ports?.[endpoint];
      if (!port || !['N', 'S', 'E', 'W'].includes(port.side)) {
        throw new Error(`authored route ${route.id} has no valid port for ${endpoint}`);
      }
    }
  }

  const ordinaryPairs = new Set((manifest.connections ?? []).map(([a, b]) => pairKey(a, b)));
  const layoutOrdinaryPairs = new Set((layout.routes ?? []).filter(route => route.kind === 'ordinary').map(route => pairKey(route.from, route.to)));
  if (!sameSet(ordinaryPairs, layoutOrdinaryPairs)) {
    throw new Error('authored ordinary routes do not exactly match manifest.connections');
  }

  const conditionalIds = new Set((manifest.conditionalConnections ?? []).map(route => route.id));
  const layoutConditionalIds = new Set((layout.routes ?? []).filter(route => route.kind === 'conditional').map(route => route.id));
  if (!sameSet(conditionalIds, layoutConditionalIds)) {
    throw new Error('authored conditional routes do not exactly match the manifest');
  }

  const secretIds = new Set((manifest.secretConnections ?? []).map(route => route.id));
  const layoutSecretIds = new Set((layout.routes ?? []).filter(route => route.kind === 'secret').map(route => route.id));
  if (!sameSet(secretIds, layoutSecretIds)) {
    throw new Error('authored secret routes do not exactly match the manifest');
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
    elevations: [...new Set(routes.map(route => route.elevation ?? 0))].sort((a, b) => a - b)
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
