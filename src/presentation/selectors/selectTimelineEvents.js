// timeline selector (surface.timeline).
// Namespace filters match event type prefixes; `major` matches severe events.

const MAJOR_SEVERITIES = new Set(['major', 'critical', 'historic']);

function matchesFilter(event, filter) {
  if (filter === 'all') return true;
  if (filter === 'major') return MAJOR_SEVERITIES.has(event.severity);
  const type = typeof event.type === 'string' ? event.type : '';
  return type === filter || type.startsWith(`${filter}.`);
}

export function selectTimelineEvents(state, { filter = 'all', limit = 50 } = {}) {
  const events = Array.isArray(state?.events) ? state.events : [];
  const filtered = [];

  for (const event of events) {
    if (!event || typeof event !== 'object' || !matchesFilter(event, filter)) continue;
    filtered.push({
      id: event.id ?? `${event.type ?? 'event'}:${event.time ?? 0}:${filtered.length}`,
      time: typeof event.time === 'number' ? event.time : 0,
      type: event.type ?? null,
      severity: event.severity ?? 'ambient',
      text: event.fallbackText ?? event.text ?? '',
      roomId: event.roomId ?? event.locationRoomId ?? null,
      actorId: event.actorId ?? event.sourceId ?? event.agentId ?? null,
      targetId: event.targetId ?? event.subjectId ?? null,
      factionId: event.factionId ?? null
    });
  }

  // Input is append ordered, so retain the newest `limit` events while keeping
  // chronological order for the presentation layer.
  const max = typeof limit === 'number' && limit >= 0 ? limit : 50;
  return filtered.length > max ? filtered.slice(filtered.length - max) : filtered;
}
