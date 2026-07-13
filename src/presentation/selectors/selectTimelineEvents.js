// Chronicle-aware timeline selector.

import { channelVisibleInMode } from '../../domain/chronicleContract.js';
import { defaultLocalizationService } from '../../localization/LocalizationService.js';

const MAJOR_SEVERITIES = new Set(['major', 'critical', 'historic']);

function matchesFilter(event, filter) {
  if (filter === 'all') return true;
  if (filter === 'major') return MAJOR_SEVERITIES.has(event.severity);
  const type = typeof event.type === 'string' ? event.type : '';
  return type === filter || type.startsWith(`${filter}.`);
}

export function selectTimelineEvents(state, {
  filter = 'all',
  limit = 50,
  mode = 'chronicle',
  locale = 'en',
  localizationService = defaultLocalizationService
} = {}) {
  const events = Array.isArray(state?.events) ? state.events : [];
  const filtered = [];

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const channel = event.channel ?? inferLegacyChannel(event);
    if (!channelVisibleInMode(channel, mode) || !matchesFilter(event, filter)) continue;
    const localized = localizationService.render(event, { locale });
    const detail = localizationService.render(event, { locale, detail: true });
    filtered.push({
      id: event.id ?? `${event.type ?? 'event'}:${event.time ?? 0}:${filtered.length}`,
      time: typeof event.time === 'number' ? event.time : 0,
      type: event.type ?? null,
      severity: event.severity ?? 'ambient',
      channel,
      salience: Number.isFinite(event.salience) ? event.salience : 0.2,
      text: localized || event.fallbackText || event.text || '',
      detail: detail && detail !== localized ? detail : null,
      fallbackText: event.fallbackText ?? event.text ?? '',
      roomId: event.roomId ?? event.locationRoomId ?? null,
      actorId: event.actorIds?.[0] ?? event.actorId ?? event.sourceId ?? event.agentId ?? null,
      targetId: event.targetIds?.[0] ?? event.targetId ?? event.subjectId ?? null,
      factionId: event.factionIds?.[0] ?? event.factionId ?? null,
      localizationKey: event.localizationKey ?? null,
      params: { ...(event.params ?? {}) },
      debug: event.debug ? { ...event.debug } : null,
      tags: [...(event.tags ?? [])]
    });
  }

  const max = typeof limit === 'number' && limit >= 0 ? limit : 50;
  return filtered.length > max ? filtered.slice(filtered.length - max) : filtered;
}

function inferLegacyChannel(event) {
  if (event.type === 'legacy.log') return 'detail';
  return MAJOR_SEVERITIES.has(event.severity) ? 'chronicle' : 'detail';
}
