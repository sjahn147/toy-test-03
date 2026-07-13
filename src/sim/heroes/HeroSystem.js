import { getHeroDefinition, listHeroDefinitions } from '../../content/heroes/HeroDefinitions.js';

const DEFAULT_STATE = 'active';

export class HeroSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.states = new Map();
    this.events = [];
    this.initialized = false;
  }

  initialize(sim) {
    if (!sim) return;
    for (const definition of listHeroDefinitions()) {
      let state = this.states.get(definition.id);
      if (!state) {
        state = createHeroState(definition);
        this.states.set(definition.id, state);
      }
      const existing = (sim.agents ?? []).find(agent => agent.heroId === definition.id || agent.role === definition.role);
      if (existing) {
        bindHeroAgent(existing, definition, state, sim);
        continue;
      }
      if (state.state === 'dead' || state.state === 'missing') continue;
      const roomExists = (sim.rooms ?? []).some(room => room.id === definition.initialRoomId);
      if (!roomExists) {
        state.state = 'missing';
        state.missingReason = `room ${definition.initialRoomId} is unavailable`;
        continue;
      }
      const agent = spawnHeroAgent(definition, state, sim);
      this.emit(`${definition.displayName} entered the campaign at ${definition.initialRoomId}.`, {
        type: 'hero-introduced', heroId: definition.id, agentId: agent.id, roomId: agent.roomId, factionId: definition.factionId
      });
    }
    this.initialized = true;
  }

  update(dt, sim) {
    if (!this.initialized) this.initialize(sim);
    for (const definition of listHeroDefinitions()) {
      const state = this.states.get(definition.id) ?? createHeroState(definition);
      this.states.set(definition.id, state);
      const agent = this.agentFor(definition.id, sim);
      if (!agent) continue;
      ensureHeroRuntime(agent, definition);
      state.agentId = agent.id;
      state.roomId = agent.roomId;
      state.hp = agent.hp;
      state.maxHp = agent.maxHp;
      state.alive = agent.alive !== false;
      state.damageStage = damageStage(agent, definition);
      agent.heroDamageStage = state.damageStage;
      agent.heroRevealRemaining = Math.max(0, (agent.heroRevealRemaining ?? 0) - dt);
      this.applyDamagePassives(agent, definition, state, sim);
      recomputeHeroStats(agent, definition);
      state.cooldowns = { ...(agent.heroCooldowns ?? {}) };
      state.currentSkillId = agent.heroCast?.skillId ?? null;
      state.skillPhase = agent.heroCast?.phase ?? null;
      state.disposition = agent.heroDisposition ?? state.disposition;
      state.relationship = clamp(agent.heroRelationship ?? state.relationship, -100, 100);
      state.flags = [...new Set([...(state.flags ?? []), ...(agent.heroFlags ?? [])])];
      agent.heroLastHp = agent.hp;
    }
  }

  applyDamagePassives(agent, definition, state, sim) {
    const previous = Number.isFinite(agent.heroLastHp) ? agent.heroLastHp : agent.hp;
    const loss = Math.max(0, previous - (agent.hp ?? 0));
    if (definition.id !== 'hero.karg' || loss < agent.maxHp * 0.15 || agent.alive === false) return;
    const stacks = Math.min(3, (agent.heroStatuses.lessonStacks ?? 0) + 1);
    if (stacks === agent.heroStatuses.lessonStacks) return;
    agent.heroStatuses.lessonStacks = stacks;
    agent.heroStatModifiers.passive = {
      attack: stacks,
      armor: 0,
      courage: stacks,
      speedMultiplier: 1,
      interruptResistance: stacks * 0.06
    };
    state.flags = [...new Set([...(state.flags ?? []), `lesson-${stacks}`])];
    this.emit(`${definition.displayName} learned from another heavy blow (${stacks}/3).`, {
      type: 'hero-passive-stack', heroId: definition.id, agentId: agent.id, stacks, roomId: agent.roomId
    });
    sim?.emitEffect?.('hero-passive', { roomId: agent.roomId, agentId: agent.id, duration: 0.9, heroId: definition.id, cue: 'lesson-of-defeat' });
  }

  agentFor(heroId, sim) {
    const state = this.states.get(heroId);
    return (sim?.agents ?? []).find(agent => agent.heroId === heroId || (state?.agentId && agent.id === state.agentId)) ?? null;
  }

  definitionForAgent(agent) {
    return getHeroDefinition(agent?.heroId ?? agent?.role);
  }

  stateFor(heroId) {
    const state = this.states.get(heroId);
    return state ? cloneState(state) : null;
  }

  setDisposition(heroId, disposition, relationshipDelta = 0) {
    const state = this.states.get(heroId);
    if (!state) return false;
    state.disposition = disposition;
    state.relationship = clamp((state.relationship ?? 0) + relationshipDelta, -100, 100);
    return true;
  }

  addFlag(heroId, flag) {
    const state = this.states.get(heroId);
    if (!state || !flag) return false;
    state.flags = [...new Set([...(state.flags ?? []), flag])];
    return true;
  }

  onAgentDeath(agent, sim) {
    const definition = this.definitionForAgent(agent);
    if (!definition) return false;
    const state = this.states.get(definition.id) ?? createHeroState(definition);
    state.state = 'dead';
    state.alive = false;
    state.hp = 0;
    state.roomId = agent.roomId;
    state.agentId = agent.id;
    state.deathTime = sim?.time ?? 0;
    this.states.set(definition.id, state);
    agent.heroState = 'dead';
    this.emit(`${definition.displayName} was defeated permanently.`, {
      type: 'hero-death', heroId: definition.id, agentId: agent.id, roomId: agent.roomId, factionId: definition.factionId
    });
    return true;
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot() {
    return {
      heroes: [...this.states.values()].map(cloneState),
      recentEvents: this.events.map(event => ({ ...event }))
    };
  }

  metrics() {
    const states = [...this.states.values()];
    return {
      heroDefinitions: listHeroDefinitions().length,
      heroesActive: states.filter(state => state.state === 'active' && state.alive !== false).length,
      heroesDead: states.filter(state => state.state === 'dead').length,
      heroEvents: this.events.length
    };
  }
}

