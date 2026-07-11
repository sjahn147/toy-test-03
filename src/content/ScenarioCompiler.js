// campaign.manifest.json → 레거시 시나리오 shape 컴파일러.
//
// Phase 체인 호환 전략 (plan 결정 1):
//   - manifest 크기는 이미 post-scale 단위 → phase8SpatialScaleApplied: true를 직접
//     설정하고 legacyDimensions / spatialCapacity를 자체 계산 (Phase8 no-op).
//   - 세력/야생 lair prop을 manifest에서 직접 방출 → Phase5(goblin_lair 가드),
//     Phase6(plague_mortuary 가드)의 휴리스틱 배치 억제.
//   - Phase2(waystation)와 Phase7(territory_resource)은 그대로 통과시킴.
// 완전 결정론: RNG/Date 금지 — 같은 manifest면 deep-equal 산출물.

import { layoutZones } from './layout/zoneLayout.js';
import {
  SIZE_SCALE,
  POSITION_SCALE,
  spatialCapacity,
  factionForRole,
  speciesDisplayName,
  speciesSize,
  alphabeticLabel,
  lairRoomTags,
  FACTION_LAIR_DEFAULTS,
  PHASE5_STOCK_FIELDS,
  PHASE6_STOCK_FIELDS,
  PARTY_ROLE_NAMES
} from './legacyMappings.js';

function round(value) {
  return Math.round(value * 100) / 100;
}

