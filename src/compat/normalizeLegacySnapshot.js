// 레거시 sim.snapshot() → 정규화 WorldSnapshot 변환기
// (docs/architecture/production-layering.md §6, src/domain/snapshotContract.js).
// Phase8 서브 스냅샷(settlement/expedition/logistics/construction)이 없어도
// 빈 테이블을 방출하므로 base DungeonSim에도 그대로 사용할 수 있습니다.

import { assertWorldSnapshot } from '../domain/snapshotContract.js';

function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// 방어적 직렬화: Map→object, Set→array, Date→ISO 문자열,
// 함수/심볼/bigint 제거, 비유한 숫자→null, 순환 참조 차단.
function toSerializable(value, seen = new WeakSet()) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) return null;
    return value === 0 ? 0 : value; // -0은 JSON 왕복에서 0이 되므로 선제 정규화
  }
  if (type === 'function' || type === 'symbol' || type === 'bigint') return undefined;
  if (type !== 'object') return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  let result;
  if (Array.isArray(value)) {
    result = value.map(item => {
      const cleaned = toSerializable(item, seen);
      return cleaned === undefined ? null : cleaned;
    });
  } else if (value instanceof Map) {
    result = {};
    for (const [key, item] of value.entries()) {
      const cleaned = toSerializable(item, seen);
      if (cleaned !== undefined) result[String(key)] = cleaned;
    }
  } else if (value instanceof Set) {
    result = [...value].map(item => {
      const cleaned = toSerializable(item, seen);
      return cleaned === undefined ? null : cleaned;
    });
  } else if (value instanceof Date) {
    result = value.toISOString();
  } else {
    result = {};
    for (const [key, item] of Object.entries(value)) {
      const cleaned = toSerializable(item, seen);
      if (cleaned !== undefined) result[key] = cleaned;
    }
  }

  seen.delete(value);
  return result;
}

// 배열/Map/plain object 어느 형태로 오든 id 키 테이블로 변환합니다.
function tableOf(source, prefix) {
  const table = {};
  const push = (record, fallbackKey) => {
    const cleaned = toSerializable(record);
    if (!cleaned || typeof cleaned !== 'object' || Array.isArray(cleaned)) return;
    const id = cleaned.id !== undefined && cleaned.id !== null && `${cleaned.id}`.length > 0
      ? String(cleaned.id)
      : String(fallbackKey);
    cleaned.id = id;
    table[id] = cleaned;
  };
  if (!source) return table;
  if (Array.isArray(source)) source.forEach((record, index) => push(record, `${prefix}-${index}`));
  else if (source instanceof Map) for (const [key, record] of source.entries()) push(record, key);
  else if (typeof source === 'object') for (const [key, record] of Object.entries(source)) push(record, key);
  return table;
}

// 레거시 links([[a,b], ...] 또는 {a,b}/{from,to})에서 connection 테이블 파생.
function connectionTable(links) {
  const table = {};
  if (!Array.isArray(links)) return table;
  for (const link of links) {
    let from;
    let to;
    if (Array.isArray(link)) [from, to] = link;
    else if (link && typeof link === 'object') {
      from = link.from ?? link.a;
      to = link.to ?? link.b;
    }
    if (typeof from !== 'string' || typeof to !== 'string' || !from || !to) continue;
    const id = `${from}--${to}`;
    table[id] = { id, from, to };
  }
  return table;
}

// 세력 테이블은 agents의 ecologyFaction + settlements의 factionId에서 파생합니다.
function factionTable(agents, settlements) {
  const table = {};
  const ensure = id => {
    table[id] ??= { id, agentCount: 0, settlementIds: [] };
    return table[id];
  };
  for (const agent of Object.values(agents)) {
    if (typeof agent.ecologyFaction === 'string' && agent.ecologyFaction) {
      ensure(agent.ecologyFaction).agentCount += 1;
    }
  }
  for (const settlement of Object.values(settlements)) {
    if (typeof settlement.factionId === 'string' && settlement.factionId) {
      ensure(settlement.factionId).settlementIds.push(settlement.id);
    }
  }
  return table;
}

function groupIndex(records, keyOf) {
  const index = {};
  for (const record of Object.values(records)) {
    const key = keyOf(record);
    if (typeof key !== 'string' || !key) continue;
    (index[key] ??= []).push(record.id);
  }
  return index;
}

/**
 * @param {Object} rawSnapshot  sim.snapshot() 결과 (base 또는 Phase8)
 * @param {Object} [options]
 * @param {Object[]} [options.events]  eventContract.js shape의 WorldEvent 배열
 * @param {Object|null} [options.metrics]  sim.metrics() 결과 (추가 top-level 필드로 보존)
 * @param {number|null} [options.turn]  sim.turn (레거시 snapshot에는 없음)
 * @returns {import('../domain/snapshotContract.js').WorldSnapshot}
 */
export function normalizeLegacySnapshot(rawSnapshot, { events = [], metrics = null, turn = null } = {}) {
  const raw = rawSnapshot && typeof rawSnapshot === 'object' ? rawSnapshot : {};

  const agents = tableOf(raw.agents, 'agent');
  const rooms = tableOf(raw.rooms, 'room');
  const props = tableOf(raw.props, 'prop');
  const effects = tableOf(raw.effects, 'effect');
  const connections = connectionTable(raw.links);
  const settlements = tableOf(raw.settlement?.settlements, 'settlement');
  const parties = tableOf(raw.expedition?.parties, 'party');
  const cargo = tableOf(raw.logistics?.cargo, 'cargo');
  const structures = tableOf(raw.construction?.structures, 'structure');
  const factions = factionTable(agents, settlements);

  const visited = new Set(Array.isArray(raw.visited) ? raw.visited : []);
  for (const room of Object.values(rooms)) room.visited = visited.has(room.id);

  const snapshot = {
    clock: {
      time: finiteNumber(raw.time),
      turn: finiteNumber(turn ?? raw.turn),
      ended: raw.ended === true
    },
    entities: { agents, rooms, connections, props, settlements, factions, parties, cargo, structures, effects },
    indexes: {
      agentsByRoom: groupIndex(agents, agent =>
        agent.alive !== false && agent.departed !== true ? agent.roomId : null
      ),
      propsByRoom: groupIndex(props, prop => prop.roomId),
      settlementsByFaction: groupIndex(settlements, settlement => settlement.factionId)
    },
    events: Array.isArray(events)
      ? events.map(event => toSerializable(event)).filter(event => event && typeof event === 'object')
      : [],
    metrics: toSerializable(metrics) ?? null
  };

  return assertWorldSnapshot(snapshot);
}
