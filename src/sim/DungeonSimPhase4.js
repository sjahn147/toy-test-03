import { DungeonSim as Phase3DungeonSim } from './DungeonSimPhase3.js';
import { EquipmentSystem } from './EquipmentSystem.js';

export class DungeonSim extends Phase3DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.equipmentSystem = new EquipmentSystem({ onEvent: text => this.event(text) });
    this.equipmentSystem.initializeAgents(this.agents, this.props);
  }

  update(dt) {
    this.equipmentSystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (agent?.faction === 'party' && this.isActive(agent) && !agent.travel && !agent.combat) {
      const tradeAction = this.equipmentSystem.decideTrade(agent, this);
      if (tradeAction) {
        this.equipmentSystem.trade(agent, this);
        return;
      }
    }

    if (action?.type === 'equipment-trade') {
      this.equipmentSystem.trade(agent, this);
      return;
    }

    const treasure = action?.type === 'openTreasure'
      ? this.props.find(prop => prop.id === action.propId)
      : null;
    const treasureWasClosed = treasure && !treasure.opened;
    const combatBefore = agent?.combat;

    super.resolve(agent, action);

    if (action?.type === 'attack' && !combatBefore && agent?.combat) {
      this.equipmentSystem.wearWeapon(agent, this, agent.combat.ranged ? 0.72 : 1);
      this.equipmentSystem.adjustCombatTiming(agent);
    }

    if (treasureWasClosed && treasure?.opened) {
      const room = this.rooms.find(candidate => candidate.id === treasure.roomId);
      const position = treasure.placement
        ? { x: room.x + (treasure.placement.ox ?? 0), z: room.z + (treasure.placement.oz ?? 0) }
        : { x: room?.x ?? 0, z: room?.z ?? 0 };
      this.equipmentSystem.spawnLoot('treasure', treasure.roomId, Math.max(1, this.generation), position, true);
      if (Math.random() < 0.35) this.equipmentSystem.spawnLoot('treasure', treasure.roomId, Math.max(1, this.generation), { x: position.x + 0.45, z: position.z - 0.25 }, true);
      this.event(`${treasure.label} released equipment as well as the usual financial temptation.`);
    }
  }

  applyCombatDamage(source, target, amount, metadata = {}) {
    const mitigated = this.equipmentSystem.mitigateDamage(target, amount);
    super.applyCombatDamage(source, target, mitigated, metadata);
    if (target?.faction === 'party') this.equipmentSystem.wearArmor(target, this, Math.max(0.5, amount * 0.12));
  }

  applyHealing(source, target, amount, metadata = {}) {
    const bonus = source?.healingBonus ?? 0;
    super.applyHealing(source, target, amount + bonus, metadata);
  }

  finalizeDeath(source, target) {
    const shouldDrop = target?.faction === 'dungeon' && !target.lootDropped;
    const roomId = target?.roomId;
    const position = target?.roomCell ? { x: target.roomCell.x, z: target.roomCell.z } : null;
    const role = target?.role;
    const level = target?.level ?? 1;
    super.finalizeDeath(source, target);

    if (shouldDrop && roomId) {
      target.lootDropped = true;
      const drop = this.equipmentSystem.spawnLoot(role, roomId, level, position, false);
      if (drop) this.event(`${target.name} left behind ${drop.item.name}.`);
    }
  }

  spawnMonster(forcedRole = null) {
    const before = this.agents.length;
    super.spawnMonster(forcedRole);
    const spawned = this.agents[before];
    if (spawned) this.equipmentSystem.initializeAgent(spawned);
  }

  snapshot() {
    return {
      ...super.snapshot(),
      lootDrops: this.equipmentSystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      loot: this.equipmentSystem.lootDrops.length,
      broken: this.agents.filter(agent =>
        agent.faction === 'party' && Object.values(agent.equipment ?? {}).some(item => item?.broken)
      ).length
    };
  }
}
