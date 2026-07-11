// timeline selector (surface.timeline).
// filter는 이벤트 type의 namespace prefix와 매칭 ('combat' → 'combat.*').

function matchesFilter(event, filter) {
  if (filter === 'all') return true;
  const type = typeof event.type === 'string' ? event.type : '';
  return type === filter || type.startsWith(`${filter}.`);
}

export function selectTimelineEvents(state, { filter = 'all', limit = 50 } = {}) {
  const events = Array.isArray(state?.events) ? state.events : [];

  const filtered = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    if (!matchesFilter(event, filter)) continue;
    filtered.push({
      id: event.id ?? null,
      time: typeof event.time === 'number' ? event.time : 0,
      type: event.type ?? null,
      severity: event.severity ?? 'ambient',
      text: event.fallbackText ?? event.text ?? '',
      roomId: event.roomId ?? null
    });
  }

  // 입력이 시간순(append order)이라는 계약을 따르므로 최근 limit개만 남긴다 (newest-last).
  const max = typeof limit === 'number' && limit >= 0 ? limit : 50;
  return filtered.length > max ? filtered.slice(filtered.length - max) : filtered;
}
