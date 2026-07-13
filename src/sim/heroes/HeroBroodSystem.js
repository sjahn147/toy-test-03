import { recomputeHeroStats } from './HeroSystem.js';

export class HeroBroodSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.sequence = 0;
    this.guards = [];
    this.clutches = [];
    this.husks = [];
    this.domains = [];
    this.hatchCount = 0;
  }

  update(dt, sim) {
    this.guards = this.guards.filter(record => tickRecord(record, dt));
    this.husks = this.husks.filter(record => tickRecord(record, dt));
    for (const clutch of this.clutches) {
      clutch.remaining -= dt;
      clutch.incubationRemaining -= dt;
      if (clutch.hp <= 0 || clutch.remaining <= 0) continue;
      if (clutch.incubationRemaining <= 0 && clutch.hatched < clutch.hatchCount) {
        clutch.incubationRemaining += clutch.incubation;
        this.spawnSpiderling(clutch, sim);
        clutch.hatched += 1;
      }
    }
    this.clutches = this.clutches.filter(record => record.hp > 0 && record.remaining > 0 && record.hatched < record.hatchCount);
    for (const domain of this.domains) {
      domain.remaining -= dt;
      domain.hatchTimer -= dt;
      if (domain.hatchTimer <= 0) {
        domain.hatchTimer += domain.hatchInterval;
        this.spawnSpiderling(domain, sim, 'royal-spiderling');
      }
    }
    this.domains = this.domains.filter(record => record.remaining > 0);

    for (const agent of sim?.agents ?? []) {
      tickStatus(agent, 'silkPinned', dt);
      tickStatus(agent, 'threadGuard', dt);
      if (agent.heroId === 'hero.eighth-cocoon') {
        tickStatus(agent, 'feralShell', dt, () => {
          delete agent.heroStatModifiers.feralShell;
          agent.heroVariant = 'knight-shell';
          agent.knightShellIntact = false;
          recomputeHeroStats(agent);
        });
      }
      if (agent.heroId === 'hero.empty-queen-hand') {
        const domain = this.domains.find(item => item.ownerId === agent.id);
        if (domain) agent.heroStatuses.broodThrone = { remaining: 0.3, carrierShields: domain.carrierShields };
        else delete agent.heroStatuses?.broodThrone;
      }
    }
  }

  silkLance(owner, targetId, effect, sim) {
    const targets = lineTargets(owner, targetId, sim, effect.length ?? 6.5, effect.width ?? 0.75);
    for (const target of targets.slice(0, 3)) {
      sim?.applyCombatDamage?.(owner, target, effect.damage ?? 15, { melee: true, silk: true, heroSkill: true });
      target.heroStatuses ??= {};
      target.heroStatuses.silkPinned = { remaining: effect.pinDuration ?? 2.4 };
      target.webbed = Math.max(target.webbed ?? 0, effect.pinDuration ?? 2.4);
    }
    return targets.length > 0;
  }

  threadGuard(owner, effect, sim) {
    const guard = {
      id: `silk-guard-${this.sequence++}`, kind: 'silk-guard', ownerId: owner.id, heroId: owner.heroId,
      factionId: factionOf(owner), roomId: owner.roomId, hp: effect.hp ?? 42, maxHp: effect.hp ?? 42,
      remaining: effect.duration ?? 9, frontalReduction: effect.frontalReduction ?? 0.35,
      projectileSlow: effect.projectileSlow ?? 0.35, direction: facingOf(owner)
    };
    this.guards.push(guard);
    owner.heroStatuses.threadGuard = { remaining: guard.remaining, guardId: guard.id };
    sim?.emitEffect?.('hero-brood', { roomId: owner.roomId, agentId: owner.id, duration: 0.9, heroId: owner.heroId, cue: 'thread-guard' });
    return true;
  }

  castOffShell(owner, effect, sim) {
    if (owner.heroStatuses?.feralShell) return false;
    const husk = { id: `knight-husk-${this.sequence++}`, kind: 'knight-husk', ownerId: owner.id, roomId: owner.roomId, hp: effect.huskHp ?? 34, maxHp: effect.huskHp ?? 34, remaining: effect.duration ?? 16, ox: 0, oz: -0.45 };
    this.husks.push(husk);
    owner.heroVariant = 'feral-arachnid';
    owner.knightShellIntact = false;
    owner.heroStatuses.feralShell = { remaining: effect.duration ?? 16, poisonDamage: effect.poisonDamage ?? 3 };
    owner.heroStatModifiers.feralShell = { attack: effect.attackBonus ?? 5, armor: -(effect.armorLoss ?? 4), courage: 3, speedMultiplier: effect.speedMultiplier ?? 1.28, interruptResistance: 0.2 };
    recomputeHeroStats(owner);
    sim?.emitEffect?.('hero-brood', { roomId: owner.roomId, agentId: owner.id, duration: 1.2, heroId: owner.heroId, cue: 'cast-off-shell' });
    return true;
  }

  layRoyalClutch(owner, effect, sim) {
    const owned = this.clutches.filter(item => item.ownerId === owner.id);
    if (owned.length >= (effect.maximum ?? 2)) return false;
    const clutch = {
      id: `royal-clutch-${this.sequence++}`, kind: 'royal-clutch', ownerId: owner.id, heroId: owner.heroId,
      factionId: factionOf(owner), roomId: owner.roomId, hp: effect.hp ?? 52, maxHp: effect.hp ?? 52,
      incubation: effect.incubation ?? 12, incubationRemaining: effect.incubation ?? 12,
      hatchCount: effect.hatchCount ?? 3, hatched: 0, remaining: (effect.incubation ?? 12) * ((effect.hatchCount ?? 3) + 1), ox: 0.6 - owned.length * 1.2, oz: 0.5
    };
    this.clutches.push(clutch);
    owner.clutchIds = [...(owner.clutchIds ?? []), clutch.id];
    return true;
  }

  reassignBrood(owner, effect, sim) {
    const rooms = new Set([owner.roomId, ...(sim?.graph?.get?.(owner.roomId) ?? [])]);
    let affected = 0;
    for (const spider of sim?.agents ?? []) {
      if (spider.id === owner.id || spider.alive === false || factionOf(spider) !== factionOf(owner) || !rooms.has(spider.roomId)) continue;
      if (!/spider|stirge|brood|cocoon/.test(String(spider.role ?? spider.species ?? ''))) continue;
      spider.homeRoomId = owner.roomId;
      spider.retreatTargetRoomId = owner.roomId;
      spider.heroBroodOrder = 'converge';
      if (effect.retargetHomeSite) spider.homeSiteId = owner.homeSiteId ?? spider.homeSiteId;
      affected += 1;
    }
    return affected > 0;
  }

  queenWithoutBody(owner, effect, sim) {
    const domain = {
      id: `brood-domain-${this.sequence++}`, kind: 'brood-domain', ownerId: owner.id, heroId: owner.heroId,
      factionId: factionOf(owner), roomId: owner.roomId, remaining: effect.duration ?? 15,
      radius: 6, hatchInterval: effect.hatchInterval ?? 3.5, hatchTimer: 0.4,
      carrierShields: effect.carrierShields ?? 5, attackAura: effect.attackAura ?? 2
    };
    this.domains.push(domain);
    owner.heroStatuses.broodThrone = { remaining: domain.remaining, carrierShields: domain.carrierShields };
    return true;
  }

  modifyIncomingDamage(source, target, amount, metadata = {}) {
    if (target?.heroId === 'hero.eighth-cocoon') {
      const guard = this.guards.find(item => item.ownerId === target.id && item.hp > 0);
      if (guard && (metadata.projectileType || metadata.ranged || metadata.melee)) {
        const absorbed = Math.min(guard.hp, amount * guard.frontalReduction);
        guard.hp -= absorbed;
        return Math.max(0, amount - absorbed);
      }
      if (target.knightShellIntact && metadata.melee) return amount * 0.82;
    }
    if (target?.heroId === 'hero.empty-queen-hand') {
      const domain = this.domains.find(item => item.ownerId === target.id && item.carrierShields > 0);
      if (domain && amount >= (target.maxHp ?? 1) * 0.08) {
        domain.carrierShields -= 1;
        target.carrierCount = Math.max(1, (target.carrierCount ?? 5) - 1);
        target.heroVariant = `carriers-${target.carrierCount}`;
        return amount * 0.42;
      }
    }
    return amount;
  }

  isMovementBlocked(agent) { return Boolean(agent?.heroStatuses?.silkPinned?.remaining > 0); }

  onAgentDeath(agent, sim) {
    if (agent?.heroId === 'hero.empty-queen-hand') for (const clutch of this.clutches.filter(item => item.ownerId === agent.id)) clutch.remaining = Math.min(clutch.remaining, 4);
    if (agent?.heroId === 'hero.eighth-cocoon') for (const guard of this.guards.filter(item => item.ownerId === agent.id)) guard.remaining = 0;
  }

  spawnSpiderling(source, sim, role = 'spider') {
    const owner = (sim?.agents ?? []).find(agent => agent.id === source.ownerId);
    const agent = {
      id: `hero-broodling-${this.sequence++}`, name: role === 'royal-spiderling' ? 'Royal Spiderling' : 'Spiderling',
      role, species: 'spider', faction: 'dungeon', ecologyFaction: source.factionId,
      roomId: source.roomId, homeRoomId: source.roomId, hp: 14, maxHp: 14, attack: 4, armor: 0, courage: 12,
      level: 1, size: 'small', alive: true, departed: false, hidden: false, heroSummonKind: 'spiderling', heroOwnerId: owner?.id ?? source.ownerId
    };
    sim?.agents?.push(agent);
    sim?.combatSystem?.initializeAgent?.(agent);
    this.hatchCount += 1;
    sim?.emitEffect?.('hero-brood', { roomId: source.roomId, agentId: agent.id, duration: 0.8, cue: 'clutch-hatches' });
    return agent;
  }

  snapshot() { return { guards: this.guards.map(copy), clutches: this.clutches.map(copy), husks: this.husks.map(copy), domains: this.domains.map(copy) }; }
  metrics() { return { heroBroodGuards: this.guards.length, heroBroodClutches: this.clutches.length, heroBroodDomains: this.domains.length, heroBroodHatched: this.hatchCount }; }
}

