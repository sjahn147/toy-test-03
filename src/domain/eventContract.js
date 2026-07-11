// 시뮬레이션 이벤트 계약 (docs/architecture/production-layering.md §10).
// 타임라인, 세션 리포트, 알림, 저장 파일이 같은 구조를 공유합니다.

export const EVENT_SEVERITIES = ['ambient', 'minor', 'major', 'critical', 'historic'];

export const EVENT_NAMESPACES = [
  'agent',
  'combat',
  'ecology',
  'party',
  'settlement',
  'territory',
  'logistics',
  'construction',
  'campaign',
  'discovery',
  'legacy'
];

/**
 * @typedef {Object} WorldEvent
 * @property {string} id
 * @property {number} time
 * @property {string} type  `<namespace>.<name>` 형식, namespace는 EVENT_NAMESPACES 중 하나
 * @property {string} severity  EVENT_SEVERITIES 중 하나
 * @property {string[]} actorIds
 * @property {string[]} targetIds
 * @property {string|null} roomId
 * @property {string[]} factionIds
 * @property {string[]} tags
 * @property {string|null} localizationKey
 * @property {Object} params
 * @property {string} fallbackText
 */

/**
 * 검증된 frozen WorldEvent를 생성합니다.
 * @returns {Readonly<WorldEvent>}
 */
export function createWorldEvent({
  id,
  time,
  type,
  severity = 'ambient',
  actorIds = [],
  targetIds = [],
  roomId = null,
  factionIds = [],
  tags = [],
  localizationKey = null,
  params = {},
  fallbackText = ''
} = {}) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('WorldEvent.id must be a non-empty string');
  }
  if (typeof time !== 'number' || !Number.isFinite(time)) {
    throw new Error(`WorldEvent.time must be a finite number, got ${time}`);
  }
  if (typeof type !== 'string' || !type.includes('.')) {
    throw new Error(`WorldEvent.type must look like "<namespace>.<name>", got "${type}"`);
  }
  const namespace = type.slice(0, type.indexOf('.'));
  if (!EVENT_NAMESPACES.includes(namespace)) {
    throw new Error(`WorldEvent.type namespace "${namespace}" is not one of: ${EVENT_NAMESPACES.join(', ')}`);
  }
  if (!EVENT_SEVERITIES.includes(severity)) {
    throw new Error(`WorldEvent.severity "${severity}" is not one of: ${EVENT_SEVERITIES.join(', ')}`);
  }

  return Object.freeze({
    id,
    time,
    type,
    severity,
    actorIds: Object.freeze([...actorIds]),
    targetIds: Object.freeze([...targetIds]),
    roomId,
    factionIds: Object.freeze([...factionIds]),
    tags: Object.freeze([...tags]),
    localizationKey,
    params: { ...params },
    fallbackText
  });
}
