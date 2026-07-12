import { graphDistance, nearestRoom, nextStep } from './Pathfinding.js';

const STATS = {
  fighter: { hp: 18, attack: 5, courage: 9 },
  rogue: { hp: 12, attack: 4, courage: 6 },
  cleric: { hp: 14, attack: 3, courage: 7 },
  wizard: { hp: 9, attack: 6, courage: 3 },
  archer: { hp: 11, attack: 5, courage: 6 },
  goblin: { hp: 8, attack: 3, courage: 4 },
  skeleton: { hp: 10, attack: 3, courage: 10 },
  slime: { hp: 16, attack: 2, courage: 8 },
  mimic: { hp: 15, attack: 7, courage: 10 },
  spider: { hp: 9, attack: 3, courage: 7 },
  orc: { hp: 22, attack: 6, courage: 10 },
  zombie: { hp: 14, attack: 4, courage: 8 },
  ogre: { hp: 42, attack: 9, courage: 12 }
};

export function hydrateAgent(raw, i) {
  const stats = STATS[raw.role] ?? STATS.goblin;
  const level = raw.level ?? 1;
  const partyBoost = raw.faction === 'party' ? level - 1 : Math.floor((level - 1) * 0.6);
  return {
    ...raw,
    index: i,
    level,
    hp: stats.hp + partyBoost * 3,
    maxHp: stats.hp + partyBoost * 3,
    attack: stats.attack + partyBoost,
    courage: stats.courage,
    alive: true,
    departed: false,
    travel: null,
    roomCell: raw.roomCell ?? null,
    cooldown: 0,
    mood: raw.hidden ? 'waiting' : 'curious',
    gold: raw.gold ?? 0,
    kills: raw.kills ?? 0,
    partyId: raw.partyId ?? null,
    partyLeaderId: raw.partyLeaderId ?? null,
    partyState: raw.partyState ?? null,
    partyDistance: 0,
    orphaned: false,
    blockedMoveRoomId: null,
    blockedMoveUntilTurn: -1,
    previousRoomId: null,
    recentRooms: Array.isArray(raw.recentRooms) ? [...raw.recentRooms].slice(-6) : [raw.roomId].filter(Boolean)
  };
}

export function decideAction(agent, sim) {
  if (!active(agent)) return { type: 'idle' };

  const enemiesHere = sim.agents.filter(candidate => active(candidate) && candidate.faction !== agent.faction && candidate.roomId === agent.roomId && !candidate.hidden);
  const alliesHere = sim.agents.filter(candidate => active(candidate) && candidate.faction === agent.faction && candidate.roomId === agent.roomId);

  if (agent.role === 'mimic') {
    const rogueHere = enemiesHere.find(candidate => candidate.role === 'rogue');
    if (rogueHere) {
      agent.hidden = false;
      return { type: 'attack', targetId: rogueHere.id, text: `${agent.name} revealed too many teeth.` };
    }
    return { type: 'idle' };
  }

  if (agent.faction === 'party' && agent.orphaned && enemiesHere.length) {
    const retreatChance = clamp(0.45 + (7 - agent.courage) * 0.05 + (1 - agent.hp / agent.maxHp) * 0.35, 0.35, 0.9);
    if (Math.random() < retreatChance) return flee(agent, sim, `${agent.name} realized the rest of the party was no longer behind them.`);
  }

  if (enemiesHere.length) {
    if (agent.role === 'wizard' && agent.hp <= agent.maxHp * 0.42) return flee(agent, sim, `${agent.name} chose field research from a safer room.`);
    if (agent.role === 'goblin' && alliesHere.length < 2) return flee(agent, sim, `${agent.name} remembered an urgent goblin appointment elsewhere.`);
    const target = weakest(enemiesHere);
    return { type: 'attack', targetId: target.id };
  }

  if (agent.faction === 'party') {
    const directive = partyDirective(agent, sim);
    if (directive) return directive;
  }

  if (agent.faction === 'party' && shouldLeave(agent, sim)) {
    const entryRoomId = getEntryRoomId(sim);
    if (agent.roomId === entryRoomId) return { type: 'exitDungeon' };
    return moveToward(agent, sim, entryRoomId, `${agent.name} started thinking about retirement and reinforcements.`);
  }

  if (agent.role === 'cleric') {
    const wounded = nearestAgent(agent, sim, candidate => active(candidate) && candidate.faction === agent.faction && candidate.hp < candidate.maxHp * 0.55);
    if (wounded) {
      if (wounded.roomId === agent.roomId) return { type: 'heal', targetId: wounded.id };
      return moveToward(agent, sim, wounded.roomId, `${agent.name} hurried toward the smell of regret.`, wounded.id, 'heal');
    }
  }

  if (agent.role === 'rogue') {
    const treasure = sim.props.find(prop => prop.type === 'treasure' && !prop.opened);
    if (treasure) {
      if (treasure.roomId === agent.roomId) return { type: 'openTreasure', propId: treasure.id };
      return moveToward(agent, sim, treasure.roomId, `${agent.name} heard a coin whisper his legal name.`);
    }
  }

  if (agent.faction === 'party') {
    const targetRoom = nearestRoom(sim.graph, agent.roomId, sim.rooms.filter(room => !sim.visited.has(room.id)).map(room => room.id));
    if (targetRoom) return moveToward(agent, sim, targetRoom);
    const treasureRoom = nearestRoom(sim.graph, agent.roomId, sim.props.filter(prop => prop.type === 'treasure' && !prop.opened).map(prop => prop.roomId));
    if (treasureRoom) return moveToward(agent, sim, treasureRoom);
  }

  if (agent.role === 'skeleton' && sim.lastNoiseRoom) {
    if (agent.roomId !== sim.lastNoiseRoom) return moveToward(agent, sim, sim.lastNoiseRoom, `${agent.name} followed a noise with professional resentment.`);
  }

  if (agent.faction === 'dungeon') {
    const target = nearestAgent(agent, sim, candidate => active(candidate) && candidate.faction === 'party' && !candidate.hidden);
    if (target) return moveToward(agent, sim, target.roomId, null, target.id, 'attack');
  }

  const neighbors = sim.graph.get(agent.roomId) ?? [];
  const available = neighbors.filter(roomId => !(agent.blockedMoveRoomId === roomId && (agent.blockedMoveUntilTurn ?? -1) >= sim.turn));
  if (isOscillating(agent) && available.every(roomId => roomId === agent.previousRoomId)) {
    agent.mood = 'holding-position';
    return { type: 'idle' };
  }
  const wanderChance = agent.role === 'ogre' ? 0.08 : 0.18;
  const effectiveWanderChance = isOscillating(agent) ? wanderChance * 0.15 : wanderChance;
  if (available.length && Math.random() < effectiveWanderChance) {
    const alternatives = available.filter(roomId => roomId !== agent.previousRoomId);
    const pool = alternatives.length ? alternatives : available;
    return { type: 'move', roomId: pool[Math.floor(Math.random() * pool.length)] };
  }

  return { type: 'idle' };
}

