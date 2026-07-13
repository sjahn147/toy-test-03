const BASIC_SPECIES = new Set(['rat', 'goblin', 'spider', 'slime', 'ogre', 'skeleton']);
const SAFE_STATES = new Set(['active', 'dormant', 'abandoned', 'destroyed', 'sealed']);

export class SpawnNetworkSystem {
  constructor({ scenario, onEvent = () => {} } = {}) {
    this.config = clone(scenario?.meta?.spawnNetwork ?? scenario?.spawnNetwork ?? null);
    this.enabled = Boolean(this.config?.enabled);
    this.onEvent = onEvent;
    this.clock = 0;
    this.expansionClock = 0;
    this.leakageClock = 0;
    this.sequence = 0;
    this.sites = new Map();
    this.networks = new Map();
    this.socketsByRoom = new Map();
    this.events = [];

    if (!this.enabled) return;
    for (const [roomId, sockets] of Object.entries(this.config.socketsByRoom ?? {})) {
      this.socketsByRoom.set(roomId, (sockets ?? []).map(socket => ({ ...socket, position: [...(socket.position ?? [0, 0])] })));
    }
    for (const source of this.config.sites ?? []) {
      const site = normalizeSite(source);
      if (!SAFE_STATES.has(site.state)) throw new Error(`unsupported spawn site state ${site.state}`);
      this.sites.set(site.id, site);
    }
    for (const source of this.config.networks ?? []) {
      this.networks.set(source.factionId, { ...source, siteIds: new Set(source.siteIds ?? []) });
    }
    this.reindexNetworks();
  }

  initialize(sim) {
    if (!this.enabled) return;
    for (const agent of sim.agents ?? []) this.assignExistingAgent(agent, sim);
    this.refreshPopulation(sim);
  }

  managesSpecies(species) {
    if (!this.enabled) return false;
    return [...this.sites.values()].some(site => site.species.includes(species));
  }

  update(dt, sim) {
    if (!this.enabled || !sim) return;
    this.clock -= dt;
    if (this.clock > 0) return;
    const step = 1;
    this.clock = step;
    this.expansionClock -= step;
    this.leakageClock -= step;

    this.refreshPopulation(sim);
    this.updateSiteTimers(step);
    this.updateIsolation(step, sim);
    if (this.leakageClock <= 0) {
      this.leakageClock = 4;
      this.seedUndeadLeakage(sim);
    }
    if (this.expansionClock <= 0) {
      this.expansionClock = Math.max(8, this.config.expansionInterval ?? 18);
      this.tryExpansion(sim);
    }
    this.trySpawns(sim);
  }

  assignExistingAgent(agent, sim) {
    if (!agent?.alive || agent.faction !== 'dungeon') return;
    const candidates = this.siteCandidatesForAgent(agent);
    const site = candidates.find(candidate => candidate.roomId === agent.roomId)
      ?? candidates.find(candidate => candidate.type === 'core')
      ?? candidates[0];
    if (!site) return;
    agent.birthSiteId ??= site.id;
    agent.homeSiteId ??= site.id;
    agent.homeRoomId = site.roomId;
    agent.factionCapitalRoomId ??= this.coreSite(site)?.roomId ?? site.roomId;
    agent.retreatSiteId ??= site.id;
    if (!agent.ecologyFaction && site.factionId) agent.ecologyFaction = site.factionId;
  }

  siteCandidatesForAgent(agent) {
    return [...this.sites.values()]
      .filter(site => site.state === 'active' && site.species.includes(agent.role))
      .filter(site => !agent.ecologyFaction || site.factionId === agent.ecologyFaction)
      .sort(siteOrder);
  }

  refreshPopulation(sim) {
    for (const site of this.sites.values()) site.localPopulation = 0;
    for (const network of this.networks.values()) network.globalPopulation = 0;
    for (const agent of sim.agents ?? []) {
      if (!agent.alive || agent.departed || agent.faction !== 'dungeon') continue;
      const site = this.sites.get(agent.homeSiteId) ?? this.siteCandidatesForAgent(agent)[0] ?? null;
      if (site) {
        site.localPopulation += 1;
        agent.homeSiteId ??= site.id;
        agent.homeRoomId = site.roomId;
      }
      const network = this.networks.get(agent.ecologyFaction ?? site?.factionId);
      if (network) network.globalPopulation = (network.globalPopulation ?? 0) + (agent.populationCost ?? 1);
    }
  }