function zoneTag(code) {
  return `zone_${String(code).toLowerCase()}`;
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

  const zones = manifest.zones ?? [];
  const zoneById = new Map(zones.map(zone => [zone.id, zone]));
  const centers = layoutZones({ zones, rooms: manifest.rooms, layout: manifest.layout });

  // 비밀 연결 양단 방 → secret_route 태그
  const secretConnections = (manifest.connections ?? []).filter(connection => connection.kind === 'secret');
  const secretRooms = new Set(secretConnections.flatMap(connection => [connection.from, connection.to]));

  // --- rooms ---
  const rooms = manifest.rooms.map(source => {
    const center = centers.get(source.id);
    if (!center) warnings.push(`room "${source.id}" has no layout position (unknown zone "${source.zoneId}"), defaulting to origin`);
    const zone = zoneById.get(source.zoneId);
    const w = source.size.w;
    const d = source.size.d;
    const tags = [...(source.tags ?? [])];
    if (zone) tags.push(zoneTag(zone.code));
    tags.push('phase8_spacious');
    if (secretRooms.has(source.id)) tags.push('secret_route');
    return {
      id: source.id,
      name: source.name,
      kind: source.kind,
      floor: 0,
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
  const codeByRoomId = new Map(manifest.rooms.map(room => [room.id, room.code]));

  // --- links (비밀 통로도 포함 — 레거시 런타임엔 발견 게이트가 없음, plan 결정 2) ---
  const links = (manifest.connections ?? []).map(connection => [connection.from, connection.to]);
  const secretLinks = secretConnections.map(connection => [connection.from, connection.to]);

  // --- props / agents ---
  const props = [];
  const agents = [];
  const ecologyLairs = {};
  const advancedEcologyLairs = {};
  const propSeqByRoom = new Map();
  const roleCounters = new Map();

  const nextPropId = roomId => {
    const code = codeByRoomId.get(roomId) ?? 'X00';
    const seq = (propSeqByRoom.get(roomId) ?? 0) + 1;
    propSeqByRoom.set(roomId, seq);
    return `sc-${code}-${seq}`;
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

    // Phase5/6이 lair 방에 붙이던 태그 미러
    const room = roomById.get(roomId);
    if (room && resolvedSpecies) {
      room.tags = [...new Set([...room.tags, ...lairRoomTags(phase, resolvedSpecies)])];
      if (phase === 5) room.ecologySpecies = resolvedSpecies;
      const registry = phase === 5 ? ecologyLairs : advancedEcologyLairs;
      registry[resolvedSpecies] ??= roomId;
    }
    return prop;
  };

  const emitEcologyAgents = ({ entries, ecologyFaction, roomId }) => {
    for (const entry of entries) {
      const count = entry.count ?? 1;
      for (let i = 0; i < count; i += 1) {
        const role = entry.role;
        const seq = roleCounters.get(role) ?? 0;
        roleCounters.set(role, seq + 1);
        const explicit = count === 1;
        agents.push({
          id: explicit && entry.id ? entry.id : `sc-${role}-${seq + 1}`,
          name: explicit && entry.name ? entry.name : `${speciesDisplayName(role)} ${alphabeticLabel(seq)}`,
          role,
          faction: 'dungeon',
          ecologyFaction,
          roomId,
          homeRoomId: roomId,
          level: 1,
          size: speciesSize(role)
        });
      }
    }
  };

  for (const faction of manifest.factions ?? []) {
    if (faction.kind === 'party') {
      // 파티는 입구에서 시작 (applyPhase2Facilities가 waystation으로 옮김)
      for (const entry of faction.startingAgents ?? []) {
        const role = entry.role;
        agents.push({
          id: entry.id ?? role,
          name: entry.name ?? PARTY_ROLE_NAMES[role] ?? speciesDisplayName(role),
          role,
          faction: 'party',
          roomId: manifest.entranceRoomId,
          level: 1
        });
      }
      continue;
    }
    if (faction.lair?.propType) {
      emitLairProp({
        roomId: faction.homeRoomId,
        propType: faction.lair.propType,
        ecologyFaction: faction.legacyEcologyFaction,
        species: faction.species,
        capacity: faction.lair.capacity,
        stocks: faction.lair.stocks
      });
    }
    emitEcologyAgents({
      entries: faction.startingAgents ?? [],
      ecologyFaction: faction.legacyEcologyFaction,
      roomId: faction.homeRoomId
    });
  }

  for (const entry of manifest.wildlife ?? []) {
    const ecologyFaction = factionForRole(entry.species);
    emitLairProp({
      roomId: entry.lairRoomId,
      propType: entry.propType,
      ecologyFaction,
      species: entry.species,
      capacity: undefined,
      stocks: entry.stocks
    });
    emitEcologyAgents({
      entries: [{ role: entry.species, count: entry.count }],
      ecologyFaction,
      roomId: entry.lairRoomId
    });
  }

  // --- propBundles (plan 결정 3) ---
  // legacyProp 매핑 있으면 레거시 prop 방출, 없으면 meta에만 기록,
  // 카탈로그 미등록이면 report.missingBundles.
  const propBundlesByRoom = {};
  for (const source of manifest.rooms) {
    const bundles = source.propBundles ?? [];
    if (bundles.length) propBundlesByRoom[source.id] = [...bundles];
    for (const bundleId of bundles) {
      const entry = bundleIndex.get(bundleId);
      if (!entry) {
        if (!missingBundles.includes(bundleId)) missingBundles.push(bundleId);
        warnings.push(`bundle "${bundleId}" (room "${source.id}") is not in the asset catalog`);
        continue;
      }
      if (!entry.legacyProp) continue; // 장식/키트: meta 기록만
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
  }

  // --- scenario ---
  const campaignId = manifest.id;
  const scenario = {
    id: campaignId.startsWith('campaign.') ? campaignId.slice('campaign.'.length) : campaignId,
    name: manifest.name,
    description: manifest.description ?? '',
    rooms,
    links,
    secretLinks,
    agents,
    props,
    ecologyLairs,
    advancedEcologyLairs,
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
      propBundlesByRoom
    }
  };

  const report = {
    warnings,
    missingBundles,
    stats: {
      zones: zones.length,
      rooms: rooms.length,
      connections: links.length,
      secretConnections: secretLinks.length,
      factions: (manifest.factions ?? []).length,
      agents: agents.length,
      props: props.length
    }
  };

  return { scenario, report };
}
