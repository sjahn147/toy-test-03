export class RoomVisualStateComposer {
  compose(snapshot = {}, canonicalRoomStates = null) {
    if (canonicalRoomStates && typeof canonicalRoomStates === 'object' && Object.keys(canonicalRoomStates).length) {
      return Object.values(canonicalRoomStates).filter(Boolean).map(fromCanonical);
    }
    return fromRawSnapshot(snapshot);
  }
}

function fromCanonical(room) {
  const statuses = new Set((room.presentation?.statuses ?? []).map(item => item.id));
  return {
    roomId: room.roomId,
    owner: room.ownership?.ownerFactionId ?? null,
    challenger: room.ownership?.challengerFactionId ?? null,
    control: clamp(room.ownership?.control, 0, 100),
    contested: Boolean(room.ownership?.contested),
    population: Number(room.population?.current) || 0,
    capacity: Number(room.population?.capacity) || 0,
    danger: clamp01(room.danger?.score),
    settlement: room.settlement ? {
      id: room.settlement.settlementId,
      factionId: room.settlement.factionId,
      tier: room.settlement.tier,
      state: room.settlement.state,
      structuralIntegrity: room.settlement.integrity,
      supplyStatus: room.settlement.supplyStatus,
      supplyEfficiency: room.settlement.supplyEfficiency
    } : null,
    environment: { ...(room.environment ?? {}) },
    economy: { ...(room.economy ?? {}) },
    flags: {
      ruined: statuses.has('ruined'),
      collapsing: statuses.has('collapsing'),
      contested: Boolean(room.ownership?.contested),
      combat: statuses.has('combat'),
      siege: statuses.has('siege'),
      flooded: statuses.has('flooded'),
      burning: statuses.has('burning'),
      infected: statuses.has('infected'),
      overcrowded: statuses.has('overcrowded'),
      construction: statuses.has('construction'),
      work: statuses.has('work'),
      blockaded: statuses.has('blockaded')
    },
    jobs: room.activity?.construction ?? [],
    tasks: room.activity?.workOrders ?? [],
    spatial: room.spatial ?? null,
    visualVariant: room.presentation?.visualVariant ?? 'default'
  };
}

