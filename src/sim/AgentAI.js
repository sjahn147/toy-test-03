import { nearestRoom, nextStep } from './Pathfinding.js';

const STATS = {
  fighter: { hp: 18, attack: 5, courage: 9 },
  rogue: { hp: 12, attack: 4, courage: 6 },
  cleric: { hp: 14, attack: 3, courage: 7 },
  wizard: { hp: 9, attack: 6, courage: 3 },
  goblin: { hp: 8, attack: 3, courage: 4 },
  skeleton: { hp: 10, attack: 3, courage: 10 },
  slime: { hp: 16, attack: 2, courage: 8 },
  mimic: { hp: 15, attack: 7, courage: 10 },
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
    cooldown: 0,
    mood: raw.hidden ? 'waiting' : 'curious',
    gold: raw.gold ?? 0,
    kills: raw.kills ?? 0
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

  if (agent.faction === 'party' && shouldLeave(agent, sim)) {
    if (agent.roomId === 'entry') return { type: 'exitDungeon' };
    return moveToward(agent, sim, 'entry', `${agent.name} started thinking about retirement and reinforcements.`);
  }

  if (enemiesHere.length) {
    if (agent.role === 'wizard' && agent.hp <= agent.maxHp * 0.42) return flee(agent, sim, `${agent.name} chose field research from a safer room.`);
    if (agent.role === 'goblin' && alliesHere.length < 2) return flee(agent, sim, `${agent.name} remembered an urgent goblin appointment elsewhere.`);
    const target = weakest(enemiesHere);
    return { type: 'attack', targetId: target.id };
  }

  if (agent.role === 'cleric') {
    const wounded = sim.agents.find(candidate => active(candidate) && candidate.faction === agent.faction && candidate.hp < candidate.maxHp * 0.55);
    if (wounded) {
      if (wounded.roomId === agent.roomId) return { type: 'heal', targetId: wounded.id };
      return moveToward(agent, sim, wounded.roomId, `${agent.name} hurried toward the smell of regret.`);
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
    const partyRooms = sim.agents.filter(candidate => active(candidate) && candidate.faction === 'party').map(candidate => candidate.roomId);
    const target = nearestRoom(sim.graph, agent.roomId, partyRooms);
    if (target) return moveToward(agent, sim, target);
  }

  const neighbors = sim.graph.get(agent.roomId) ?? [];
  const wanderChance = agent.role === 'ogre' ? 0.08 : 0.18;
  if (neighbors.length && Math.random() < wanderChance) {
    return { type: 'move', roomId: neighbors[Math.floor(Math.random() * neighbors.length)] };
  }

  return { type: 'idle' };
}

function active(agent) {
  return agent.alive && !agent.departed && !agent.travel;
}

function shouldLeave(agent, sim) {
  if (agent.roomId !== 'entry' && sim.turn < 10) return false;
  const activeMonsters = sim.agents.filter(candidate => active(candidate) && candidate.faction === 'dungeon' && !candidate.hidden).length;
  if (activeMonsters === 0 && sim.turn > 8) return true;
  if (activeMonsters < 2 && sim.turn > 18 && Math.random() < 0.45) return true;
  if (agent.hp < agent.maxHp * 0.35) return true;
  if (agent.gold >= 5 && sim.turn > 14) return true;
  if (sim.props.every(prop => prop.type !== 'treasure' || prop.opened) && sim.turn > 18) return true;
  return false;
}

function weakest(agents) {
  return [...agents].sort((a, b) => a.hp - b.hp)[0];
}

function moveToward(agent, sim, targetRoom, text = null) {
  const step = nextStep(sim.graph, agent.roomId, targetRoom);
  if (!step || step === agent.roomId) return { type: 'idle' };
  return { type: 'move', roomId: step, text };
}

function flee(agent, sim, text) {
  const enemies = sim.agents.filter(candidate => active(candidate) && candidate.faction !== agent.faction).map(candidate => candidate.roomId);
  const options = sim.graph.get(agent.roomId) ?? [];
  const safer = options.find(room => !enemies.includes(room)) ?? options[0];
  if (!safer) return { type: 'idle' };
  return { type: 'move', roomId: safer, text };
}
