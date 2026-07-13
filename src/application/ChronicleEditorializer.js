import { createChronicleDescriptor } from '../domain/chronicleContract.js';

const DEFAULT_DEDUPE_WINDOWS = Object.freeze({
  debug: 18,
  detail: 2.5,
  chronicle: 3.5
});

export class ChronicleEditorializer {
  constructor({ debugRetention = 80, minimumChronicleSalience = 0.24 } = {}) {
    this.debugRetention = Math.max(10, debugRetention);
    this.minimumChronicleSalience = minimumChronicleSalience;
    this.lastPublished = new Map();
    this.aggregates = new Map();
    this.stats = {
      ingested: 0,
      published: 0,
      deduped: 0,
      suppressed: 0,
      aggregated: 0
    };
  }

  ingest(descriptor, now = 0) {
    if (!descriptor) return [];
    this.stats.ingested += 1;

    if (descriptor.channel === 'chronicle' && descriptor.salience < this.minimumChronicleSalience) {
      this.stats.suppressed += 1;
      return [];
    }

    if (descriptor.aggregateKey && descriptor.aggregateWindow > 0) {
      this.addAggregate(descriptor, now);
      this.stats.aggregated += 1;
      return [];
    }

    if (this.shouldDedupe(descriptor, now)) {
      this.stats.deduped += 1;
      return [];
    }
    this.markPublished(descriptor, now);
    this.stats.published += 1;
    return [descriptor];
  }

  flush(now = 0, { force = false } = {}) {
    const ready = [];
    for (const [key, aggregate] of [...this.aggregates]) {
      if (!force && now < aggregate.expiresAt) continue;
      this.aggregates.delete(key);
      const descriptor = this.materializeAggregate(aggregate);
      if (!descriptor) continue;
      if (this.shouldDedupe(descriptor, now)) {
        this.stats.deduped += 1;
        continue;
      }
      this.markPublished(descriptor, now);
      this.stats.published += 1;
      ready.push(descriptor);
    }
    return ready;
  }

  addAggregate(descriptor, now) {
    const existing = this.aggregates.get(descriptor.aggregateKey);
    if (!existing || now > existing.expiresAt) {
      if (existing) this.aggregates.delete(descriptor.aggregateKey);
      this.aggregates.set(descriptor.aggregateKey, {
        first: descriptor,
        count: Number(descriptor.params?.count ?? 1),
        actorNames: [descriptor.params?.actor].filter(Boolean),
        actorIds: [...descriptor.actorIds],
        targetIds: [...descriptor.targetIds],
        startedAt: now,
        expiresAt: now + descriptor.aggregateWindow,
        latestFallbackText: descriptor.fallbackText
      });
      return;
    }
    existing.count += Number(descriptor.params?.count ?? 1);
    if (descriptor.params?.actor) existing.actorNames.push(descriptor.params.actor);
    existing.actorIds.push(...descriptor.actorIds);
    existing.targetIds.push(...descriptor.targetIds);
    existing.latestFallbackText = descriptor.fallbackText || existing.latestFallbackText;
    existing.expiresAt = Math.max(existing.expiresAt, now + descriptor.aggregateWindow * 0.35);
  }

  materializeAggregate(aggregate) {
    const first = aggregate.first;
    const count = Math.max(1, aggregate.count);
    const isSpawn = first.localizationKey === 'ecology.spawn.single' || first.type === 'ecology.spawn';
    if (!isSpawn) return first;
    const params = {
      ...first.params,
      count,
      actor: count === 1 ? aggregate.actorNames[0] ?? first.params?.actor : first.params?.actor,
      actorNames: aggregate.actorNames.slice(0, 8),
      speciesPlural: pluralize(first.params?.species ?? 'creature', count)
    };
    return createChronicleDescriptor({
      ...first,
      type: 'ecology.spawn',
      severity: count >= 4 ? 'minor' : 'ambient',
      channel: 'chronicle',
      salience: Math.min(0.72, 0.31 + count * 0.08),
      localizationKey: count === 1 ? 'ecology.spawn.single' : 'ecology.spawn.cluster',
      fallbackText: count === 1 ? first.fallbackText : `${count} ${params.speciesPlural} emerged from ${params.site ?? 'a habitat'}.`,
      actorIds: [...new Set(aggregate.actorIds)],
      targetIds: [...new Set(aggregate.targetIds)],
      params,
      dedupeKey: `spawn-cluster:${first.aggregateKey}`,
      aggregateKey: null,
      aggregateWindow: 0,
      variantSeed: `${first.aggregateKey}:${Math.floor(aggregate.startedAt)}:${count}`,
      debug: null
    });
  }

  shouldDedupe(descriptor, now) {
    if (!descriptor.dedupeKey) return false;
    const previous = this.lastPublished.get(descriptor.dedupeKey);
    if (!Number.isFinite(previous)) return false;
    const explicit = descriptor.debug?.dedupeWindow;
    const window = Number.isFinite(explicit) ? explicit : DEFAULT_DEDUPE_WINDOWS[descriptor.channel] ?? 2;
    return now - previous < window;
  }

  markPublished(descriptor, now) {
    if (descriptor.dedupeKey) this.lastPublished.set(descriptor.dedupeKey, now);
    if (this.lastPublished.size > this.debugRetention * 4) {
      const threshold = now - 180;
      for (const [key, time] of this.lastPublished) if (time < threshold) this.lastPublished.delete(key);
    }
  }

  snapshot() {
    return {
      pendingAggregates: [...this.aggregates.entries()].map(([key, aggregate]) => ({
        key,
        count: aggregate.count,
        startedAt: aggregate.startedAt,
        expiresAt: aggregate.expiresAt,
        localizationKey: aggregate.first.localizationKey
      })),
      stats: { ...this.stats }
    };
  }

  reset() {
    this.lastPublished.clear();
    this.aggregates.clear();
    for (const key of Object.keys(this.stats)) this.stats[key] = 0;
  }
}

function pluralize(value, count) {
  const word = String(value ?? 'creature');
  if (count === 1) return word;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}
