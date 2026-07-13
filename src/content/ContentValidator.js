// 캠페인 manifest / 컴파일된 시나리오 밸리데이터.
// I/O 없음 — 스키마 JSON은 호출자가 loadContentNode.js(node) 또는 fetch(browser)로
// 읽어 options.manifestSchema로 넘깁니다. ajv 의존 없이 type/required/enum/items만 지원.
//
// manifest는 content/campaigns/sleeping-citadel/campaign.manifest.json (Codex 저작)의
// "design-complete-runtime-pending" shape을 따릅니다 — factions[]에 lair/species 정보가
// 없으므로, 그 부분의 도메인 검사는 legacyMappings.FACTION_RUNTIME_BINDINGS를 기준으로 합니다.
// campaign.schema.json은 $ref/oneOf/prefixItems를 쓰므로 validateAgainstSchema(아래의
// 최소 워커)가 중첩 제약을 완전히 풀어내지 못합니다 — 실질적 계약 검증은 이 파일의
// 도메인 체크가 담당합니다.

import {
  KIND_MINIMUMS,
  DEFAULT_KIND_MINIMUM,
  RESERVED_ID_PREFIXES,
  RESERVED_ROOM_IDS,
  mapRoomKind,
  FACTION_RUNTIME_BINDINGS,
  WILDLIFE_BINDINGS
} from './legacyMappings.js';

const GUARD_LAIR_TYPES = ['goblin_lair', 'plague_mortuary'];

function issue(code, message, refs = []) {
  return { code, message, refs };
}

// content/schemas/*.schema.json 구조를 걷는 최소 스키마 체커.
// 지원 키워드: type(object/array/string/number/integer/boolean), required, properties, items, enum.
// $ref/oneOf/prefixItems/additionalProperties는 무시됩니다 (해당 하위 트리는 검사 생략).
export function validateAgainstSchema(value, schema, path = '$') {
  const errors = [];
  walkSchema(value, schema, path, errors);
  return errors;
}

function walkSchema(value, schema, path, errors) {
  if (!schema || typeof schema !== 'object') return;

  if (schema.type) {
    if (!matchesType(value, schema.type)) {
      errors.push(issue('schema', `${path}: expected ${schema.type}, got ${describe(value)}`, [path]));
      return;
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(issue('schema', `${path}: value ${JSON.stringify(value)} is not one of [${schema.enum.join(', ')}]`, [path]));
    return;
  }

  if (schema.type === 'object' && value && typeof value === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push(issue('schema', `${path}: missing required property "${key}"`, [path]));
      }
    }
    for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) walkSchema(value[key], propSchema, `${path}.${key}`, errors);
    }
  }

  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => walkSchema(item, schema.items, `${path}[${index}]`, errors));
  }
}

function matchesType(value, type) {
  switch (type) {
    case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    default: return true;
  }
}

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * @param {import('./ContentRegistry.js').ContentRegistry} registry
 * @param {string} campaignId
 * @param {{ strict?: boolean, manifestSchema?: Object|null }} [options]
 *   strict: propBundle 해석 실패를 warning 대신 error로 승격
 *   manifestSchema: content/schemas/campaign.schema.json의 파싱 결과 (없으면 스키마 검사 생략)
 * @returns {{ ok: boolean, errors: Array, warnings: Array }}
 */
