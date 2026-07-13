import { createChronicleDescriptor } from '../domain/chronicleContract.js';

const NOISE_PATTERNS = [
  /could not find a legal corridor/i,
  /stopped repeating a blocked route/i,
  /stopped uselessly retracing/i,
  /could not produce another/i,
  /no valid target/i,
  /target .* (missing|unavailable)/i,
  /failed to resolve/i,
  /spawn socket/i,
  /habitat slots were occupied or unsafe/i
];

const DETAIL_PATTERNS = [
  / entered the corridor toward /i,
  / arrived from .* at /i,
  / carried .* toward /i,
  / moved to escort /i,
  / dealt \d+ siege damage /i,
  / hammered .* for \d+ siege damage/i,
  / deployed in /i,
  / field formed in /i,
  / struck the edge of /i
];

export class LegacyChronicleBridge {
  translate(payload, context = {}) {
    const meta = normalizePayload(payload);
    if (meta.localizationKey || meta.eventKey) return this.fromStructured(meta, context);

    const explicit = this.fromExplicitType(meta, context);
    if (explicit) return explicit;

    const parsed = this.fromText(meta, context);
    if (parsed) return parsed;

    return this.fromUnknown(meta, context);
  }

  fromStructured(meta, context) {
    return createChronicleDescriptor({
      type: normalizeEventType(meta.type, meta.namespace),
      severity: meta.severity ?? 'minor',
      channel: meta.channel ?? 'chronicle',
      salience: meta.salience ?? 0.6,
      localizationKey: meta.localizationKey ?? meta.eventKey,
      detailKey: meta.detailKey ?? null,
      fallbackText: meta.text ?? meta.fallbackText ?? '',
      actorIds: ids(meta.actorIds, meta.sourceId, meta.agentId, meta.heroId),
      targetIds: ids(meta.targetIds, meta.targetId, meta.subjectId),
      roomId: meta.roomId ?? meta.locationRoomId ?? null,
      factionIds: ids(meta.factionIds, meta.factionId),
      tags: [...(meta.tags ?? []), 'structured'],
      params: enrichParams(meta.params ?? meta, meta, context),
      dedupeKey: meta.dedupeKey ?? null,
      aggregateKey: meta.aggregateKey ?? null,
      aggregateWindow: meta.aggregateWindow ?? 0,
      variantSeed: meta.variantSeed ?? null,
      debug: meta.debug ?? null
    });
  }

