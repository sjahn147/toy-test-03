const INN_ROOM_IDS = Object.freeze(['H36', 'H37', 'H38', 'H39', 'H40']);
const PARTY_ROLES = Object.freeze(['fighter', 'rogue', 'cleric', 'wizard', 'archer']);
const LABOR_ROLES = new Set(['fighter', 'rogue', 'cleric', 'wizard', 'archer', 'goblin', 'kobold']);

const TIER_PROFILES = Object.freeze([
  Object.freeze({ name: 'ruin', capacity: 0, guestCapacity: 0, comfort: 0, security: 2, recovery: 0, trade: false, rumors: false, smuggling: false }),
  Object.freeze({ name: 'camp', capacity: 4, guestCapacity: 2, comfort: 7, security: 8, recovery: 4, trade: false, rumors: true, smuggling: false }),
  Object.freeze({ name: 'outpost', capacity: 10, guestCapacity: 4, comfort: 14, security: 18, recovery: 9, trade: true, rumors: true, smuggling: false }),
  Object.freeze({ name: 'inn', capacity: 18, guestCapacity: 8, comfort: 25, security: 28, recovery: 15, trade: true, rumors: true, smuggling: true }),
  Object.freeze({ name: 'fortified-inn', capacity: 24, guestCapacity: 10, comfort: 28, security: 46, recovery: 18, trade: true, rumors: true, smuggling: true })
]);

const UPGRADE_COSTS = Object.freeze([
  null,
  Object.freeze({ materials: 2, supply: 2, labor: 7 }),
  Object.freeze({ materials: 5, supply: 4, labor: 16 }),
  Object.freeze({ materials: 9, supply: 7, labor: 30 }),
  Object.freeze({ materials: 13, supply: 10, labor: 48 })
]);

