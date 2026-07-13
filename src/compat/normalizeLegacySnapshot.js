// 레거시 sim.snapshot() → 정규화 WorldSnapshot 변환기
// (docs/architecture/production-layering.md §6, src/domain/snapshotContract.js).
// Phase8 서브 스냅샷(settlement/expedition/logistics/construction)이 없어도
// 빈 테이블을 방출하므로 base DungeonSim에도 그대로 사용할 수 있습니다.

import { assertWorldSnapshot } from '../domain/snapshotContract.js';
import { enrichLegacyParties } from './enrichLegacyParties.js';

const ADVENTURER_FACTION = 'adventurer-expedition';

function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toSerializable(value, seen = new WeakSet()) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) return null;
    return value === 0 ? 0 : value;
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

function connectionTable(routes, links) {
  const table = {};
  const source = Array.isArray(routes) && routes.length ? routes : links;
  if (!Array.isArray(source)) return table;
  for (let index = 0; index < source.length; index += 1) {
    const link = source[index];
    let from;
    let to;
    if (Array.isArray(link)) [from, to] = link;
    else if (link && typeof link === 'object') {
      from = link.from ?? link.a;
      to = link.to ?? link.b;
    }
    if (typeof from !== 'string' || typeof to !== 'string' || !from || !to) continue;
    const id = String(link?.id ?? `${from}--${to}`);
    table[id] = {
      id,
      from,
      to,
      kind: link?.kind ?? 'ordinary',
      state: link?.state ?? (link?.active === false ? 'blocked' : 'open'),
      active: link?.active !== false,
      condition: link?.condition ?? null,
      width: finiteNumber(link?.width, 1.5),
      elevation: finiteNumber(link?.elevation, 0),
      points: toSerializable(link?.points ?? []),
      ports: toSerializable(link?.ports ?? {})
    };
  }
  return table;
}

function normalizedFactionId(agent) {
  if (agent?.faction === 'party') return ADVENTURER_FACTION;
  return agent?.factionId ?? agent?.ecologyFaction ?? (agent?.faction !== 'dungeon' ? agent?.faction : null) ?? null;
}

function factionTable(agents, settlements) {
  const table = {};
  const ensure = id => {
    table[id] ??= { id, name: id.replaceAll('-', ' '), agentCount: 0, settlementIds: [] };
    return table[id];
  };
  for (const agent of Object.values(agents)) {
    const id = normalizedFactionId(agent);
    if (typeof id === 'string' && id) ensure(id).agentCount += 1;
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

export function normalizeLegacySnapshot(rawSnapshot, { events = [], metrics = null, turn = null } = {}) {
  const raw = rawSnapshot && typeof rawSnapshot === 'object' ? rawSnapshot : {};

  const agents = tableOf(raw.agents, 'agent');
  const rooms = tableOf(raw.rooms, 'room');
  const props = tableOf(raw.props, 'prop');
  const effects = tableOf(raw.effects, 'effect');
  const connections = connectionTable(raw.routes, raw.links);
  const settlements = tableOf(raw.settlement?.settlements, 'settlement');
  const parties = enrichLegacyParties(tableOf(raw.expedition?.parties, 'party'), agents);
  const cargo = tableOf(raw.logistics?.cargo, 'cargo');
  const structures = tableOf(raw.construction?.structures, 'structure');
  const environmentTasks = tableOf(raw.environmentTasks?.tasks, 'environment-task');
  const settlementOrders = tableOf(raw.settlementOperations?.orders, 'settlement-order');
  const zoneInteractions = tableOf(raw.zoneInteractions?.tasks, 'zone-interaction');
  const heroes = tableOf(raw.heroes?.heroes ?? raw.heroes, 'hero');
  const heroForms = tableOf(raw.heroForms?.forms, 'hero-form');
  const heroDeployables = tableOf(raw.heroDeployables?.deployables, 'hero-deployable');
  const heroProjectiles = tableOf(raw.heroDeployables?.projectiles, 'hero-projectile');
  const heroFields = tableOf(raw.heroEnvironment?.fields, 'hero-field');
  const factions = factionTable(agents, settlements);

  const visited = new Set(Array.isArray(raw.visited) ? raw.visited : []);
  for (const room of Object.values(rooms)) room.visited = visited.has(room.id);

  const snapshot = {
    clock: {
      time: finiteNumber(raw.time),
      turn: finiteNumber(turn ?? raw.turn),
      ended: raw.ended === true
    },
    entities: { agents, rooms, connections, props, settlements, factions, parties, cargo, structures, environmentTasks, settlementOrders, zoneInteractions, heroes, heroForms, heroDeployables, heroProjectiles, heroFields, effects },
    indexes: {
      agentsByRoom: groupIndex(agents, agent =>
        agent.alive !== false && agent.departed !== true ? agent.roomId : null
      ),
      propsByRoom: groupIndex(props, prop => prop.roomId),
      settlementsByFaction: groupIndex(settlements, settlement => settlement.factionId),
      environmentTasksByRoom: groupIndex(environmentTasks, task => task.targetRoomId),
      environmentTasksByTarget: groupIndex(environmentTasks, task => task.targetId),
      settlementOrdersByRoom: groupIndex(settlementOrders, order => order.targetRoomId),
      settlementOrdersBySettlement: groupIndex(settlementOrders, order => order.settlementId),
      zoneInteractionsByRoom: groupIndex(zoneInteractions, task => task.targetRoomId),
      zoneInteractionsByAction: groupIndex(zoneInteractions, task => task.actionId),
      heroesByFaction: groupIndex(heroes, hero => hero.factionId),
      heroesByRoom: groupIndex(heroes, hero => hero.roomId),
      heroFormsByOwner: groupIndex(heroForms, form => form.ownerHeroId),
      heroFormsByRoom: groupIndex(heroForms, form => form.roomId),
      heroDeployablesByRoom: groupIndex(heroDeployables, item => item.roomId),
      heroProjectilesByRoom: groupIndex(heroProjectiles, item => item.roomId),
      heroFieldsByRoom: groupIndex(heroFields, item => item.roomId)
    },
    events: Array.isArray(events)
      ? events.map(event => toSerializable(event)).filter(event => event && typeof event === 'object')
      : [],
    metrics: toSerializable(metrics) ?? null
  };

  return assertWorldSnapshot(snapshot);
}
