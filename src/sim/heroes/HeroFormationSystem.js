const DEFAULT_LINE_DURATION = 12;

export class HeroFormationSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.formations = [];
    this.sequence = 0;
    this.crossingCount = 0;
    this.events = [];
  }

  update(dt, sim) {
    const survivors = [];
    for (const formation of this.formations) {
      formation.remaining -= dt;
      const owner = findAgent(sim, formation.ownerId);
      if (!owner || owner.alive === false || owner.departed || formation.remaining <= 0) {
        this.releaseFormation(formation, sim);
        continue;
      }
      this.refreshMembers(formation, owner, sim);
      this.updateCrossings(formation, dt, sim);
      survivors.push(formation);
    }
    this.formations = survivors;
  }

  createRoyalLine(owner, options = {}, sim) {
    if (!owner || !sim) return null;
    this.removeOwner(owner.id, sim);
    const hostiles = roomHostiles(owner, sim);
    const direction = directionTo(owner, hostiles[0]);
    const normal = { x: -direction.z, z: direction.x };
    const maximum = Math.max(1, options.maximumAllies ?? 4);
    const allies = roomAllies(owner, sim)
      .filter(agent => isSkeletonLike(agent))
      .sort((a, b) => commandPriority(b) - commandPriority(a) || String(a.id).localeCompare(String(b.id)))
      .slice(0, maximum);
    const members = [owner, ...allies];
    const span = options.span ?? 5.2;
    const center = worldPoint(owner);
    const formation = {
      id: `hero-formation-${this.sequence++}`,
      kind: 'royal-line',
      ownerId: owner.id,
      heroId: owner.heroId,
      factionId: factionOf(owner),
      roomId: owner.roomId,
      remaining: options.duration ?? DEFAULT_LINE_DURATION,
      duration: options.duration ?? DEFAULT_LINE_DURATION,
      span,
      width: options.width ?? 0.75,
      frontalDamageMultiplier: options.frontalDamageMultiplier ?? 0.72,
      crossingStagger: options.crossingStagger ?? 1.1,
      direction,
      normal,
      center,
      memberIds: members.map(agent => agent.id),
      originalCells: {},
      crossingCooldowns: {},
      previousSides: {}
    };
    const count = members.length;
    members.forEach((member, index) => {
      const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * Math.min(span, 1.25 * (count - 1));
      formation.originalCells[member.id] = member.roomCell ? { ...member.roomCell } : null;
      member.roomCell ??= { x: center.x, z: center.z };
      member.roomCell.x = center.x + normal.x * offset;
      member.roomCell.z = center.z + normal.z * offset;
      member.heroStatuses ??= {};
      member.heroStatuses.royalFormation = {
        formationId: formation.id,
        ownerId: owner.id,
        direction: { ...direction },
        frontalDamageMultiplier: formation.frontalDamageMultiplier,
        knockbackResistanceBonus: 0.25,
        remaining: formation.remaining
      };
      member.heroStatModifiers ??= {};
      member.heroStatModifiers.royalFormation = {
        armor: member.id === owner.id ? 1 : 2,
        courage: 3,
        speedMultiplier: 0.9,
        interruptResistance: 0.1
      };
    });
    for (const hostile of hostiles) formation.previousSides[hostile.id] = signedSide(formation, hostile);
    this.formations.push(formation);
    this.emit(`${owner.name} established a royal battle line.`, {
      type: 'hero-formation-created', formationId: formation.id, heroId: owner.heroId, roomId: owner.roomId, memberIds: [...formation.memberIds]
    });
    return formation;
  }

  shieldBash(owner, options = {}, sim) {
    const primary = options.targetId ? findAgent(sim, options.targetId) : roomHostiles(owner, sim).sort((a, b) => distance(owner, a) - distance(owner, b))[0];
    if (primary) owner.heroFacing = directionTo(owner, primary);
    const targets = roomHostiles(owner, sim)
      .filter(target => inDirectionalArea(owner, target, options.length ?? 3.6, options.width ?? 2.4))
      .sort((a, b) => distance(owner, a) - distance(owner, b));
    for (const target of targets) {
      sim?.applyCombatDamage?.(owner, target, options.damage ?? 6, { melee: true, heroSkill: true, shield: true });
      target.combat = null;
      target.heroStatuses ??= {};
      target.heroStatuses.stagger = Math.max(target.heroStatuses.stagger ?? 0, options.stagger ?? 0.9);
      sim?.heroPhysicsSystem?.applyImpulse?.(target, directionTo(owner, target), options.impulse ?? 5.2, { sourceId: owner.id, roomId: owner.roomId });
      if (options.armorBreak) {
        target.heroStatuses.armorBreak = { remaining: options.armorBreak.duration ?? 5, amount: options.armorBreak.amount ?? 2, originalArmor: target.armor ?? 0 };
        target.armor = Math.max(0, (target.armor ?? 0) - (options.armorBreak.amount ?? 2));
      }
    }
    return targets.length;
  }

  modifyIncomingDamage(source, target, amount, metadata = {}) {
    const status = target?.heroStatuses?.royalFormation;
    if (!status || !source || source.roomId !== target.roomId) return amount;
    const attackDirection = directionTo(target, source);
    const facing = status.direction ?? { x: 0, z: 1 };
    const frontal = attackDirection.x * facing.x + attackDirection.z * facing.z >= 0.15;
    if (!frontal || metadata.holy || metadata.magicPiercing) return amount;
    return Math.max(1, Math.round(amount * (status.frontalDamageMultiplier ?? 0.72)));
  }

  removeOwner(ownerId, sim) {
    const keep = [];
    for (const formation of this.formations) {
      if (formation.ownerId === ownerId) this.releaseFormation(formation, sim);
      else keep.push(formation);
    }
    this.formations = keep;
  }

  onAgentDeath(agent, sim) {
    if (!agent) return;
    this.removeOwner(agent.id, sim);
    for (const formation of this.formations) {
      if (!formation.memberIds.includes(agent.id)) continue;
      formation.memberIds = formation.memberIds.filter(id => id !== agent.id);
      delete formation.originalCells[agent.id];
    }
  }

  refreshMembers(formation, owner, sim) {
    for (const id of [...formation.memberIds]) {
      const member = findAgent(sim, id);
      if (!member || member.alive === false || member.departed || member.roomId !== formation.roomId) {
        formation.memberIds = formation.memberIds.filter(candidate => candidate !== id);
        continue;
      }
      member.heroStatuses ??= {};
      if (member.heroStatuses.royalFormation) member.heroStatuses.royalFormation.remaining = formation.remaining;
    }
  }

  updateCrossings(formation, dt, sim) {
    for (const [id, remaining] of Object.entries(formation.crossingCooldowns)) {
      formation.crossingCooldowns[id] = Math.max(0, remaining - dt);
    }
    for (const hostile of (sim?.agents ?? []).filter(agent => agent.alive !== false && !agent.departed && agent.roomId === formation.roomId && factionOf(agent) !== formation.factionId)) {
      const side = signedSide(formation, hostile);
      const previous = formation.previousSides[hostile.id];
      formation.previousSides[hostile.id] = side;
      if (previous === undefined || Math.sign(previous) === Math.sign(side) || Math.abs(side) > 1.1) continue;
      const lateral = lateralDistance(formation, hostile);
      if (lateral > formation.span * 0.55 || (formation.crossingCooldowns[hostile.id] ?? 0) > 0) continue;
      hostile.heroStatuses ??= {};
      hostile.heroStatuses.stagger = Math.max(hostile.heroStatuses.stagger ?? 0, formation.crossingStagger);
      hostile.combat = null;
      formation.crossingCooldowns[hostile.id] = 2;
      this.crossingCount += 1;
      sim?.emitEffect?.('hero-formation-impact', { roomId: formation.roomId, agentId: hostile.id, duration: 0.7, formationId: formation.id });
      this.emit(`${hostile.name} broke against the royal line.`, { type: 'hero-formation-crossing', formationId: formation.id, targetId: hostile.id, roomId: formation.roomId });
    }
  }

  releaseFormation(formation, sim) {
    for (const id of formation.memberIds) {
      const member = findAgent(sim, id);
      if (!member) continue;
      delete member.heroStatuses?.royalFormation;
      delete member.heroStatModifiers?.royalFormation;
      const cell = formation.originalCells[id];
      if (cell && member.roomId === formation.roomId) member.roomCell = { ...cell };
    }
    this.emit('The royal battle line dissolved.', { type: 'hero-formation-ended', formationId: formation.id, roomId: formation.roomId });
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot() {
    return { formations: this.formations.map(formation => ({ ...formation, direction: { ...formation.direction }, normal: { ...formation.normal }, center: { ...formation.center }, memberIds: [...formation.memberIds], originalCells: cloneObject(formation.originalCells), crossingCooldowns: { ...formation.crossingCooldowns }, previousSides: { ...formation.previousSides } })), recentEvents: this.events.map(event => ({ ...event })) };
  }

  metrics() {
    return { heroFormationsActive: this.formations.length, heroFormationCrossings: this.crossingCount };
  }
}

