export class HeroBarrierSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.barriers = [];
    this.sequence = 0;
    this.destroyedCount = 0;
    this.events = [];
  }

  update(dt, sim) {
    const survivors = [];
    for (const barrier of this.barriers) {
      barrier.remaining -= dt;
      const owner = findAgent(sim, barrier.ownerId);
      if (barrier.remaining <= 0 || barrier.hp <= 0 || !owner || owner.alive === false || owner.departed) {
        this.endBarrier(barrier, sim, barrier.hp <= 0 ? 'destroyed' : 'expired');
        continue;
      }
      survivors.push(barrier);
    }
    this.barriers = survivors;
    this.updateGatekeeperBonuses(sim);
    this.updateRootedHeroes(dt, sim);
  }

  createSpectralGate(owner, route, options = {}, sim) {
    if (!owner || !route) return null;
    const existing = this.barriers.find(barrier => barrier.routeId === route.id && barrier.hp > 0);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, options.duration ?? 12);
      existing.hp = Math.min(existing.maxHp, existing.hp + Math.round(existing.maxHp * 0.35));
      return existing;
    }
    const barrier = {
      id: `hero-barrier-${this.sequence++}`,
      kind: 'spectral-gate',
      ownerId: owner.id,
      heroId: owner.heroId,
      factionId: factionOf(owner),
      roomId: owner.roomId,
      routeId: route.id,
      fromRoomId: route.from ?? owner.roomId,
      toRoomId: route.to ?? otherRoom(route, owner.roomId),
      hp: options.hp ?? 48,
      maxHp: options.hp ?? 48,
      remaining: options.duration ?? 12,
      duration: options.duration ?? 12,
      allowFaction: options.allowFaction ?? factionOf(owner),
      width: route.width ?? 2.2,
      state: 'active'
    };
    this.barriers.push(barrier);
    this.emit(`${owner.name} raised a spectral gate.`, { type: 'hero-barrier-created', barrierId: barrier.id, heroId: owner.heroId, routeId: route.id, roomId: owner.roomId });
    sim?.emitEffect?.('hero-barrier-rise', { roomId: owner.roomId, duration: 1.1, heroId: owner.heroId, barrierId: barrier.id, routeId: route.id });
    return barrier;
  }

  sealAllRoomRoutes(owner, routes, options = {}, sim) {
    const result = [];
    for (const route of routes) {
      result.push(this.createSpectralGate(owner, route, options, sim));
    }
    return result.filter(Boolean);
  }

  isRouteBlocked(fromRoomId, toRoomId, agent) {
    const barrier = this.barriers.find(item => item.hp > 0 && pairMatches(item, fromRoomId, toRoomId));
    if (!barrier) return false;
    if (agent?.incorporeal && factionOf(agent) === barrier.allowFaction) return false;
    return factionOf(agent) !== barrier.allowFaction;
  }

  barrierForRoute(routeId) { return this.barriers.find(barrier => barrier.routeId === routeId && barrier.hp > 0) ?? null; }

  nearestBarrier(roomId, factionId = null) {
    return this.barriers.find(barrier => barrier.roomId === roomId && barrier.hp > 0 && (!factionId || barrier.factionId === factionId)) ?? null;
  }

  damageBarrier(barrierOrId, amount, source = null, sim = null) {
    const barrier = typeof barrierOrId === 'string' ? this.barriers.find(item => item.id === barrierOrId) : barrierOrId;
    if (!barrier || barrier.hp <= 0 || amount <= 0) return false;
    barrier.hp = Math.max(0, barrier.hp - amount);
    sim?.emitEffect?.('hero-barrier-hit', { roomId: barrier.roomId, duration: 0.55, barrierId: barrier.id, amount, sourceId: source?.id ?? null });
    if (barrier.hp <= 0) {
      this.destroyedCount += 1;
      this.endBarrier(barrier, sim, 'destroyed');
      this.barriers = this.barriers.filter(item => item.id !== barrier.id);
    }
    return true;
  }

  banishmentCharge(owner, target, options = {}, sim) {
    if (!owner || !target) return false;
    sim?.applyCombatDamage?.(owner, target, options.damage ?? 9, { melee: true, heroSkill: true, shield: true });
    target.combat = null;
    target.heroStatuses ??= {};
    target.heroStatuses.stagger = Math.max(target.heroStatuses.stagger ?? 0, options.stagger ?? 1.4);
    const direction = directionTo(owner, target);
    sim?.heroPhysicsSystem?.applyImpulse?.(target, direction, options.impulse ?? 7.2, { sourceId: owner.id, roomId: owner.roomId });
    const barrier = this.nearestBarrier(owner.roomId, factionOf(owner));
    if (barrier) {
      const collision = options.barrierCollisionDamage ?? 12;
      sim?.applyCombatDamage?.(owner, target, collision, { melee: true, heroSkill: true, barrierCollision: true });
      target.heroStatuses.stagger = Math.max(target.heroStatuses.stagger ?? 0, (options.stagger ?? 1.4) + 0.7);
      sim?.emitEffect?.('hero-gate-collision', { roomId: owner.roomId, agentId: target.id, duration: 0.9, barrierId: barrier.id, heroId: owner.heroId });
    }
    return true;
  }

  rootHero(owner, duration) {
    owner.heroStatuses ??= {};
    owner.heroStatuses.gateLockdown = { remaining: duration };
    return true;
  }

  modifyIncomingDamage(source, target, amount) {
    if (target?.heroId !== 'hero.arvek') return amount;
    const barrier = this.nearestBarrier(target.roomId, factionOf(target));
    if (!barrier) return amount;
    return Math.max(1, Math.round(amount * 0.75));
  }

  updateGatekeeperBonuses(sim) {
    const arvek = (sim?.agents ?? []).find(agent => agent.heroId === 'hero.arvek');
    if (!arvek) return;
    arvek.heroStatModifiers ??= {};
    const active = arvek.alive !== false && Boolean(this.nearestBarrier(arvek.roomId, factionOf(arvek)));
    if (active) arvek.heroStatModifiers.gatekeeper = { armor: 2, courage: 3, speedMultiplier: 0.92, interruptResistance: 0.18 };
    else delete arvek.heroStatModifiers.gatekeeper;
  }

  updateRootedHeroes(dt, sim) {
    for (const agent of sim?.agents ?? []) {
      const status = agent.heroStatuses?.gateLockdown;
      if (!status) continue;
      status.remaining -= dt;
      if (status.remaining <= 0) delete agent.heroStatuses.gateLockdown;
    }
  }

  isMovementBlocked(agent) { return Boolean(agent?.heroStatuses?.gateLockdown); }

  onAgentDeath(agent, sim) {
    if (!agent) return;
    if (agent.heroId === 'hero.arvek') {
      for (const barrier of [...this.barriers]) this.endBarrier(barrier, sim, 'owner-dead');
      this.barriers = this.barriers.filter(barrier => barrier.ownerId !== agent.id);
    }
  }

  endBarrier(barrier, sim, reason) {
    barrier.state = reason;
    sim?.emitEffect?.('hero-barrier-fall', { roomId: barrier.roomId, duration: 0.8, barrierId: barrier.id, routeId: barrier.routeId, reason });
    this.emit('A spectral gate collapsed.', { type: 'hero-barrier-ended', barrierId: barrier.id, routeId: barrier.routeId, roomId: barrier.roomId, reason });
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot() {
    return { barriers: this.barriers.map(barrier => ({ ...barrier })), recentEvents: this.events.map(event => ({ ...event })) };
  }

  metrics() { return { heroBarriersActive: this.barriers.length, heroBarriersDestroyed: this.destroyedCount }; }
}

function findAgent(sim, id) { return (sim?.agents ?? []).find(agent => agent.id === id) ?? null; }
function factionOf(agent) { return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null; }
function pairMatches(barrier, a, b) { return (barrier.fromRoomId === a && barrier.toRoomId === b) || (barrier.fromRoomId === b && barrier.toRoomId === a); }
function otherRoom(route, roomId) { return route.from === roomId ? route.to : route.from; }
function point(agent) { return { x: (agent?.roomCell?.x ?? 0) + (agent?.heroPhysicsOffset?.x ?? 0), z: (agent?.roomCell?.z ?? 0) + (agent?.heroPhysicsOffset?.z ?? 0) }; }
function directionTo(a, b) { const pa = point(a); const pb = point(b); const dx = pb.x - pa.x; const dz = pb.z - pa.z; const length = Math.hypot(dx, dz) || 1; return { x: dx / length, z: dz / length }; }
