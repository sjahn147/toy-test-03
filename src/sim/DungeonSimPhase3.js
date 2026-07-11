import { DungeonSim as Phase2DungeonSim } from './DungeonSimPhase2.js';
import { CombatSystem } from './CombatSystem.js';
import { ProjectileSystem } from './ProjectileSystem.js';

export class DungeonSim extends Phase2DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.combatSystem = new CombatSystem();
    this.projectileSystem = new ProjectileSystem();
    this.combatSystem.initializeAgents(this.agents);
  }

  update(dt) {
    this.projectileSystem.update(dt, this);
    this.combatSystem.update(dt, this);
    super.update(dt);
  }

  isActive(agent) {
    return super.isActive(agent) && !agent.downed && !agent.queued;
  }

  resolve(agent, action) {
    if (!this.isActive(agent) || agent.travel || agent.combat) return;

    if (agent.faction === 'party') {
      const downedAlly = this.agents.find(candidate =>
        candidate.downed && candidate.partyId === agent.partyId && candidate.roomId === agent.roomId
      );
      if (downedAlly && this.combatSystem.tryRescue(agent, downedAlly, this)) return;
    }

    if (action?.type === 'attack') {
      const target = this.agents.find(candidate => candidate.id === action.targetId);
      if (!target || !this.isCombatTarget(target) || target.roomId !== agent.roomId) return;
      if (action.text) this.event(action.text);
      this.combatSystem.startAttack(agent, target, this);
      return;
    }

    if (action?.type === 'heal') {
      const target = this.agents.find(candidate => candidate.id === action.targetId);
      if (!target || !target.alive || target.downed || target.travel || target.roomId !== agent.roomId) return;
      this.combatSystem.startHeal(agent, target, this);
      return;
    }

    super.resolve(agent, action);
  }

  isCombatTarget(agent) {
    return agent.alive && !agent.departed && !agent.travel && !agent.downed && !agent.hidden;
  }

  applyCombatDamage(source, target, amount, metadata = {}) {
    if (!target || !this.isCombatTarget(target)) return;
    target.hp -= amount;
    target.lastAttackerId = source?.id ?? null;
    this.lastNoiseRoom = target.roomId;
    this.emitEffect(metadata.projectileType === 'magic' ? 'magic-impact' : metadata.projectileType === 'arrow' ? 'arrow-impact' : 'attack', {
      roomId: target.roomId,
      agentId: target.id,
      duration: 0.62,
      amount
    });
    this.event(`${source?.name ?? 'Something'} hit ${target.name} for ${amount}.`, {
      type: 'attack', sourceId: source?.id, targetId: target.id, amount
    });

    if (target.hp > 0) return;
    if (target.faction === 'party') {
      this.enterDowned(target, source);
      return;
    }
    this.finalizeDeath(source, target);
  }

  applyHealing(source, target, amount) {
    if (!target?.alive || target.downed || target.departed) return;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    this.emitEffect('heal', { roomId: target.roomId, agentId: target.id, duration: 0.85, amount });
    this.event(`${source?.name ?? 'A blessing'} restored ${amount} health to ${target.name}.`, {
      type: 'heal', sourceId: source?.id, targetId: target.id, amount
    });
  }

  applyWeb(source, target, strength) {
    if (!target?.alive || target.downed || target.departed) return;
    target.webbed = Math.max(target.webbed ?? 0, 3.5 + strength * 0.18);
    target.mood = 'webbed';
    this.emitEffect('web-impact', { roomId: target.roomId, agentId: target.id, duration: 1.1, amount: strength });
    this.event(`${source?.name ?? 'A spider'} wrapped ${target.name} in binding silk.`, {
      type: 'web', sourceId: source?.id, targetId: target.id
    });
  }

  enterDowned(target, source) {
    target.hp = 0;
    target.downed = true;
    target.bleedout = 14;
    target.combat = null;
    target.travel = null;
    target.mood = 'downed';
    target.resurrectable = false;
    this.emitEffect('downed', { roomId: target.roomId, agentId: target.id, duration: 1.4 });
    this.event(`${target.name} went down and can still be rescued.`, {
      type: 'downed', sourceId: source?.id, targetId: target.id
    });
  }

  finalizeDeath(source, target) {
    if (!target.alive && !target.downed) return;
    target.downed = false;
    target.alive = false;
    target.hp = 0;
    target.combat = null;
    target.travel = null;
    const killer = source ?? this.agents.find(agent => agent.id === target.lastAttackerId) ?? {
      id: 'dungeon-hazard', name: 'The dungeon', faction: 'dungeon', kills: 0, hp: 1, maxHp: 1
    };
    super.onDeath(killer, target);
  }

  beginTravel(agent, toRoomId) {
    if (agent.webbed > 0 || agent.combat || agent.downed) return;
    super.beginTravel(agent, toRoomId);
    if (agent.travel && agent.webbed > 0) agent.travel.duration *= 1.75;
  }

  spawnMonster(forcedRole = null) {
    super.spawnMonster(forcedRole);
    const spawned = this.agents[this.agents.length - 1];
    if (spawned) this.combatSystem.initializeAgent(spawned);
  }

  snapshot() {
    return {
      ...super.snapshot(),
      projectiles: this.projectileSystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      downed: this.agents.filter(agent => agent.downed).length,
      projectiles: this.projectileSystem.projectiles.length
    };
  }
}
