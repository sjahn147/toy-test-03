// campaign.manifest.json (Codex 저작, content/campaigns/sleeping-citadel/) →
// 레거시 시나리오 shape 컴파일러.
//
// 이 manifest는 "design-complete-runtime-pending" 문서입니다 — zones에 macro-grid,
// factions에 lair/species/startingAgents가 없습니다. legacyMappings.js의
// GRID_BY_ZONE / DESCRIPTIVE_KIND_MAP / FACTION_RUNTIME_BINDINGS / WILDLIFE_BINDINGS가
// 그 gap을 결정론적으로 메웁니다. manifest 파일 자체는 수정하지 않습니다.
//
// Phase 체인 호환 전략 (plan 결정 1):
//   - manifest 크기는 이미 post-scale 단위 → phase8SpatialScaleApplied: true를 직접
//     설정하고 legacyDimensions / spatialCapacity를 자체 계산 (Phase8 no-op).
//   - 세력/야생 lair prop을 manifest 밖 바인딩 테이블에서 직접 방출 → Phase5(goblin_lair 가드),
//     Phase6(plague_mortuary 가드)의 휴리스틱 배치 억제.
//   - Phase2(waystation)와 Phase7(territory_resource)은 그대로 통과시킴.
// 완전 결정론: RNG/Date 금지 — 같은 manifest면 deep-equal 산출물.

import { layoutZones } from './layout/zoneLayout.js';
import { getAuthoredCampaignLayout } from './layout/AuthoredCampaignLayout.js';
import { getCampaignSpawnNetwork } from './spawn/SpawnNetworkCatalog.js';
import {
  SIZE_SCALE,
  POSITION_SCALE,
  spatialCapacity,
  speciesDisplayName,
  speciesSize,
  alphabeticLabel,
  lairRoomTags,
  FACTION_LAIR_DEFAULTS,
  PHASE5_STOCK_FIELDS,
  PHASE6_STOCK_FIELDS,
  PARTY_ROLE_NAMES,
  GRID_BY_ZONE,
  mapRoomKind,
  FACTION_RUNTIME_BINDINGS,
  WILDLIFE_BINDINGS
} from './legacyMappings.js';

function round(value) {
  return Math.round(value * 100) / 100;
}

function zoneTag(zoneId) {
  return `zone_${String(zoneId).toLowerCase()}`;
}

/**
 * @param {{ manifest: Object, assetCatalog?: Object|null, options?: Object }} input
 * @returns {{ scenario: Object, report: { warnings: string[], missingBundles: string[], stats: Object } }}
 */
