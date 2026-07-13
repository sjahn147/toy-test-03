import { ELITE_BESTIARY, getEliteDefinition, isEliteRole } from '../content/elite/EliteBestiary.js';

const TIER_RANK = { veteran: 1, specialist: 1, elite: 2, large: 2, champion: 3, abomination: 3 };
const FACTION_GROUPS = {
  'wild-rat': new Set(['wild-rat', 'warren-vermin']),
  'warren-vermin': new Set(['wild-rat', 'warren-vermin']),
  'wild-slime': new Set(['wild-slime', 'slime-bloom']),
  'slime-bloom': new Set(['wild-slime', 'slime-bloom']),
  'pale-brood': new Set(['pale-brood', 'carrion-brood']),
  'carrion-brood': new Set(['pale-brood', 'carrion-brood'])
};

const RESOURCE_ALIASES = {
  stolenGoods: ['scrap', 'food'],
  mechanismParts: ['scrap'],
  powder: ['scrap'],
  weapons: ['trophy', 'scrap'],
  timber: ['scrap'],
  air: ['food'],
  biomass: ['spore', 'carrion'],
  silk: ['blood', 'hosts'],
  reagents: ['hosts', 'deathEnergy'],
  glass: ['scrap'],
  metal: ['scrap'],
  water: ['biomass'],
  refuse: ['grain'],
  corpses: ['carrion'],
  bones: ['corpses'],
  food: ['grain', 'meat']
};

