const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);
const PARTY_ROUTINE_DURATION = 32;
const OUTPOST_ROUTINE_DURATION = 26;
const SCHEDULE_INTERVAL = 1.25;

const DURATIONS = {
  cooking: 7.5,
  eating: 6.8,
  sleeping: 14,
  resting: 9,
  guarding: 11.5,
  'monster-feeding': 6.4,
  'monster-resting': 10.5,
  'maintaining-outpost': 8.5
};

const PARTY_ANCHORS = {
  cooking: [{ x: 0.46, z: 0.18, facing: Math.PI }],
  eating: [
    { x: 0.08, z: 0.66, facing: Math.PI },
    { x: -0.26, z: 0.48, facing: Math.PI * 0.76 },
    { x: 0.72, z: 0.08, facing: -Math.PI * 0.62 }
  ],
  sleeping: [
    { x: -0.74, z: 0.54, facing: -0.2 },
    { x: -0.16, z: 0.68, facing: 0.12 },
    { x: 0.46, z: 0.67, facing: -0.08 }
  ],
  resting: [
    { x: -0.78, z: -0.44, facing: Math.PI * 0.3 },
    { x: 0.2, z: 0.42, facing: Math.PI }
  ],
  guarding: [
    { x: -1.18, z: 0.08, facing: -Math.PI * 0.5 },
    { x: 1.16, z: -0.12, facing: Math.PI * 0.5 }
  ]
};

const MONSTER_ANCHORS = {
  guarding: [
    { x: -0.94, z: 0.04, facing: -Math.PI * 0.5 },
    { x: 0.94, z: -0.04, facing: Math.PI * 0.5 }
  ],
  'monster-feeding': [
    { x: 0.22, z: 0.52, facing: Math.PI },
    { x: -0.36, z: 0.42, facing: Math.PI * 0.72 }
  ],
  'monster-resting': [
    { x: -0.46, z: -0.44, facing: 0.18 },
    { x: 0.42, z: -0.5, facing: -0.16 }
  ],
  'maintaining-outpost': [
    { x: 0.05, z: 0.28, facing: Math.PI },
    { x: -0.22, z: 0.12, facing: Math.PI * 0.7 }
  ]
};

