import {
  chooseRoomStatuses,
  clamp01,
  clampPercent,
  factionUiColor,
  roomStatusSeverity
} from './RoomStatePolicy.js';
import { DEFAULT_FLOOR_HEIGHT } from '../../engine/DungeonTopology.js';

const ACTIVE_TASKS = new Set(['queued', 'moving', 'working', 'interrupted', 'blocked']);
const ACTIVE_SETTLEMENTS = new Set(['active', 'threatened', 'damaged', 'collapsing']);
const BLOCKED_ROUTE_STATES = new Set(['blocked', 'barricaded', 'collapsed', 'flooded', 'webbed', 'locked']);
const DISCOVERED_SECRET_STATES = new Set(['discovered', 'opened', 'collapsed']);
const HERO_RANKS = new Set(['hero', 'faction-hero', 'champion']);

function table(state, name) {
  const value = state?.entities?.[name];
  return value && typeof value === 'object' ? value : {};
}

function index(state, name) {
  const value = state?.indexes?.[name];
  return value && typeof value === 'object' ? value : {};
}

function alive(agent) {
  return agent?.alive !== false && agent?.dead !== true && agent?.departed !== true && agent?.hidden !== true;
}

function factionId(agent) {
  if (!agent) return null;
  return agent.faction === 'party'
    ? 'adventurer-expedition'
    : agent.factionId ?? agent.ecologyFaction ?? (agent.faction !== 'dungeon' ? agent.faction : null) ?? null;
}

function projectedRoom(agent) {
  return agent?.travel?.phase === 'entering'
    ? agent.travel.toRoomId
    : agent?.travel?.toRoomId ?? agent?.roomId ?? null;
}

export function selectRoomStateMap(state, { previous = null, observerFactionId = null } = {}) {
  const result = {};
  for (const room of Object.values(table(state, 'rooms'))) {
    if (!room?.id) continue;
    result[room.id] = selectRoomState(state, room.id, {
      previous: previous?.[room.id] ?? null,
      observerFactionId
    });
  }
  return result;
}