export class OldLanternInnSystem {
  constructor({ rooms, graph, settlementSystem, territorySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.graph = graph;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.onEvent = onEvent;
    this.enabled = INN_ROOM_IDS.every(roomId => rooms.some(room => room.id === roomId));
    this.settlementId = 'settlement-old-lantern-inn';
    this.tier = 0;
    this.stage = 'ruin';
    this.progress = 0;
    this.integrity = 28;
    this.state = 'ruined';
    this.lastState = null;
    this.lastTier = 0;
    this.tickClock = 0;
    this.serviceClock = 0;
    this.lastThreatAt = -999;
    this.sackedUntil = -1;
    this.roomStates = new Map();
    this.lastSnapshot = null;
  }

  initialize(sim) {
    if (!this.enabled) return;
    if (!this.settlementSystem.settlements.has(this.settlementId)) {
      this.settlementSystem.registerSettlement(this.createSettlement(sim));
    }
    this.applyRoomStates(sim);
    this.syncSettlement(sim);
  }

  createSettlement(sim) {
    return {
      id: this.settlementId,
      anchorPropId: null,
      factionId: 'adventurer-expedition',
      species: null,
      allowedSpecies: [...PARTY_ROLES],
      type: 'old-lantern-inn',
      roomId: 'H36',
      tier: 0,
      state: 'ruined',
      previousState: null,
      indestructible: false,
      managedBy: 'old-lantern-inn',
      baseCapacity: 0,
      capacity: 0,
      guestCapacity: 0,
      roamingRange: 99,
      homeAttachment: 0.92,
      minimumGarrison: 0,
      structuralIntegrity: this.integrity,
      control: 0,
      controlRequired: 25,
      contested: false,
      population: 0,
      presentPopulation: 0,
      overcrowded: 0,
      residentIds: [],
      presentIds: [],
      displacedIds: [],
      food: 0,
      water: 0,
      medicine: 0,
      materials: 2,
      wealth: 0,
      comfort: 0,
      security: 2,
      recoveryPower: 0,
      buildings: [],
      anchorPresent: true,
      visualPlacement: { ox: 0, oz: 0, rotation: 0, scale: 0 },
      foundedAt: sim.time ?? 0,
      lastAttackedAt: null,
      abandonedAt: null,
      innStage: 'ruin',
      services: {}
    };
  }

  update(dt, sim) {
    if (!this.enabled) return;
    this.tickClock -= dt;
    this.serviceClock -= dt;
    if (this.tickClock <= 0) {
      this.tickClock = 0.75;
      this.updateFacility(0.75, sim);
    }
    if (this.serviceClock <= 0) {
      this.serviceClock = 0.6;
      this.applyServices(0.6, sim);
    }
  }

  updateFacility(dt, sim) {
    const settlement = this.ensureSettlement(sim);
    if (!settlement) return;
    const signals = this.collectSignals(sim);
    const hostilePressure = signals.hostiles.length + (signals.contestedRooms * 1.35);
    const labor = signals.workers.length;
    const supplied = this.availableSupply();

    if (hostilePressure > 0) {
      this.lastThreatAt = sim.time;
      this.integrity = Math.max(0, this.integrity - dt * (0.8 + hostilePressure * 0.72));
      settlement.lastAttackedAt = sim.time;
      if (hostilePressure >= 4 && this.integrity < 24) this.sackedUntil = Math.max(this.sackedUntil, sim.time + 24);
    } else if (labor > 0 && this.tier > 0) {
      this.integrity = Math.min(100, this.integrity + dt * (0.22 + labor * 0.16));
    }

    const nextCost = UPGRADE_COSTS[this.tier + 1];
    if (nextCost && labor > 0 && hostilePressure === 0) {
      const materialFactor = Math.min(1, (settlement.materials ?? 0) / Math.max(1, nextCost.materials));
      const supplyFactor = Math.min(1, supplied / Math.max(1, nextCost.supply));
      const clericBonus = signals.workers.some(agent => agent.role === 'cleric') ? 1.12 : 1;
      const rogueBonus = signals.workers.some(agent => agent.role === 'rogue') ? 1.08 : 1;
      this.progress += dt * labor * (0.48 + 0.52 * Math.min(materialFactor, supplyFactor)) * clericBonus * rogueBonus;
      if (this.progress >= nextCost.labor && materialFactor >= 1 && supplyFactor >= 1) {
        this.completeUpgrade(settlement, nextCost, sim);
      }
    }

    if (this.integrity <= 0) {
      this.tier = 0;
      this.progress = 0;
      this.sackedUntil = Math.max(this.sackedUntil, sim.time + 30);
    } else if (this.tier > 1 && this.integrity < 18) {
      this.tier -= 1;
      this.progress = 0;
      this.onEvent(`The Old Lantern Inn lost a restoration tier as its structures failed.`);
      sim.emitEffect?.('old-lantern-downgrade', { roomId: 'H36', duration: 1.4 });
    }

    this.stage = TIER_PROFILES[this.tier].name;
    this.state = this.deriveFacilityState(signals, sim);
    this.applyRoomStates(sim, signals);
    this.syncSettlement(sim, signals);
    this.emitTransitions(sim);
    this.lastSnapshot = this.buildSnapshot(signals, settlement);
  }

  ensureSettlement(sim) {
    let settlement = this.settlementSystem.settlements.get(this.settlementId);
    if (!settlement) {
      settlement = this.createSettlement(sim);
      this.settlementSystem.registerSettlement(settlement);
    }
    return settlement;
  }

  collectSignals(sim) {
    const innRooms = new Set(INN_ROOM_IDS);
    const present = sim.agents.filter(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && innRooms.has(agent.roomId));
    const friendlies = present.filter(agent => this.agentFaction(agent) === 'adventurer-expedition');
    const hostiles = present.filter(agent => this.agentFaction(agent) !== 'adventurer-expedition');
    const workers = friendlies.filter(agent => LABOR_ROLES.has(agent.role) && !agent.combat && !agent.downed);
    const roles = new Set(hostiles.map(agent => agent.role));
    let contestedRooms = 0;
    let controlledRooms = 0;
    for (const roomId of INN_ROOM_IDS) {
      const territory = this.territorySystem?.roomStates?.get(roomId);
      if (territory?.contested || (territory?.owner && territory.owner !== 'adventurer-expedition')) contestedRooms += 1;
      if (territory?.owner === 'adventurer-expedition' && !territory.contested) controlledRooms += 1;
    }
    return { present, friendlies, hostiles, workers, roles, contestedRooms, controlledRooms };
  }

  completeUpgrade(settlement, cost, sim) {
    settlement.materials = Math.max(0, (settlement.materials ?? 0) - cost.materials);
    const supply = this.availableSupply();
    this.territorySystem?.factionSupply?.set('adventurer-expedition', Math.max(0, supply - cost.supply));
    this.tier += 1;
    this.integrity = Math.max(this.integrity, 34 + this.tier * 13);
    this.progress = 0;
    const stage = TIER_PROFILES[this.tier].name;
    this.onEvent(`The Old Lantern Inn advanced to ${stage}.`);
    sim.emitEffect?.('old-lantern-upgrade', { roomId: 'H36', duration: 1.5, tier: this.tier });
  }

  deriveFacilityState(signals, sim) {
    if (sim.time < this.sackedUntil || this.integrity <= 8) return 'sacked';
    if (signals.hostiles.length > 0 || signals.contestedRooms > 0) return 'besieged';
    return this.tier === 0 ? 'ruined' : TIER_PROFILES[this.tier].name;
  }

  applyRoomStates(sim, signals = null) {
    if (!this.enabled) return;
    const threatRoles = signals?.roles ?? new Set();
    const sacked = this.state === 'sacked';
    const besieged = this.state === 'besieged';
    const states = {
      H36: sacked ? 'burned' : besieged ? 'besieged' : ['ruined', 'bivouac', 'repaired', 'prosperous', 'prosperous'][this.tier],
      H37: threatRoles.has('slime') || threatRoles.has('rat') ? 'infested' : sacked ? 'blackened' : ['blackened', 'camp-kitchen', 'working', 'working', 'working'][this.tier],
      H38: threatRoles.has('spider') || threatRoles.has('stirge') ? 'webbed' : sacked ? 'collapsed' : ['collapsed', 'partitioned-camp', 'guestrooms', 'guestrooms', 'guestrooms'][this.tier],
      H39: threatRoles.has('myconid') ? 'fungal-brewery' : sacked ? 'raided' : ['flooded', 'flooded', 'stocked', 'stocked', 'stocked'][this.tier],
      H40: sacked ? 'discovered' : this.tier >= 3 ? 'operations-room' : this.tier >= 2 ? 'discovered' : 'sealed'
    };
    for (const [roomId, visualState] of Object.entries(states)) {
      const room = this.rooms.find(candidate => candidate.id === roomId);
      if (!room) continue;
      room.visualState = visualState;
      room.stateVariant = visualState;
      room.innTier = this.tier;
      room.innFacilityState = this.state;
      this.roomStates.set(roomId, visualState);
    }
  }

  syncSettlement(sim, signals = null) {
    const settlement = this.settlementSystem.settlements.get(this.settlementId);
    if (!settlement) return;
    const profile = TIER_PROFILES[this.tier];
    const activeSignals = signals ?? this.collectSignals(sim);
    settlement.tier = this.tier;
    settlement.innStage = profile.name;
    settlement.structuralIntegrity = Math.round(this.integrity * 10) / 10;
    settlement.baseCapacity = profile.capacity;
    settlement.capacity = this.state === 'sacked' || this.tier === 0
      ? 0
      : Math.max(1, Math.floor(profile.capacity * (0.55 + this.integrity / 100 * 0.45)));
    settlement.guestCapacity = profile.guestCapacity;
    settlement.comfort = Math.max(0, profile.comfort - (this.state === 'besieged' ? 7 : this.state === 'sacked' ? 18 : 0));
    settlement.security = Math.max(0, profile.security + (this.tier >= 4 ? 8 : 0) - activeSignals.contestedRooms * 5);
    settlement.recoveryPower = this.state === 'sacked' ? 0 : profile.recovery;
    settlement.control = Math.max(0, Math.min(100, 20 + activeSignals.controlledRooms * 16 - activeSignals.contestedRooms * 18));
    settlement.contested = activeSignals.contestedRooms > 0 || activeSignals.hostiles.length > 0;
    settlement.state = this.state === 'sacked' || this.tier === 0
      ? 'ruined'
      : this.state === 'besieged'
        ? 'threatened'
        : this.integrity < 45
          ? 'damaged'
          : 'active';
    settlement.anchorPresent = this.integrity > 0;
    settlement.services = {
      trade: profile.trade && this.state !== 'besieged' && this.state !== 'sacked',
      rumors: profile.rumors && this.state !== 'sacked',
      smuggling: profile.smuggling && this.roomStates.get('H40') === 'operations-room',
      partyRegroup: this.tier >= 1 && this.state !== 'sacked',
      foodService: this.roomStates.get('H37') === 'working',
      guestRooms: this.roomStates.get('H38') === 'guestrooms'
    };
    settlement.presentIds = activeSignals.friendlies.map(agent => agent.id);
    settlement.presentPopulation = settlement.presentIds.length;
    settlement.population = settlement.residentIds?.length ?? 0;
    settlement.overcrowded = Math.max(0, settlement.population - settlement.capacity);
  }

  applyServices(dt, sim) {
    const settlement = this.settlementSystem.settlements.get(this.settlementId);
    if (!settlement || this.tier === 0 || this.state === 'sacked') return;
    const rooms = new Set(INN_ROOM_IDS);
    const kitchenWorking = this.roomStates.get('H37') === 'working';
    const guestRooms = this.roomStates.get('H38') === 'guestrooms';
    for (const agent of sim.agents) {
      if (!agent.alive || agent.departed || agent.travel || agent.combat || !rooms.has(agent.roomId)) continue;
      if (this.agentFaction(agent) !== 'adventurer-expedition') continue;
      const recovery = (0.03 + settlement.recoveryPower * 0.008) * dt;
      agent.hp = Math.min(agent.maxHp, agent.hp + recovery);
      agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - dt * (guestRooms ? 0.16 : 0.08));
      agent.stress = Math.max(0, (agent.stress ?? 0) - dt * (0.05 + settlement.comfort * 0.004));
      if (kitchenWorking && (settlement.food ?? 0) > 0 && (agent.supplies ?? 0) < 4) {
        agent.supplies = Math.min(4, (agent.supplies ?? 0) + dt * 0.04);
        settlement.food = Math.max(0, settlement.food - dt * 0.01);
      }
    }
  }

