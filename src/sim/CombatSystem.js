const RANGED_ROLES = new Set(['wizard', 'archer', 'cleric', 'spider']);

export class CombatSystem {
  constructor() {
    this.sequence = 0;
  }

  initializeAgents(agents) {
    for (const agent of agents) this.initializeAgent(agent);
  }

  initializeAgent(agent) {
    agent.combat ??= null;
    agent.downed ??= false;
    agent.bleedout ??= 0;
    agent.webbed ??= 0;
    agent.rescueProgress ??= 0;
  }

  update(dt, sim) {
    for (const agent of sim.agents) {
      this.initializeAgent(agent);
      agent.webbed = Math.max(0, agent.webbed - dt);
      if (agent.downed) this.updateDowned(agent, dt, sim);
      if (agent.combat) this.updateCombat(agent, dt, sim);
    }
  }

  updateDowned(agent, dt, sim) {
    agent.bleedout -= dt;
    if (agent.bleedout > 0) return;
    agent.hp = 0;
    agent.combat = null;
    sim.finalizeDeath(null, agent);
  }

  updateCombat(agent, dt, sim) {
    const combat = agent.combat;
    const target = sim.agents.find(candidate => candidate.id === combat.targetId);
    if (!target || !target.alive || target.departed || target.travel || target.roomId !== agent.roomId) {
      agent.combat = null;
      return;
    }

    combat.elapsed += dt;
    combat.progress = Math.min(1, combat.elapsed / combat.duration);
    if (combat.progress < 1) return;

    if (combat.phase === 'windup') {
      combat.phase = 'impact';
      combat.elapsed = 0;
      combat.duration = 0.08;
      return;
    }

    if (combat.phase === 'impact') {
      sim.applyCombatDamage(agent, target, combat.amount, { melee: true });
      combat.phase = 'recovery';
      combat.elapsed = 0;
      combat.duration = combat.recovery;
      return;
    }

    agent.combat = null;
  }

  startAttack(agent, target, sim) {
    this.initializeAgent(agent);
    this.initializeAgent(target);
    if (agent.combat || agent.downed || target.downed || !agent.alive || !target.alive) return false;

    const amount = rollDamage(agent);
    if (RANGED_ROLES.has(agent.role)) {
      const projectileType = rangedType(agent.role);
      sim.projectileSystem.spawn({
        type: projectileType,
        source: agent,
        target,
        amount,
        roomId: agent.roomId
      });
      agent.combat = {
        id: `combat-${this.sequence++}`,
        phase: 'recovery',
        targetId: target.id,
        elapsed: 0,
        duration: projectileType === 'web' ? 1.2 : 0.9,
        progress: 0,
        amount,
        ranged: true
      };
      return true;
    }

    agent.combat = {
      id: `combat-${this.sequence++}`,
      phase: 'windup',
      targetId: target.id,
      elapsed: 0,
      duration: agent.role === 'ogre' ? 0.72 : 0.38,
      recovery: agent.role === 'rogue' ? 0.42 : agent.role === 'ogre' ? 1.0 : 0.58,
      progress: 0,
      amount,
      ranged: false
    };
    return true;
  }

  startHeal(agent, target, sim) {
    if (agent.combat || agent.downed || !agent.alive || !target.alive) return false;
    const amount = 4 + Math.floor(Math.random() * 4);
    sim.projectileSystem.spawn({ type: 'heal', source: agent, target, amount, roomId: agent.roomId });
    agent.combat = {
      id: `combat-${this.sequence++}`,
      phase: 'recovery',
      targetId: target.id,
      elapsed: 0,
      duration: 0.9,
      progress: 0,
      amount,
      ranged: true,
      healing: true
    };
    return true;
  }

  tryRescue(rescuer, target, sim) {
    if (!target?.downed || target.roomId !== rescuer.roomId || rescuer.travel || rescuer.downed) return false;
    target.downed = false;
    target.bleedout = 0;
    target.hp = Math.max(1, Math.round(target.maxHp * 0.28));
    target.mood = 'rescued';
    target.rescueProgress = 0;
    sim.emitEffect('heal', { roomId: target.roomId, agentId: target.id, duration: 0.9, amount: target.hp });
    sim.event(`${rescuer.name} pulled ${target.name} back from the floor.`, { type: 'rescue', sourceId: rescuer.id, targetId: target.id });
    return true;
  }
}

function rangedType(role) {
  if (role === 'archer') return 'arrow';
  if (role === 'spider') return 'web';
  return 'magic';
}

function rollDamage(agent) {
  const roll = 1 + Math.floor(Math.random() * 6);
  return Math.max(1, Math.floor(agent.attack + roll - 3));
}