function fromRawSnapshot(snapshot) {
  const rooms = array(snapshot.rooms);
  const agents = array(snapshot.agents).filter(agent => agent?.alive !== false && !agent?.departed && !agent?.hidden);
  const territory = new Map(array(snapshot.territory?.rooms).map(item => [item.roomId, item]));
  const settlementsByRoom = groupBy(array(snapshot.settlement?.settlements), item => item.roomId);
  const siegesByRoom = groupBy(array(snapshot.construction?.sieges).filter(item => item.active !== false), item => item.roomId);
  const jobsByRoom = groupBy(array(snapshot.construction?.jobs).filter(item => ['building', 'queued', 'working'].includes(item.state ?? item.status)), item => item.roomId);
  const tasksByRoom = groupBy(array(snapshot.environmentTasks?.tasks).filter(item => ['queued', 'moving', 'working', 'interrupted', 'blocked'].includes(item.status ?? item.state)), item => item.targetRoomId ?? item.roomId);
  const spatialByRoom = new Map(array(snapshot.occupancy?.spatial?.rooms).map(item => [item.roomId, item]));
  const agentsByRoom = groupBy(agents, agent => agent.travel?.toRoomId ?? agent.roomId);

  return rooms.map(room => {
    const roomAgents = agentsByRoom.get(room.id) ?? [];
    const state = territory.get(room.id) ?? {};
    const settlements = settlementsByRoom.get(room.id) ?? [];
    const settlement = settlements.find(item => !['ruined', 'abandoned'].includes(item.state)) ?? settlements[0] ?? null;
    const owner = state.owner ?? room.ownerFactionId ?? room.factionId ?? null;
    const hostile = owner ? roomAgents.filter(agent => agentFaction(agent) && agentFaction(agent) !== owner).length : 0;
    const capacity = Math.max(0, Number(settlement?.effectiveCapacity ?? settlement?.capacity ?? spatialByRoom.get(room.id)?.actorCapacity ?? 0));
    const environment = environmentFlags(room, roomAgents, snapshot.props);
    const siege = (siegesByRoom.get(room.id) ?? [])[0] ?? null;
    const combat = roomAgents.some(agent => agent.combat || agent.downed) || (Boolean(state.contested) && hostile > 0);
    const danger = clamp01(hostile * 0.08 + (state.contested ? 0.22 : 0) + (combat ? 0.2 : 0) + (siege ? 0.3 : 0) + (environment.infected ? 0.12 : 0) + (environment.burning ? 0.2 : 0) + (settlement?.supplyStatus === 'blockaded' ? 0.12 : 0));
    const flags = {
      ruined: settlement?.state === 'ruined',
      collapsing: settlement?.state === 'collapsing' || Number(settlement?.structuralIntegrity ?? 100) < 24,
      contested: Boolean(state.contested), combat, siege: Boolean(siege), flooded: environment.flooded,
      burning: environment.burning, infected: environment.infected,
      overcrowded: capacity > 0 && roomAgents.length > capacity,
      construction: (jobsByRoom.get(room.id) ?? []).length > 0,
      work: (tasksByRoom.get(room.id) ?? []).length > 0,
      blockaded: settlement?.supplyStatus === 'blockaded'
    };
    return {
      roomId: room.id,
      owner, challenger: state.challenger ?? null,
      control: clamp(Number(state.control ?? 0), 0, 100), contested: Boolean(state.contested),
      population: roomAgents.length, capacity, danger, settlement, environment, economy: {}, flags,
      jobs: jobsByRoom.get(room.id) ?? [], tasks: tasksByRoom.get(room.id) ?? [],
      spatial: spatialByRoom.get(room.id) ?? null,
      visualVariant: visualVariant(flags, owner)
    };
  });
}

function environmentFlags(room, agents, props = []) {
  const roomProps = array(props).filter(prop => prop.roomId === room.id);
  const text = `${(room.tags ?? []).join(' ')} ${room.environmentState ?? ''} ${room.visualState ?? ''} ${roomProps.map(prop => prop.type).join(' ')}`.toLowerCase();
  return {
    flooded: Boolean(room.flooded || room.waterLevel > 0 || /flood|submerged|waterlogged/.test(text)),
    burning: Boolean(room.burning || room.fireLevel > 0 || /burning|fire-hazard/.test(text)),
    infected: Boolean(room.infected || agents.some(agent => agent.infected || agent.hosted || agent.infectionType) || /infection|parasite|plague/.test(text)),
    webbed: Boolean(room.webbed || /webbed|spider-web/.test(text)),
    spores: Number(room.sporeLevel ?? room.spores ?? (/spore|fungal/.test(text) ? 1 : 0)),
    corrupted: Boolean(room.corrupted || /corrupt|death-energy|cursed/.test(text))
  };
}
function visualVariant(flags, owner) {
  if (flags.ruined) return 'ruined';
  if (flags.collapsing) return 'damaged';
  if (flags.siege || flags.combat || flags.contested) return 'contested';
  if (flags.burning) return 'burning';
  if (flags.infected) return 'corrupted';
  if (flags.flooded) return 'flooded';
  return owner ? `controlled:${owner}` : 'default';
}
function agentFaction(agent) { return agent?.faction === 'party' ? 'adventurer-expedition' : agent?.factionId ?? agent?.ecologyFaction ?? agent?.faction ?? null; }
function groupBy(items, keyOf) { const result = new Map(); for (const item of items) { const key = keyOf(item); if (!key) continue; if (!result.has(key)) result.set(key, []); result.get(key).push(item); } return result; }
function array(value) { return Array.isArray(value) ? value : []; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function clamp01(value) { return clamp(value, 0, 1); }
