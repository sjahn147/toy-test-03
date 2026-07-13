import { getHeroDefinition } from '../../content/heroes/HeroDefinitions.js';
import { recomputeHeroStats } from './HeroSystem.js';

export class HeroMimicrySystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.observations = new Map();
    this.husks = [];
    this.echoes = [];
    this.sequence = 0;
  }

  update(dt, sim) {
    for (const observer of (sim?.agents ?? []).filter(agent => agent.heroId === 'hero.failed-successor' && agent.alive !== false)) {
      const records = this.observations.get(observer.id) ?? [];
      for (const other of sim?.agents ?? []) {
        if (other.id === observer.id || other.roomId !== observer.roomId || !other.heroCast || other.heroCast.phase !== 'impact') continue;
        const definition = getHeroDefinition(other.heroId ?? other.role);
        const skill = definition?.skills.find(item => item.id === other.heroCast.skillId);
        if (!skill) continue;
        const archetype = classify(skill);
        if (!records.some(item => item.skillId === skill.id)) records.push({ skillId: skill.id, heroId: definition.id, archetype, observedAt: sim.time ?? 0 });
      }
      this.observations.set(observer.id, records.slice(-8));
      observer.observedArchetypes = [...new Set(records.map(item => item.archetype))];
      observer.copiedSkillIds = records.map(item => item.skillId);
      tickStatus(observer, 'falseInvestiture', dt, () => {
        observer.heroRoyalAccess = false; observer.royalAccess = false;
        for (const prop of sim?.props ?? []) if (prop.heroClaimedBy === observer.id) { delete prop.heroClaimedBy; delete prop.heroClaimRemaining; }
        for (const barrier of sim?.heroBarrierSystem?.barriers ?? []) if (barrier.suppressedBy === observer.id) delete barrier.suppressedBy;
      });
      tickStatus(observer, 'borrowedGesture', dt);
      tickStatus(observer, 'copiedWard', dt, () => { delete observer.heroStatModifiers.copiedWard; recomputeHeroStats(observer); });
      tickStatus(observer, 'copiedMovement', dt, () => { delete observer.heroStatModifiers.copiedMovement; recomputeHeroStats(observer); });
      tickStatus(observer, 'shedPrince', dt, () => {
        delete observer.heroStatModifiers.shedPrince;
        observer.heroVariant = 'prince-shell';
        recomputeHeroStats(observer);
      });
    }
    this.husks = this.husks.filter(item => (item.remaining -= dt) > 0 && item.hp > 0);
    this.echoes = this.echoes.filter(item => (item.remaining -= dt) > 0);
  }

  borrowedGesture(owner, effect, sim) {
    const records = this.observations.get(owner.id) ?? [];
    const record = records.at(-1) ?? { archetype: effect.fallbackArchetype ?? 'strike', skillId: 'fallback' };
    const archetype = record.archetype;
    const powerMultiplier = effect.powerMultiplier ?? 0.72;
    this.replayArchetype(owner, archetype, powerMultiplier, sim);
    owner.heroStatuses.borrowedGesture = { remaining: 4, archetype, sourceSkillId: record.skillId };
    owner.heroVariant = `gesture-${archetype}`;
    return true;
  }

  falseInvestiture(owner, effect, sim) {
    owner.heroStatuses.falseInvestiture = { remaining: effect.duration ?? 14 };
    owner.heroRoyalAccess = true;
    owner.royalAccess = true;
    owner.heroVariant = 'false-invested';
    for (const prop of sim?.props ?? []) {
      if (prop.roomId !== owner.roomId || !/royal|gate|seal|throne|registry/.test(`${prop.type ?? ''} ${prop.label ?? ''}`)) continue;
      prop.heroClaimedBy = owner.id;
      prop.heroClaimRemaining = effect.duration ?? 14;
    }
    if (effect.suppressRoyalBarrier) {
      for (const barrier of sim?.heroBarrierSystem?.barriers ?? []) if (barrier.roomId === owner.roomId || barrier.fromRoomId === owner.roomId) barrier.suppressedBy = owner.id;
    }
    return true;
  }

  shedPrince(owner, effect, sim) {
    if (owner.heroStatuses?.shedPrince) return false;
    const husk = { id: `prince-husk-${this.sequence++}`, kind: 'prince-husk', ownerId: owner.id, roomId: owner.roomId, hp: effect.huskHp ?? 38, maxHp: effect.huskHp ?? 38, remaining: effect.duration ?? 18, ox: 0.25, oz: -0.3 };
    this.husks.push(husk);
    owner.heroStatuses.shedPrince = { remaining: effect.duration ?? 18, replayCount: effect.replayCount ?? 2 };
    owner.heroStatModifiers.shedPrince = { attack: effect.attackBonus ?? 4, armor: -1, courage: 4, speedMultiplier: effect.speedMultiplier ?? 1.2, interruptResistance: 0.3 };
    owner.heroVariant = 'parasite-revealed';
    recomputeHeroStats(owner);
    const records = (this.observations.get(owner.id) ?? []).slice(-(effect.replayCount ?? 2));
    for (const record of records) this.replayArchetype(owner, record.archetype, 0.55, sim);
    sim?.emitEffect?.('hero-mimicry', { roomId: owner.roomId, agentId: owner.id, duration: 1.1, cue: 'shed-prince' });
    return true;
  }

  replayArchetype(owner, archetype, multiplier, sim) {
    const hostiles = roomHostiles(owner, sim);
    if (archetype === 'ward') {
      owner.heroStatuses.copiedWard = { remaining: 8 };
      owner.heroStatModifiers.copiedWard = { armor: Math.max(1, Math.round(4 * multiplier)), attack: 0, courage: 1, speedMultiplier: 1, interruptResistance: 0.14 };
      recomputeHeroStats(owner);
    } else if (archetype === 'control') {
      for (const target of hostiles.slice(0, 3)) { target.heroStatuses ??= {}; target.heroStatuses.mimicStagger = { remaining: 1.2 * multiplier }; target.combat = null; }
    } else if (archetype === 'summon') {
      const echo = { id: `parasite-echo-${this.sequence++}`, name: 'Borrowed Retainer', role: 'parasite-echo', species: 'parasite', faction: 'dungeon', ecologyFaction: owner.ecologyFaction, roomId: owner.roomId, homeRoomId: owner.roomId, hp: 18, maxHp: 18, attack: 5, armor: 1, courage: 14, level: 1, size: 'small', alive: true, departed: false, hidden: false, heroSummonKind: 'parasite-echo', heroOwnerId: owner.id };
      sim?.agents?.push(echo); sim?.combatSystem?.initializeAgent?.(echo); this.echoes.push({ id: echo.id, ownerId: owner.id, roomId: owner.roomId, remaining: 14 });
    } else if (archetype === 'movement') {
      owner.heroStatuses.copiedMovement = { remaining: 8 };
      owner.heroStatModifiers.copiedMovement = { armor: 0, attack: 1, courage: 0, speedMultiplier: 1 + 0.28 * multiplier, interruptResistance: 0.08 };
      recomputeHeroStats(owner);
    } else {
      const target = hostiles.sort((a, b) => power(b) - power(a))[0];
      if (target) sim?.applyCombatDamage?.(owner, target, Math.max(4, Math.round((owner.attack ?? 8) * multiplier)), { heroSkill: true, mimic: true });
    }
  }

  snapshot() {
    return {
      observations: [...this.observations.entries()].map(([ownerId, records]) => ({ ownerId, records: records.map(item => ({ ...item })) })),
      husks: this.husks.map(item => ({ ...item })), echoes: this.echoes.map(item => ({ ...item }))
    };
  }
  metrics() { return { heroMimicObservations: [...this.observations.values()].reduce((sum, list) => sum + list.length, 0), heroMimicHusks: this.husks.length }; }
}

function classify(skill) {
  const joined = skill.effects.map(effect => effect.type).join(' ');
  if (/summon|raise|split|clutch|hatch/.test(joined)) return 'summon';
  if (/barrier|guard|armor|formation|bastion|heal/.test(joined)) return 'ward';
  if (/root|stagger|slow|fear|command|lock|seal/.test(joined)) return 'control';
  if (/retreat|charge|move|dash|procession/.test(joined)) return 'movement';
  return 'strike';
}
function tickStatus(agent, key, dt, onExpire) { const status = agent.heroStatuses?.[key]; if (!status) return; status.remaining -= dt; if (status.remaining <= 0) { delete agent.heroStatuses[key]; onExpire?.(); } }
function roomHostiles(owner, sim) { return (sim?.agents ?? []).filter(agent => agent.id !== owner.id && agent.alive !== false && agent.roomId === owner.roomId && factionOf(agent) !== factionOf(owner)); }
function factionOf(agent) { return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null; }
function power(agent) { return (agent.hp ?? 0) + (agent.attack ?? 0) * 4 + (agent.armor ?? 0) * 3; }