function partyDirective(agent, sim) {
  const partySystem = sim.partySystem;
  if (!partySystem || !agent.partyId) return null;
  const party = partySystem.getParty(agent);
  const leader = partySystem.getLeader(agent, sim.agents);
  if (!party || !leader) return null;

  if (leader.id === agent.id) {
    if (partySystem.leaderShouldWait(agent, sim.agents)) {
      agent.mood = 'waiting-for-party';
      return { type: 'idle' };
    }
    return null;
  }

  const targetRoom = partySystem.getFollowRoom(agent, sim.agents);
  if (!targetRoom || targetRoom === agent.roomId) return null;
  const text = agent.orphaned
    ? `${agent.name} abandoned every other plan and tried to find ${leader.name}.`
    : null;
  return moveToward(agent, sim, targetRoom, text, leader.id, 'join-party');
}

function active(agent) {
  return agent.alive && !agent.departed && !agent.travel && !agent.queued && !agent.downed;
}

function shouldLeave(agent, sim) {
  if (agent.partyId && agent.partyLeaderId && agent.id !== agent.partyLeaderId) return false;
  const entryRoomId = getEntryRoomId(sim);
  if (agent.roomId !== entryRoomId && sim.turn < 10) return false;
  const activeMonsters = sim.agents.filter(candidate => active(candidate) && candidate.faction === 'dungeon' && !candidate.hidden).length;
  if (activeMonsters === 0 && sim.turn > 8) return true;
  if (activeMonsters < 2 && sim.turn > 18 && Math.random() < 0.45) return true;
  if (agent.hp < agent.maxHp * 0.35) return true;
  if (agent.gold >= 5 && sim.turn > 14) return true;
  if (sim.props.every(prop => prop.type !== 'treasure' || prop.opened) && sim.turn > 18) return true;
  return false;
}

function getEntryRoomId(sim) {
  return sim.entryRoomId ?? sim.rooms.find(room => room.kind === 'start')?.id ?? 'entry';
}

function weakest(agents) {
  return [...agents].sort((a, b) => a.hp - b.hp)[0];
}

function nearestAgent(agent, sim, predicate) {
  return sim.agents
    .filter(candidate => candidate.id !== agent.id && predicate(candidate))
    .map(candidate => ({ candidate, distance: graphDistance(sim.graph, agent.roomId, candidate.roomId) }))
    .sort((a, b) => a.distance - b.distance || a.candidate.index - b.candidate.index)[0]?.candidate ?? null;
}

function moveToward(agent, sim, targetRoom, text = null, interactionTargetId = null, interactionType = null) {
  const step = nextStep(sim.graph, agent.roomId, targetRoom);
  if (!step || step === agent.roomId) return { type: 'idle' };
  if (!interactionTargetId && isOscillating(agent) && step === agent.previousRoomId && targetRoom === agent.previousRoomId) {
    agent.mood = 'holding-position';
    return { type: 'idle', text: `${agent.name} stopped uselessly retracing the last corridor.` };
  }
  if (agent.blockedMoveRoomId === step && (agent.blockedMoveUntilTurn ?? -1) >= sim.turn && !interactionTargetId) {
    return { type: 'idle', text: `${agent.name} stopped repeating a blocked route.` };
  }
  return { type: 'move', roomId: step, text, interactionTargetId, interactionType };
}

function flee(agent, sim, text) {
  const enemies = sim.agents.filter(candidate => active(candidate) && candidate.faction !== agent.faction).map(candidate => candidate.roomId);
  const options = sim.graph.get(agent.roomId) ?? [];
  const safer = options.find(room => !enemies.includes(room) && room !== agent.previousRoomId) ?? options.find(room => !enemies.includes(room)) ?? options[0];
  if (!safer) return { type: 'idle' };
  return { type: 'move', roomId: safer, text, forceDisengage: true };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isOscillating(agent) {
  const rooms = agent.recentRooms ?? [];
  if (rooms.length < 4) return false;
  const tail = rooms.slice(-4);
  return tail[0] === tail[2] && tail[1] === tail[3] && tail[0] !== tail[1];
}