  fromExplicitType(meta, context) {
    const type = String(meta.type ?? '');
    const actorIds = ids(meta.sourceId, meta.agentId, meta.ownerAgentId, meta.heroId);
    const targetIds = ids(meta.targetId, meta.subjectId);
    const common = {
      fallbackText: meta.text,
      actorIds,
      targetIds,
      roomId: meta.roomId ?? null,
      factionIds: ids(meta.factionId),
      params: enrichParams(meta, meta, context),
      variantSeed: meta.variantSeed ?? `${type}:${meta.sourceId ?? ''}:${meta.targetId ?? ''}:${meta.roomId ?? ''}`
    };

    const map = {
      attack: ['combat.hit', 'ambient', 'detail', 0.1, 'combat.hit'],
      heal: ['combat.heal', 'ambient', 'detail', 0.12, 'combat.heal'],
      downed: ['combat.downed', 'major', 'chronicle', 0.76, 'combat.downed'],
      death: ['combat.death', 'major', 'chronicle', 0.84, 'combat.death'],
      'move-start': ['agent.move.started', 'ambient', 'detail', 0.05, 'agent.move.started'],
      'move-end': ['agent.move.arrived', 'ambient', 'detail', 0.07, 'agent.move.arrived'],
      gold: ['discovery.treasure.found', 'minor', 'chronicle', 0.44, 'discovery.treasure.found'],
      web: ['combat.webbed', 'minor', 'chronicle', 0.4, 'combat.webbed'],
      'disengage-blocked': ['combat.disengage.blocked', 'minor', 'chronicle', 0.38, 'combat.disengage.blocked'],
      'disengage-move': ['combat.disengage.moved', 'minor', 'chronicle', 0.42, 'combat.disengage.moved']
    };
    if (map[type]) {
      const [eventType, severity, channel, salience, localizationKey] = map[type];
      return createChronicleDescriptor({
        ...common,
        type: eventType,
        severity,
        channel,
        salience,
        localizationKey,
        detailKey: channel === 'detail' ? localizationKey : null,
        dedupeKey: channel === 'detail' ? `${eventType}:${meta.sourceId ?? ''}:${meta.targetId ?? ''}` : null
      });
    }

    if (type === 'hero-death') return createChronicleDescriptor({
      ...common, type: 'hero.death', severity: 'historic', channel: 'chronicle', salience: 1,
      localizationKey: 'hero.death', dedupeKey: `hero-death:${meta.heroId ?? meta.agentId}`,
      tags: ['hero', 'permanent']
    });

    if (/^hero-skill-(start|started|cast-start)$/i.test(type)) return createChronicleDescriptor({
      ...common, type: 'hero.skill.started', severity: 'major', channel: 'chronicle', salience: 0.72,
      localizationKey: 'hero.skill.started', dedupeKey: `hero-skill-start:${meta.heroId ?? meta.agentId}:${meta.skillId ?? meta.skill ?? ''}`,
      tags: ['hero', 'skill']
    });
    if (/^hero-skill-(interrupt|interrupted)$/i.test(type)) return createChronicleDescriptor({
      ...common, type: 'hero.skill.interrupted', severity: 'major', channel: 'chronicle', salience: 0.78,
      localizationKey: 'hero.skill.interrupted', dedupeKey: `hero-skill-interrupt:${meta.heroId ?? meta.agentId}:${meta.skillId ?? meta.skill ?? ''}`,
      tags: ['hero', 'skill', 'interrupt']
    });
    if (/^hero-skill-(impact|resolved|complete|completed)$/i.test(type)) return createChronicleDescriptor({
      ...common, type: 'hero.skill.resolved', severity: 'major', channel: 'chronicle', salience: 0.7,
      localizationKey: 'hero.skill.resolved', dedupeKey: `hero-skill-resolved:${meta.heroId ?? meta.agentId}:${meta.skillId ?? meta.skill ?? ''}`,
      tags: ['hero', 'skill']
    });
    if (type === 'hero-deployable-created') return createChronicleDescriptor({
      ...common, type: 'hero.deployable.created', severity: 'minor', channel: 'detail', salience: 0.26,
      localizationKey: 'hero.deployable.created', detailKey: 'hero.deployable.created',
      dedupeKey: `hero-deployable:${meta.heroId ?? ''}:${meta.kind ?? ''}:${meta.roomId ?? ''}`,
      tags: ['hero', 'deployable']
    });
    if (type === 'hero-deployable-destroyed') return createChronicleDescriptor({
      ...common, type: 'hero.deployable.destroyed', severity: 'minor', channel: 'chronicle', salience: 0.42,
      localizationKey: 'hero.deployable.destroyed',
      dedupeKey: `hero-deployable-destroyed:${meta.deployableId ?? meta.kind ?? ''}`,
      tags: ['hero', 'deployable']
    });
    if (type === 'hero-field-created') return createChronicleDescriptor({
      ...common, type: 'hero.field.created', severity: 'minor', channel: 'detail', salience: 0.28,
      localizationKey: 'hero.field.created', detailKey: 'hero.field.created',
      dedupeKey: `hero-field:${meta.heroId ?? ''}:${meta.kind ?? ''}:${meta.roomId ?? ''}`,
      tags: ['hero', 'field']
    });
    if (type === 'hero-explosion') return createChronicleDescriptor({
      ...common, type: 'hero.explosion', severity: 'major', channel: 'chronicle', salience: 0.74,
      localizationKey: 'hero.explosion', dedupeKey: `hero-explosion:${meta.heroId ?? ''}:${meta.projectileId ?? meta.roomId ?? ''}`,
      tags: ['hero', 'explosion']
    });
    if (type === 'hero-adaptation-change') return createChronicleDescriptor({
      ...common, type: 'hero.adaptation.changed', severity: 'major', channel: 'chronicle', salience: 0.76,
      localizationKey: 'hero.adaptation.changed', dedupeKey: `hero-adaptation:${meta.heroId ?? ''}:${meta.adaptation ?? ''}`,
      tags: ['hero', 'transformation']
    });
    if (type === 'hero-physics-collision') return createChronicleDescriptor({
      ...common, type: 'hero.physics.collision', severity: 'ambient', channel: 'detail', salience: 0.12,
      localizationKey: 'hero.physics.collision', detailKey: 'hero.physics.collision',
      dedupeKey: `hero-collision:${meta.targetId ?? ''}:${meta.roomId ?? ''}`,
      tags: ['hero', 'physics']
    });
    if (/barrier|gate/i.test(type) && /created|closed|spawned|raised/i.test(type)) return createChronicleDescriptor({
      ...common, type: 'hero.barrier.created', severity: 'major', channel: 'chronicle', salience: 0.72,
      localizationKey: 'hero.barrier.created', dedupeKey: `hero-barrier:${meta.heroId ?? ''}:${meta.roomId ?? ''}:${meta.routeId ?? ''}`,
      tags: ['hero', 'barrier']
    });
    if (/summon|reassemble|raised/i.test(type)) return createChronicleDescriptor({
      ...common, type: 'hero.summon.created', severity: 'major', channel: 'chronicle', salience: 0.68,
      localizationKey: 'hero.summon.created', dedupeKey: `hero-summon:${meta.heroId ?? ''}:${meta.roomId ?? ''}:${type}`,
      tags: ['hero', 'summon']
    });

    return null;
  }