export function selectRoomState(state, roomId, { previous = null, observerFactionId = null } = {}) {
  const room = table(state, 'rooms')[roomId];
  if (!room) return null;

  const agents = table(state, 'agents');
  const settlements = table(state, 'settlements');
  const structures = table(state, 'structures');
  const props = table(state, 'props');
  const connections = table(state, 'connections');
  const cargo = table(state, 'cargo');
  const territories = table(state, 'territories');
  const sieges = table(state, 'sieges');
  const constructionJobs = table(state, 'constructionJobs');
  const tasks = table(state, 'environmentTasks');
  const spatialRooms = table(state, 'spatialRooms');

  const occupants = roomAgents(state, roomId, agents);
  const primaryTerritory = territories[roomId] ?? Object.values(territories).find(item => item.roomId === roomId) ?? null;
  const roomSettlements = ids(index(state, 'settlementsByRoom')[roomId]).map(id => settlements[id]).filter(Boolean);
  const roomStructures = ids(index(state, 'structuresByRoom')[roomId]).map(id => structures[id]).filter(Boolean);
  const roomTasks = ids(index(state, 'environmentTasksByRoom')[roomId]).map(id => tasks[id]).filter(Boolean);
  const roomJobs = ids(index(state, 'constructionJobsByRoom')[roomId]).map(id => constructionJobs[id]).filter(Boolean);
  const roomSieges = ids(index(state, 'siegesByRoom')[roomId]).map(id => sieges[id]).filter(siege => siege?.active !== false);
  const roomProps = ids(index(state, 'propsByRoom')[roomId]).map(id => props[id]).filter(Boolean);
  const roomCargo = ids(index(state, 'cargoByRoom')[roomId]).map(id => cargo[id]).filter(Boolean);
  const roomConnections = ids(index(state, 'connectionsByRoom')[roomId]).map(id => connections[id]).filter(Boolean);
  const spatial = spatialRooms[roomId] ?? Object.values(spatialRooms).find(item => item.roomId === roomId) ?? null;

  const ownerFactionId = primaryTerritory?.owner
    ?? primaryTerritory?.factionId
    ?? room.ownership?.factionId
    ?? room.ownerFactionId
    ?? room.factionId
    ?? null;
  const challengerFactionId = primaryTerritory?.challenger
    ?? primaryTerritory?.challengerFactionId
    ?? room.ownership?.challengerFactionId
    ?? null;
  const control = clampPercent(primaryTerritory?.control ?? room.ownership?.control ?? room.control ?? 0);
  const contested = Boolean(primaryTerritory?.contested ?? room.ownership?.contested ?? room.contested);
  const controlDelta = previous ? control - Number(previous.ownership?.control ?? control) : 0;
  const controlTrend = controlDelta > 0.75 ? 'rising' : controlDelta < -0.75 ? 'falling' : 'steady';

  const byFaction = countBy(occupants, agent => factionId(agent) ?? 'unaffiliated');
  const bySpecies = countBy(occupants, agent => agent.role ?? agent.kind ?? 'unknown');
  const hostile = ownerFactionId
    ? occupants.filter(agent => factionId(agent) && factionId(agent) !== ownerFactionId).length
    : Math.max(0, occupants.length - Math.max(0, ...Object.values(byFaction)));
  const heroes = occupants.filter(agent => HERO_RANKS.has(agent.rank) || agent.unique === true || String(agent.role ?? '').startsWith('hero-'));

  const activeSettlements = roomSettlements.filter(item => ACTIVE_SETTLEMENTS.has(item.state ?? 'active'));
  const primarySettlement = activeSettlements.sort(settlementPriority)[0] ?? roomSettlements[0] ?? null;
  const logicalCapacity = activeSettlements.reduce((sum, item) => sum + numeric(item.effectiveCapacity ?? item.capacity), 0);
  const guestCapacity = activeSettlements.reduce((sum, item) => sum + numeric(item.guestCapacity), 0);
  const physicalCapacity = numeric(spatial?.actorCapacity ?? spatial?.walkableCells ?? 0);
  const currentPopulation = occupants.length;
  const capacity = Math.max(0, Math.floor(
    logicalCapacity > 0 && physicalCapacity > 0
      ? Math.min(logicalCapacity + guestCapacity, physicalCapacity)
      : logicalCapacity > 0
        ? logicalCapacity + guestCapacity
        : physicalCapacity
  ));
  const occupancyRatio = capacity > 0 ? currentPopulation / capacity : currentPopulation > 0 ? 1 : 0;
  const populationDelta = previous ? currentPopulation - Number(previous.population?.current ?? currentPopulation) : 0;
  const populationTrend = populationDelta > 0 ? 'rising' : populationDelta < 0 ? 'falling' : 'steady';
  const overcrowded = Math.max(0, currentPopulation - Math.max(0, capacity));

  const activeSiege = roomSieges[0] ?? null;
  const activeCombat = occupants.some(agent => agent.combat || agent.downed) || (ownerFactionId && hostile > 0 && contested);
  const activeJobs = roomJobs.filter(job => ['building', 'queued', 'working'].includes(job.state ?? job.status));
  const activeTasks = roomTasks.filter(task => ACTIVE_TASKS.has(task.status ?? task.state));
  const settlementState = primarySettlement?.state ?? room.settlementState ?? null;
  const supplyStatus = primarySettlement?.supplyStatus ?? inferSupply(roomCargo, roomConnections);
  const supplyEfficiency = clamp01(primarySettlement?.supplyEfficiency ?? (supplyStatus === 'blockaded' ? 0 : supplyStatus === 'threatened' ? 0.65 : 1));
  const integrity = clampPercent(primarySettlement?.structuralIntegrity
    ?? primarySettlement?.integrity
    ?? weakestStructureIntegrity(roomStructures)
    ?? 100);

  const environment = deriveEnvironment(room, roomProps, occupants);
  const routes = deriveRoutes(roomConnections);
  const economy = deriveEconomy(room, roomProps, activeSettlements, roomCargo);
  const danger = deriveDanger({ hostile, currentPopulation, contested, activeCombat, activeSiege, environment, supplyStatus, routes });
  const pressure = clamp01(
    Math.max(0, occupancyRatio - 0.65) * 1.65
    + Math.min(0.3, hostile * 0.06)
    + (supplyStatus === 'blockaded' ? 0.25 : supplyStatus === 'threatened' ? 0.12 : 0)
    + (environment.infected || environment.burning ? 0.18 : 0)
  );

  const secretDiscovered = routes.secretDiscovered > 0;
  const flags = {
    ruined: settlementState === 'ruined' || room.visualState === 'ruined',
    collapsing: settlementState === 'collapsing' || integrity < 24,
    siege: Boolean(activeSiege),
    combat: activeCombat,
    blockaded: supplyStatus === 'blockaded',
    contested,
    infected: environment.infected || environment.corrupted,
    burning: environment.burning,
    flooded: environment.flooded,
    overcrowded: overcrowded > 0 || occupancyRatio > 1,
    'supply-threatened': supplyStatus === 'threatened',
    construction: activeJobs.length > 0,
    work: activeTasks.length > 0,
    spawning: pressure > 0.72,
    hero: heroes.length > 0,
    secret: secretDiscovered,
    stable: true
  };
  const statuses = chooseRoomStatuses(flags, 3);
  const discovered = room.visited === true || room.discovered === true || room.kind === 'start' || room.tags?.includes('safe_zone');

  return {
    roomId,
    name: room.name ?? roomId,
    zoneId: room.zoneId ?? room.zoneCode ?? room.code ?? null,
    kind: room.kind ?? 'room',
    discovered,
    position: {
      x: numeric(room.x),
      y: numeric((room.floor ?? 0) * DEFAULT_FLOOR_HEIGHT),
      z: numeric(room.z),
      floor: numeric(room.floor)
    },
    ownership: {
      ownerFactionId,
      challengerFactionId,
      ownerColor: factionUiColor(ownerFactionId),
      challengerColor: factionUiColor(challengerFactionId),
      control,
      contested,
      controlDelta,
      controlTrend
    },
    population: {
      current: currentPopulation,
      capacity,
      logicalCapacity,
      physicalCapacity,
      guestCapacity,
      hostile,
      heroes: heroes.length,
      byFaction,
      bySpecies,
      occupancyRatio,
      overcrowded,
      pressure,
      trend: populationTrend,
      delta: populationDelta
    },
    settlement: primarySettlement ? {
      settlementId: primarySettlement.id,
      factionId: primarySettlement.factionId ?? null,
      tier: primarySettlement.tier ?? 1,
      state: settlementState,
      integrity,
      supplyStatus,
      supplyEfficiency,
      upgradeReadiness: primarySettlement.upgradeReadiness ?? null
    } : null,
    environment,
    economy,
    activity: {
      combat: activeCombat,
      siege: activeSiege ? summarizeSiege(activeSiege) : null,
      construction: activeJobs.map(summarizeJob),
      workOrders: activeTasks.map(summarizeTask),
      cargo: roomCargo.length,
      heroIds: heroes.map(agent => agent.id)
    },
    routes,
    spatial: spatial ? {
      totalCells: numeric(spatial.totalCells),
      walkableCells: numeric(spatial.walkableCells ?? spatial.actorCapacity),
      blockedCells: numeric(spatial.blockedCells),
      routeReservedCells: numeric(spatial.routeReservedCells),
      placementReservedCells: numeric(spatial.placementReservedCells),
      largeAnchors: numeric(spatial.largeAnchors),
      conflicts: numeric(spatial.conflicts)
    } : null,
    danger: {
      score: danger,
      level: danger >= 0.78 ? 'critical' : danger >= 0.5 ? 'high' : danger >= 0.24 ? 'moderate' : 'low'
    },
    presentation: {
      primaryStatus: statuses[0]?.id ?? 'stable',
      secondaryStatuses: statuses.slice(1).map(status => status.id),
      statuses,
      severity: roomStatusSeverity(statuses),
      pulse: statuses.some(status => status.severity >= 4),
      visualVariant: deriveVisualVariant({ flags, ownerFactionId, settlementState, environment })
    },
    observer: {
      factionId: observerFactionId,
      friendly: Boolean(observerFactionId && ownerFactionId === observerFactionId)
    }
  };
}

