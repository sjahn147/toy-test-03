export const OLD_LANTERN_ROOM_IDS = Object.freeze(['H36', 'H37', 'H38', 'H39', 'H40']);

export const OLD_LANTERN_TIER_PROFILES = Object.freeze([
  profile('ruin', 0, 0, 0, 2, 0, false, false, false),
  profile('camp', 4, 2, 7, 8, 4, false, true, false),
  profile('outpost', 10, 4, 14, 18, 9, true, true, false),
  profile('inn', 18, 8, 25, 28, 15, true, true, true),
  profile('fortified-inn', 24, 10, 28, 46, 18, true, true, true)
]);

export const OLD_LANTERN_UPGRADE_COSTS = Object.freeze([
  null,
  Object.freeze({ materials: 2, supply: 2, labor: 7 }),
  Object.freeze({ materials: 5, supply: 4, labor: 16 }),
  Object.freeze({ materials: 9, supply: 7, labor: 30 }),
  Object.freeze({ materials: 13, supply: 10, labor: 48 })
]);

const LABOR_ROLES = new Set(['fighter', 'rogue', 'cleric', 'wizard', 'archer', 'goblin', 'kobold']);

export class OldLanternInnSystem {
  constructor({ rooms, settlementSystem, territorySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.onEvent = onEvent;
    this.enabled = OLD_LANTERN_ROOM_IDS.every(id => rooms.some(room => room.id === id));
    this.settlementId = 'settlement-old-lantern-inn';
    this.tier = 0;
    this.progress = 0;
    this.integrity = 28;
    this.state = 'ruined';
    this.lastState = null;
    this.tickClock = 0;
    this.serviceClock = 0;
    this.sackedUntil = -1;
    this.roomStates = new Map();
    this.lastSnapshot = null;
  }

  initialize(sim) {
    if (!this.enabled) return;
    if (!this.settlementSystem?.settlements?.has(this.settlementId)) this.settlementSystem?.registerSettlement?.(this.createSettlement(sim));
    this.applyRoomStates();
    this.syncSettlement(this.collectSignals(sim));
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
    const hostilePressure = signals.hostiles.length + signals.contestedRooms * 1.35;
    const labor = signals.workers.length;

    if (hostilePressure > 0) {
      this.integrity = Math.max(0, this.integrity - dt * (0.8 + hostilePressure * 0.72));
      settlement.lastAttackedAt = sim.time;
      if (hostilePressure >= 4 && this.integrity < 24) this.sackedUntil = Math.max(this.sackedUntil, sim.time + 24);
    } else if (labor > 0 && this.tier > 0) {
      this.integrity = Math.min(100, this.integrity + dt * (0.22 + labor * 0.16));
    }

    const cost = OLD_LANTERN_UPGRADE_COSTS[this.tier + 1];
    if (cost && labor > 0 && hostilePressure === 0) {
      const materialFactor = Math.min(1, (settlement.materials ?? 0) / cost.materials);
      const supplyFactor = Math.min(1, this.availableSupply() / cost.supply);
      const specialistBonus = (signals.workers.some(a => a.role === 'cleric') ? 1.12 : 1) * (signals.workers.some(a => a.role === 'rogue') ? 1.08 : 1);
      this.progress += dt * labor * (0.48 + 0.52 * Math.min(materialFactor, supplyFactor)) * specialistBonus;
      if (this.progress >= cost.labor && materialFactor >= 1 && supplyFactor >= 1) this.completeUpgrade(settlement, cost, sim);
    }

    if (this.integrity <= 0) {
      this.tier = 0;
      this.progress = 0;
      this.sackedUntil = Math.max(this.sackedUntil, sim.time + 30);
    } else if (this.tier > 1 && this.integrity < 18) {
      this.tier -= 1;
      this.progress = 0;
      this.onEvent('The Old Lantern Inn lost a restoration tier as its structures failed.');
      sim.emitEffect?.('old-lantern-downgrade', { roomId: 'H36', duration: 1.4 });
    }

    this.state = sim.time < this.sackedUntil || this.integrity <= 8
      ? 'sacked'
      : hostilePressure > 0
        ? 'besieged'
        : this.tier === 0 ? 'ruined' : OLD_LANTERN_TIER_PROFILES[this.tier].name;
    this.applyRoomStates(signals);
    this.syncSettlement(signals);
    this.emitTransitions(sim);
    this.lastSnapshot = this.buildSnapshot(signals, settlement);
  }

  createSettlement(sim) {
    return {
      id: this.settlementId,
      factionId: 'adventurer-expedition',
      type: 'old-lantern-inn',
      roomId: 'H36',
      tier: 0,
      state: 'ruined',
      managedBy: 'old-lantern-inn',
      baseCapacity: 0,
      capacity: 0,
      guestCapacity: 0,
      structuralIntegrity: this.integrity,
      control: 0,
      population: 0,
      presentPopulation: 0,
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
      anchorPresent: true,
      visualPlacement: { ox: 0, oz: 0, rotation: 0, scale: 0 },
      foundedAt: sim.time ?? 0,
      innStage: 'ruin',
      services: {}
    };
  }

  ensureSettlement(sim) {
    let settlement = this.settlementSystem?.settlements?.get(this.settlementId);
    if (!settlement) {
      settlement = this.createSettlement(sim);
      this.settlementSystem?.registerSettlement?.(settlement);
    }
    return settlement;
  }

  collectSignals(sim) {
    const rooms = new Set(OLD_LANTERN_ROOM_IDS);
    const present = (sim.agents ?? []).filter(agent => agent.alive && !agent.departed && !agent.hidden && !agent.travel && rooms.has(agent.roomId));
    const friendlies = present.filter(agent => factionOf(agent) === 'adventurer-expedition');
    const hostiles = present.filter(agent => factionOf(agent) !== 'adventurer-expedition');
    const workers = friendlies.filter(agent => LABOR_ROLES.has(agent.role) && !agent.combat && !agent.downed);
    const roles = new Set(hostiles.map(agent => agent.role));
    let contestedRooms = 0;
    let controlledRooms = 0;
    for (const roomId of OLD_LANTERN_ROOM_IDS) {
      const territory = this.territorySystem?.roomStates?.get(roomId);
      if (territory?.contested || (territory?.owner && territory.owner !== 'adventurer-expedition')) contestedRooms += 1;
      if (territory?.owner === 'adventurer-expedition' && !territory.contested) controlledRooms += 1;
    }
    return { friendlies, hostiles, workers, roles, contestedRooms, controlledRooms };
  }

  completeUpgrade(settlement, cost, sim) {
    settlement.materials = Math.max(0, (settlement.materials ?? 0) - cost.materials);
    this.territorySystem?.factionSupply?.set('adventurer-expedition', Math.max(0, this.availableSupply() - cost.supply));
    this.tier += 1;
    this.integrity = Math.max(this.integrity, 34 + this.tier * 13);
    this.progress = 0;
    this.onEvent(`The Old Lantern Inn advanced to ${OLD_LANTERN_TIER_PROFILES[this.tier].name}.`);
    sim.emitEffect?.('old-lantern-upgrade', { roomId: 'H36', duration: 1.5, tier: this.tier });
  }

  applyRoomStates(signals = null) {
    const roles = signals?.roles ?? new Set();
    const sacked = this.state === 'sacked';
    const besieged = this.state === 'besieged';
    const states = {
      H36: sacked ? 'burned' : besieged ? 'besieged' : ['ruined', 'bivouac', 'repaired', 'prosperous', 'prosperous'][this.tier],
      H37: roles.has('slime') || roles.has('rat') ? 'infested' : sacked ? 'blackened' : ['blackened', 'camp-kitchen', 'working', 'working', 'working'][this.tier],
      H38: roles.has('spider') || roles.has('stirge') ? 'webbed' : sacked ? 'collapsed' : ['collapsed', 'partitioned-camp', 'guestrooms', 'guestrooms', 'guestrooms'][this.tier],
      H39: roles.has('myconid') ? 'fungal-brewery' : sacked ? 'raided' : ['flooded', 'flooded', 'stocked', 'stocked', 'stocked'][this.tier],
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

  syncSettlement(signals) {
    const settlement = this.settlementSystem?.settlements?.get(this.settlementId);
    if (!settlement) return;
    const profile = OLD_LANTERN_TIER_PROFILES[this.tier];
    settlement.tier = this.tier;
    settlement.innStage = profile.name;
    settlement.structuralIntegrity = Math.round(this.integrity * 10) / 10;
    settlement.baseCapacity = profile.capacity;
    settlement.capacity = this.state === 'sacked' || this.tier === 0 ? 0 : Math.max(1, Math.floor(profile.capacity * (0.55 + this.integrity / 100 * 0.45)));
    settlement.guestCapacity = profile.guestCapacity;
    settlement.comfort = Math.max(0, profile.comfort - (this.state === 'besieged' ? 7 : this.state === 'sacked' ? 18 : 0));
    settlement.security = Math.max(0, profile.security + (this.tier >= 4 ? 8 : 0) - signals.contestedRooms * 5);
    settlement.recoveryPower = this.state === 'sacked' ? 0 : profile.recovery;
    settlement.control = Math.max(0, Math.min(100, 20 + signals.controlledRooms * 16 - signals.contestedRooms * 18));
    settlement.contested = signals.contestedRooms > 0 || signals.hostiles.length > 0;
    settlement.state = this.state === 'sacked' || this.tier === 0 ? 'ruined' : this.state === 'besieged' ? 'threatened' : this.integrity < 45 ? 'damaged' : 'active';
    settlement.anchorPresent = this.integrity > 0;
    settlement.services = {
      trade: profile.trade && !['besieged', 'sacked'].includes(this.state),
      rumors: profile.rumors && this.state !== 'sacked',
      smuggling: profile.smuggling && this.roomStates.get('H40') === 'operations-room',
      partyRegroup: this.tier >= 1 && this.state !== 'sacked',
      foodService: this.roomStates.get('H37') === 'working',
      guestRooms: this.roomStates.get('H38') === 'guestrooms'
    };
    settlement.presentIds = signals.friendlies.map(agent => agent.id);
    settlement.presentPopulation = settlement.presentIds.length;
  }

  applyServices(dt, sim) {
    const settlement = this.settlementSystem?.settlements?.get(this.settlementId);
    if (!settlement || this.tier === 0 || this.state === 'sacked') return;
    const rooms = new Set(OLD_LANTERN_ROOM_IDS);
    for (const agent of sim.agents ?? []) {
      if (!agent.alive || agent.departed || agent.travel || agent.combat || !rooms.has(agent.roomId) || factionOf(agent) !== 'adventurer-expedition') continue;
      agent.hp = Math.min(agent.maxHp, agent.hp + (0.03 + settlement.recoveryPower * 0.008) * dt);
      agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - dt * (settlement.services.guestRooms ? 0.16 : 0.08));
      agent.stress = Math.max(0, (agent.stress ?? 0) - dt * (0.05 + settlement.comfort * 0.004));
    }
  }

  emitTransitions(sim) {
    if (this.lastState === this.state) return;
    const previous = this.lastState;
    this.lastState = this.state;
    if (!previous) return;
    if (this.state === 'besieged') sim.emitEffect?.('old-lantern-besieged', { roomId: 'H36', duration: 1.2 });
    if (this.state === 'sacked') sim.emitEffect?.('old-lantern-sacked', { roomId: 'H36', duration: 1.6 });
  }

  availableSupply() { return this.territorySystem?.factionSupply?.get('adventurer-expedition') ?? 0; }

  buildSnapshot(signals, settlement) {
    return {
      enabled: this.enabled,
      settlementId: this.settlementId,
      tier: this.tier,
      stage: OLD_LANTERN_TIER_PROFILES[this.tier].name,
      state: this.state,
      integrity: Math.round(this.integrity * 10) / 10,
      progress: Math.round(this.progress * 10) / 10,
      nextUpgrade: OLD_LANTERN_UPGRADE_COSTS[this.tier + 1] ? { ...OLD_LANTERN_UPGRADE_COSTS[this.tier + 1] } : null,
      roomStates: Object.fromEntries(this.roomStates),
      services: { ...(settlement.services ?? {}) },
      capacity: settlement.capacity,
      workers: signals.workers.map(agent => agent.id),
      hostiles: signals.hostiles.map(agent => agent.id)
    };
  }

  snapshot() { return this.lastSnapshot ?? { enabled: this.enabled, tier: this.tier, state: this.state, integrity: this.integrity, progress: this.progress, roomStates: Object.fromEntries(this.roomStates), services: {} }; }
  metrics() { return { oldLanternTier: this.tier, oldLanternIntegrity: Math.round(this.integrity), oldLanternOperational: this.tier >= 2 && this.state !== 'sacked', oldLanternBesieged: this.state === 'besieged', oldLanternCapacity: this.lastSnapshot?.capacity ?? 0 }; }
}

function profile(name, capacity, guestCapacity, comfort, security, recovery, trade, rumors, smuggling) { return Object.freeze({ name, capacity, guestCapacity, comfort, security, recovery, trade, rumors, smuggling }); }
function factionOf(agent) { return agent.faction === 'party' ? 'adventurer-expedition' : agent.ecologyFaction; }