  updateSiteTimers(dt) {
    for (const site of this.sites.values()) {
      site.cooldownRemaining = Math.max(0, (site.cooldownRemaining ?? 0) - dt);
      if (site.telegraphRemaining != null) site.telegraphRemaining = Math.max(0, site.telegraphRemaining - dt);
      site.age = (site.age ?? 0) + dt;
    }
  }

  updateIsolation(dt, sim) {
    for (const site of this.sites.values()) {
      if (site.state !== 'active' || !site.requiresSupplyRoute || site.type === 'core') continue;
      const core = this.coreSite(site);
      const supplied = core?.state === 'active' && hasPath(sim.graph, core.roomId, site.roomId);
      site.isolationSeconds = supplied ? 0 : (site.isolationSeconds ?? 0) + dt;
      if (site.isolationSeconds < (this.config.isolationAbandonSeconds ?? 18)) continue;
      site.state = 'abandoned';
      site.telegraphRemaining = null;
      this.emit(`${site.id} was abandoned after its supply route failed.`, { type: 'spawn-site-abandoned', siteId: site.id, roomId: site.roomId });
    }
  }

  trySpawns(sim) {
    if (this.activeSites().length > (this.config.globalActiveSiteCap ?? 28)) return;
    for (const network of [...this.networks.values()].sort((a, b) => a.factionId.localeCompare(b.factionId))) {
      if ((network.globalPopulation ?? 0) >= (network.globalPopulationCap ?? Infinity)) continue;
      const candidates = [...this.sites.values()]
        .filter(site => site.factionId === network.factionId)
        .filter(site => this.siteCanSpawn(site, sim, network))
        .map(site => ({ site, score: this.siteScore(site, sim, network) }))
        .filter(entry => Number.isFinite(entry.score))
        .sort((a, b) => b.score - a.score || a.site.id.localeCompare(b.site.id));
      const selected = candidates[0]?.site;
      if (!selected) continue;
      if (selected.telegraphRemaining == null) {
        const eliteSelection = sim.eliteEcologySystem?.selectSpawnRole?.(selected, network, sim) ?? null;
        selected.pendingRole = eliteSelection?.role ?? this.selectSpecies(selected, sim);
        selected.telegraphRemaining = this.config.defaultTelegraphSeconds ?? 2;
        this.emitTelegraph(selected, sim);
        continue;
      }
      if (selected.telegraphRemaining > 0) continue;
      this.spawnFromSite(selected, sim, network);
    }
  }

  siteCanSpawn(site, sim, network) {
    if (site.state !== 'active' || site.eventLocked || site.cooldownRemaining > 0) return false;
    if (site.spawnCharges === 0 || site.localPopulation >= site.capacity) return false;
    if ((network.globalPopulation ?? 0) >= (network.globalPopulationCap ?? Infinity)) return false;
    if (this.partyOccupies(site.roomId, sim)) return false;
    if (site.requiresSupplyRoute) {
      const core = this.coreSite(site);
      if (!core || core.state !== 'active' || !hasPath(sim.graph, core.roomId, site.roomId)) return false;
    }
    return this.hasSpawnResource(site);
  }