export function ensureHeroRuntime(agent, definition = getHeroDefinition(agent?.heroId ?? agent?.role)) {
  if (!agent || !definition) return false;
  agent.heroId = definition.id;
  agent.isHero = true;
  agent.unique = true;
  agent.displayName = definition.displayName;
  agent.heroState ??= DEFAULT_STATE;
  agent.heroDisposition ??= definition.relationship.initial < -20 ? 'hostile' : definition.relationship.initial > 20 ? 'friendly' : 'neutral';
  agent.heroRelationship ??= definition.relationship.initial;
  agent.heroFlags ??= [];
  agent.heroStatuses ??= {};
  agent.heroCooldowns ??= {};
  agent.heroCast ??= null;
  agent.heroStatModifiers ??= {};
  agent.heroBaseStats ??= { ...definition.baseStats };
  agent.maxHp = Math.max(agent.maxHp ?? 0, definition.baseStats.hp);
  agent.hp = agent.alive === false ? 0 : Math.max(1, Math.min(agent.hp ?? definition.baseStats.hp, agent.maxHp));
  agent.baseAttack = definition.baseStats.attack;
  agent.baseCourage = definition.baseStats.courage;
  agent.baseArmor = definition.baseStats.armor;
  agent.baseSpeed = definition.baseStats.speed;
  agent.faction = agent.faction ?? 'dungeon';
  agent.ecologyFaction = definition.factionId;
  agent.size = definition.size;
  agent.heroDamageStage ??= damageStage(agent, definition);
  agent.heroRevealRemaining ??= 2.2;
  agent.heroLastHp ??= agent.hp;
  recomputeHeroStats(agent, definition);
  return true;
}