  fromText(meta, context) {
    const text = String(meta.text ?? '').trim();
    if (!text) return null;
    const common = textCommon(meta, context);
    let match;

    if ((match = text.match(/^(.+) was placed under the glass\.$/))) return descriptor(common, {
      type: 'campaign.observation.started', severity: 'major', channel: 'chronicle', salience: 0.8,
      localizationKey: 'campaign.observation.started', params: { scenario: match[1] }, dedupeKey: 'campaign-start'
    });
    if ((match = text.match(/^(.+) escaped with (\d+) coins and promised to come back with worse friends\.$/))) return descriptor(common, {
      type: 'party.expedition.escaped', severity: 'major', channel: 'chronicle', salience: 0.72,
      localizationKey: 'party.expedition.escaped', params: { actor: match[1], gold: Number(match[2]) },
      dedupeKey: `party-escaped:${match[1]}`
    });
    if ((match = text.match(/^(.+) hit (.+) for ([\d.]+)\.$/))) return descriptor(common, {
      type: 'combat.hit', severity: 'ambient', channel: 'detail', salience: 0.08,
      localizationKey: 'combat.hit', detailKey: 'combat.hit',
      params: { actor: match[1], target: match[2], amount: Number(match[3]) },
      dedupeKey: `hit:${match[1]}:${match[2]}`, dedupeWindow: 2.2
    });
    if ((match = text.match(/^(.+) (?:patched up|restored) (.+) for ([\d.]+)\.?$/))) return descriptor(common, {
      type: 'combat.heal', severity: 'ambient', channel: 'detail', salience: 0.1,
      localizationKey: 'combat.heal', detailKey: 'combat.heal',
      params: { actor: match[1], target: match[2], amount: Number(match[3]) },
      dedupeKey: `heal:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) opened (.+)\. (.+) opened back\.$/))) return descriptor(common, {
      type: 'discovery.mimic.revealed', severity: 'major', channel: 'chronicle', salience: 0.82,
      localizationKey: 'discovery.mimic.revealed', params: { actor: match[1], object: match[2], mimic: match[3] },
      dedupeKey: `mimic:${match[2]}`
    });
    if ((match = text.match(/^(.+) found (\d+) suspicious coins\.$/))) return descriptor(common, {
      type: 'discovery.treasure.found', severity: 'minor', channel: 'chronicle', salience: 0.45,
      localizationKey: 'discovery.treasure.found', params: { actor: match[1], gold: Number(match[2]) }
    });
    if ((match = text.match(/^(.+) could not find a legal corridor to (.+)\.$/))) return descriptor(common, {
      type: 'system.route.invalid', severity: 'ambient', channel: 'debug', salience: 0,
      localizationKey: 'system.route.invalid', detailKey: 'system.route.invalid', params: { actor: match[1], room: match[2] },
      dedupeKey: `route-invalid:${match[1]}:${match[2]}`, dedupeWindow: 18,
      debug: { reason: 'no-legal-corridor' }
    });
    if ((match = text.match(/^(.+) entered the corridor toward (.+)\.$/))) return descriptor(common, {
      type: 'agent.move.started', severity: 'ambient', channel: 'detail', salience: 0.02,
      localizationKey: 'agent.move.started', detailKey: 'agent.move.started', params: { actor: match[1], room: match[2] },
      dedupeKey: `move-start:${match[1]}:${match[2]}`, dedupeWindow: 3.5
    });
    if ((match = text.match(/^(.+) arrived from (.+) at (.+)\.$/))) return descriptor(common, {
      type: 'agent.move.arrived', severity: 'ambient', channel: 'detail', salience: 0.03,
      localizationKey: 'agent.move.arrived', detailKey: 'agent.move.arrived', params: { actor: match[1], fromRoom: match[2], room: match[3] },
      dedupeKey: `move-end:${match[1]}:${match[3]}`, dedupeWindow: 3.5
    });
    if ((match = text.match(/^(.+) stopped participating in the experiment\.$/))) return descriptor(common, {
      type: 'combat.death', severity: 'major', channel: 'chronicle', salience: 0.82,
      localizationKey: 'combat.death', params: { target: match[1] }, dedupeKey: `death:${match[1]}`
    });
    if ((match = text.match(/^(.+) fed\. The dungeon remembered the taste\.$/))) return descriptor(common, {
      type: 'ecology.predator.fed', severity: 'minor', channel: 'chronicle', salience: 0.56,
      localizationKey: 'ecology.predator.fed', params: { actor: match[1] }, dedupeKey: `fed:${match[1]}`, dedupeWindow: 8
    });
    if ((match = text.match(/^(.+) learned a terrible little lesson and reached level (\d+)\.$/))) return descriptor(common, {
      type: 'party.level.gained', severity: 'major', channel: 'chronicle', salience: 0.66,
      localizationKey: 'party.level.gained', params: { actor: match[1], level: Number(match[2]) }, dedupeKey: `level:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) found a weapon that looked barely legal\.$/))) return descriptor(common, {
      type: 'discovery.armory.weapon', severity: 'minor', channel: 'chronicle', salience: 0.48,
      localizationKey: 'discovery.armory.weapon', params: { actor: match[1] }, dedupeKey: `armory:${match[1]}`
    });
    if ((match = text.match(/^(.+) rested at (.+) and mistook relief for destiny\.$/))) return descriptor(common, {
      type: 'discovery.shrine.rest', severity: 'minor', channel: 'chronicle', salience: 0.48,
      localizationKey: 'discovery.shrine.rest', params: { actor: match[1], room: match[2] }, dedupeKey: `shrine:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) triggered (.+) for ([\d.]+)\. Terrible little mechanism\.$/))) return descriptor(common, {
      type: 'combat.trap.triggered', severity: 'major', channel: 'chronicle', salience: 0.64,
      localizationKey: 'combat.trap.triggered', params: { actor: match[1], trap: match[2], amount: Number(match[3]) }, dedupeKey: `trap:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) was converted into a cautionary tale\.$/))) return descriptor(common, {
      type: 'combat.trap.death', severity: 'major', channel: 'chronicle', salience: 0.82,
      localizationKey: 'combat.trap.death', params: { actor: match[1] }, dedupeKey: `trap-death:${match[1]}`
    });
    if (/^Above ground, the tavern began simplifying the story\.$/.test(text)) return descriptor(common, {
      type: 'party.return.scheduled', severity: 'minor', channel: 'chronicle', salience: 0.5,
      localizationKey: 'party.return.scheduled', dedupeKey: 'party-return-scheduled', dedupeWindow: 20
    });
    if (/^Something under the flagstones began dividing its inheritance\.$/.test(text)) return descriptor(common, {
      type: 'ecology.birth.stirring', severity: 'minor', channel: 'chronicle', salience: 0.5,
      localizationKey: 'ecology.birth.stirring', dedupeKey: 'ecology-birth-stirring', dedupeWindow: 12
    });
    if ((match = text.match(/^(.+) returned at level (\d+), which was not comforting\.$/))) return descriptor(common, {
      type: 'party.member.returned', severity: 'major', channel: 'chronicle', salience: 0.62,
      localizationKey: 'party.member.returned', params: { actor: match[1], level: Number(match[2]) }, dedupeKey: `returned:${match[1]}`
    });
    if ((match = text.match(/^(.+) joined the party after hearing an inaccurate version of events\.$/))) return descriptor(common, {
      type: 'party.member.recruited', severity: 'minor', channel: 'chronicle', salience: 0.54,
      localizationKey: 'party.member.recruited', params: { actor: match[1] }, dedupeKey: `recruit:${match[1]}`
    });
    if ((match = text.match(/^(.+) crawled out of (.+) and immediately had opinions\.$/))) return descriptor(common, {
      type: 'ecology.spawn', severity: 'ambient', channel: 'chronicle', salience: 0.34,
      localizationKey: 'ecology.spawn.single', params: { actor: match[1], species: speciesFromName(match[1]), site: match[2], count: 1 },
      aggregateKey: `spawn:${match[2]}:${speciesFromName(match[1])}`, aggregateWindow: 2.8,
      tags: ['aggregate-spawn']
    });
    if ((match = text.match(/^(.+) reset itself with quiet malice\.$/))) return descriptor(common, {
      type: 'ecology.trap.rearmed', severity: 'ambient', channel: 'detail', salience: 0.18,
      localizationKey: 'ecology.trap.rearmed', detailKey: 'ecology.trap.rearmed', params: { trap: match[1] }, dedupeKey: `rearm:${match[1]}`, dedupeWindow: 30
    });
    if ((match = text.match(/^A new rumor condensed into a chest in (.+)\.$/))) return descriptor(common, {
      type: 'discovery.treasure.rumor', severity: 'minor', channel: 'chronicle', salience: 0.5,
      localizationKey: 'discovery.treasure.rumor', params: { room: match[1] }, dedupeKey: `rumor-chest:${match[1]}`, dedupeWindow: 16
    });
    if ((match = text.match(/^A tiny god tapped the glass near (.+)\.$/))) return descriptor(common, {
      type: 'campaign.observer.noise', severity: 'major', channel: 'chronicle', salience: 0.7,
      localizationKey: 'campaign.observer.noise', params: { room: match[1] }, dedupeKey: `observer-noise:${match[1]}`, dedupeWindow: 8
    });
    if ((match = text.match(/^A coin fell in (.+)\. (.+) developed a theory\.$/))) return descriptor(common, {
      type: 'campaign.observer.coin', severity: 'minor', channel: 'chronicle', salience: 0.5,
      localizationKey: 'campaign.observer.coin', params: { room: match[1], actor: match[2] }, dedupeKey: `observer-coin:${match[1]}`
    });

    if ((match = text.match(/^(.+) became threatened in (.+)\.$/))) return descriptor(common, {
      type: 'settlement.threatened', severity: 'major', channel: 'chronicle', salience: 0.74,
      localizationKey: 'settlement.threatened', params: { site: match[1], room: match[2] }, dedupeKey: `settlement-threat:${match[1]}`, dedupeWindow: 20
    });
    if ((match = text.match(/^(.+) began collapsing as its home structures failed\.$/))) return descriptor(common, {
      type: 'settlement.collapsing', severity: 'critical', channel: 'chronicle', salience: 0.9,
      localizationKey: 'settlement.collapsing', params: { site: match[1] }, dedupeKey: `settlement-collapse:${match[1]}`
    });
    if ((match = text.match(/^(.+) was reduced to a ruined habitat\.$/))) return descriptor(common, {
      type: 'settlement.ruined', severity: 'historic', channel: 'chronicle', salience: 1,
      localizationKey: 'settlement.ruined', params: { site: match[1] }, dedupeKey: `settlement-ruin:${match[1]}`
    });
    if ((match = text.match(/^(.+) adopted (.+) after (.+)\.$/))) return descriptor(common, {
      type: 'settlement.rehomed', severity: 'minor', channel: 'chronicle', salience: 0.58,
      localizationKey: 'settlement.rehomed', params: { actor: match[1], site: match[2], reason: match[3] }, dedupeKey: `rehome:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) was displaced from (.+)\.$/))) return descriptor(common, {
      type: 'settlement.displaced', severity: 'major', channel: 'chronicle', salience: 0.72,
      localizationKey: 'settlement.displaced', params: { actor: match[1], site: match[2] }, dedupeKey: `displaced:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) could not produce another (.+); its (\d+) habitat slots were occupied or unsafe\.$/))) return descriptor(common, {
      type: 'system.capacity.blocked', severity: 'ambient', channel: 'debug', salience: 0,
      localizationKey: 'system.capacity.blocked', detailKey: 'system.capacity.blocked',
      params: { site: match[1], species: match[2], capacity: Number(match[3]) },
      dedupeKey: `capacity:${match[1]}:${match[2]}`, dedupeWindow: 30,
      debug: { reason: 'capacity-or-safety' }
    });

    if ((match = text.match(/^(.+) moved to escort (.+)'s cargo\.$/))) return descriptor(common, {
      type: 'logistics.escort.move', severity: 'ambient', channel: 'detail', salience: 0.04,
      localizationKey: 'logistics.escort.move', detailKey: 'logistics.escort.move', params: { actor: match[1], target: match[2] },
      dedupeKey: `escort-move:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) carried (.+) toward (.+)\.$/))) return descriptor(common, {
      type: 'logistics.carry.move', severity: 'ambient', channel: 'detail', salience: 0.03,
      localizationKey: 'logistics.carry.move', detailKey: 'logistics.carry.move', params: { actor: match[1], resource: match[2], site: match[3] },
      dedupeKey: `cargo-move:${match[1]}:${match[2]}:${match[3]}`
    });
    if ((match = text.match(/^(.+) delivered ([\d.]+) (.+) to (.+)\.$/))) return descriptor(common, {
      type: 'logistics.delivered', severity: 'minor', channel: 'chronicle', salience: 0.54,
      localizationKey: 'logistics.delivered', params: { actor: match[1], amount: Number(match[2]), resource: match[3], site: match[4] },
      dedupeKey: `delivery:${match[4]}:${match[3]}`, dedupeWindow: 4
    });
    if ((match = text.match(/^(.+) cargo was dropped in (.+) after (.+)\.$/))) return descriptor(common, {
      type: /raid|ambush/i.test(match[3]) ? 'logistics.raided' : 'logistics.dropped', severity: 'major', channel: 'chronicle', salience: 0.68,
      localizationKey: /raid|ambush/i.test(match[3]) ? 'logistics.raided' : 'logistics.dropped',
      params: { resource: match[1], room: match[2], reason: match[3] }, dedupeKey: `cargo-drop:${match[1]}:${match[2]}`, dedupeWindow: 4
    });

    if ((match = text.match(/^(.+) began building (.+) in (.+)\.$/))) return descriptor(common, {
      type: 'construction.started', severity: 'minor', channel: 'chronicle', salience: 0.56,
      localizationKey: 'construction.started', params: { faction: match[1], structure: match[2], room: match[3] },
      dedupeKey: `construction-start:${match[2]}:${match[3]}`
    });
    if ((match = text.match(/^(.+) was completed in (.+)\.$/))) return descriptor(common, {
      type: 'construction.completed', severity: 'major', channel: 'chronicle', salience: 0.7,
      localizationKey: 'construction.completed', params: { structure: match[1], room: match[2] },
      dedupeKey: `construction-complete:${match[1]}:${match[2]}`
    });
    if ((match = text.match(/^(.+) dealt ([\d.]+) siege damage to (.+)\.$/))) return descriptor(common, {
      type: 'siege.hit', severity: 'ambient', channel: 'detail', salience: 0.08,
      localizationKey: 'siege.hit', detailKey: 'siege.hit', params: { actor: match[1], amount: Number(match[2]), structure: match[3] },
      dedupeKey: `siege-hit:${match[1]}:${match[3]}`, dedupeWindow: 0.5
    });
    if ((match = text.match(/^(.+) destroyed (.+) in (.+)\.$/))) return descriptor(common, {
      type: 'siege.structure.destroyed', severity: 'critical', channel: 'chronicle', salience: 0.9,
      localizationKey: 'siege.structure.destroyed', params: { faction: match[1], structure: match[2], room: match[3] },
      dedupeKey: `structure-destroyed:${match[2]}:${match[3]}`
    });

    if ((match = text.match(/^(.+) abandoned a safer plan to reach (.+)\.$/))) return descriptor(common, {
      type: 'personality.rescue', severity: 'minor', channel: 'chronicle', salience: 0.55,
      localizationKey: 'personality.rescue', params: { actor: match[1], target: match[2] }, dedupeKey: `rescue:${match[1]}:${match[2]}`, dedupeWindow: 10
    });
    if ((match = text.match(/^(.+) turned toward home after remembering its damaged walls\.$/))) return descriptor(common, {
      type: 'personality.home.defense', severity: 'minor', channel: 'chronicle', salience: 0.52,
      localizationKey: 'personality.home.defense', params: { actor: match[1], site: 'home' }, dedupeKey: `home-defense:${match[1]}`, dedupeWindow: 12
    });
    if ((match = text.match(/^(.+) pressed toward (.+) instead of wandering\.$/))) return descriptor(common, {
      type: 'personality.aggression', severity: 'ambient', channel: 'detail', salience: 0.24,
      localizationKey: 'personality.aggression', detailKey: 'personality.aggression', params: { actor: match[1], target: match[2] }, dedupeKey: `aggression:${match[1]}:${match[2]}`, dedupeWindow: 10
    });
    if ((match = text.match(/^(.+) remembered who hurt them and chose a deliberate route\.$/))) return descriptor(common, {
      type: 'personality.revenge', severity: 'minor', channel: 'chronicle', salience: 0.58,
      localizationKey: 'personality.revenge', params: { actor: match[1] }, dedupeKey: `revenge:${match[1]}`, dedupeWindow: 15
    });
    if ((match = text.match(/^(.+) chose survival over another empty circuit of the dungeon\.$/))) return descriptor(common, {
      type: 'personality.retreat', severity: 'minor', channel: 'chronicle', salience: 0.48,
      localizationKey: 'personality.retreat', params: { actor: match[1] }, dedupeKey: `retreat:${match[1]}`, dedupeWindow: 12
    });
    if ((match = text.match(/^(.+) selected an unseen room rather than pacing between familiar doors\.$/))) return descriptor(common, {
      type: 'personality.explore', severity: 'ambient', channel: 'detail', salience: 0.2,
      localizationKey: 'personality.explore', detailKey: 'personality.explore', params: { actor: match[1] }, dedupeKey: `explore:${match[1]}`, dedupeWindow: 12
    });

    return null;
  }

  fromUnknown(meta, context) {
    const text = String(meta.text ?? '').trim();
    if (!text) return null;
    const noisy = NOISE_PATTERNS.some(pattern => pattern.test(text));
    const detailed = DETAIL_PATTERNS.some(pattern => pattern.test(text));
    const heroLike = /^hero-|\bhero\b/i.test(String(meta.type ?? ''));
    const channel = noisy ? 'debug' : detailed ? 'detail' : heroLike ? 'chronicle' : 'detail';
    const salience = channel === 'chronicle' ? 0.45 : channel === 'detail' ? 0.12 : 0;
    return createChronicleDescriptor({
      type: noisy ? 'system.legacy-diagnostic' : heroLike ? 'hero.legacy-event' : 'legacy.log',
      severity: heroLike ? 'minor' : 'ambient',
      channel,
      salience,
      localizationKey: 'legacy.unknown',
      detailKey: 'legacy.unknown',
      fallbackText: text,
      actorIds: ids(meta.sourceId, meta.agentId, meta.heroId),
      targetIds: ids(meta.targetId, meta.subjectId),
      roomId: meta.roomId ?? null,
      factionIds: ids(meta.factionId),
      tags: ['legacy', channel],
      params: enrichParams({ text }, meta, context),
      dedupeKey: `${channel}:legacy:${normalizeForKey(text)}`,
      debug: channel === 'debug' ? { legacyType: meta.type ?? null, rawText: text } : null
    });
  }
}

function descriptor(common, overrides) {
  const dedupeWindow = overrides.dedupeWindow ?? 0;
  return createChronicleDescriptor({
    ...common,
    ...overrides,
    params: { ...(common.params ?? {}), ...(overrides.params ?? {}) },
    debug: overrides.debug ? { ...overrides.debug, dedupeWindow } : dedupeWindow ? { dedupeWindow } : common.debug
  });
}

function textCommon(meta, context) {
  return {
    fallbackText: meta.text ?? '',
    actorIds: ids(meta.sourceId, meta.agentId, meta.heroId),
    targetIds: ids(meta.targetId, meta.subjectId),
    roomId: meta.roomId ?? null,
    factionIds: ids(meta.factionId),
    params: enrichParams({}, meta, context),
    variantSeed: `${meta.type ?? 'legacy'}:${meta.sourceId ?? ''}:${meta.targetId ?? ''}:${meta.roomId ?? ''}:${meta.turn ?? ''}`
  };
}

function normalizePayload(payload) {
  if (payload && typeof payload === 'object') return { ...payload };
  return { text: String(payload ?? '') };
}

function normalizeEventType(type, namespace) {
  const value = String(type ?? 'legacy.log');
  if (value.includes('.')) return value;
  const prefix = namespace && /^[a-z-]+$/i.test(namespace) ? namespace : 'legacy';
  return `${prefix}.${value || 'log'}`;
}

function enrichParams(input, meta, context) {
  const params = { ...(input && typeof input === 'object' ? input : {}) };
  const sim = context.sim;
  const actorId = meta.sourceId ?? meta.agentId ?? meta.ownerAgentId ?? null;
  const targetId = meta.targetId ?? meta.subjectId ?? null;
  if (!params.actor && actorId) params.actor = findAgentName(sim, actorId) ?? actorId;
  if (!params.target && targetId) params.target = findAgentName(sim, targetId) ?? targetId;
  if (!params.room && meta.roomId) params.room = findRoomName(sim, meta.roomId) ?? meta.roomId;
  if (!params.skill && (meta.skillName ?? meta.skillId)) params.skill = meta.skillName ?? humanize(meta.skillId);
  if (!params.object && (meta.kind ?? meta.deployableKind)) params.object = humanize(meta.kind ?? meta.deployableKind);
  if (!params.objectId && meta.deployableId) params.objectId = meta.deployableId;
  if (!params.field && meta.kind) params.field = humanize(meta.kind);
  if (!params.adaptation && meta.adaptation) params.adaptation = humanize(meta.adaptation);
  if (!params.count && Array.isArray(meta.summonIds)) params.count = meta.summonIds.length;
  if (!params.summon && meta.summonType) params.summon = humanize(meta.summonType);
  return params;
}

function findAgentName(sim, id) {
  return sim?.agents?.find?.(agent => agent.id === id)?.name ?? sim?.agents?.find?.(agent => agent.heroId === id)?.name ?? null;
}

function findRoomName(sim, id) {
  return sim?.rooms?.find?.(room => room.id === id)?.name ?? null;
}

function ids(...values) {
  return [...new Set(values.flat().filter(value => typeof value === 'string' && value.length > 0))];
}

function speciesFromName(name) {
  return String(name ?? 'creature').trim().split(/\s+/)[0].toLowerCase();
}

function normalizeForKey(text) {
  return String(text).toLowerCase().replace(/\d+/g, '#').replace(/[^a-z#]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
}

function humanize(value) {
  return String(value ?? '').replace(/[._-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}