export class EliteEcologySystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.sequence = 0;
    this.spawnedByRole = new Map();
    this.activeByRole = new Map();
    this.events = [];
  }

  initialize(sim) {
    for (const agent of sim.agents ?? []) this.initializeAgent(agent, sim);
    this.refreshCounts(sim);
    this.bootstrapNetworkResources(sim);
  }

  initializeAgent(agent, sim = null) {
    const definition = getEliteDefinition(agent?.role);
    if (!definition || !agent) return false;
    agent.eliteTier ??= definition.tier;
    agent.size = definition.size;
    agent.maxHp = Math.max(agent.maxHp ?? 0, definition.stats.hp);
    agent.hp = agent.alive === false ? 0 : Math.max(1, Math.min(agent.hp ?? definition.stats.hp, agent.maxHp));
    agent.baseAttack = definition.stats.attack;
    agent.attack = definition.stats.attack;
    agent.courage = definition.stats.courage;
    agent.baseSpeed = definition.stats.speed;
    agent.speedMultiplier ??= definition.stats.speed;
    agent.armor = definition.stats.armor ?? 0;
    agent.eliteCooldowns ??= {};
    agent.eliteStatuses ??= {};
    agent.eliteCast ??= null;
    agent.populationCost = definition.ecology.populationCost;
    agent.displayName ??= definition.name;
    agent.spawnedAt ??= sim?.time ?? 0;
    sim?.combatSystem?.initializeAgent?.(agent);
    return true;
  }

  update(dt, sim) {
    for (const agent of sim.agents ?? []) {
      if (!isEliteRole(agent.role)) continue;
      this.initializeAgent(agent, sim);
      agent.eliteSpawnRemaining = Math.max(0, (agent.eliteSpawnRemaining ?? 0) - dt);
    }
    this.refreshCounts(sim);
  }

  hasRole(role) {
    return isEliteRole(role);
  }

  selectSpawnRole(site, network, sim) {
    if (!site || !network) return null;
    const cycle = (site.spawned ?? 0) + (site.localPopulation ?? 0);
    const desiredRank = desiredTierRank(site.type, site.tier ?? 1, cycle);
    if (desiredRank === 0) return null;

    const candidates = Object.values(ELITE_BESTIARY)
      .filter(definition => factionMatches(definition.factionId, site.factionId))
      .filter(definition => definition.ecology.siteTypes.includes(site.type) || (site.type === 'event' && definition.ecology.siteTypes.includes('core')))
      .filter(definition => (site.tier ?? 1) >= definition.ecology.siteTier)
      .filter(definition => definition.ecology.parentSpecies === site.species[0] || site.species.includes(definition.ecology.parentSpecies) || site.type === 'core' || site.type === 'event')
      .filter(definition => TIER_RANK[definition.tier] <= desiredRank)
      .filter(definition => this.canSpawnDefinition(definition, site, network, sim))
      .sort((a, b) => {
        const ar = TIER_RANK[a.tier] ?? 0;
        const br = TIER_RANK[b.tier] ?? 0;
        return br - ar || (this.activeByRole.get(a.role) ?? 0) - (this.activeByRole.get(b.role) ?? 0) || a.role.localeCompare(b.role);
      });

    const selected = candidates[0];
    return selected ? { role: selected.role, definition: selected } : null;
  }

  canSpawnDefinition(definition, site, network, sim) {
    const active = this.activeByRole.get(definition.role) ?? 0;
    if (active >= definition.ecology.globalCap) return false;
    const local = (sim.agents ?? []).filter(agent => agent.alive && agent.role === definition.role && agent.homeSiteId === site.id).length;
    if (local >= definition.ecology.localCap) return false;
    const usedPopulation = (network.globalPopulation ?? 0);
    if (usedPopulation + definition.ecology.populationCost > (network.globalPopulationCap ?? Infinity)) return false;
    if (definition.size === 'large' || definition.size === 'huge') {
      const room = (sim.rooms ?? []).find(candidate => candidate.id === site.roomId);
      const minimum = definition.size === 'huge' ? 15 : 11;
      if (!room || Math.min(room.w ?? 0, room.d ?? 0) < minimum) return false;
    }
    return this.canAfford(definition, network, sim);
  }

  canAfford(definition, network, sim) {
    const pool = this.resourcePool(network, sim);
    return Object.entries(definition.ecology.costs ?? {}).every(([resource, amount]) => availableWithAliases(pool, resource) >= amount);
  }

  consumeCosts(definition, network, sim) {
    const sites = this.networkSites(network, sim).filter(site => site.state === 'active');
    for (const [resource, amount] of Object.entries(definition.ecology.costs ?? {})) {
      let remaining = amount;
      for (const key of [resource, ...(RESOURCE_ALIASES[resource] ?? [])]) {
        for (const site of sites.sort((a, b) => siteRank(a) - siteRank(b) || a.id.localeCompare(b.id))) {
          const available = Math.max(0, Number(site.supply?.[key]) || 0);
          if (available <= 0 || remaining <= 0) continue;
          const spent = Math.min(available, remaining);
          site.supply[key] = available - spent;
          remaining -= spent;
        }
        if (remaining <= 0) break;
      }
      if (remaining > 0) return false;
    }
    return true;
  }

  spawn(role, site, network, sim) {
    const definition = getEliteDefinition(role);
    if (!definition || !this.canSpawnDefinition(definition, site, network, sim)) return null;
    if (!this.consumeCosts(definition, network, sim)) return null;

    const index = this.sequence++;
    const agent = {
      id: `elite-${role}-${index + 1}`,
      index: (sim.agents?.length ?? 0) + index,
      name: uniqueName(definition.name, index),
      displayName: definition.name,
      role,
      faction: 'dungeon',
      ecologyFaction: site.factionId,
      roomId: site.roomId,
      homeRoomId: site.roomId,
      homeSiteId: site.id,
      birthSiteId: site.id,
      retreatSiteId: site.id,
      factionCapitalRoomId: sim.spawnNetworkSystem?.coreSite?.(site)?.roomId ?? site.roomId,
      size: definition.size,
      level: Math.max(2, TIER_RANK[definition.tier] + 1),
      hp: definition.stats.hp,
      maxHp: definition.stats.hp,
      attack: definition.stats.attack,
      baseAttack: definition.stats.attack,
      courage: definition.stats.courage,
      alive: true,
      departed: false,
      hidden: false,
      mood: 'emerging',
      eliteSpawnRemaining: definition.size === 'huge' ? 2.4 : definition.size === 'large' ? 1.8 : 1.2,
      populationCost: definition.ecology.populationCost,
      eliteTier: definition.tier
    };
    sim.agents.push(agent);
    this.initializeAgent(agent, sim);
    sim.occupancy?.placeAgent?.(agent, site.roomId);
    this.spawnedByRole.set(role, (this.spawnedByRole.get(role) ?? 0) + 1);
    this.activeByRole.set(role, (this.activeByRole.get(role) ?? 0) + 1);
    this.emit(`${definition.name} completed its preparation at ${site.id}.`, { type: 'elite-spawn', role, siteId: site.id, roomId: site.roomId, agentId: agent.id });
    return agent;
  }

  onAgentDeath(agent, sim) {
    const definition = getEliteDefinition(agent?.role);
    if (!definition) return;
    this.activeByRole.set(agent.role, Math.max(0, (this.activeByRole.get(agent.role) ?? 1) - 1));
    const split = definition.abilities.find(action => action.effects?.some(effect => effect.type === 'split-on-death'));
    if (split) {
      const effect = split.effects.find(candidate => candidate.type === 'split-on-death');
      for (let i = 0; i < (effect.count ?? 2); i += 1) sim.spawnAdvancedMonster?.(effect.role ?? definition.parentSpecies, agent.roomId);
    }
    this.emit(`${definition.name} was destroyed.`, { type: 'elite-death', role: agent.role, agentId: agent.id, roomId: agent.roomId });
  }

  refreshCounts(sim) {
    this.activeByRole.clear();
    for (const agent of sim.agents ?? []) {
      if (!agent.alive || agent.departed || !isEliteRole(agent.role)) continue;
      this.activeByRole.set(agent.role, (this.activeByRole.get(agent.role) ?? 0) + 1);
    }
  }

  bootstrapNetworkResources(sim) {
    const additions = {
      'goblin-clan': { stolenGoods: 8, powder: 3 },
      'copper-tail-clutch': { mechanismParts: 8, powder: 4 },
      'red-tusk-tribe': { weapons: 7, timber: 4 },
      'undead-host': { deathEnergy: 6, bones: 4, corpses: 4 },
      'bluecap-colony': { biomass: 8 },
      'red-wing-brood': { silk: 8, hosts: 2 },
      'pale-brood': { reagents: 8, carrion: 5 },
      'wild-slime': { water: 5, metal: 4, glass: 2 },
      'wild-rat': { refuse: 6 }
    };
    for (const network of sim.spawnNetworkSystem?.networks?.values?.() ?? []) {
      const core = sim.spawnNetworkSystem.sites.get(network.coreSiteId);
      if (!core) continue;
      for (const [resource, amount] of Object.entries(additions[network.factionId] ?? {})) {
        core.supply[resource] = Math.max(Number(core.supply[resource]) || 0, amount);
      }
    }
  }

  networkSites(network, sim) {
    return [...(network.siteIds ?? [])].map(id => sim.spawnNetworkSystem?.sites?.get(id)).filter(Boolean);
  }

  resourcePool(network, sim) {
    const pool = {};
    for (const site of this.networkSites(network, sim)) {
      if (site.state !== 'active') continue;
      for (const [key, value] of Object.entries(site.supply ?? {})) pool[key] = (pool[key] ?? 0) + Math.max(0, Number(value) || 0);
    }
    return pool;
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot() {
    return {
      roles: Object.keys(ELITE_BESTIARY).length,
      activeByRole: Object.fromEntries([...this.activeByRole].sort()),
      spawnedByRole: Object.fromEntries([...this.spawnedByRole].sort()),
      recentEvents: this.events.map(event => ({ ...event }))
    };
  }

  metrics() {
    return {
      eliteRolesAvailable: Object.keys(ELITE_BESTIARY).length,
      eliteAgentsActive: [...this.activeByRole.values()].reduce((sum, value) => sum + value, 0),
      eliteLargeActive: [...this.activeByRole].reduce((sum, [role, count]) => ['large', 'huge'].includes(getEliteDefinition(role)?.size) ? sum + count : sum, 0),
      eliteChampionsActive: [...this.activeByRole].reduce((sum, [role, count]) => getEliteDefinition(role)?.tier === 'champion' ? sum + count : sum, 0)
    };
  }
}