function lineTargets(owner, targetId, sim, length, width) {
  const agents = (sim?.agents ?? []).filter(agent => agent.id !== owner.id && agent.alive !== false && agent.roomId === owner.roomId && factionOf(agent) !== factionOf(owner));
  const primary = agents.find(agent => agent.id === targetId) ?? agents[0];
  const origin = pointOf(owner), aim = pointOf(primary ?? { roomCell: { x: origin.x, z: origin.z + 1 } });
  const dx = aim.x - origin.x, dz = aim.z - origin.z, mag = Math.hypot(dx, dz) || 1, ux = dx / mag, uz = dz / mag;
  return agents.filter(agent => { const p = pointOf(agent), rx = p.x - origin.x, rz = p.z - origin.z, along = rx * ux + rz * uz, side = Math.abs(rx * -uz + rz * ux); return along >= 0 && along <= length && side <= width; }).sort((a, b) => distance(owner, a) - distance(owner, b));
}
function tickRecord(record, dt) { record.remaining -= dt; return record.remaining > 0 && (record.hp ?? 1) > 0; }
function tickStatus(agent, key, dt, onExpire) { const status = agent.heroStatuses?.[key]; if (!status) return; status.remaining -= dt; if (status.remaining <= 0) { delete agent.heroStatuses[key]; onExpire?.(); } }
function facingOf(agent) { const r = agent.rotation ?? agent.travel?.rotation ?? 0; return { x: Math.sin(r), z: Math.cos(r) }; }
function pointOf(agent) { return { x: agent?.roomCell?.x ?? 0, z: agent?.roomCell?.z ?? 0 }; }
function distance(a, b) { const p = pointOf(a), q = pointOf(b); return Math.hypot(p.x - q.x, p.z - q.z); }
function factionOf(agent) { return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null; }
function copy(item) { return JSON.parse(JSON.stringify(item)); }
