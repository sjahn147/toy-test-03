export class HeroEnvironmentSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.fields = new Map();
    this.sequence = 0;
    this.clock = 0;
    this.clearedFields = 0;
    this.appliedRoomIds = new Set();
  }

  update(dt, sim) {
    let remaining = Math.max(0, Math.min(0.5, dt));
    if (remaining <= 0.000001) {
      this.stepFields(0, sim);
      return;
    }
    while (remaining > 0.000001) {
      const step = Math.min(0.05, remaining);
      this.clock += step;
      this.stepFields(step, sim);
      remaining -= step;
    }
  }

  stepFields(step, sim) {
    this.restoreAgentModifiers(sim);
    this.restoreRoomState(sim);
    for (const field of this.fields.values()) {
      field.remaining -= step;
      if (field.linkedDeployableId && !sim?.heroDeployableSystem?.deployables?.has(field.linkedDeployableId)) field.remaining = 0;
      if (field.remaining <= 0) continue;
      this.applyField(field, step, sim);
    }
    for (const [id, field] of this.fields) {
      if (field.remaining > 0) continue;
      this.clearRouteSeal(field, sim);
      this.fields.delete(id);
    }
  }

  createField(options = {}, sim = null) {
    const field = {
      id: options.id ?? `hero-field-${this.sequence++}`,
      kind: options.kind ?? 'generic',
      ownerHeroId: options.ownerHeroId ?? null,
      ownerAgentId: options.ownerAgentId ?? null,
      factionId: options.factionId ?? null,
      roomId: options.roomId,
      routeId: options.routeId ?? null,
      linkedDeployableId: options.linkedDeployableId ?? null,
      remaining: options.duration ?? 8,
      radius: options.radius ?? 4,
      payload: { ...(options.payload ?? {}) },
      createdAt: this.clock
    };
    this.fields.set(field.id, field);
    this.onEvent(`${field.kind} field formed in ${field.roomId}.`, { type: 'hero-field-created', fieldId: field.id, kind: field.kind, heroId: field.ownerHeroId, roomId: field.roomId, routeId: field.routeId });
    sim?.emitEffect?.('hero-field-spawn', { roomId: field.roomId, duration: 0.8, heroId: field.ownerHeroId, fieldId: field.id, kind: field.kind, radius: field.radius, colorRole: colorForKind(field.kind) });
    return field;
  }

  createPressureSeal(agent, deployable, options = {}, sim) {
    const field = this.createField({
      kind: 'pressure-seal',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      routeId: deployable?.routeId ?? options.routeId ?? null,
      linkedDeployableId: deployable?.id ?? null,
      duration: options.duration ?? deployable?.remaining ?? 12,
      radius: 2.4,
      payload: { suppressWater: options.suppressWater !== false, suppressAquaticSpawns: options.suppressAquaticSpawns !== false }
    }, sim);
    this.markRouteSeal(field, sim);
    return field;
  }

  createEmergencyDrain(agent, options = {}, sim) {
    return this.createField({
      kind: 'emergency-drain',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      duration: options.duration ?? 16,
      radius: options.radius ?? 6,
      payload: {
        waterLevelDelta: options.waterLevelDelta ?? -1,
        alliedSpeedMultiplier: options.alliedSpeedMultiplier ?? 1.12,
        aquaticEnemyMultiplier: options.aquaticEnemyMultiplier ?? 0.72,
        revealSubmergedSockets: true
      }
    }, sim);
  }

  createHealingCauldron(agent, deployable, options = {}, sim) {
    return this.createField({
      kind: 'healing-cauldron',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      linkedDeployableId: deployable?.id ?? null,
      duration: options.duration ?? deployable?.remaining ?? 9,
      radius: options.radius ?? 4.2,
      payload: {
        healPerSecond: options.healPerSecond ?? 2.1,
        fearRecoveryPerSecond: options.fearRecoveryPerSecond ?? 0.8
      }
    }, sim);
  }

  createWarFeast(agent, options = {}, sim) {
    return this.createField({
      kind: 'war-feast',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      duration: options.duration ?? 12,
      radius: options.radius ?? 6,
      payload: {
        attackMultiplier: options.attackMultiplier ?? 1.24,
        lifesteal: options.lifesteal ?? 0.12,
        noRetreat: options.noRetreat !== false
      }
    }, sim);
  }

  clearKinds(roomId, kinds = [], sourceHeroId = null, sim = null) {
    const set = new Set(kinds);
    let removed = 0;
    for (const field of this.fields.values()) {
      if (field.roomId !== roomId || !set.has(field.kind)) continue;
      field.remaining = 0;
      removed += 1;
    }
    const room = (sim?.rooms ?? []).find(candidate => candidate.id === roomId);
    if (room) {
      room.heroClearedHazards ??= {};
      for (const kind of set) room.heroClearedHazards[kind] = Math.max(room.heroClearedHazards[kind] ?? 0, this.clock + 5);
    }
    this.clearedFields += removed;
    if (removed) this.onEvent(`Hero pressure cleared ${removed} environmental fields in ${roomId}.`, { type: 'hero-fields-cleared', roomId, heroId: sourceHeroId, kinds: [...set], count: removed });
    return removed;
  }

  removeLinkedDeployable(deployableId, sim = null) {
    for (const field of this.fields.values()) if (field.linkedDeployableId === deployableId) field.remaining = 0;
    for (const field of this.fields.values()) if (field.remaining <= 0) this.clearRouteSeal(field, sim);
  }

  clearOwner(agentId, sim = null) {
    if (!agentId) return 0;
    let cleared = 0;
    for (const field of this.fields.values()) {
      if (field.ownerAgentId !== agentId) continue;
      field.remaining = 0;
      this.clearRouteSeal(field, sim);
      cleared += 1;
    }
    return cleared;
  }

  isWaterRouteSuppressed(routeId) {
    return [...this.fields.values()].some(field => field.kind === 'pressure-seal' && field.routeId === routeId && field.remaining > 0 && field.payload.suppressWater);
  }

  isSpawnSuppressed(roomId, family) {
    if (!['aquatic', 'slime', 'water'].includes(family)) return false;
    return [...this.fields.values()].some(field => field.roomId === roomId && field.remaining > 0 && ((field.kind === 'pressure-seal' && field.payload.suppressAquaticSpawns) || field.kind === 'emergency-drain'));
  }

  modifyOutgoingDamage(attacker, target, amount) {
    const feast = this.fieldForAgent(attacker, 'war-feast');
    if (!feast) return amount;
    return Math.max(1, Math.round(amount * (feast.payload.attackMultiplier ?? 1)));
  }

  onDamageDealt(attacker, target, amount) {
    if (!attacker?.alive || !target || amount <= 0) return 0;
    const feast = this.fieldForAgent(attacker, 'war-feast');
    if (!feast) return 0;
    const healing = Math.max(0, amount * (feast.payload.lifesteal ?? 0));
    attacker.hp = Math.min(attacker.maxHp ?? attacker.hp, attacker.hp + healing);
    return healing;
  }

  fieldForAgent(agent, kind) {
    return [...this.fields.values()].find(field => field.kind === kind && field.remaining > 0 && field.roomId === agent?.roomId && field.factionId === factionOf(agent)) ?? null;
  }

  applyField(field, dt, sim) {
    if (field.kind === 'healing-cauldron') return this.applyHealingCauldron(field, dt, sim);
    if (field.kind === 'war-feast') return this.applyWarFeast(field, dt, sim);
    if (field.kind === 'emergency-drain') return this.applyEmergencyDrain(field, dt, sim);
    if (field.kind === 'pressure-seal') return this.applyPressureSeal(field, sim);
  }

  applyHealingCauldron(field, dt, sim) {
    const allies = agentsInRoom(sim, field.roomId).filter(agent => factionOf(agent) === field.factionId);
    for (const ally of allies) {
      if (ally.hp < (ally.maxHp ?? ally.hp)) ally.hp = Math.min(ally.maxHp, ally.hp + (field.payload.healPerSecond ?? 2) * dt);
      ally.fear = Math.max(0, (ally.fear ?? 0) - (field.payload.fearRecoveryPerSecond ?? 0.8) * dt);
      ally.heroStatuses ??= {};
      ally.heroStatuses.brothWarmth = { remaining: 0.3, sourceFieldId: field.id };
    }
  }

  applyWarFeast(field, dt, sim) {
    for (const ally of agentsInRoom(sim, field.roomId).filter(agent => factionOf(agent) === field.factionId)) {
      const baseline = ally.heroEnvironmentApplied ?? captureAgent(ally);
      ally.heroEnvironmentApplied ??= baseline;
      ally.courage = baseline.courage + 3;
      ally.heroStatuses ??= {};
      ally.heroStatuses.warFeast = { remaining: 0.3, sourceFieldId: field.id, noRetreat: field.payload.noRetreat !== false, damageMultiplier: field.payload.attackMultiplier ?? 1.24, lifesteal: field.payload.lifesteal ?? 0.12 };
      if (ally.combat) ally.hp = Math.min(ally.maxHp ?? ally.hp, ally.hp + 0.25 * dt);
    }
  }

  applyEmergencyDrain(field, dt, sim) {
    const room = (sim?.rooms ?? []).find(candidate => candidate.id === field.roomId);
    if (room) {
      room.heroWaterLevelDelta = Math.min(room.heroWaterLevelDelta ?? 0, field.payload.waterLevelDelta ?? -1);
      room.heroSubmergedSocketsRevealed = field.payload.revealSubmergedSockets === true;
      room.heroEnvironmentState = 'temporarily-drained';
      this.appliedRoomIds.add(room.id);
    }
    for (const agent of agentsInRoom(sim, field.roomId)) {
      const baseline = agent.heroEnvironmentApplied ?? captureAgent(agent);
      agent.heroEnvironmentApplied ??= baseline;
      const ally = factionOf(agent) === field.factionId;
      const aquatic = isAquatic(agent);
      if (ally && !aquatic) agent.speedMultiplier = baseline.speedMultiplier * (field.payload.alliedSpeedMultiplier ?? 1.1);
      if (!ally && aquatic) agent.speedMultiplier = baseline.speedMultiplier * (field.payload.aquaticEnemyMultiplier ?? 0.72);
    }
  }

  applyPressureSeal(field, sim) {
    this.markRouteSeal(field, sim);
    const room = (sim?.rooms ?? []).find(candidate => candidate.id === field.roomId);
    if (room) {
      room.heroWaterFlowSuppressed = true;
      room.heroSubmergedSocketsRevealed = true;
      this.appliedRoomIds.add(room.id);
    }
  }

  markRouteSeal(field, sim) {
    if (!field.routeId) return;
    const route = sim?.routeGraph?.getRoute?.(field.routeId) ?? null;
    if (!route) return;
    route.heroPressureSealId = field.id;
    route.waterSuppressed = field.payload.suppressWater !== false;
    route.aquaticSpawnsSuppressed = field.payload.suppressAquaticSpawns !== false;
  }

  clearRouteSeal(field, sim) {
    if (!field?.routeId) return;
    const route = sim?.routeGraph?.getRoute?.(field.routeId) ?? null;
    if (!route || route.heroPressureSealId !== field.id) return;
    delete route.heroPressureSealId;
    delete route.waterSuppressed;
    delete route.aquaticSpawnsSuppressed;
  }

  restoreAgentModifiers(sim) {
    for (const agent of sim?.agents ?? []) {
      const baseline = agent.heroEnvironmentApplied;
      if (!baseline) continue;
      if (Number.isFinite(baseline.attack)) agent.attack = baseline.attack;
      if (Number.isFinite(baseline.courage)) agent.courage = baseline.courage;
      if (Number.isFinite(baseline.armor)) agent.armor = baseline.armor;
      if (Number.isFinite(baseline.speedMultiplier)) agent.speedMultiplier = baseline.speedMultiplier;
      delete agent.heroEnvironmentApplied;
    }
  }

  restoreRoomState(sim) {
    for (const roomId of this.appliedRoomIds) {
      const room = (sim?.rooms ?? []).find(candidate => candidate.id === roomId);
      if (!room) continue;
      delete room.heroWaterLevelDelta;
      delete room.heroSubmergedSocketsRevealed;
      delete room.heroEnvironmentState;
      delete room.heroWaterFlowSuppressed;
    }
    this.appliedRoomIds.clear();
  }

  snapshot() {
    return { fields: [...this.fields.values()].map(field => ({ ...field, payload: { ...(field.payload ?? {}) } })) };
  }

  metrics() {
    return { heroFieldsActive: this.fields.size, heroFieldsCleared: this.clearedFields };
  }
}

function agentsInRoom(sim, roomId) {
  return (sim?.agents ?? []).filter(agent => agent.alive !== false && !agent.departed && !agent.hidden && agent.roomId === roomId);
}

function captureAgent(agent) {
  return {
    attack: Number.isFinite(agent.attack) ? agent.attack : 0,
    courage: Number.isFinite(agent.courage) ? agent.courage : 0,
    armor: Number.isFinite(agent.armor) ? agent.armor : 0,
    speedMultiplier: Number.isFinite(agent.speedMultiplier) ? agent.speedMultiplier : 1
  };
}

function factionOf(agent) {
  return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null;
}

function isAquatic(agent) {
  const role = String(agent?.role ?? '');
  return role.includes('tissa') || role.includes('slime') || role.includes('aquatic') || role.includes('diver') || agent?.tags?.includes?.('aquatic');
}

function colorForKind(kind) {
  if (kind === 'pressure-seal' || kind === 'emergency-drain') return 'kobold-water';
  if (kind === 'healing-cauldron' || kind === 'war-feast') return 'orc-ember';
  return 'hero';
}
