const MASS_BY_SIZE = Object.freeze({ tiny: 0.45, small: 0.78, medium: 1.12, large: 2.15, huge: 3.8 });
const DEFAULT_MARGIN = Object.freeze({ tiny: 0.28, small: 0.36, medium: 0.48, large: 0.72, huge: 1.0 });
const COLLISION_RADIUS = Object.freeze({ tiny: 0.18, small: 0.28, medium: 0.38, large: 0.58, huge: 0.82 });

export class HeroPhysicsSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.impulses = [];
    this.tethers = [];
    this.completedTethers = [];
    this.sequence = 0;
    this.clock = 0;
    this.collisionCount = 0;
    this.agentCollisionCount = 0;
  }

  update(dt, sim) {
    let remaining = clamp(dt, 0, 0.5);
    while (remaining > 0.000001) {
      const step = Math.min(0.05, remaining);
      this.clock += step;
      this.updateImpulses(step, sim);
      this.updateTethers(step, sim);
      this.relaxOffsets(step, sim);
      this.resolveAgentCollisions(sim);
      remaining -= step;
    }
  }

  applyImpulse(target, direction, magnitude, options = {}) {
    if (!target || target.alive === false || target.departed || target.hidden) return null;
    const normalized = normalize(direction?.x ?? 0, direction?.z ?? 0);
    if (normalized.length <= 0.0001 || magnitude <= 0) return null;
    const mass = this.massOf(target);
    const resistance = clamp(Number(target.heroKnockbackResistance ?? options.resistance ?? 0), 0, 0.85);
    const speed = magnitude * (1 - resistance) / Math.max(0.35, mass);
    const impulse = {
      id: `hero-impulse-${this.sequence++}`,
      targetId: target.id,
      sourceId: options.sourceId ?? null,
      roomId: target.roomId,
      vx: normalized.x * speed,
      vz: normalized.z * speed,
      remaining: options.duration ?? 0.42,
      damping: options.damping ?? 6.5,
      collisionStagger: options.collisionStagger ?? 0.65,
      minimumCollisionSpeed: options.minimumCollisionSpeed ?? 2.4,
      kind: options.kind ?? 'impulse'
    };
    this.impulses.push(impulse);
    target.heroStatuses ??= {};
    target.heroStatuses.displaced = { sourceId: impulse.sourceId, remaining: impulse.remaining, kind: impulse.kind };
    if (speed >= 4.5) target.combat = null;
    return impulse;
  }

  applyRadialImpulse(source, targets, magnitude, sim, options = {}) {
    const origin = this.localPosition(source, sim);
    let applied = 0;
    for (const target of targets ?? []) {
      const position = this.localPosition(target, sim);
      const dx = position.x - origin.x;
      const dz = position.z - origin.z;
      const distance = Math.max(0.25, Math.hypot(dx, dz));
      const radius = options.radius ?? 4;
      if (distance > radius) continue;
      const falloff = options.falloff === false ? 1 : Math.max(0.2, 1 - distance / Math.max(0.1, radius));
      if (this.applyImpulse(target, { x: dx, z: dz }, magnitude * falloff, { ...options, sourceId: source?.id ?? options.sourceId })) applied += 1;
    }
    return applied;
  }

  applyDirectionalImpulse(source, targets, direction, magnitude, sim, options = {}) {
    const origin = this.localPosition(source, sim);
    const forward = normalize(direction?.x ?? 0, direction?.z ?? 1);
    const length = options.length ?? 5;
    const width = options.width ?? 3;
    let applied = 0;
    for (const target of targets ?? []) {
      const position = this.localPosition(target, sim);
      const dx = position.x - origin.x;
      const dz = position.z - origin.z;
      const longitudinal = dx * forward.x + dz * forward.z;
      const lateral = Math.abs(dx * -forward.z + dz * forward.x);
      if (longitudinal < -0.2 || longitudinal > length || lateral > width * 0.5) continue;
      const falloff = Math.max(0.35, 1 - longitudinal / Math.max(length, 0.1) * 0.45);
      if (this.applyImpulse(target, forward, magnitude * falloff, { ...options, sourceId: source?.id ?? options.sourceId })) applied += 1;
    }
    return applied;
  }

  createTether(sourceAgent, target, options = {}) {
    if (!sourceAgent || !target) return null;
    const targetType = options.targetType ?? (target.role ? 'agent' : 'corpse');
    const tether = {
      id: `hero-tether-${this.sequence++}`,
      sourceAgentId: sourceAgent.id,
      targetId: target.id,
      targetType,
      roomId: sourceAgent.roomId,
      remaining: options.duration ?? 2,
      strength: options.strength ?? 5.5,
      completeDistance: options.completeDistance ?? 0.6,
      maximumDistance: options.maximumDistance ?? 6,
      payload: { ...(options.payload ?? {}) },
      completed: false,
      failed: false
    };
    this.tethers.push(tether);
    return tether;
  }

  takeCompletedTethers() {
    const result = this.completedTethers.map(item => ({ ...item, payload: { ...(item.payload ?? {}) } }));
    this.completedTethers = [];
    return result;
  }

  clearAgent(agentId) {
    this.impulses = this.impulses.filter(item => item.targetId !== agentId && item.sourceId !== agentId);
    this.tethers = this.tethers.filter(item => item.sourceAgentId !== agentId && !(item.targetType === 'agent' && item.targetId === agentId));
  }

  massOf(agent) {
    const base = MASS_BY_SIZE[agent?.size] ?? 1;
    const hero = agent?.isHero ? 1.12 : 1;
    const authored = Number.isFinite(agent?.heroMassMultiplier) ? agent.heroMassMultiplier : 1;
    const rooted = agent?.heroStatuses?.bastion?.rooted ? 2.4 : 1;
    return base * hero * authored * rooted;
  }

  localPosition(entity, sim) {
    const base = this.baseLocalPosition(entity, sim);
    const offset = entity?.heroPhysicsOffset ?? { x: 0, z: 0 };
    return { x: base.x + offset.x, z: base.z + offset.z };
  }

  updateImpulses(dt, sim) {
    for (const impulse of this.impulses) {
      const target = (sim?.agents ?? []).find(agent => agent.id === impulse.targetId);
      if (!target?.alive || target.departed || target.roomId !== impulse.roomId) {
        impulse.remaining = 0;
        continue;
      }
      target.heroPhysicsOffset ??= { x: 0, z: 0 };
      const room = (sim.rooms ?? []).find(candidate => candidate.id === target.roomId);
      const margin = DEFAULT_MARGIN[target.size] ?? 0.48;
      const maxX = Math.max(0.2, (room?.w ?? 10) * 0.5 - margin);
      const maxZ = Math.max(0.2, (room?.d ?? 10) * 0.5 - margin);
      const base = this.baseLocalPosition(target, sim);
      const nextX = target.heroPhysicsOffset.x + impulse.vx * dt;
      const nextZ = target.heroPhysicsOffset.z + impulse.vz * dt;
      const clampedX = clamp(nextX, -maxX - base.x, maxX - base.x);
      const clampedZ = clamp(nextZ, -maxZ - base.z, maxZ - base.z);
      const collided = Math.abs(clampedX - nextX) > 0.001 || Math.abs(clampedZ - nextZ) > 0.001;
      target.heroPhysicsOffset.x = clampedX;
      target.heroPhysicsOffset.z = clampedZ;
      const speed = Math.hypot(impulse.vx, impulse.vz);
      if (collided && speed >= impulse.minimumCollisionSpeed) {
        target.heroStatuses ??= {};
        target.heroStatuses.stagger = { remaining: Math.max(target.heroStatuses.stagger?.remaining ?? 0, impulse.collisionStagger), sourceId: impulse.sourceId, collision: true };
        target.combat = null;
        impulse.vx *= -0.16;
        impulse.vz *= -0.16;
        this.collisionCount += 1;
        this.onEvent(`${target.name ?? target.id} struck the edge of ${target.roomId}.`, { type: 'hero-physics-collision', targetId: target.id, sourceId: impulse.sourceId, roomId: target.roomId });
      }
      const damping = Math.exp(-impulse.damping * dt);
      impulse.vx *= damping;
      impulse.vz *= damping;
      impulse.remaining = Math.max(0, impulse.remaining - dt);
      if (target.heroStatuses?.displaced?.sourceId === impulse.sourceId) target.heroStatuses.displaced.remaining = Math.max(0, impulse.remaining);
      if (speed < 0.08) impulse.remaining = 0;
    }
    this.impulses = this.impulses.filter(item => item.remaining > 0.000001);
  }

  updateTethers(dt, sim) {
    for (const tether of this.tethers) {
      tether.remaining = Math.max(0, tether.remaining - dt);
      const source = (sim?.agents ?? []).find(agent => agent.id === tether.sourceAgentId && agent.alive !== false);
      const target = this.resolveTetherTarget(tether, sim);
      if (!source || !target || source.roomId !== tether.roomId || target.roomId !== tether.roomId) {
        tether.failed = true;
        tether.remaining = 0;
        continue;
      }
      const sourcePosition = this.localPosition(source, sim);
      const targetPosition = this.localPosition(target, sim);
      tether.sourceX = sourcePosition.x;
      tether.sourceZ = sourcePosition.z;
      tether.targetX = targetPosition.x;
      tether.targetZ = targetPosition.z;
      const dx = sourcePosition.x - targetPosition.x;
      const dz = sourcePosition.z - targetPosition.z;
      const distance = Math.hypot(dx, dz);
      if (distance > tether.maximumDistance + 0.5) {
        tether.failed = true;
        tether.remaining = 0;
        continue;
      }
      if (distance <= tether.completeDistance + 0.01) {
        tether.completed = true;
        tether.remaining = 0;
        this.completedTethers.push({ ...tether, payload: { ...(tether.payload ?? {}) } });
        continue;
      }
      const direction = normalize(dx, dz);
      const move = Math.min(distance - tether.completeDistance, tether.strength * dt);
      if (tether.targetType === 'agent') {
        target.heroPhysicsOffset ??= { x: 0, z: 0 };
        target.heroPhysicsOffset.x += direction.x * move;
        target.heroPhysicsOffset.z += direction.z * move;
        this.clampOffset(target, sim);
        target.combat = null;
        target.heroStatuses ??= {};
        target.heroStatuses.hooked = { remaining: Math.max(0.2, tether.remaining), sourceId: source.id };
      } else {
        target.x = (Number.isFinite(target.x) ? target.x : targetPosition.x) + direction.x * move;
        target.z = (Number.isFinite(target.z) ? target.z : targetPosition.z) + direction.z * move;
      }
    }
    this.tethers = this.tethers.filter(item => item.remaining > 0.000001 && !item.completed && !item.failed);
  }

  resolveTetherTarget(tether, sim) {
    if (tether.targetType === 'agent') return (sim?.agents ?? []).find(agent => agent.id === tether.targetId && agent.alive !== false) ?? null;
    const corpses = sim?.ecosystem?.corpses ?? sim?.advancedEcologySystem?.corpses ?? [];
    return corpses.find(corpse => corpse.id === tether.targetId) ?? null;
  }


  resolveAgentCollisions(sim) {
    const moving = new Set([
      ...this.impulses.map(item => item.targetId),
      ...this.tethers.filter(item => item.targetType === 'agent').map(item => item.targetId)
    ]);
    if (!moving.size) return;
    const tetherPairs = new Set(this.tethers
      .filter(item => item.targetType === 'agent')
      .map(item => pairKey(item.sourceAgentId, item.targetId)));
    const byRoom = new Map();
    for (const agent of sim?.agents ?? []) {
      if (!agent?.alive || agent.departed || agent.hidden || agent.travel || !agent.roomId) continue;
      if (!byRoom.has(agent.roomId)) byRoom.set(agent.roomId, []);
      byRoom.get(agent.roomId).push(agent);
    }
    for (const agents of byRoom.values()) {
      agents.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      for (let i = 0; i < agents.length; i += 1) {
        for (let j = i + 1; j < agents.length; j += 1) {
          const a = agents[i];
          const b = agents[j];
          if (!moving.has(a.id) && !moving.has(b.id)) continue;
          if (tetherPairs.has(pairKey(a.id, b.id))) continue;
          const aPosition = this.localPosition(a, sim);
          const bPosition = this.localPosition(b, sim);
          let dx = bPosition.x - aPosition.x;
          let dz = bPosition.z - aPosition.z;
          let distance = Math.hypot(dx, dz);
          const minimum = (COLLISION_RADIUS[a.size] ?? 0.38) + (COLLISION_RADIUS[b.size] ?? 0.38);
          if (distance >= minimum) continue;
          if (distance <= 0.0001) {
            const angle = deterministicAngle(a.id, b.id);
            dx = Math.cos(angle);
            dz = Math.sin(angle);
            distance = 1;
          }
          const overlap = minimum - distance;
          const nx = dx / distance;
          const nz = dz / distance;
          const aInverse = 1 / Math.max(0.1, this.massOf(a));
          const bInverse = 1 / Math.max(0.1, this.massOf(b));
          const total = aInverse + bInverse;
          a.heroPhysicsOffset ??= { x: 0, z: 0 };
          b.heroPhysicsOffset ??= { x: 0, z: 0 };
          a.heroPhysicsOffset.x -= nx * overlap * (aInverse / total);
          a.heroPhysicsOffset.z -= nz * overlap * (aInverse / total);
          b.heroPhysicsOffset.x += nx * overlap * (bInverse / total);
          b.heroPhysicsOffset.z += nz * overlap * (bInverse / total);
          this.clampOffset(a, sim);
          this.clampOffset(b, sim);
          this.agentCollisionCount += 1;
        }
      }
    }
  }

  clampOffset(agent, sim) {
    if (!agent?.heroPhysicsOffset) return;
    const room = (sim?.rooms ?? []).find(candidate => candidate.id === agent.roomId);
    const margin = DEFAULT_MARGIN[agent.size] ?? 0.48;
    const maxX = Math.max(0.2, (room?.w ?? 10) * 0.5 - margin);
    const maxZ = Math.max(0.2, (room?.d ?? 10) * 0.5 - margin);
    const base = this.baseLocalPosition(agent, sim);
    agent.heroPhysicsOffset.x = clamp(agent.heroPhysicsOffset.x, -maxX - base.x, maxX - base.x);
    agent.heroPhysicsOffset.z = clamp(agent.heroPhysicsOffset.z, -maxZ - base.z, maxZ - base.z);
  }

  baseLocalPosition(entity, sim) {
    if (!entity) return { x: 0, z: 0 };
    const room = (sim?.rooms ?? []).find(candidate => candidate.id === entity.roomId);
    if (Number.isFinite(entity.x) && Number.isFinite(entity.z)) {
      const x = room && Math.abs(entity.x - room.x) <= (room.w ?? 10) * 0.5 + 2 ? entity.x - room.x : entity.x;
      const z = room && Math.abs(entity.z - room.z) <= (room.d ?? 10) * 0.5 + 2 ? entity.z - room.z : entity.z;
      return { x, z };
    }
    if (entity.roomCell && Number.isFinite(entity.roomCell.x) && Number.isFinite(entity.roomCell.z)) {
      return { x: entity.roomCell.x - (room?.x ?? 0), z: entity.roomCell.z - (room?.z ?? 0) };
    }
    return { x: 0, z: 0 };
  }

  relaxOffsets(dt, sim) {
    const active = new Set(this.impulses.map(item => item.targetId));
    const tethered = new Set(this.tethers.filter(item => item.targetType === 'agent').map(item => item.targetId));
    for (const agent of sim?.agents ?? []) {
      if (agent.heroStatuses?.displaced && !active.has(agent.id)) delete agent.heroStatuses.displaced;
      if (!agent.heroPhysicsOffset || active.has(agent.id) || tethered.has(agent.id)) continue;
      const factor = Math.exp(-5 * dt);
      agent.heroPhysicsOffset.x *= factor;
      agent.heroPhysicsOffset.z *= factor;
      if (Math.hypot(agent.heroPhysicsOffset.x, agent.heroPhysicsOffset.z) < 0.01) agent.heroPhysicsOffset = { x: 0, z: 0 };
    }
  }

  snapshot() {
    return {
      impulses: this.impulses.map(item => ({ ...item })),
      tethers: this.tethers.map(item => ({ ...item, payload: { ...(item.payload ?? {}) } })),
      collisionCount: this.collisionCount,
      agentCollisionCount: this.agentCollisionCount
    };
  }

  metrics() {
    return {
      heroImpulsesActive: this.impulses.length,
      heroTethersActive: this.tethers.length,
      heroPhysicsCollisions: this.collisionCount,
      heroAgentCollisions: this.agentCollisionCount
    };
  }
}

function normalize(x, z) {
  const length = Math.hypot(x, z);
  if (length <= 0.0001) return { x: 0, z: 0, length: 0 };
  return { x: x / length, z: z / length, length };
}

function pairKey(a, b) {
  return [String(a), String(b)].sort().join('::');
}

function deterministicAngle(a, b) {
  const source = `${a}:${b}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 6283) / 1000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
