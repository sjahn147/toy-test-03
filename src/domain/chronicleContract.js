export const CHRONICLE_CHANNELS = Object.freeze(['chronicle', 'detail', 'debug']);
export const CHRONICLE_MODES = Object.freeze(['chronicle', 'detailed', 'debug']);

export const DEFAULT_CHANNEL_BY_SEVERITY = Object.freeze({
  ambient: 'detail',
  minor: 'chronicle',
  major: 'chronicle',
  critical: 'chronicle',
  historic: 'chronicle'
});

export function createChronicleDescriptor({
  type,
  severity = 'ambient',
  channel = DEFAULT_CHANNEL_BY_SEVERITY[severity] ?? 'detail',
  salience = 0.35,
  localizationKey = null,
  detailKey = null,
  fallbackText = '',
  actorIds = [],
  targetIds = [],
  roomId = null,
  factionIds = [],
  tags = [],
  params = {},
  dedupeKey = null,
  aggregateKey = null,
  aggregateWindow = 0,
  variantSeed = null,
  debug = null
} = {}) {
  if (typeof type !== 'string' || !type.includes('.')) {
    throw new Error(`Chronicle descriptor type must look like "<namespace>.<name>", got "${type}"`);
  }
  if (!CHRONICLE_CHANNELS.includes(channel)) {
    throw new Error(`Unknown chronicle channel "${channel}"`);
  }
  const normalizedSalience = clamp(Number.isFinite(salience) ? salience : 0.35, 0, 1);
  return Object.freeze({
    type,
    severity,
    channel,
    salience: normalizedSalience,
    localizationKey,
    detailKey,
    fallbackText: typeof fallbackText === 'string' ? fallbackText : '',
    actorIds: Object.freeze(uniqueStrings(actorIds)),
    targetIds: Object.freeze(uniqueStrings(targetIds)),
    roomId: typeof roomId === 'string' && roomId ? roomId : null,
    factionIds: Object.freeze(uniqueStrings(factionIds)),
    tags: Object.freeze(uniqueStrings(tags)),
    params: Object.freeze(sanitizeParams(params)),
    dedupeKey: typeof dedupeKey === 'string' && dedupeKey ? dedupeKey : null,
    aggregateKey: typeof aggregateKey === 'string' && aggregateKey ? aggregateKey : null,
    aggregateWindow: Math.max(0, Number.isFinite(aggregateWindow) ? aggregateWindow : 0),
    variantSeed: variantSeed ?? null,
    debug: debug && typeof debug === 'object' ? Object.freeze(sanitizeParams(debug)) : null
  });
}

export function channelVisibleInMode(channel, mode = 'chronicle') {
  const normalizedMode = CHRONICLE_MODES.includes(mode) ? mode : 'chronicle';
  if (normalizedMode === 'debug') return true;
  if (normalizedMode === 'detailed') return channel !== 'debug';
  return channel === 'chronicle';
}

export function chronicleModeLabel(mode) {
  if (mode === 'detailed') return 'Detailed';
  if (mode === 'debug') return 'Debug';
  return 'Chronicle';
}

function sanitizeParams(params) {
  const output = {};
  for (const [key, value] of Object.entries(params && typeof params === 'object' ? params : {})) {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') continue;
    if (Array.isArray(value)) {
      output[key] = value.filter(item => isSerializablePrimitive(item));
      continue;
    }
    if (value && typeof value === 'object') {
      const nested = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (isSerializablePrimitive(nestedValue)) nested[nestedKey] = nestedValue;
      }
      output[key] = nested;
      continue;
    }
    if (isSerializablePrimitive(value)) output[key] = value;
  }
  return output;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value.length > 0))];
}

function isSerializablePrimitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