export function compileCampaign({ manifest, assetCatalog = null, options = {} } = {}) {
  if (!manifest || !Array.isArray(manifest.rooms)) {
    throw new Error('compileCampaign: manifest with a rooms array is required');
  }

  const warnings = [];
  const missingBundles = [];
  const bundleIndex = new Map((assetCatalog?.entries ?? []).map(entry => [entry.id, entry]));
  const entryRoomId = manifest.entryRoomId;

  // manifest zones엔 macro-grid가 없음 — GRID_BY_ZONE으로 보강해 zoneLayout에 전달.
  const zones = (manifest.zones ?? []).map(zone => ({ ...zone, grid: GRID_BY_ZONE[zone.id] }));
  const zoneById = new Map(zones.map(zone => [zone.id, zone]));

  // manifest room.size는 [w,d] 배열 — zoneLayout은 size.w/size.d 객체를 기대함.
  const roomsForLayout = manifest.rooms.map(room => ({
    ...room,
    size: { w: room.size[0], d: room.size[1] }
  }));
  const authoredLayout = getAuthoredCampaignLayout(manifest);
  const spawnNetwork = getCampaignSpawnNetwork(manifest);
  const centers = authoredLayout?.centers ?? layoutZones({ zones, rooms: roomsForLayout, layout: manifest.layout });
  const floorDefinitions = manifest.floors ?? authoredLayout?.floors ?? [];
  const floorElevationById = new Map(floorDefinitions.map(floor => [floor.id, floor.elevation]));

  // 연결 shape: connections는 [a,b] pair, secretConnections/conditionalConnections는 객체.
  const secretConnections = manifest.secretConnections ?? [];
  const conditionalConnections = manifest.conditionalConnections ?? [];
  const secretRooms = new Set(secretConnections.flatMap(c => [c.from, c.to]));
  const conditionalRooms = new Set(conditionalConnections.flatMap(c => [c.from, c.to]));

  // --- rooms ---
  const rooms = manifest.rooms.map(source => {
    const center = centers.get(source.id);
    const authoredPlacement = authoredLayout?.roomPlacements.get(source.id) ?? null;
    if (!center) warnings.push(`room "${source.id}" has no layout position (unknown zone "${source.zoneId}"), defaulting to origin`);
    const zone = zoneById.get(source.zoneId);
    const [w, d] = source.size;
    const tags = [...(source.tags ?? [])];
    if (zone) tags.push(zoneTag(zone.id));
    tags.push('phase8_spacious');
    if (secretRooms.has(source.id)) tags.push('secret_route', 'secret-route');
    if (conditionalRooms.has(source.id)) tags.push('conditional_route', 'conditional-route');
    return {
      id: source.id,
      name: source.name,
      kind: mapRoomKind(source.kind, source.id, entryRoomId),
      floorId: source.floorId ?? authoredPlacement?.floorId ?? null,
      floor: source.floor ?? authoredPlacement?.floor ?? 0,
      floorElevation: Number.isFinite(floorElevationById.get(source.floorId ?? authoredPlacement?.floorId ?? null))
        ? floorElevationById.get(source.floorId ?? authoredPlacement?.floorId ?? null)
        : undefined,
      rotation: authoredPlacement?.rotation ?? 0,
      layoutRole: authoredPlacement?.role ?? null,
      depthBand: authoredPlacement?.depthBand ?? null,
      spawnSockets: authoredPlacement?.spawnSockets?.map(socket => ({ ...socket, position: [...(socket.position ?? [0, 0])] })) ?? [],
      x: center?.x ?? 0,
      z: center?.z ?? 0,
      w,
      d,
      tags: [...new Set(tags)],
      danger: source.danger ?? 1,
      spawnWeight: source.spawnWeight ?? 0,
      legacyDimensions: { w: round(w / SIZE_SCALE), d: round(d / SIZE_SCALE) },
      spatialCapacity: spatialCapacity(w, d)
    };
  });
  const roomById = new Map(rooms.map(room => [room.id, room]));

  // --- authored routes / active initial graph ---
  const baseLinks = (manifest.connections ?? []).map(([a, b]) => [a, b]);
  const fallbackRouteDefinitions = [
    ...baseLinks.map(([from, to], index) => ({ id: `route-${index}-${from}-${to}`, from, to, kind: 'ordinary', defaultState: 'open', state: 'open', active: true })),
    ...conditionalConnections.map(connection => ({ ...connection, kind: 'conditional', state: connection.defaultState ?? 'locked', active: false })),
    ...secretConnections.map(connection => ({ ...connection, kind: 'secret', defaultState: 'hidden', state: 'hidden', active: false }))
  ];
  const routeDefinitions = authoredLayout?.routes ?? fallbackRouteDefinitions;
  const conditionalLinks = routeDefinitions.filter(route => route.kind === 'conditional').map(route => [route.from, route.to]);
  const secretLinks = routeDefinitions.filter(route => route.kind === 'secret').map(route => [route.from, route.to]);
  // Only ordinary open routes enter the initial legacy graph. Conditional and secret
  // routes remain first-class definitions and can be activated through ActiveCampaignGraph.
  const links = authoredLayout
    ? routeDefinitions.filter(route => route.kind === 'ordinary' && (route.defaultState ?? route.state ?? 'open') === 'open').map(route => [route.from, route.to])
    : [...baseLinks, ...conditionalLinks, ...secretLinks];

  // --- props / agents ---
  const props = [];
  const agents = [];
  const ecologyLairs = {};
  const advancedEcologyLairs = {};
  const propSeqByRoom = new Map();
  const roleCounters = new Map();

  const nextPropId = roomId => {
    const seq = (propSeqByRoom.get(roomId) ?? 0) + 1;
    propSeqByRoom.set(roomId, seq);
    return `sc-${roomId}-${seq}`;
  };

  const emitLairProp = ({ roomId, propType, ecologyFaction, species, capacity, stocks }) => {
    const defaults = FACTION_LAIR_DEFAULTS[propType] ?? null;
    if (!defaults) warnings.push(`lair propType "${propType}" has no legacy defaults; emitting with generic shape`);
    const phase = defaults?.phase ?? 6;
    const resolvedSpecies = species ?? defaults?.species;
    const [ox, oz, rotation, scale] = defaults?.placement ?? [0, 0, 0, 0.8];

    const stockFields = phase === 5 ? PHASE5_STOCK_FIELDS : PHASE6_STOCK_FIELDS;
    const zeroFill = Object.fromEntries(stockFields.map(field => [field, 0]));

    const prop = {
      id: nextPropId(roomId),
      type: propType,
      label: defaults?.label ?? propType,
      species: resolvedSpecies,
      ecologyFaction,
      roomId,
      placement: { ox, oz, rotation, scale },
      capacity: capacity ?? defaults?.capacity ?? 4,
      spawnProgress: 0,
      ...zeroFill,
      ...(defaults?.stocks ?? {}),
      ...(stocks ?? {})
    };
    props.push(prop);

    const room = roomById.get(roomId);
    if (room && resolvedSpecies) {
      room.tags = [...new Set([...room.tags, ...lairRoomTags(phase, resolvedSpecies)])];
      if (phase === 5) room.ecologySpecies = resolvedSpecies;
      const registry = phase === 5 ? ecologyLairs : advancedEcologyLairs;
      registry[resolvedSpecies] ??= roomId;
    }
    return prop;
  };

  const emitEcologyAgents = ({ role, count, ecologyFaction, roomId }) => {
    for (let i = 0; i < count; i += 1) {
      const seq = roleCounters.get(role) ?? 0;
      roleCounters.set(role, seq + 1);
      agents.push({
        id: `sc-${role}-${seq + 1}`,
        name: `${speciesDisplayName(role)} ${alphabeticLabel(seq)}`,
        role,
        faction: 'dungeon',
        ecologyFaction,
        roomId,
        homeRoomId: roomId,
        level: 1,
        size: speciesSize(role)
      });
    }
  };

  const propBundlesByRoom = {};
  const missingLairRooms = [];

  for (const faction of manifest.factions ?? []) {
    const binding = FACTION_RUNTIME_BINDINGS[faction.id];
    if (!binding) {
      warnings.push(`faction "${faction.id}" has no runtime binding; skipping agent/lair emission`);
      continue;
    }

    if (binding.kind === 'party') {
      // 파티는 입구에서 시작 (applyPhase2Facilities가 waystation으로 옮김)
      for (const entry of binding.startingAgents ?? []) {
        agents.push({
          id: entry.id,
          name: PARTY_ROLE_NAMES[entry.role] ?? speciesDisplayName(entry.role),
          role: entry.role,
          faction: 'party',
          roomId: entryRoomId,
          level: 1
        });
      }
      continue;
    }

    for (const lair of binding.lairs ?? []) {
      if (!roomById.has(lair.roomId)) {
        missingLairRooms.push(lair.roomId);
        continue;
      }
      emitLairProp({
        roomId: lair.roomId,
        propType: lair.propType,
        ecologyFaction: faction.runtimeFactionId,
        species: lair.species,
        capacity: lair.capacity,
        stocks: lair.stocks
      });
      emitEcologyAgents({ role: lair.species, count: 1, ecologyFaction: faction.runtimeFactionId, roomId: lair.roomId });
      if (lair.assetBundle) {
        propBundlesByRoom[lair.roomId] = [...(propBundlesByRoom[lair.roomId] ?? []), lair.assetBundle];
        if (!bundleIndex.has(lair.assetBundle) && !missingBundles.includes(lair.assetBundle)) {
          missingBundles.push(lair.assetBundle);
          warnings.push(`bundle "${lair.assetBundle}" (faction "${faction.id}" lair) is not in the asset catalog`);
        }
      }
    }
  }
  for (const roomId of missingLairRooms) {
    warnings.push(`faction lair references unknown room "${roomId}"`);
  }

  for (const entry of WILDLIFE_BINDINGS) {
    if (!roomById.has(entry.lairRoomId)) {
      warnings.push(`wildlife "${entry.species}" lairRoomId "${entry.lairRoomId}" does not exist`);
      continue;
    }
    // 야생종 세력 id는 apply 체인과 동일하게 "wild-<species>" 규칙을 따름 (legacyMappings.factionForRole 미러)
    const ecologyFaction = `wild-${entry.species}`;
    emitLairProp({
      roomId: entry.lairRoomId,
      propType: entry.propType,
      ecologyFaction,
      species: entry.species,
      stocks: entry.stocks
    });
    emitEcologyAgents({ role: entry.species, count: entry.count, ecologyFaction, roomId: entry.lairRoomId });
  }

  // --- landmarkBundle (plan 결정 3) ---
  // 카탈로그 legacyProp 매핑이 있으면 레거시 prop으로 방출, 없으면(대부분의 랜드마크는
  // 순수 시각 디오라마) meta에만 기록. 미등록 bundle은 report.missingBundles.
  for (const source of manifest.rooms) {
    const bundleId = source.landmarkBundle;
    if (!bundleId) continue;
    propBundlesByRoom[source.id] = [...(propBundlesByRoom[source.id] ?? []), bundleId];
    const entry = bundleIndex.get(bundleId);
    if (!entry) {
      if (!missingBundles.includes(bundleId)) missingBundles.push(bundleId);
      warnings.push(`bundle "${bundleId}" (room "${source.id}") is not in the asset catalog`);
      continue;
    }
    if (!entry.legacyProp) continue; // 순수 디오라마: meta 기록만
    const prop = {
      id: nextPropId(source.id),
      type: entry.legacyProp.type,
      roomId: source.id,
      label: entry.legacyProp.label ?? entry.id
    };
    if (entry.legacyProp.type === 'trap') prop.armed = true;
    if (entry.legacyProp.type === 'treasure') prop.opened = false;
    props.push(prop);
  }

  // --- scenario ---
  const campaignId = manifest.id;
  const scenario = {
    id: campaignId.startsWith('campaign.') ? campaignId.slice('campaign.'.length) : campaignId,
    name: typeof manifest.title === 'string' ? manifest.title : (manifest.title?.en ?? campaignId),
    description: typeof manifest.title === 'object' ? (manifest.title?.ko ?? '') : '',
    rooms,
    links,
    routes: routeDefinitions,
    floors: (manifest.floors ?? authoredLayout?.floors ?? []).map(floor => ({ ...floor, roomIds: [...(floor.roomIds ?? [])] })),
    verticalConnectors: (manifest.verticalConnectors ?? authoredLayout?.verticalConnectors ?? []).map(connector => structuredCloneSafe(connector)),
    secretLinks,
    agents,
    props,
    ecologyLairs,
    advancedEcologyLairs,
    spawnNetwork,
    // Phase8 선점: 크기는 이미 post-scale, 아래 가드로 재스케일 방지
    phase8SpatialScaleApplied: true,
    spatialScale: {
      position: POSITION_SCALE,
      size: SIZE_SCALE,
      roomCount: rooms.length,
      averageArea: round(rooms.reduce((sum, room) => sum + room.w * room.d, 0) / (rooms.length || 1))
    },
    // territoryEnabled는 설정하지 않음 — applyPhase7Territories가 정상 실행되도록
    meta: {
      campaignId,
      contentVersion: manifest.contentVersion,
      status: manifest.status,
      conditionalLinks,
      authoredPhysicalLayout: Boolean(authoredLayout),
      authoredLayoutSource: authoredLayout ? 'content/campaigns/sleeping-citadel/authored-layout.json' : null,
      entryPolicy: authoredLayout?.entryPolicy ?? null,
      entryRoomId: authoredLayout?.entryRoomId ?? entryRoomId,
      facilityPlacements: authoredLayout?.facilityPlacements ?? {},
      depthBands: authoredLayout?.depthBands ?? {},
      cameraLandmarks: authoredLayout?.cameraLandmarks ?? {},
      zoneTransitions: authoredLayout?.zoneTransitions ?? [],
      floors: (manifest.floors ?? authoredLayout?.floors ?? []).map(floor => ({ ...floor, roomIds: [...(floor.roomIds ?? [])] })),
      verticalConnectors: (manifest.verticalConnectors ?? authoredLayout?.verticalConnectors ?? []).map(connector => structuredCloneSafe(connector)),
      floorBounds: authoredLayout?.floorBounds ?? {},
      junctions: authoredLayout?.junctions ?? [],
      spawnNetwork,
      propBundlesByRoom
    }
  };

  const report = {
    warnings,
    missingBundles,
    stats: {
      zones: zones.length,
      rooms: rooms.length,
      connections: baseLinks.length,
      conditionalConnections: conditionalLinks.length,
      secretConnections: secretLinks.length,
      factions: (manifest.factions ?? []).length,
      agents: agents.length,
      props: props.length
    }
  };

  return { scenario, report };
}

function structuredCloneSafe(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