  emitTransitions(sim) {
    if (this.lastTier !== this.tier) this.lastTier = this.tier;
    if (this.lastState === this.state) return;
    const previous = this.lastState;
    this.lastState = this.state;
    if (!previous) return;
    if (this.state === 'besieged') {
      this.onEvent(`The Old Lantern Inn barred its doors as hostile pressure reached the five-room complex.`);
      sim.emitEffect?.('old-lantern-besieged', { roomId: 'H36', duration: 1.2 });
    }
    if (this.state === 'sacked') {
      this.onEvent(`The Old Lantern Inn was sacked; its beds, stores, and services fell silent.`);
      sim.emitEffect?.('old-lantern-sacked', { roomId: 'H36', duration: 1.6 });
    }
  }

  availableSupply() {
    return this.territorySystem?.factionSupply?.get('adventurer-expedition') ?? 0;
  }

  agentFaction(agent) {
    return agent.faction === 'party' ? 'adventurer-expedition' : agent.ecologyFaction;
  }

  buildSnapshot(signals, settlement) {
    const profile = TIER_PROFILES[this.tier];
    return {
      enabled: this.enabled,
      settlementId: this.settlementId,
      tier: this.tier,
      stage: profile.name,
      state: this.state,
      integrity: Math.round(this.integrity * 10) / 10,
      progress: Math.round(this.progress * 10) / 10,
      nextUpgrade: UPGRADE_COSTS[this.tier + 1] ? { ...UPGRADE_COSTS[this.tier + 1] } : null,
      roomStates: Object.fromEntries(this.roomStates),
      services: { ...(settlement.services ?? {}) },
      capacity: settlement.capacity,
      guestCapacity: settlement.guestCapacity,
      comfort: settlement.comfort,
      security: settlement.security,
      recoveryPower: settlement.recoveryPower,
      materials: settlement.materials ?? 0,
      food: settlement.food ?? 0,
      supply: this.availableSupply(),
      workers: signals.workers.map(agent => agent.id),
      friendlies: signals.friendlies.map(agent => agent.id),
      hostiles: signals.hostiles.map(agent => agent.id),
      contestedRooms: signals.contestedRooms
    };
  }

  snapshot() {
    return this.lastSnapshot ?? {
      enabled: this.enabled,
      settlementId: this.settlementId,
      tier: this.tier,
      stage: this.stage,
      state: this.state,
      integrity: this.integrity,
      progress: this.progress,
      roomStates: Object.fromEntries(this.roomStates),
      services: {}
    };
  }

  metrics() {
    return {
      oldLanternTier: this.tier,
      oldLanternIntegrity: Math.round(this.integrity),
      oldLanternOperational: this.tier >= 2 && this.state !== 'sacked',
      oldLanternBesieged: this.state === 'besieged',
      oldLanternCapacity: this.lastSnapshot?.capacity ?? 0
    };
  }
}

export { INN_ROOM_IDS, TIER_PROFILES, UPGRADE_COSTS };
