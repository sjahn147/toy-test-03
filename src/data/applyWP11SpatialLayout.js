const DEFAULT_MARGIN = 0.82;
const SEARCH_RINGS = [0, 0.55, 1.1, 1.65, 2.2, 2.75, 3.3];
const SEARCH_STEPS = 16;

const PROP_RADII = Object.freeze({
  dungeon_entrance: 1.25,
  water_fountain: 0.85,
  rest_site: 1.15,
  camp_site: 1.05,
  merchant_stall: 1.2,
  goddess_statue: 1,
  goblin_lair: 1.15,
  ossuary_lair: 1.05,
  spider_lair: 1.15,
  slime_pool: 1.05,
  rat_warren: 1,
  ogre_lair: 1.25,
  plague_mortuary: 1.1,
  orc_tribe_camp: 1.25,
  fungal_garden: 1.15,
  blood_roost: 1.05,
  carrion_pit: 1.1,
  kobold_workshop: 1.15,
  cursed_chapel: 1.1,
  parasite_pool: 1.05,
  territory_banner: 0.55,
  barricade: 0.92,
  watch_post: 0.95,
  supply_depot: 1.2,
  gatehouse: 1.45,
  siege_workshop: 1.3,
  ambush_post: 0.95,
  adventurer_field_camp: 1.05
});

export function applyWP11SpatialLayout(source) {
  const scenario = clone(source);
  if (scenario.wp11SpatialLayoutApplied) return scenario;

  const propsByRoom = groupBy(scenario.props ?? [], prop => prop.roomId);
  const portClearanceByRoom = collectPortClearance(scenario.routes ?? []);
  const diagnostics = [];

  for (const room of scenario.rooms ?? []) {
    const reserved = [...(portClearanceByRoom.get(room.id) ?? [])];
    const props = [...(propsByRoom.get(room.id) ?? [])].sort((a, b) => placementPriority(a) - placementPriority(b) || String(a.id).localeCompare(String(b.id)));
    for (const prop of props) {
      const placement = prop.placement ?? {};
      const scale = finite(placement.scale, defaultScale(prop));
      const radius = propRadius(prop) * scale;
      const desired = { ox: finite(placement.ox), oz: finite(placement.oz) };
      const candidate = chooseCandidate(room, desired, radius, reserved, prop.id);
      const resolved = candidate ?? clampInside(room, desired, radius);
      prop.placement = {
        ...placement,
        ox: round(resolved.ox),
        oz: round(resolved.oz),
        scale,
        wp11Adjusted: Math.hypot(resolved.ox - desired.ox, resolved.oz - desired.oz) > 0.03,
        wp11SpatialRadius: round(radius)
      };
      reserved.push({ id: String(prop.id), ox: resolved.ox, oz: resolved.oz, radius, kind: 'prop' });
      if (!candidate) {
        prop.placement.wp11Conflict = true;
        diagnostics.push({ roomId: room.id, propId: prop.id, kind: 'no-clear-placement' });
      }
    }
  }

  scenario.wp11SpatialLayoutApplied = true;
  scenario.meta ??= {};
  scenario.meta.wp11SpatialLayout = {
    schemaVersion: 1,
    diagnostics,
    adjustedProps: (scenario.props ?? []).filter(prop => prop.placement?.wp11Adjusted).length,
    conflictingProps: diagnostics.length
  };
  return scenario;
}

function collectPortClearance(routes) {
  const result = new Map();
  for (const route of routes) {
    for (const [roomId, port] of Object.entries(route?.ports ?? {})) {
      if (!port || !Number.isFinite(port.x) || !Number.isFinite(port.z)) continue;
      const width = Math.max(1.2, finite(port.width, route.width ?? 1.5));
      const roomList = result.get(roomId) ?? [];
      roomList.push({
        id: `route:${route.id ?? `${route.from}-${route.to}`}:${roomId}`,
        worldX: port.x,
        worldZ: port.z,
        radius: width * 0.72 + 0.25,
        kind: 'route'
      });
      result.set(roomId, roomList);
    }
  }
  return result;
}

function chooseCandidate(room, desired, radius, reserved, id) {
  const angleOffset = hash01(id) * Math.PI * 2;
  const candidates = [];
  for (const ring of SEARCH_RINGS) {
    if (ring === 0) candidates.push(desired);
    else {
      for (let step = 0; step < SEARCH_STEPS; step += 1) {
        const angle = angleOffset + step * Math.PI * 2 / SEARCH_STEPS;
        candidates.push({ ox: desired.ox + Math.cos(angle) * ring, oz: desired.oz + Math.sin(angle) * ring });
      }
    }
  }
  return candidates
    .filter(candidate => inside(room, candidate, radius))
    .filter(candidate => reserved.every(item => !overlaps(room, candidate, radius, item)))
    .sort((a, b) => Math.hypot(a.ox - desired.ox, a.oz - desired.oz) - Math.hypot(b.ox - desired.ox, b.oz - desired.oz))[0] ?? null;
}

function overlaps(room, candidate, radius, item) {
  const itemLocal = item.kind === 'route'
    ? { ox: item.worldX - room.x, oz: item.worldZ - room.z }
    : item;
  return Math.hypot(candidate.ox - itemLocal.ox, candidate.oz - itemLocal.oz) < radius + item.radius + 0.18;
}

function inside(room, candidate, radius) {
  const maxX = Math.max(0, room.w / 2 - DEFAULT_MARGIN - radius);
  const maxZ = Math.max(0, room.d / 2 - DEFAULT_MARGIN - radius);
  return Math.abs(candidate.ox) <= maxX && Math.abs(candidate.oz) <= maxZ;
}

function clampInside(room, candidate, radius) {
  const maxX = Math.max(0, room.w / 2 - DEFAULT_MARGIN - radius);
  const maxZ = Math.max(0, room.d / 2 - DEFAULT_MARGIN - radius);
  return { ox: clamp(candidate.ox, -maxX, maxX), oz: clamp(candidate.oz, -maxZ, maxZ) };
}

function propRadius(prop) {
  return PROP_RADII[prop?.type] ?? finite(prop?.placement?.radius ?? prop?.radius, 0.58);
}

function defaultScale(prop) {
  if (String(prop?.type ?? '').includes('lair') || String(prop?.type ?? '').includes('camp')) return 0.78;
  if (PROP_RADII[prop?.type] >= 1.2) return 0.72;
  return 0.7;
}

function placementPriority(prop) {
  if (['dungeon_entrance', 'goddess_statue'].includes(prop?.type)) return 0;
  if (String(prop?.type ?? '').includes('lair') || String(prop?.type ?? '').includes('camp') || String(prop?.type ?? '').includes('garden')) return 1;
  if (['gatehouse', 'barricade', 'watch_post'].includes(prop?.type)) return 2;
  return 3;
}

function groupBy(items, keyOf) {
  const result = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const list = result.get(key) ?? [];
    list.push(item);
    result.set(key, list);
  }
  return result;
}

function finite(value, fallback = 0) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function round(value) { return Math.round(value * 100) / 100; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function hash01(value) { let result = 2166136261; for (const char of String(value ?? '')) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0) / 0xffffffff; }
function clone(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
