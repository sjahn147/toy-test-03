const SAFE_TYPES = new Set(['dungeon_entrance', 'water_fountain', 'rest_site', 'camp_site', 'merchant_stall', 'goddess_statue']);
const LAIR_TYPES = new Set([
  'goblin_lair', 'ossuary_lair', 'spider_lair', 'slime_pool', 'rat_warren', 'ogre_lair',
  'plague_mortuary', 'orc_tribe_camp', 'fungal_garden', 'blood_roost', 'carrion_pit',
  'kobold_workshop', 'cursed_chapel', 'parasite_pool'
]);
const DEFENSE_TYPES = new Set([
  'territory_banner', 'barricade', 'watch_post', 'supply_depot', 'gatehouse',
  'siege_workshop', 'ambush_post'
]);

export function applyPhase8PropLayout(source) {
  const scenario = clone(source);
  if (scenario.phase8PropLayoutApplied) return scenario;

  const propsByRoom = new Map();
  for (const prop of scenario.props ?? []) {
    if (!propsByRoom.has(prop.roomId)) propsByRoom.set(prop.roomId, []);
    propsByRoom.get(prop.roomId).push(prop);
  }

  for (const room of scenario.rooms ?? []) {
    const props = propsByRoom.get(room.id) ?? [];
    const buckets = {
      safe: props.filter(prop => SAFE_TYPES.has(prop.type)),
      lair: props.filter(prop => LAIR_TYPES.has(prop.type)),
      resource: props.filter(prop => prop.type === 'territory_resource'),
      defense: props.filter(prop => DEFENSE_TYPES.has(prop.type)),
      ordinary: props.filter(prop => !SAFE_TYPES.has(prop.type) && !LAIR_TYPES.has(prop.type) && prop.type !== 'territory_resource' && !DEFENSE_TYPES.has(prop.type))
    };

    placeRing(buckets.safe, room, 0.33, 0.28, 0.66, 0.06);
    placeRing(buckets.lair, room, 0.28, 0.26, 0.78, Math.PI * 0.76);
    placeRing(buckets.resource, room, 0.34, 0.3, 0.74, -Math.PI * 0.22);
    placeRing(buckets.defense, room, 0.4, 0.34, 0.82, Math.PI * 0.12);
    placeRing(buckets.ordinary, room, 0.2, 0.18, 0.72, Math.PI * 0.45);
  }

  scenario.phase8PropLayoutApplied = true;
  return scenario;
}

function placeRing(props, room, radiusXFactor, radiusZFactor, defaultScale, phase) {
  if (!props.length) return;
  const radiusX = Math.max(1.8, room.w * radiusXFactor);
  const radiusZ = Math.max(1.6, room.d * radiusZFactor);
  const ordered = [...props].sort((a, b) => a.id.localeCompare(b.id));
  ordered.forEach((prop, index) => {
    if (prop.type === 'adventurer_field_camp') return;
    const hash = hashString(prop.id);
    const angle = phase + index * Math.PI * 2 / Math.max(3, ordered.length) + (hash % 31) / 100;
    const authored = prop.placement ?? {};
    const scale = authored.scale ?? defaultScale;
    prop.placement = {
      ...authored,
      ox: round(Math.cos(angle) * radiusX),
      oz: round(Math.sin(angle) * radiusZ),
      rotation: authored.rotation ?? round(angle + Math.PI),
      scale
    };
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