function desiredTierRank(siteType, siteTier, cycle) {
  if (siteType === 'event') return 3;
  if (siteType === 'core') {
    if (siteTier >= 3 && cycle % 13 === 12) return 3;
    if (siteTier >= 2 && cycle % 7 === 6) return 2;
    if (cycle % 3 === 2) return 1;
    return 0;
  }
  if (siteType === 'outpost') return cycle % 4 === 3 ? Math.min(2, siteTier) : 0;
  if (siteType === 'field-camp') return cycle % 6 === 5 ? 1 : 0;
  if (siteType === 'emergent') return cycle % 5 === 4 ? Math.min(2, siteTier) : 0;
  return 0;
}

function factionMatches(definitionFaction, networkFaction) {
  if (definitionFaction === networkFaction) return true;
  return FACTION_GROUPS[networkFaction]?.has(definitionFaction) ?? false;
}

function availableWithAliases(pool, resource) {
  return [resource, ...(RESOURCE_ALIASES[resource] ?? [])].reduce((sum, key) => sum + Math.max(0, Number(pool[key]) || 0), 0);
}

function siteRank(site) {
  return { core: 0, outpost: 1, 'field-camp': 2, emergent: 3, event: 4 }[site.type] ?? 9;
}

function uniqueName(name, index) {
  const suffix = String.fromCharCode(65 + (index % 26));
  return `${name} ${suffix}`;
}