export function validateCampaign(registry, campaignId, options = {}) {
  const errors = [];
  const warnings = [];
  const manifest = registry.getCampaign(campaignId);
  if (!manifest) {
    return { ok: false, errors: [issue('campaign-missing', `campaign "${campaignId}" is not registered`, [campaignId])], warnings };
  }

  if (options.manifestSchema) {
    errors.push(...validateAgainstSchema(manifest, options.manifestSchema));
  } else {
    warnings.push(issue('schema-skipped', 'no manifestSchema provided; schema conformance check skipped', [campaignId]));
  }

  const zones = manifest.zones ?? [];
  const rooms = manifest.rooms ?? [];
  const connections = manifest.connections ?? [];
  const conditionalConnections = manifest.conditionalConnections ?? [];
  const secretConnections = manifest.secretConnections ?? [];
  const factions = manifest.factions ?? [];
  const entryRoomId = manifest.entryRoomId;

  // 고유 ID
  const seen = new Set();
  for (const { list, kind } of [
    { list: zones, kind: 'zone' },
    { list: rooms, kind: 'room' },
    { list: factions, kind: 'faction' }
  ]) {
    for (const entry of list) {
      if (seen.has(entry.id)) {
        errors.push(issue('duplicate-id', `duplicate ${kind} id "${entry.id}"`, [entry.id]));
      }
      seen.add(entry.id);
    }
  }

  const roomIds = new Set(rooms.map(room => room.id));
  const zoneIds = new Set(zones.map(zone => zone.id));

  // 방이 참조하는 존 존재
  for (const room of rooms) {
    if (!zoneIds.has(room.zoneId)) {
      errors.push(issue('zone-missing', `room "${room.id}" references unknown zone "${room.zoneId}"`, [room.id, room.zoneId]));
    }
    if (RESERVED_ROOM_IDS.includes(room.id)) {
      errors.push(issue('reserved-room-id', `room id "${room.id}" is reserved by the legacy apply chain`, [room.id]));
    }
  }

  // 연결 endpoint 존재 — connections는 [a,b] pair, 나머지 둘은 {from,to} 객체
  for (const [a, b] of connections) {
    for (const endpoint of [a, b]) {
      if (!roomIds.has(endpoint)) {
        errors.push(issue('connection-endpoint', `connection ${a} → ${b} references unknown room "${endpoint}"`, [endpoint]));
      }
    }
  }
  for (const list of [conditionalConnections, secretConnections]) {
    for (const connection of list) {
      for (const endpoint of [connection.from, connection.to]) {
        if (!roomIds.has(endpoint)) {
          errors.push(issue('connection-endpoint', `connection ${connection.from} → ${connection.to} references unknown room "${endpoint}"`, [endpoint]));
        }
      }
    }
  }

  // start 방 1개 이상(kind 매핑 후) + 입구 존재
  const startRooms = rooms.filter(room => mapRoomKind(room.kind, room.id, entryRoomId) === 'start');
  if (startRooms.length === 0) {
    errors.push(issue('no-start-room', 'campaign has no room mapping to legacy kind "start"', [campaignId]));
  }
  if (!roomIds.has(entryRoomId)) {
    errors.push(issue('entrance-missing', `entryRoomId "${entryRoomId}" does not exist`, [entryRoomId]));
  }

  // 비밀 연결 제외 그래프 연결성 (발견 시스템 도입 대비). 조건부 연결은 기본적으로
  // 열린 링크로 취급하므로(plan 결정 2) 연결성 검사에 포함합니다.
  if (roomIds.has(entryRoomId)) {
    const adjacency = new Map();
    const addEdge = (from, to) => {
      if (!roomIds.has(from) || !roomIds.has(to)) return;
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);
      adjacency.get(from).push(to);
      adjacency.get(to).push(from);
    };
    for (const [a, b] of connections) addEdge(a, b);
    for (const connection of conditionalConnections) addEdge(connection.from, connection.to);

    const visited = new Set([entryRoomId]);
    const queue = [entryRoomId];
    while (queue.length) {
      const current = queue.shift();
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    const unreachable = rooms.filter(room => !visited.has(room.id)).map(room => room.id);
    if (unreachable.length) {
      errors.push(issue('graph-disconnected', `${unreachable.length} room(s) unreachable from entrance without secret connections: ${unreachable.join(', ')}`, unreachable));
    }
  }

  // 크기 최소치 (post-scale, applyPhase8SpatialScale.KIND_MINIMUMS 기준). size는 [w,d] 배열.
  for (const room of rooms) {
    const legacyKind = mapRoomKind(room.kind, room.id, entryRoomId);
    const [minW, minD] = KIND_MINIMUMS[legacyKind] ?? DEFAULT_KIND_MINIMUM;
    const w = room.size?.[0];
    const d = room.size?.[1];
    if (typeof w !== 'number' || typeof d !== 'number') continue; // 스키마 체크 몫
    if (w < minW || d < minD) {
      errors.push(issue('size-minimum', `room "${room.id}" (${room.kind} → ${legacyKind}) size ${w}x${d} is below kind minimum ${minW}x${minD}`, [room.id]));
    }
  }

  // 세력 런타임 바인딩 존재 + 참조 방 존재 (manifest 자체엔 lair/homeRoomId가 없음)
  for (const faction of factions) {
    const binding = FACTION_RUNTIME_BINDINGS[faction.id];
    if (!binding) {
      errors.push(issue('faction-binding-missing', `faction "${faction.id}" has no entry in legacyMappings.FACTION_RUNTIME_BINDINGS`, [faction.id]));
      continue;
    }
    for (const roomId of faction.initialRooms ?? []) {
      if (!roomIds.has(roomId)) {
        errors.push(issue('faction-room-missing', `faction "${faction.id}" initialRooms references unknown room "${roomId}"`, [faction.id, roomId]));
      }
    }
    for (const lair of binding.lairs ?? []) {
      if (!roomIds.has(lair.roomId)) {
        errors.push(issue('faction-room-missing', `faction "${faction.id}" lair roomId "${lair.roomId}" does not exist`, [faction.id, lair.roomId]));
      }
    }
  }
  for (const entry of WILDLIFE_BINDINGS) {
    if (!roomIds.has(entry.lairRoomId)) {
      errors.push(issue('wildlife-room-missing', `wildlife "${entry.species}" lairRoomId "${entry.lairRoomId}" does not exist`, [entry.lairRoomId]));
    }
  }

  // compat.ecology-guards: Phase5/6 휴리스틱 배치를 억제하려면
  // 바인딩 테이블에 goblin_lair와 plague_mortuary가 각각 1개 이상 있어야 함
  const lairTypes = new Set();
  for (const binding of Object.values(FACTION_RUNTIME_BINDINGS)) {
    for (const lair of binding.lairs ?? []) lairTypes.add(lair.propType);
  }
  for (const entry of WILDLIFE_BINDINGS) lairTypes.add(entry.propType);
  for (const guardType of GUARD_LAIR_TYPES) {
    if (!lairTypes.has(guardType)) {
      errors.push(issue('compat.ecology-guards', `runtime bindings must place at least one "${guardType}" lair to suppress the legacy Phase5/6 heuristic placement`, [guardType]));
    }
  }

  // propBundle 해석 (기본 warning, strict면 error) — zone.zoneKit, room.landmarkBundle,
  // faction lair의 assetBundle(바인딩 테이블)까지 확인.
  const bundleIssues = options.strict ? errors : warnings;
  if (!registry.hasAssetCatalog()) {
    warnings.push(issue('no-asset-catalog', 'no asset catalog registered; propBundle resolution skipped', [campaignId]));
  } else {
    const check = (bundleId, ownerId) => {
      if (!registry.resolvePropBundle(bundleId)) {
        bundleIssues.push(issue('bundle-unresolved', `bundle "${bundleId}" (referenced by "${ownerId}") is not in the asset catalog`, [bundleId, ownerId]));
      }
    };
    for (const zone of zones) if (zone.zoneKit) check(zone.zoneKit, zone.id);
    for (const room of rooms) if (room.landmarkBundle) check(room.landmarkBundle, room.id);
    for (const binding of Object.values(FACTION_RUNTIME_BINDINGS)) {
      for (const lair of binding.lairs ?? []) if (lair.assetBundle) check(lair.assetBundle, lair.roomId);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * 컴파일된 레거시 시나리오의 안전성 검사.
 * @param {Object} scenario ScenarioCompiler 산출물
 * @param {{ gutter?: number }} [options] 방 AABB 간 최소 간격 (기본 2)
 * @returns {{ ok: boolean, errors: Array, warnings: Array }}
 */
export function validateCompiledScenario(scenario, options = {}) {
  const errors = [];
  const warnings = [];
  const gutter = options.gutter ?? 2;
  const rooms = scenario?.rooms ?? [];
  const epsilon = 1e-6;

  // 방 AABB 겹침 없음 + 최소 간격 gutter 유지 (같은 층인 경우에만; 서로 다른 층은
  // 수직으로 쌓일 수 있으므로 XZ 평면 겹침이 정상임 - WP7의 4층 authored layout)
  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const a = rooms[i];
      const b = rooms[j];
      if ((a.floor ?? 0) !== (b.floor ?? 0)) continue;
      const separatedX = Math.abs(a.x - b.x) + epsilon >= (a.w + b.w) / 2 + gutter;
      const separatedZ = Math.abs(a.z - b.z) + epsilon >= (a.d + b.d) / 2 + gutter;
      if (!separatedX && !separatedZ) {
        errors.push(issue('room-overlap', `rooms "${a.id}" and "${b.id}" overlap or are closer than gutter ${gutter}`, [a.id, b.id]));
      }
    }
  }

  const roomIds = new Set(rooms.map(room => room.id));
  for (const roomId of RESERVED_ROOM_IDS) {
    if (roomIds.has(roomId)) {
      errors.push(issue('reserved-room-id', `compiled scenario must not contain reserved room "${roomId}" (applyPhase2Facilities adds it)`, [roomId]));
    }
  }

  // apply 체인 예약 prefix 충돌
  for (const list of [scenario?.props ?? [], scenario?.agents ?? []]) {
    for (const entity of list) {
      const prefix = RESERVED_ID_PREFIXES.find(candidate => String(entity.id).startsWith(candidate));
      if (prefix) {
        errors.push(issue('reserved-prefix', `id "${entity.id}" collides with apply-chain reserved prefix "${prefix}"`, [entity.id]));
      }
    }
  }

  // 링크 endpoint 존재 (secretLinks 포함)
  for (const [listName, links] of [['links', scenario?.links ?? []], ['secretLinks', scenario?.secretLinks ?? []]]) {
    for (const [a, b] of links) {
      for (const endpoint of [a, b]) {
        if (!roomIds.has(endpoint)) {
          errors.push(issue('link-endpoint', `${listName} entry [${a}, ${b}] references unknown room "${endpoint}"`, [endpoint]));
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