export class CampLifeSystem {
  constructor({ rooms, props, partySystem, settlementSystem, territorySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.partySystem = partySystem;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.onEvent = onEvent;
    this.scheduleClock = 0;
    this.sequence = 0;
  }

  update(dt, sim) {
    this.updateActivities(sim);
    this.scheduleClock -= dt;
    if (this.scheduleClock > 0) return;
    this.scheduleClock = SCHEDULE_INTERVAL;
    this.schedulePartyCamps(sim);
    this.scheduleMonsterOutposts(sim);
  }

  updateActivities(sim) {
    for (const agent of sim.agents) {
      const activity = agent.activity;
      if (activity?.source !== 'camp-life') continue;
      if (!this.activityStillValid(agent, activity)) {
        this.clearActivity(agent, 'interrupted');
        continue;
      }
      const duration = Math.max(0.01, activity.endsAt - activity.startedAt);
      activity.progress = clamp((sim.time - activity.startedAt) / duration, 0, 1);
      activity.phase = activity.progress < 0.14 ? 'approach' : activity.progress < 0.88 ? 'loop' : 'finish';
      if (activity.progress < 1) continue;
      this.completeActivity(agent, activity, sim);
      if (agent.activity === activity) this.clearActivity(agent, 'complete');
    }
  }

  activityStillValid(agent, activity) {
    if (!agent?.alive || agent.departed || agent.hidden || agent.travel || agent.combat || agent.downed || agent.hosted || agent.attachedToId) return false;
    return projectedRoom(agent) === activity.roomId;
  }

  decide(agent) {
    if (!agent?.alive || agent.departed || agent.hidden || agent.travel || agent.combat || agent.downed) return null;
    if (agent.activity?.source !== 'camp-life') return null;
    return { type: 'camp-life-hold', activityId: agent.activity.id };
  }

  resolve(agent, action) {
    if (action?.type !== 'camp-life-hold') return false;
    if (agent.activity?.source === 'camp-life') agent.mood = agent.activity.type;
    return true;
  }

  schedulePartyCamps(sim) {
    for (const party of this.partySystem.parties.values()) {
      const camp = this.settlementSystem.settlements.get(party.baseSettlementId);
      if (!camp || camp.type !== 'field-camp' || !ACTIVE_STATES.has(camp.state)) continue;
      const members = party.memberIds
        .map(id => sim.agents.find(agent => agent.id === id))
        .filter(agent => this.eligibleAtSettlement(agent, camp));
      if (!members.length) continue;

      if (!party.campRoutine && this.shouldBeginPartyRoutine(party, camp, members, sim)) {
        this.beginPartyRoutine(party, camp, sim);
      }
      const routine = party.campRoutine;
      if (!routine || routine.settlementId !== camp.id) continue;

      const activeCampLife = members.some(agent => agent.activity?.source === 'camp-life');
      if (sim.time >= routine.until && !activeCampLife) {
        party.lastCampRoutineAt = sim.time;
        party.lastCampRoutineSettlementId = camp.id;
        party.campRoutine = null;
        if (party.expeditionState === 'encamped') party.expeditionState = 'ready';
        this.onEvent(`${party.name} struck its quiet camp routine and prepared to move again.`);
        continue;
      }

      this.schedulePartyAssignments(party, camp, members, sim);
    }
  }

  shouldBeginPartyRoutine(party, camp, members, sim) {
    const newCamp = sim.time - (camp.foundedAt ?? -999) <= 8 && party.lastCampRoutineSettlementId !== camp.id;
    const fatigue = average(members.map(agent => agent.fatigue ?? 0));
    const hunger = average(members.map(agent => agent.hunger ?? 0));
    const damaged = members.some(agent => agent.hp < agent.maxHp * 0.78);
    const need = fatigue >= 38 || hunger >= 34 || damaged || party.endurance < party.maxExpeditionTime * 0.72;
    const cooldownReady = (party.lastCampRoutineAt ?? -999) + 42 <= sim.time;
    return newCamp || (cooldownReady && need) || (party.expeditionState === 'encamped' && party.lastCampRoutineSettlementId !== camp.id);
  }

  beginPartyRoutine(party, camp, sim) {
    party.campRoutine = {
      id: `party-camp-routine-${this.sequence++}`,
      settlementId: camp.id,
      startedAt: sim.time,
      until: sim.time + PARTY_ROUTINE_DURATION,
      state: 'active'
    };
    camp.mealServings ??= 0;
    camp.guardedUntil ??= sim.time;
    this.onEvent(`${party.name} settled into a guarded camp routine at ${this.settlementSystem.label(camp)}.`);
  }

  schedulePartyAssignments(party, camp, members, sim) {
    const routine = party.campRoutine;
    if (!routine) return;
    const available = members.filter(agent => this.availableForCampLife(agent));
    if (!available.length) return;

    const guards = members.filter(agent => agent.activity?.source === 'camp-life' && agent.activity.type === 'guarding');
    const minimumGuards = members.length >= 2 ? Math.max(1, Math.ceil(members.length / 4)) : 0;
    while (guards.length < minimumGuards && available.length) {
      const guard = takeBest(available, agent => (agent.fatigue ?? 0) * -1 + (agent.hp / Math.max(1, agent.maxHp)) * 25);
      if (!guard) break;
      this.assignActivity(guard, 'guarding', camp, sim, { group: 'party', routineId: routine.id });
      guards.push(guard);
    }

    const cooking = members.some(agent => agent.activity?.source === 'camp-life' && agent.activity.type === 'cooking');
    const desiredServings = Math.max(2, Math.ceil(members.length * 0.75));
    if (!cooking && (camp.mealServings ?? 0) < desiredServings && party.provisions >= 0.6 && party.water >= 0.35 && available.length) {
      const cook = takeBest(available, agent => roleScore(agent.role, ['cleric', 'wizard', 'ranger']) - (agent.fatigue ?? 0) * 0.25);
      if (cook) this.assignActivity(cook, 'cooking', camp, sim, { group: 'party', routineId: routine.id, partyId: party.id });
    }

    const hungry = [...available]
      .filter(agent => (agent.hunger ?? 0) >= 28 && (camp.mealServings ?? 0) > 0)
      .sort((a, b) => (b.hunger ?? 0) - (a.hunger ?? 0));
    for (const agent of hungry) {
      removeItem(available, agent);
      this.assignActivity(agent, 'eating', camp, sim, { group: 'party', routineId: routine.id, partyId: party.id });
    }

    const sleepers = [...available]
      .filter(agent => (agent.fatigue ?? 0) >= 34 || agent.hp < agent.maxHp * 0.76)
      .sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0));
    for (const agent of sleepers) {
      removeItem(available, agent);
      this.assignActivity(agent, 'sleeping', camp, sim, { group: 'party', routineId: routine.id, partyId: party.id });
    }