  siteScore(site, sim, network) {
    const room = (sim.rooms ?? []).find(candidate => candidate.id === site.roomId);
    if (!room || room.tags?.includes('safe_zone') || room.tags?.includes('safe-zone')) return -Infinity;
    const depth = Number(room.depthBand ?? room.layoutDepth ?? room.id?.charCodeAt?.(0) ?? 0);
    const affinity = network.depthAffinity?.includes(room.depthBand) ? 18 : 0;
    const capacity = Math.max(0, site.capacity - site.localPopulation) * 6;
    const supply = Object.values(site.supply ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const concealment = this.socket(site)?.visibility === 'occluded' ? 5 : 0;
    const recent = site.lastSpawnAt == null ? 0 : Math.max(0, 12 - (site.age - site.lastSpawnAt));
    return affinity + capacity + Math.min(10, supply) + concealment + depth * 0.001 - recent;
  }

  spawnFromSite(site, sim, network) {
    const species = site.pendingRole ?? this.selectSpecies(site, sim);
    const elite = sim.eliteEcologySystem?.hasRole?.(species) === true;
    let agent = null;
    if (elite) {
      agent = sim.eliteEcologySystem.spawn(species, site, network, sim);
    } else if (BASIC_SPECIES.has(species) && typeof sim.spawnEcologyMonster === 'function') {
      agent = sim.spawnEcologyMonster(species, site.roomId);
    } else if (typeof sim.spawnAdvancedMonster === 'function') {
      agent = sim.spawnAdvancedMonster(species, site.roomId);
    }
    if (!agent) {
      site.telegraphRemaining = Math.max(1, (this.config.defaultTelegraphSeconds ?? 2) * 0.6);
      if (elite) site.pendingRole = null;
      return null;
    }

    agent.ecologyFaction = site.factionId;
    agent.birthSiteId = site.id;
    agent.homeSiteId = site.id;
    agent.homeRoomId = site.roomId;
    agent.factionCapitalRoomId = this.coreSite(site)?.roomId ?? site.roomId;
    agent.retreatSiteId = site.id;
    site.localPopulation += 1;
    site.spawned = (site.spawned ?? 0) + 1;
    site.lastSpawnAt = site.age;
    site.cooldownRemaining = site.cooldown;
    site.telegraphRemaining = null;
    if (Number.isFinite(site.spawnCharges)) site.spawnCharges = Math.max(0, site.spawnCharges - 1);
    if (!elite) this.consumeSpawnResource(site, species);
    site.pendingRole = null;
    network.globalPopulation = (network.globalPopulation ?? 0) + (agent.populationCost ?? 1);
    this.emit(`${agent.name} emerged from ${site.id}.`, { type: 'spawn-site-birth', siteId: site.id, roomId: site.roomId, agentId: agent.id, species });
    return agent;
  }

  selectSpecies(site, sim) {
    const species = [...site.species];
    species.sort((a, b) => {
      const ac = (sim.agents ?? []).filter(agent => agent.alive && agent.role === a).length;
      const bc = (sim.agents ?? []).filter(agent => agent.alive && agent.role === b).length;
      return ac - bc || a.localeCompare(b);
    });
    return species[0];
  }

  hasSpawnResource(site) {
    if (site.type === 'core' && site.spawnCharges > 100) return true;
    const values = Object.values(site.supply ?? {});
    return values.length === 0 || values.some(value => Number(value) >= 1);
  }

  consumeSpawnResource(site, species) {
    const preferred = resourcePreference(species);
    if (preferred && Number(site.supply?.[preferred]) >= 1) {
      site.supply[preferred] -= 1;
      return;
    }
    for (const key of Object.keys(site.supply ?? {}).sort()) {
      if (Number(site.supply[key]) < 1) continue;
      site.supply[key] -= 1;
      return;
    }
  }

  emitTelegraph(site, sim) {
    const socket = this.socket(site);
    const family = site.pendingRole ?? site.species[0] ?? 'creature';
    const cue = telegraphCue(family);
    this.emit(`${cue} in ${roomName(sim, site.roomId)}.`, {
      type: 'spawn-site-telegraph', siteId: site.id, socketId: site.socketId, roomId: site.roomId, species: family
    });
  }

  partyOccupies(roomId, sim) {
    return (sim.agents ?? []).some(agent => agent.alive && !agent.departed && !agent.hidden && agent.faction === 'party' && agent.roomId === roomId);
  }

  tryExpansion(sim) {
    if (this.activeSites().length >= (this.config.globalActiveSiteCap ?? 28)) return;
    for (const network of [...this.networks.values()].sort((a, b) => a.factionId.localeCompare(b.factionId))) {
      const fieldSites = [...this.sites.values()].filter(site => site.factionId === network.factionId && site.type === 'field-camp' && site.state === 'active');
      if (fieldSites.length >= (network.fieldCampCap ?? 0)) continue;
      const occupants = (sim.agents ?? [])
        .filter(agent => agent.alive && !agent.departed && !agent.travel && agent.faction === 'dungeon' && agent.ecologyFaction === network.factionId)
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const candidate = occupants.find(agent => this.canEstablishInRoom(agent.roomId, network, sim));
      if (!candidate) continue;
      this.establishFieldCamp({ factionId: network.factionId, roomId: candidate.roomId, species: candidate.role }, sim);
    }
  }

  canEstablishInRoom(roomId, network, sim) {
    if (!roomId || this.config.safeZoneIds?.includes(roomId)) return false;
    if ([...this.sites.values()].some(site => site.roomId === roomId && site.state === 'active')) return false;
    const room = (sim.rooms ?? []).find(candidate => candidate.id === roomId);
    if (!room || room.tags?.includes('safe_zone') || room.tags?.includes('safe-zone')) return false;
    const socket = (this.socketsByRoom.get(roomId) ?? []).find(candidate => candidate.activationPolicy !== 'event-only');
    if (!socket) return false;
    const core = this.sites.get(network.coreSiteId);
    return !core || hasPath(sim.graph, core.roomId, roomId);
  }

  establishFieldCamp({ factionId, roomId, species }, sim) {
    const network = this.networks.get(factionId);
    const socket = (this.socketsByRoom.get(roomId) ?? [])[0];
    if (!network || !socket) return null;
    const id = `site.dynamic.${factionId}.${roomId}.${this.sequence++}`;
    const site = normalizeSite({
      id, factionId, species: [species], roomId, socketId: socket.id, type: 'field-camp', tier: 1,
      state: 'active', capacity: 2, spawnCharges: 3, cooldown: 24, coreSiteId: network.coreSiteId,
      requiresSupplyRoute: true, supply: { fieldRations: 3 }
    });
    this.sites.set(id, site);
    network.siteIds.add(id);
    this.emit(`${factionId} established a field camp in ${roomName(sim, roomId)}.`, { type: 'spawn-site-created', siteId: id, roomId, factionId });
    return { ...site };
  }

  seedUndeadLeakage(sim) {
    const rule = this.config.undeadLeakage;
    if (!rule || this.activeSites().length >= (this.config.globalActiveSiteCap ?? 28)) return;
    const counts = new Map();
    for (const corpse of sim.ecosystem?.corpses ?? []) counts.set(corpse.roomId, (counts.get(corpse.roomId) ?? 0) + 1);
    for (const [roomId, count] of [...counts.entries()].sort()) {
      if (count < (rule.corpseThreshold ?? 3)) continue;
      const zone = String(roomId)[0];
      if (rule.excludedZones?.includes(zone) || this.config.safeZoneIds?.includes(roomId)) continue;
      if ([...this.sites.values()].some(site => site.roomId === roomId && site.factionId === 'undead-host' && site.state === 'active')) continue;
      const socket = (this.socketsByRoom.get(roomId) ?? [])[0];
      if (!socket) continue;
      const species = rule.species[Math.abs(hash(roomId)) % rule.species.length];
      const id = `site.emergent.undead.${roomId}.${this.sequence++}`;
      const site = normalizeSite({
        id, factionId: 'undead-host', species: [species], roomId, socketId: socket.id,
        type: rule.siteType ?? 'emergent', tier: 1, state: 'active', capacity: 2,
        spawnCharges: Math.min(3, count), cooldown: 28, coreSiteId: 'site.zombie.E22.core',
        requiresSupplyRoute: false, supply: { corpses: count }
      });
      this.sites.set(id, site);
      this.networks.get('undead-host')?.siteIds.add(id);
      this.emit(`Unburied dead formed a new ${species} site in ${roomName(sim, roomId)}.`, { type: 'undead-leakage', siteId: id, roomId, species });
      break;
    }
  }

  destroySite(siteId, reason = 'destroyed') {
    const site = this.sites.get(siteId);
    if (!site) return false;
    site.state = 'destroyed';
    site.telegraphRemaining = null;
    this.emit(`${site.id} was destroyed.`, { type: 'spawn-site-destroyed', siteId, roomId: site.roomId, reason });
    return true;
  }

  activateSite(siteId) {
    const site = this.sites.get(siteId);
    if (!site || site.state === 'destroyed') return false;
    site.state = 'active';
    site.eventLocked = false;
    return true;
  }

  coreSite(site) {
    return this.sites.get(site.coreSiteId) ?? (site.type === 'core' ? site : null);
  }

  socket(site) {
    return (this.socketsByRoom.get(site.roomId) ?? []).find(socket => socket.id === site.socketId) ?? null;
  }

  activeSites() {
    return [...this.sites.values()].filter(site => site.state === 'active');
  }

  reindexNetworks() {
    for (const network of this.networks.values()) network.siteIds = new Set();
    for (const site of this.sites.values()) this.networks.get(site.factionId)?.siteIds.add(site.id);
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot() {
    if (!this.enabled) return { enabled: false, sites: [], networks: [], socketsByRoom: {} };
    return {
      enabled: true,
      globalActiveSiteCap: this.config.globalActiveSiteCap ?? 28,
      activeSiteCount: this.activeSites().length,
      sites: [...this.sites.values()].sort(siteOrder).map(site => ({ ...site, species: [...site.species], supply: { ...site.supply } })),
      networks: [...this.networks.values()].sort((a, b) => a.factionId.localeCompare(b.factionId)).map(network => ({ ...network, siteIds: [...network.siteIds].sort() })),
      socketsByRoom: Object.fromEntries([...this.socketsByRoom].map(([roomId, sockets]) => [roomId, sockets.map(socket => ({ ...socket, position: [...socket.position] }))])),
      recentEvents: this.events.map(event => ({ ...event }))
    };
  }

  metrics() {
    return {
      spawnSitesActive: this.activeSites().length,
      spawnSitesAbandoned: [...this.sites.values()].filter(site => site.state === 'abandoned').length,
      spawnFieldCamps: [...this.sites.values()].filter(site => site.type === 'field-camp' && site.state === 'active').length,
      spawnOutposts: [...this.sites.values()].filter(site => site.type === 'outpost' && site.state === 'active').length
    };
  }
}

function normalizeSite(source) {
  return {
    ...source,
    species: [...(source.species ?? [])],
    supply: { ...(source.supply ?? {}) },
    state: source.state ?? 'dormant',
    capacity: Math.max(1, Number(source.capacity) || 1),
    spawnCharges: Number.isFinite(source.spawnCharges) ? source.spawnCharges : 0,
    cooldown: Math.max(1, Number(source.cooldown) || 18),
    cooldownRemaining: 0,
    telegraphRemaining: null,
    pendingRole: source.pendingRole ?? null,
    isolationSeconds: 0,
    localPopulation: 0,
    spawned: 0,
    age: 0
  };
}

function resourcePreference(species) {
  return {
    goblin: 'food', kobold: 'scrap', orc: 'meat', rat: 'grain', slime: 'biomass',
    spider: 'hosts', stirge: 'blood', myconid: 'spore', carrion: 'carrion', parasite: 'hosts',
    zombie: 'corpses', skeleton: 'bones', wraith: 'deathEnergy'
  }[species] ?? null;
}

function telegraphCue(species) {
  return {
    goblin: 'Crates scrape and hushed bargaining starts',
    kobold: 'Tools chatter inside a maintenance alcove',
    orc: 'Boots stamp behind a barracks screen',
    rat: 'Dust trickles from a gnawed wall hole',
    slime: 'Drain water gathers into a moving sheen',
    spider: 'A ceiling thread tightens under fresh weight',
    stirge: 'Leather wings stir above the lantern line',
    myconid: 'A spore bed swells and cracks',
    carrion: 'The carrion pit shifts from underneath',
    parasite: 'A wet shell begins to split',
    skeleton: 'Loose bones pull themselves into order',
    zombie: 'A corpse stack takes a first breath',
    wraith: 'Cold shadow leaks from a hairline fracture'
  }[species] ?? 'Something begins to emerge';
}

function hasPath(graph, start, goal) {
  if (!start || !goal) return false;
  if (start === goal) return true;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    const raw = graph?.get?.(current) ?? [];
    const neighbors = raw instanceof Set ? [...raw] : [...raw];
    for (const next of neighbors) {
      if (seen.has(next)) continue;
      if (next === goal) return true;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

function roomName(sim, roomId) {
  return (sim.rooms ?? []).find(room => room.id === roomId)?.name ?? roomId;
}

function siteOrder(a, b) {
  const rank = { core: 0, outpost: 1, 'field-camp': 2, emergent: 3 };
  return (rank[a.type] ?? 9) - (rank[b.type] ?? 9) || a.id.localeCompare(b.id);
}

function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) | 0;
  return result;
}

function clone(value) {
  if (value == null) return null;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
