// 전역 상단 bar selector (docs/ui/strategy-ui-surface.md §12, surface.global-bar).
// 정규화 WorldSnapshot만 읽는 순수함수 — sim 내부 접근 금지.

const ALERT_SEVERITIES = new Set(['major', 'critical', 'historic']);
const THREATENED_STATES = new Set(['threatened', 'damaged', 'collapsing']);
const INACTIVE_STATES = new Set(['ruined', 'abandoned']);
const MAX_ALERTS = 5;

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

function isAlive(agent) {
  return agent.alive !== false && agent.dead !== true;
}

function agentFactionId(agent) {
  return agent.factionId ?? agent.ecologyFaction ?? agent.faction ?? null;
}

function isAdventurer(agent) {
  if (agent.faction === 'party') return true;
  return agentFactionId(agent) === 'adventurer-expedition';
}

export function selectGlobalBar(state, roomStates = null) {
  const clock = state?.clock ?? {};
  const agents = Object.values(table(state, 'agents'));
  const rooms = Object.values(table(state, 'rooms'));
  const settlements = Object.values(table(state, 'settlements'));
  const factionRecords = table(state, 'factions');
  const events = Array.isArray(state?.events) ? state.events : [];

  const adventurers = agents.filter(isAdventurer);
  const dungeonPopulation = agents.filter(
    agent => isAlive(agent) && !agent.hidden && !isAdventurer(agent)
  ).length;

  const aliveByFaction = {};
  for (const agent of agents) {
    if (!isAlive(agent)) continue;
    const factionId = agentFactionId(agent);
    if (!factionId) continue;
    aliveByFaction[factionId] = (aliveByFaction[factionId] ?? 0) + 1;
  }

  const factions = Object.entries(factionRecords).map(([id, record]) => ({
    id,
    population: typeof record?.population === 'number'
      ? record.population
      : (aliveByFaction[id] ?? 0)
  }));

  let activeSettlements = 0;
  let threatenedSettlements = 0;
  for (const settlement of settlements) {
    const settlementState = settlement.state ?? 'active';
    if (!INACTIVE_STATES.has(settlementState)) activeSettlements += 1;
    if (THREATENED_STATES.has(settlementState)) threatenedSettlements += 1;
  }

  const contestedRooms = roomStates
    ? Object.values(roomStates).filter(room => room?.ownership?.contested).length
    : rooms.filter(room => {
      if (room.contested) return true;
      return Array.isArray(room.tags) && room.tags.includes('contested');
    }).length;

  const alerts = [];
  for (let i = events.length - 1; i >= 0 && alerts.length < MAX_ALERTS; i -= 1) {
    const event = events[i];
    if (!event || !ALERT_SEVERITIES.has(event.severity)) continue;
    alerts.push({
      severity: event.severity,
      text: event.fallbackText ?? event.text ?? ''
    });
  }

  return {
    time: typeof clock.time === 'number' ? clock.time : 0,
    turn: typeof clock.turn === 'number' ? clock.turn : 0,
    ended: clock.ended === true,
    adventurers: {
      count: adventurers.length,
      alive: adventurers.filter(isAlive).length
    },
    dungeonPopulation,
    factions,
    settlements: {
      active: activeSettlements,
      threatened: threatenedSettlements
    },
    contestedRooms,
    alerts
  };
}