    for (const agent of [...available]) {
      removeItem(available, agent);
      this.assignActivity(agent, (camp.mealServings ?? 0) > 0 && (agent.hunger ?? 0) > 16 ? 'eating' : 'resting', camp, sim, {
        group: 'party',
        routineId: routine.id,
        partyId: party.id
      });
    }
  }

  scheduleMonsterOutposts(sim) {
    for (const settlement of this.settlementSystem.settlements.values()) {
      if (settlement.type !== 'forward-outpost' || !ACTIVE_STATES.has(settlement.state)) continue;
      const residents = sim.agents.filter(agent =>
        agent.faction === 'dungeon' &&
        agent.ecologyFaction === settlement.factionId &&
        agent.homeSettlementId === settlement.id &&
        this.eligibleAtSettlement(agent, settlement)
      );
      if (!residents.length) continue;

      const initialRoutine = sim.time <= (settlement.foundedAt ?? 0) + OUTPOST_ROUTINE_DURATION;
      const threatened = settlement.state === 'threatened' || settlement.contested;
      const periodic = sim.time >= (settlement.nextLifeCycleAt ?? settlement.foundedAt ?? 0);
      if (!initialRoutine && !threatened && !periodic) continue;
      if (periodic && !initialRoutine) settlement.nextLifeCycleAt = sim.time + 24 + hash01(settlement.id) * 12;

      this.scheduleMonsterAssignments(settlement, residents, sim);
    }
  }

  scheduleMonsterAssignments(settlement, residents, sim) {
    const available = residents.filter(agent => this.availableForCampLife(agent));
    if (!available.length) return;
    const guards = residents.filter(agent => agent.activity?.source === 'camp-life' && agent.activity.type === 'guarding');
    const minimumGuards = Math.max(1, settlement.state === 'threatened' ? Math.ceil(residents.length / 2) : 1);
    while (guards.length < minimumGuards && available.length) {
      const guard = takeBest(available, agent => (agent.hp / Math.max(1, agent.maxHp)) * 30 - (agent.fatigue ?? 0) * 0.2);
      if (!guard) break;
      this.assignActivity(guard, 'guarding', settlement, sim, { group: 'monster' });
      guards.push(guard);
    }

    const hungry = [...available]
      .filter(agent => (agent.hunger ?? 0) >= 36 && (settlement.food ?? 0) >= 0.35)
      .sort((a, b) => (b.hunger ?? 0) - (a.hunger ?? 0));
    for (const agent of hungry.slice(0, 2)) {
      removeItem(available, agent);
      this.assignActivity(agent, 'monster-feeding', settlement, sim, { group: 'monster' });
    }

    const tired = [...available]
      .filter(agent => (agent.fatigue ?? 0) >= 48 || agent.hp < agent.maxHp * 0.68)
      .sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0));
    for (const agent of tired.slice(0, 2)) {
      removeItem(available, agent);
      this.assignActivity(agent, 'monster-resting', settlement, sim, { group: 'monster' });
    }

    if (available.length && (settlement.structuralIntegrity ?? 100) < 96) {
      const worker = takeBest(available, agent => roleScore(agent.role, ['kobold', 'goblin', 'orc', 'skeleton']));
      if (worker) this.assignActivity(worker, 'maintaining-outpost', settlement, sim, { group: 'monster' });
    }
  }

  eligibleAtSettlement(agent, settlement) {
    return Boolean(agent?.alive && !agent.departed && !agent.hidden && !agent.travel && !agent.combat && !agent.downed && !agent.hosted && !agent.attachedToId && projectedRoom(agent) === settlement.roomId);
  }

  availableForCampLife(agent) {
    if (!agent.activity) return true;
    if (agent.activity.source === 'camp-life') return false;
    return agent.activity.source === 'strategic-expansion' && ['guarding-camp', 'guarding-outpost'].includes(agent.activity.type);
  }

  assignActivity(agent, type, settlement, sim, metadata = {}) {
    const duration = (DURATIONS[type] ?? 8) * (0.92 + hash01(`${agent.id}:${type}:${this.sequence}`) * 0.18);
    const anchor = this.activityAnchor(settlement, type, agent, sim);
    const id = `camp-life-${this.sequence++}`;
    agent.activity = {
      id,
      type,
      label: activityLabel(type),
      phase: 'approach',
      source: 'camp-life',
      roomId: settlement.roomId,
      targetRoomId: settlement.roomId,
      settlementId: settlement.id,
      targetSettlementId: settlement.id,
      startedAt: sim.time,
      endsAt: sim.time + duration,
      duration,
      progress: 0,
      anchor,
      prop: activityProp(type, agent.role),
      interruptible: true,
      assignedBy: metadata.group === 'monster' ? 'outpost-routine' : 'party-leader',
      ...metadata
    };
    agent.mood = type;
    if (type === 'guarding') settlement.guardedUntil = Math.max(settlement.guardedUntil ?? 0, sim.time + duration + 2);
    return agent.activity;
  }

  activityAnchor(settlement, type, agent, sim) {
    const anchors = settlement.type === 'field-camp' ? PARTY_ANCHORS[type] : MONSTER_ANCHORS[type];
    const choices = anchors?.length ? anchors : [{ x: 0, z: 0, facing: 0 }];
    const occupied = new Set(sim.agents
      .filter(candidate => candidate.id !== agent.id && candidate.activity?.source === 'camp-life' && candidate.activity.settlementId === settlement.id)
      .map(candidate => candidate.activity.anchor?.slotId)
      .filter(Boolean));
    let index = Math.floor(hash01(`${agent.id}:${type}`) * choices.length) % choices.length;
    for (let offset = 0; offset < choices.length; offset += 1) {
      const candidate = (index + offset) % choices.length;
      const slotId = `${settlement.id}:${type}:${candidate}`;
      if (!occupied.has(slotId)) {
        index = candidate;
        break;
      }
    }
    const local = choices[index];
    const placement = settlement.visualPlacement ?? this.props.find(prop => prop.id === settlement.anchorPropId)?.placement ?? {};
    const rotation = placement.rotation ?? 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      slotId: `${settlement.id}:${type}:${index}`,
      ox: (placement.ox ?? 0) + local.x * cos - local.z * sin,
      oz: (placement.oz ?? 0) + local.x * sin + local.z * cos,
      facing: rotation + local.facing,
      posture: type
    };
  }

  completeActivity(agent, activity, sim) {
    const settlement = this.settlementSystem.settlements.get(activity.settlementId);
    if (!settlement) return;
    const party = activity.partyId ? this.partySystem.parties.get(activity.partyId) : null;

    if (activity.type === 'cooking' && party) {
      if (party.provisions >= 0.6 && party.water >= 0.35) {
        party.provisions = Math.max(0, party.provisions - 0.6);
        party.water = Math.max(0, party.water - 0.35);
        settlement.mealServings = Math.min(8, (settlement.mealServings ?? 0) + 3);
        settlement.lastMealAt = sim.time;
        sim.emitEffect?.('camp-meal-ready', { roomId: settlement.roomId, agentId: agent.id, duration: 1.1 });
        this.onEvent(`${agent.name} finished a hot meal for ${party.name}.`);
      }
      return;
    }

    if (activity.type === 'eating') {
      if ((settlement.mealServings ?? 0) > 0) {
        settlement.mealServings -= 1;
        agent.hunger = Math.max(0, (agent.hunger ?? 0) - 36);
        agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - 6);
        agent.hp = Math.min(agent.maxHp, agent.hp + Math.max(1, Math.round(agent.maxHp * 0.04)));
        sim.emitEffect?.('camp-eat', { roomId: settlement.roomId, agentId: agent.id, duration: 0.9 });
      }
      return;
    }

    if (activity.type === 'sleeping') {
      agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - 44);
      agent.hp = Math.min(agent.maxHp, agent.hp + Math.max(2, Math.round(agent.maxHp * 0.12)));
      if (party) party.endurance = Math.min(party.maxExpeditionTime, party.endurance + 10);
      sim.emitEffect?.('camp-wake', { roomId: settlement.roomId, agentId: agent.id, duration: 0.85 });
      return;
    }

    if (activity.type === 'resting') {
      agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - 18);
      agent.hp = Math.min(agent.maxHp, agent.hp + Math.max(1, Math.round(agent.maxHp * 0.05)));
      return;
    }

    if (activity.type === 'guarding') {
      const territory = this.territorySystem.roomStates.get(settlement.roomId);
      if (territory?.owner === settlement.factionId && !territory.contested) territory.control = Math.min(100, (territory.control ?? 0) + 1.8);
      settlement.guardReadiness = clamp((settlement.guardReadiness ?? 0.35) + 0.12, 0, 1);
      settlement.guardedUntil = Math.max(settlement.guardedUntil ?? 0, sim.time + 10);
      return;
    }

    if (activity.type === 'monster-feeding') {
      if ((settlement.food ?? 0) >= 0.35) {
        settlement.food = Math.max(0, settlement.food - 0.35);
        agent.hunger = Math.max(0, (agent.hunger ?? 0) - 31);
        agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - 4);
      }
      return;
    }

    if (activity.type === 'monster-resting') {
      agent.fatigue = Math.max(0, (agent.fatigue ?? 0) - 32);
      agent.hp = Math.min(agent.maxHp, agent.hp + Math.max(1, Math.round(agent.maxHp * 0.08)));
      return;
    }

    if (activity.type === 'maintaining-outpost') {
      settlement.structuralIntegrity = Math.min(100, (settlement.structuralIntegrity ?? 0) + 2.5);
      const territory = this.territorySystem.roomStates.get(settlement.roomId);
      if (territory?.owner === settlement.factionId) territory.control = Math.min(100, (territory.control ?? 0) + 1);
      sim.emitEffect?.('construction-complete', { roomId: settlement.roomId, agentId: agent.id, duration: 0.7 });
    }
  }

  clearActivity(agent, reason) {
    const activity = agent.activity;
    if (activity?.source !== 'camp-life') return;
    agent.lastCampActivity = {
      type: activity.type,
      settlementId: activity.settlementId,
      finishedAt: activity.endsAt,
      reason
    };
    agent.activity = null;
    if (!agent.combat && !agent.travel) agent.mood = reason === 'complete' ? 'camp-routine-complete' : 'camp-routine-interrupted';
  }

  snapshot(agents) {
    return {
      activities: agents
        .filter(agent => agent.activity?.source === 'camp-life')
        .map(agent => ({ agentId: agent.id, ...cloneActivity(agent.activity) })),
      partyRoutines: [...this.partySystem.parties.values()]
        .filter(party => party.campRoutine)
        .map(party => ({ partyId: party.id, ...party.campRoutine }))
    };
  }

  metrics(agents) {
    const activities = agents.filter(agent => agent.activity?.source === 'camp-life').map(agent => agent.activity);
    return {
      campLifeActivities: activities.length,
      campSleeping: activities.filter(activity => ['sleeping', 'monster-resting'].includes(activity.type)).length,
      campEating: activities.filter(activity => ['eating', 'monster-feeding'].includes(activity.type)).length,
      campGuarding: activities.filter(activity => activity.type === 'guarding').length,
      campCooking: activities.filter(activity => activity.type === 'cooking').length
    };
  }
}