export function recomputeHeroStats(agent, definition = getHeroDefinition(agent?.heroId ?? agent?.role)) {
  if (!agent || !definition) return false;
  const modifiers = Object.values(agent.heroStatModifiers ?? {});
  const sum = key => modifiers.reduce((total, modifier) => total + (Number(modifier?.[key]) || 0), 0);
  const product = key => modifiers.reduce((total, modifier) => total * (Number.isFinite(modifier?.[key]) ? modifier[key] : 1), 1);
  agent.baseAttack = definition.baseStats.attack;
  agent.attack = Math.max(0, definition.baseStats.attack + sum('attack'));
  agent.courage = Math.max(0, definition.baseStats.courage + sum('courage'));
  agent.armor = Math.max(0, definition.baseStats.armor + sum('armor'));
  agent.speedMultiplier = Math.max(0.25, definition.baseStats.speed * product('speedMultiplier'));
  agent.heroInterruptResistance = clamp(sum('interruptResistance'), 0, 0.75);
  return true;
}

function createHeroState(definition) {
  return {
    id: definition.id,
    heroId: definition.id,
    role: definition.role,
    displayName: definition.displayName,
    factionId: definition.factionId,
    agentId: null,
    roomId: definition.initialRoomId,
    state: DEFAULT_STATE,
    alive: true,
    disposition: definition.relationship.initial < -20 ? 'hostile' : definition.relationship.initial > 20 ? 'friendly' : 'neutral',
    relationship: definition.relationship.initial,
    hp: definition.baseStats.hp,
    maxHp: definition.baseStats.hp,
    damageStage: 0,
    currentSkillId: null,
    skillPhase: null,
    cooldowns: {},
    flags: [],
    missingReason: null,
    deathTime: null
  };
}

function spawnHeroAgent(definition, state, sim) {
  const index = (sim.agents?.length ?? 0) + 1;
  const agent = {
    id: `hero-agent-${definition.id.split('.').at(-1)}`,
    index,
    heroId: definition.id,
    name: definition.displayName,
    displayName: definition.displayName,
    role: definition.role,
    faction: 'dungeon',
    ecologyFaction: definition.factionId,
    roomId: definition.initialRoomId,
    homeRoomId: definition.initialRoomId,
    factionCapitalRoomId: definition.initialRoomId,
    size: definition.size,
    level: 8,
    hp: definition.baseStats.hp,
    maxHp: definition.baseStats.hp,
    attack: definition.baseStats.attack,
    baseAttack: definition.baseStats.attack,
    courage: definition.baseStats.courage,
    armor: definition.baseStats.armor,
    alive: true,
    departed: false,
    hidden: false,
    downed: false,
    travel: null,
    combat: null,
    mood: 'hero-reveal',
    unique: true,
    isHero: true
  };
  sim.agents.push(agent);
  ensureHeroRuntime(agent, definition);
  sim.combatSystem?.initializeAgent?.(agent);
  sim.equipmentSystem?.initializeAgent?.(agent);
  sim.occupancy?.placeAgent?.(agent, definition.initialRoomId);
  state.agentId = agent.id;
  state.roomId = agent.roomId;
  return agent;
}

function bindHeroAgent(agent, definition, state, sim) {
  ensureHeroRuntime(agent, definition);
  state.agentId = agent.id;
  state.roomId = agent.roomId;
  state.state = agent.alive === false ? 'dead' : agent.heroState ?? DEFAULT_STATE;
  state.alive = agent.alive !== false;
  sim.combatSystem?.initializeAgent?.(agent);
}

function damageStage(agent, definition) {
  const ratio = Math.max(0, Math.min(1, (agent.hp ?? 0) / Math.max(1, agent.maxHp ?? definition.baseStats.hp)));
  const [stageOne, stageTwo] = definition.visual.damageThresholds;
  if (ratio <= stageTwo) return 2;
  if (ratio <= stageOne) return 1;
  return 0;
}

function cloneState(state) {
  return {
    ...state,
    cooldowns: { ...(state.cooldowns ?? {}) },
    flags: [...(state.flags ?? [])]
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
