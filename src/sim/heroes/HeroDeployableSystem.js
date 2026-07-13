export class HeroDeployableSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.deployables = new Map();
    this.projectiles = new Map();
    this.sequence = 0;
    this.clock = 0;
    this.detonations = 0;
  }

  update(dt, sim) {
    let remaining = Math.max(0, Math.min(0.5, dt));
    while (remaining > 0.000001) {
      const step = Math.min(0.05, remaining);
      this.clock += step;
      this.updateProjectiles(step, sim);
      this.updateDeployables(step, sim);
      remaining -= step;
    }
  }

  createDeployable(options = {}, sim = null) {
    const id = options.id ?? `hero-deployable-${this.sequence++}`;
    const deployable = {
      id,
      kind: options.kind ?? 'generic',
      ownerHeroId: options.ownerHeroId ?? null,
      ownerAgentId: options.ownerAgentId ?? null,
      factionId: options.factionId ?? null,
      roomId: options.roomId,
      routeId: options.routeId ?? null,
      targetStructureId: options.targetStructureId ?? null,
      ox: options.ox ?? 0,
      oz: options.oz ?? 0,
      y: options.y ?? 0,
      state: options.arming > 0 ? 'arming' : 'active',
      armingRemaining: options.arming ?? 0,
      fuseRemaining: options.fuse ?? null,
      remaining: options.duration ?? null,
      hp: options.hp ?? 1,
      maxHp: options.hp ?? 1,
      payload: { ...(options.payload ?? {}) },
      visual: { ...(options.visual ?? {}) },
      createdAt: this.clock
    };
    this.deployables.set(id, deployable);
    this.onEvent(`${deployable.kind} deployed in ${deployable.roomId}.`, { type: 'hero-deployable-created', deployableId: id, kind: deployable.kind, roomId: deployable.roomId, heroId: deployable.ownerHeroId });
    sim?.emitEffect?.('hero-deployable-spawn', { roomId: deployable.roomId, duration: 0.8, heroId: deployable.ownerHeroId, deployableId: id, kind: deployable.kind, ox: deployable.ox, oz: deployable.oz });
    return deployable;
  }

  createBreachCharge(agent, options = {}, sim) {
    return this.createDeployable({
      kind: 'breach-charge',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      targetStructureId: options.targetStructureId ?? null,
      ox: options.ox ?? 0.8,
      oz: options.oz ?? 0.2,
      arming: options.arming ?? 1.2,
      fuse: options.fuse ?? 2.2,
      hp: 8,
      payload: {
        damage: options.damage ?? 9,
        structureDamage: options.structureDamage ?? 36,
        radius: options.radius ?? 3.4,
        impulse: options.impulse ?? 4.8,
        friendlyDamage: options.friendlyDamage === true
      },
      visual: { fuse: true, pressureGauge: true }
    }, sim);
  }

  createPressureSeal(agent, routeId, options = {}, sim) {
    return this.createDeployable({
      kind: 'pressure-seal',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      routeId,
      duration: options.duration ?? 12,
      hp: options.hp ?? 24,
      payload: { suppressWater: options.suppressWater !== false, suppressAquaticSpawns: options.suppressAquaticSpawns !== false },
      visual: { valve: true, routeMounted: true }
    }, sim);
  }

  createCauldron(agent, options = {}, sim) {
    return this.createDeployable({
      kind: options.kind ?? 'healing-cauldron',
      ownerHeroId: agent.heroId,
      ownerAgentId: agent.id,
      factionId: factionOf(agent),
      roomId: agent.roomId,
      duration: options.duration ?? 9,
      hp: options.hp ?? 36,
      ox: options.ox ?? -0.7,
      oz: options.oz ?? 0.6,
      payload: { radius: options.radius ?? 4.2, healPerSecond: options.healPerSecond ?? 2.1, fearRecoveryPerSecond: options.fearRecoveryPerSecond ?? 0.8 },
      visual: { steam: true, ember: true, lid: true }
    }, sim);
  }

  launchProjectile(options = {}, sim = null) {
    const id = options.id ?? `hero-projectile-${this.sequence++}`;
    const projectile = {
      id,
      kind: options.kind ?? 'mortar-shell',
      ownerHeroId: options.ownerHeroId ?? null,
      ownerAgentId: options.ownerAgentId ?? null,
      factionId: options.factionId ?? null,
      roomId: options.roomId,
      launchDelay: options.launchDelay ?? 0,
      elapsed: 0,
      duration: options.flightDuration ?? 1,
      progress: 0,
      from: { x: options.from?.x ?? 0, y: options.from?.y ?? 1.2, z: options.from?.z ?? 0 },
      to: { x: options.to?.x ?? 0, y: options.to?.y ?? 0, z: options.to?.z ?? 0 },
      arcHeight: options.arcHeight ?? 3,
      payload: { ...(options.payload ?? {}) },
      state: options.launchDelay > 0 ? 'queued' : 'flying',
      createdAt: this.clock
    };
    this.projectiles.set(id, projectile);
    return projectile;
  }

  launchBarrage(agent, effect, sim) {
    const count = effect.count ?? 3;
    const offsets = [[-2.1, -0.8], [1.8, 1.15], [0.25, -2.2], [2.4, -1.7]];
    const damage = toArray(effect.damage, count, 10);
    const structureDamage = toArray(effect.structureDamage, count, 12);
    const impulse = toArray(effect.impulse, count, 4);
    const radius = toArray(effect.radius, count, 2.4);
    const projectiles = [];
    for (let index = 0; index < count; index += 1) {
      const offset = offsets[index % offsets.length];
      projectiles.push(this.launchProjectile({
        kind: 'three-point-shell',
        ownerHeroId: agent.heroId,
        ownerAgentId: agent.id,
        factionId: factionOf(agent),
        roomId: agent.roomId,
        launchDelay: index * (effect.interval ?? 0.55),
        flightDuration: effect.flightDuration ?? 1.15,
        from: { x: 0.45, y: 1.65, z: -0.1 },
        to: { x: offset[0], y: 0, z: offset[1] },
        arcHeight: effect.arcHeight ?? 3.6,
        payload: { damage: damage[index], structureDamage: structureDamage[index], impulse: impulse[index], radius: radius[index], friendlyDamage: false, strikeIndex: index }
      }, sim));
    }
    this.onEvent(`${agent.name ?? agent.id} launched a three-point barrage.`, { type: 'hero-barrage-launched', heroId: agent.heroId, agentId: agent.id, roomId: agent.roomId, projectileIds: projectiles.map(item => item.id) });
    return projectiles;
  }

  damageDeployable(id, amount, source = null, sim = null) {
    const deployable = this.deployables.get(id);
    if (!deployable || deployable.state === 'destroyed') return false;
    deployable.hp = Math.max(0, deployable.hp - Math.max(0, amount));
    if (deployable.hp > 0) return true;
    deployable.state = 'destroyed';
    deployable.remaining = 0;
    sim?.heroEnvironmentSystem?.removeLinkedDeployable?.(deployable.id, sim);
    sim?.emitEffect?.('hero-deployable-destroyed', { roomId: deployable.roomId, duration: 0.8, deployableId: deployable.id, heroId: deployable.ownerHeroId, kind: deployable.kind });
    this.onEvent(`${deployable.kind} was destroyed.`, { type: 'hero-deployable-destroyed', deployableId: id, roomId: deployable.roomId, sourceId: source?.id ?? null });
    return true;
  }

  deployablesInRoom(roomId, kind = null) {
    return [...this.deployables.values()].filter(item => item.roomId === roomId && item.state !== 'destroyed' && (!kind || item.kind === kind));
  }

  clearOwner(agentId, sim = null) {
    for (const deployable of this.deployables.values()) {
      if (deployable.ownerAgentId !== agentId) continue;
      if (deployable.kind === 'breach-charge' && deployable.state !== 'destroyed') this.detonate(deployable, sim);
      else deployable.remaining = 0;
    }
    for (const projectile of this.projectiles.values()) if (projectile.ownerAgentId === agentId && projectile.state === 'queued') projectile.state = 'cancelled';
  }

  updateProjectiles(dt, sim) {
    for (const projectile of this.projectiles.values()) {
      if (projectile.state === 'cancelled' || projectile.state === 'impacted') continue;
      if (projectile.launchDelay > 0) {
        projectile.launchDelay -= dt;
        if (projectile.launchDelay > 0) continue;
        projectile.state = 'flying';
        sim?.emitEffect?.('hero-projectile-launch', { roomId: projectile.roomId, duration: 0.45, heroId: projectile.ownerHeroId, projectileId: projectile.id, kind: projectile.kind });
      }
      projectile.elapsed += dt;
      projectile.progress = Math.min(1, projectile.elapsed / Math.max(0.01, projectile.duration));
      if (projectile.progress < 1) continue;
      projectile.state = 'impacted';
      this.resolveExplosion(projectile, sim);
    }
    for (const [id, projectile] of this.projectiles) if (['impacted', 'cancelled'].includes(projectile.state)) this.projectiles.delete(id);
  }

  updateDeployables(dt, sim) {
    for (const deployable of this.deployables.values()) {
      if (deployable.state === 'destroyed' || deployable.state === 'expired') continue;
      if (deployable.state === 'arming') {
        deployable.armingRemaining -= dt;
        if (deployable.armingRemaining <= 0) {
          deployable.state = 'active';
          sim?.emitEffect?.('hero-deployable-armed', { roomId: deployable.roomId, duration: 0.55, deployableId: deployable.id, heroId: deployable.ownerHeroId, kind: deployable.kind });
        }
        continue;
      }
      if (Number.isFinite(deployable.fuseRemaining)) {
        deployable.fuseRemaining -= dt;
        if (deployable.fuseRemaining <= 0) {
          this.detonate(deployable, sim);
          continue;
        }
      }
      if (Number.isFinite(deployable.remaining)) {
        deployable.remaining -= dt;
        if (deployable.remaining <= 0) {
          deployable.state = 'expired';
          sim?.heroEnvironmentSystem?.removeLinkedDeployable?.(deployable.id, sim);
        }
      }
    }
    for (const [id, deployable] of this.deployables) if (['destroyed', 'expired', 'detonated'].includes(deployable.state)) this.deployables.delete(id);
  }

  detonate(deployable, sim) {
    if (!deployable || ['destroyed', 'detonated'].includes(deployable.state)) return false;
    deployable.state = 'detonated';
    this.resolveExplosion({
      id: deployable.id,
      ownerHeroId: deployable.ownerHeroId,
      ownerAgentId: deployable.ownerAgentId,
      factionId: deployable.factionId,
      roomId: deployable.roomId,
      to: { x: deployable.ox, y: deployable.y, z: deployable.oz },
      payload: deployable.payload
    }, sim);
    return true;
  }

  resolveExplosion(source, sim) {
    const owner = (sim?.agents ?? []).find(agent => agent.id === source.ownerAgentId) ?? null;
    const payload = source.payload ?? {};
    const roomId = source.roomId;
    const targets = (sim?.agents ?? []).filter(agent => agent.alive !== false && !agent.departed && !agent.hidden && agent.roomId === roomId && agent.id !== owner?.id);
    const hostile = target => factionOf(target) !== (source.factionId ?? factionOf(owner));
    const origin = { id: source.id, roomId, x: source.to?.x ?? 0, z: source.to?.z ?? 0 };
    const originPosition = sim?.heroPhysicsSystem?.localPosition?.(origin, sim) ?? { x: origin.x, z: origin.z };
    for (const target of targets) {
      const targetPosition = sim?.heroPhysicsSystem?.localPosition?.(target, sim) ?? { x: 0, z: 0 };
      const distance = Math.hypot(targetPosition.x - originPosition.x, targetPosition.z - originPosition.z);
      const radius = payload.radius ?? 3;
      if (distance > radius) continue;
      const isHostile = hostile(target);
      const multiplier = isHostile ? 1 : Number.isFinite(target.heroBlastDamageMultiplier) ? target.heroBlastDamageMultiplier : (payload.friendlyDamage ? 1 : 0);
      const falloff = Math.max(0.45, 1 - distance / Math.max(0.1, radius) * 0.45);
      const damage = Math.max(0, (payload.damage ?? 8) * multiplier * falloff);
      if (damage > 0) sim?.applyCombatDamage?.(owner, target, damage, { heroSkill: true, explosive: true, projectileId: source.id });
    }
    const structures = structuresInRoom(sim, roomId);
    for (const structure of structures) {
      if (source.targetStructureId && structure.id !== source.targetStructureId) continue;
      const amount = payload.structureDamage ?? 0;
      if (!amount) continue;
      if (Number.isFinite(structure.hp)) structure.hp = Math.max(0, structure.hp - amount);
      else structure.integrity = Math.max(0, (structure.integrity ?? structure.maxIntegrity ?? 100) - amount);
      structure.lastDamagedByHeroId = source.ownerHeroId;
    }
    if (sim?.heroPhysicsSystem) {
      for (const target of targets) {
        const isHostile = hostile(target);
        const impulseMultiplier = isHostile ? 1 : Number.isFinite(target.heroBlastImpulseMultiplier) ? target.heroBlastImpulseMultiplier : 1;
        const targetPosition = sim.heroPhysicsSystem.localPosition(target, sim);
        const dx = targetPosition.x - originPosition.x;
        const dz = targetPosition.z - originPosition.z;
        const distance = Math.hypot(dx, dz);
        if (distance > (payload.radius ?? 3)) continue;
        const falloff = Math.max(0.2, 1 - distance / Math.max(0.1, payload.radius ?? 3));
        sim.heroPhysicsSystem.applyImpulse(target, { x: dx, z: dz }, (payload.impulse ?? 4) * impulseMultiplier * falloff, {
          radius: payload.radius ?? 3,
          kind: 'explosion',
          sourceId: source.ownerAgentId,
          collisionStagger: 0.8
        });
      }
    }
    sim?.emitEffect?.('hero-explosion', { roomId, duration: 1.1, heroId: source.ownerHeroId, projectileId: source.id, ox: source.to?.x ?? 0, oz: source.to?.z ?? 0, radius: payload.radius ?? 3, colorRole: 'goblin-orange', strikeIndex: payload.strikeIndex ?? 0 });
    this.detonations += 1;
    this.onEvent(`Hero explosive impacted ${roomId}.`, { type: 'hero-explosion', heroId: source.ownerHeroId, ownerAgentId: source.ownerAgentId, roomId, projectileId: source.id });
  }

  snapshot() {
    return {
      deployables: [...this.deployables.values()].map(item => ({ ...item, payload: { ...(item.payload ?? {}) }, visual: { ...(item.visual ?? {}) } })),
      projectiles: [...this.projectiles.values()].map(item => ({ ...item, from: { ...item.from }, to: { ...item.to }, payload: { ...(item.payload ?? {}) } }))
    };
  }

  metrics() {
    return { heroDeployablesActive: this.deployables.size, heroProjectilesActive: this.projectiles.size, heroDetonations: this.detonations };
  }
}

function structuresInRoom(sim, roomId) {
  const source = sim?.constructionSystem?.structures ?? sim?.construction?.structures ?? [];
  const values = source instanceof Map ? [...source.values()] : Array.isArray(source) ? source : Object.values(source ?? {});
  return values.filter(item => item.roomId === roomId);
}

function factionOf(agent) {
  return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null;
}

function toArray(value, count, fallback) {
  if (Array.isArray(value)) return Array.from({ length: count }, (_, index) => Number(value[index] ?? value.at(-1) ?? fallback));
  return Array.from({ length: count }, () => Number(value ?? fallback));
}
