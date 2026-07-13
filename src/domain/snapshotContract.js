// 정규화 WorldSnapshot 계약 (docs/architecture/production-layering.md §6).
// 어댑터가 방출하는 snapshot은 JSON 직렬화 가능한 plain object여야 하며,
// UI selector는 이 shape만 읽습니다.

/**
 * @typedef {Object} WorldSnapshotClock
 * @property {number} time  누적 시뮬레이션 시간(초)
 * @property {number} turn  틱/턴 카운터
 * @property {boolean} ended
 */

/**
 * @typedef {Object} WorldSnapshotEntities
 * @property {Object<string, Object>} agents
 * @property {Object<string, Object>} rooms
 * @property {Object<string, Object>} connections
 * @property {Object<string, Object>} props
 * @property {Object<string, Object>} settlements
 * @property {Object<string, Object>} factions
 * @property {Object<string, Object>} parties
 * @property {Object<string, Object>} cargo
 * @property {Object<string, Object>} structures
 * @property {Object<string, Object>} effects
 */

/**
 * @typedef {Object} WorldSnapshotIndexes
 * @property {Object<string, string[]>} agentsByRoom
 * @property {Object<string, string[]>} propsByRoom
 * @property {Object<string, string[]>} settlementsByFaction
 */

/**
 * @typedef {Object} WorldSnapshot
 * @property {WorldSnapshotClock} clock
 * @property {WorldSnapshotEntities} entities  entity table: id → plain record
 * @property {WorldSnapshotIndexes} indexes
 * @property {Object[]} events  eventContract.js shape의 배열
 */

export const ENTITY_TABLES = [
  'agents',
  'rooms',
  'connections',
  'props',
  'settlements',
  'factions',
  'parties',
  'cargo',
  'structures',
  'environmentTasks',
  'settlementOrders',
  'zoneInteractions',
  'heroes',
  'heroForms',
  'heroDeployables',
  'heroProjectiles',
  'heroFields',
  'heroFormations',
  'heroSummons',
  'heroBarriers',
  'heroAdaptationFields',
  'heroBroodActors',
  'heroMimicActors',
  'heroGardenPatches',
  'heroHoardActors',
  'effects'
];

export const INDEX_NAMES = [
  'agentsByRoom',
  'propsByRoom',
  'settlementsByFaction',
  'environmentTasksByRoom',
  'environmentTasksByTarget',
  'settlementOrdersByRoom',
  'settlementOrdersBySettlement',
  'zoneInteractionsByRoom',
  'zoneInteractionsByAction',
  'heroesByFaction',
  'heroesByRoom',
  'heroFormsByOwner',
  'heroFormsByRoom',
  'heroDeployablesByRoom',
  'heroProjectilesByRoom',
  'heroFieldsByRoom',
  'heroFormationsByRoom',
  'heroSummonsByRoom',
  'heroBarriersByRoom',
  'heroAdaptationFieldsByRoom',
  'heroBroodActorsByRoom',
  'heroMimicActorsByRoom',
  'heroGardenPatchesByRoom',
  'heroHoardActorsByRoom'
];

const CLOCK_KEYS = ['time', 'turn', 'ended'];

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  if (value instanceof Map || value instanceof Set) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Map/Set/class instance/function이 섞여 있으면 false.
// JSON 왕복이 안전한 값(원시값, 배열, plain object)만 통과합니다.
export function isPlainSerializable(value) {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (type === 'function' || type === 'symbol' || type === 'bigint') return false;
  if (Array.isArray(value)) return value.every(isPlainSerializable);
  if (!isPlainObject(value)) return false;
  return Object.values(value).every(isPlainSerializable);
}

// 저렴한 구조 검증. 깊은 직렬화 검사는 하지 않고 계약 위반을
// 명확한 메시지로 즉시 던집니다 (Map 유출, 테이블 누락 등).
export function assertWorldSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) {
    throw new Error('WorldSnapshot must be a plain object');
  }

  if (!isPlainObject(snapshot.clock)) {
    throw new Error('WorldSnapshot.clock must be a plain object');
  }
  for (const key of CLOCK_KEYS) {
    if (!(key in snapshot.clock)) {
      throw new Error(`WorldSnapshot.clock is missing "${key}"`);
    }
  }

  if (!isPlainObject(snapshot.entities)) {
    throw new Error('WorldSnapshot.entities must be a plain object');
  }
  for (const table of ENTITY_TABLES) {
    const records = snapshot.entities[table];
    if (records instanceof Map || records instanceof Set) {
      throw new Error(`WorldSnapshot.entities.${table} must be a plain object keyed by id, got ${records.constructor.name}`);
    }
    if (!isPlainObject(records)) {
      throw new Error(`WorldSnapshot.entities is missing table "${table}" (plain object keyed by id)`);
    }
    for (const [id, record] of Object.entries(records)) {
      if (!isPlainObject(record)) {
        throw new Error(`WorldSnapshot.entities.${table}["${id}"] must be a plain record object`);
      }
    }
  }

  if (!isPlainObject(snapshot.indexes)) {
    throw new Error('WorldSnapshot.indexes must be a plain object');
  }
  for (const index of INDEX_NAMES) {
    if (!isPlainObject(snapshot.indexes[index])) {
      throw new Error(`WorldSnapshot.indexes is missing index "${index}" (plain object)`);
    }
  }

  if (!Array.isArray(snapshot.events)) {
    throw new Error('WorldSnapshot.events must be an array');
  }

  return snapshot;
}
