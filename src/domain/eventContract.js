// Simulation event contract shared by timeline, session report, alerts and saves.

import { CHRONICLE_CHANNELS } from './chronicleContract.js';

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
  'hero',
  'relationship',
  'system',
  'legacy'
];

/**
 * @typedef {Object} WorldEvent
 * @property {string} id
 * @property {number} time
 * @property {string} type
 * @property {string} severity
 * @property {string} channel
 * @property {number} salience
 * @property {string[]} actorIds
 * @property {string[]} targetIds
 * @property {string|null} roomId
 * @property {string[]} factionIds
 * @property {string[]} tags
 * @property {string|null} localizationKey
 * @property {string|null} detailKey
 * @property {Object} params
 * @property {string} fallbackText
 * @property {string|null} dedupeKey
 * @property {string|null} aggregateKey
 * @property {number|string|null} variantSeed
 * @property {Object|null} debug
 */

/**
 * Creates a validated frozen WorldEvent.
 * Additional Chronicle fields are backward-compatible with the Phase runtime.
 * @returns {Readonly<WorldEvent>}
 */
export function createWorldEvent({
  id,
  time,
  type,
  severity = 'ambient',
  channel = severity === 'ambient' ? 'detail' : 'chronicle',
  salience = severity === 'ambient' ? 0.15 : 0.55,
  actorIds = [],
  targetIds = [],
  roomId = null,
  factionIds = [],
  tags = [],
  localizationKey = null,
  detailKey = null,
  params = {},
  fallbackText = '',
  dedupeKey = null,
  aggregateKey = null,
  variantSeed = null,
  debug = null
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
  if (!CHRONICLE_CHANNELS.includes(channel)) {
    throw new Error(`WorldEvent.channel "${channel}" is not one of: ${CHRONICLE_CHANNELS.join(', ')}`);
  }
  if (!Number.isFinite(salience) || salience < 0 || salience > 1) {
    throw new Error(`WorldEvent.salience must be between 0 and 1, got ${salience}`);
  }

  return Object.freeze({
    id,
    time,
    type,
    severity,
    channel,
    salience,
    actorIds: Object.freeze(uniqueStrings(actorIds)),
    targetIds: Object.freeze(uniqueStrings(targetIds)),
    roomId: typeof roomId === 'string' && roomId ? roomId : null,
    factionIds: Object.freeze(uniqueStrings(factionIds)),
    tags: Object.freeze(uniqueStrings(tags)),
    localizationKey: typeof localizationKey === 'string' && localizationKey ? localizationKey : null,
    detailKey: typeof detailKey === 'string' && detailKey ? detailKey : null,
    params: Object.freeze(sanitizeParams(params)),
    fallbackText: typeof fallbackText === 'string' ? fallbackText : '',
    dedupeKey: typeof dedupeKey === 'string' && dedupeKey ? dedupeKey : null,
    aggregateKey: typeof aggregateKey === 'string' && aggregateKey ? aggregateKey : null,
    variantSeed: isPrimitive(variantSeed) ? variantSeed : null,
    debug: debug && typeof debug === 'object' ? Object.freeze(sanitizeParams(debug)) : null
  });
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value.length > 0))];
}

function sanitizeParams(params) {
  const result = {};
  for (const [key, value] of Object.entries(params && typeof params === 'object' ? params : {})) {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') continue;
    if (Array.isArray(value)) {
      result[key] = value.filter(isPrimitive);
      continue;
    }
    if (value && typeof value === 'object') {
      const nested = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (isPrimitive(nestedValue)) nested[nestedKey] = nestedValue;
      }
      result[key] = nested;
      continue;
    }
    if (isPrimitive(value)) result[key] = value;
  }
  return result;
}

function isPrimitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}