function projectedRoom(agent) {
  if (agent?.travel?.phase === 'entering') return agent.travel.toRoomId;
  return agent?.travel?.toRoomId ?? agent?.roomId ?? null;
}

function activityLabel(type) {
  return ({
    cooking: 'Cooking a camp meal',
    eating: 'Eating by the fire',
    sleeping: 'Sleeping on a bedroll',
    resting: 'Resting at camp',
    guarding: 'Standing sentry',
    'monster-feeding': 'Feeding at the outpost',
    'monster-resting': 'Resting in the outpost',
    'maintaining-outpost': 'Maintaining the outpost'
  })[type] ?? type.replaceAll('-', ' ');
}

function activityProp(type, role) {
  if (type === 'cooking') return 'cookpot-ladle';
  if (type === 'eating') return 'bowl-spoon';
  if (type === 'sleeping') return 'bedroll-blanket';
  if (type === 'resting') return 'camp-mug';
  if (type === 'guarding') return role === 'skeleton' || role === 'zombie' ? 'watch-torch' : 'watch-lantern';
  if (type === 'monster-feeding') return role === 'skeleton' ? 'bone-offering' : 'meat-ration';
  if (type === 'monster-resting') return 'rough-bedroll';
  if (type === 'maintaining-outpost') return 'hammer-plank';
  return null;
}

function cloneActivity(activity) {
  return { ...activity, anchor: activity.anchor ? { ...activity.anchor } : null };
}

function roleScore(role, preferred) {
  const index = preferred.indexOf(role);
  return index < 0 ? 0 : (preferred.length - index) * 12;
}

function takeBest(items, score) {
  if (!items.length) return null;
  let best = items[0];
  let bestScore = score(best);
  for (let index = 1; index < items.length; index += 1) {
    const value = score(items[index]);
    if (value > bestScore) {
      best = items[index];
      bestScore = value;
    }
  }
  removeItem(items, best);
  return best;
}

function removeItem(items, item) {
  const index = items.indexOf(item);
  if (index >= 0) items.splice(index, 1);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 0xffffffff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