function roomAgents(state, roomId, agents) {
  const listed = ids(index(state, 'agentsByRoom')[roomId]).map(id => agents[id]).filter(alive);
  if (listed.length) return listed;
  return Object.values(agents).filter(agent => alive(agent) && projectedRoom(agent) === roomId);
}

function ids(value) { return Array.isArray(value) ? value : []; }
function numeric(value) { return typeof value === 'number' && Number.isFinite(value) ? value : 0; }

function countBy(items, keyOf) {
  const result = {};
  for (const item of items) {
    const key = String(keyOf(item) ?? 'unknown');
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function settlementPriority(a, b) {
  const rank = { active: 0, threatened: 1, damaged: 2, collapsing: 3, abandoned: 4, ruined: 5 };
  return (rank[a.state] ?? 9) - (rank[b.state] ?? 9) || numeric(b.tier) - numeric(a.tier);
}

function weakestStructureIntegrity(structures) {
  const values = structures
    .map(item => item.maxIntegrity > 0 ? item.integrity / item.maxIntegrity * 100 : null)
    .filter(value => typeof value === 'number' && Number.isFinite(value));
  return values.length ? Math.min(...values) : null;
}

function inferSupply(cargo, connections) {
  if (cargo.some(item => item.routeCut)) return 'blockaded';
  if (cargo.some(item => numeric(item.routeRisk) >= 0.55)) return 'threatened';
  if (connections.length && connections.every(connection => connection.active === false || BLOCKED_ROUTE_STATES.has(connection.state))) return 'blockaded';
  return 'open';
}

function deriveEnvironment(room, props, occupants) {
  const tags = new Set([...(room.tags ?? []), room.environmentState, room.visualState].filter(Boolean).map(value => String(value).toLowerCase()));
  const propTypes = props.map(prop => String(prop.type ?? '').toLowerCase());
  const text = `${[...tags].join(' ')} ${propTypes.join(' ')}`;
  const infectedAgents = occupants.filter(agent => agent.infected || agent.hosted || agent.infectionType).length;
  return {
    flooded: Boolean(room.flooded || room.waterLevel > 0 || /flood|submerged|waterlogged/.test(text)),
    burning: Boolean(room.burning || room.fireLevel > 0 || /burning|fire-hazard/.test(text)),
    infected: Boolean(infectedAgents || room.infected || /infection|parasite|plague/.test(text)),
    infectedAgents,
    sporeLevel: numeric(room.sporeLevel ?? room.spores ?? (/spore|fungal/.test(text) ? 1 : 0)),
    webbed: Boolean(room.webbed || /webbed|spider-web/.test(text)),
    corrupted: Boolean(room.corrupted || /corrupt|death-energy|cursed/.test(text)),
    sanctified: Boolean(room.sanctified || /sanctified|safe_zone|goddess/.test(text))
  };
}

function deriveRoutes(connections) {
  let open = 0, blocked = 0, secretDiscovered = 0;
  for (const connection of connections) {
    const kind = connection.kind ?? 'ordinary';
    const state = connection.state ?? (connection.active === false ? 'blocked' : 'open');
    // Hidden and merely suspected secret routes are intentionally absent from the
    // player-facing room state. Discovery must be a real campaign event, not a UI leak.
    if (kind === 'secret' && !DISCOVERED_SECRET_STATES.has(state)) continue;
    if (connection.active !== false && !BLOCKED_ROUTE_STATES.has(state)) open += 1;
    else blocked += 1;
    if (kind === 'secret') secretDiscovered += 1;
  }
  return { open, blocked, secretDiscovered };
}

function deriveEconomy(room, props, settlements, cargo) {
  const result = {};
  const add = (key, value) => {
    const amount = numeric(value);
    if (amount !== 0) result[key] = (result[key] ?? 0) + amount;
  };
  const source = room.resources ?? room;
  for (const key of ['food', 'water', 'medicine', 'materials', 'wealth', 'scrap', 'metal', 'wood', 'biomass', 'deathEnergy', 'bones']) add(key, source[key]);
  for (const prop of props) if (prop.resourceType) add(prop.resourceType, prop.stock ?? prop.amount ?? 0);
  for (const settlement of settlements) for (const key of ['food', 'water', 'medicine', 'materials', 'wealth']) add(key, settlement[key]);
  result.cargoIncoming = cargo.filter(item => item.state === 'carried').length;
  result.cargoDropped = cargo.filter(item => item.state === 'dropped').length;
  return result;
}

function deriveDanger({ hostile, currentPopulation, contested, activeCombat, activeSiege, environment, supplyStatus, routes }) {
  const density = currentPopulation > 0 ? hostile / currentPopulation : hostile > 0 ? 1 : 0;
  return clamp01(
    density * 0.42 + Math.min(0.24, hostile * 0.05) + (contested ? 0.18 : 0) + (activeCombat ? 0.16 : 0)
    + (activeSiege ? 0.28 : 0) + (environment.infected ? 0.12 : 0) + (environment.burning ? 0.18 : 0)
    + (supplyStatus === 'blockaded' ? 0.12 : 0) + (routes.open === 0 && routes.blocked > 0 ? 0.08 : 0)
  );
}

function summarizeSiege(siege) {
  return { id: siege.id, attackerFaction: siege.attackerFaction ?? null, defenderFaction: siege.defenderFaction ?? null, phase: siege.phase ?? 'active', attackers: numeric(siege.attackers), defensesRemaining: numeric(siege.defensesRemaining) };
}

function summarizeJob(job) {
  const progress = job.duration > 0 ? numeric(job.progress) / job.duration : numeric(job.buildProgress);
  return { id: job.id, type: job.type ?? 'construction', progress: clamp01(progress), state: job.state ?? job.status ?? 'building' };
}

function summarizeTask(task) {
  return { id: task.id, label: task.label ?? task.actionId ?? task.type ?? 'Field work', progress: clamp01(task.progress), status: task.status ?? task.state ?? 'working' };
}

function deriveVisualVariant({ flags, ownerFactionId, settlementState, environment }) {
  if (flags.ruined) return 'ruined';
  if (flags.collapsing) return 'damaged';
  if (flags.siege || flags.combat) return 'contested';
  if (environment.burning) return 'burning';
  if (environment.infected || environment.corrupted) return 'corrupted';
  if (environment.flooded) return 'flooded';
  if (settlementState === 'active' && ownerFactionId) return `occupied:${ownerFactionId}`;
  return ownerFactionId ? `controlled:${ownerFactionId}` : 'default';
}