function findAgent(sim, id) { return (sim?.agents ?? []).find(agent => agent.id === id) ?? null; }
function factionOf(agent) { return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null; }
function roomAllies(owner, sim) { return (sim?.agents ?? []).filter(agent => agent.id !== owner.id && agent.alive !== false && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === owner.roomId && factionOf(agent) === factionOf(owner)); }
function roomHostiles(owner, sim) { return (sim?.agents ?? []).filter(agent => agent.id !== owner.id && agent.alive !== false && !agent.departed && !agent.hidden && !agent.travel && agent.roomId === owner.roomId && factionOf(agent) !== factionOf(owner)); }
function isSkeletonLike(agent) { return String(agent?.role ?? '').includes('skeleton') || String(agent?.species ?? '').includes('skeleton') || agent?.heroSummonKind === 'royal-skeleton'; }
function commandPriority(agent) { return (agent.armor ?? 0) * 4 + (agent.hp ?? 0) + (agent.attack ?? 0) * 2; }
function worldPoint(agent) { return { x: (agent?.roomCell?.x ?? 0) + (agent?.heroPhysicsOffset?.x ?? 0), z: (agent?.roomCell?.z ?? 0) + (agent?.heroPhysicsOffset?.z ?? 0) }; }
function directionTo(a, b) { const pa = worldPoint(a); const pb = b ? worldPoint(b) : { x: pa.x, z: pa.z + 1 }; const dx = pb.x - pa.x; const dz = pb.z - pa.z; const length = Math.hypot(dx, dz) || 1; return { x: dx / length, z: dz / length }; }
function distance(a, b) { const pa = worldPoint(a); const pb = worldPoint(b); return Math.hypot(pa.x - pb.x, pa.z - pb.z); }
function signedSide(formation, agent) { const p = worldPoint(agent); return (p.x - formation.center.x) * formation.direction.x + (p.z - formation.center.z) * formation.direction.z; }
function lateralDistance(formation, agent) { const p = worldPoint(agent); return Math.abs((p.x - formation.center.x) * formation.normal.x + (p.z - formation.center.z) * formation.normal.z); }
function inDirectionalArea(owner, target, length, width) { const po = worldPoint(owner); const pt = worldPoint(target); const facing = owner.heroFacing ?? directionTo(owner, target); const dx = pt.x - po.x; const dz = pt.z - po.z; const forward = dx * facing.x + dz * facing.z; const side = Math.abs(dx * -facing.z + dz * facing.x); return forward >= -0.1 && forward <= length && side <= width * 0.5; }
function cloneObject(value) { return JSON.parse(JSON.stringify(value ?? {})); }
