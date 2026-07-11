import { EQUIPMENT_SLOTS, INITIAL_LOADOUTS, ITEM_TEMPLATES, LOOT_TABLES, instantiateItem } from '../data/itemCatalog.js';

const MAX_INVENTORY = 6;

export class EquipmentSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.sequence = 0;
    this.dropSequence = 0;
    this.lootDrops = [];
    this.pickupClock = 0;
  }

  initializeAgents(agents, props = []) {
    for (const agent of agents) this.initializeAgent(agent);
    const merchant = props.find(prop => prop.type === 'merchant_stall');
    if (merchant) this.initializeMerchant(merchant);
  }

  initializeAgent(agent) {
    agent.baseAttack ??= agent.attack;
    agent.baseMaxHp ??= agent.maxHp;
    agent.equipment ??= Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, null]));
    agent.inventory ??= [];
    agent.equipmentRevision ??= 0;
    agent.tradeCooldown ??= 0;

    if (agent.faction === 'party' && !agent.loadoutInitialized) {
      for (const templateId of INITIAL_LOADOUTS[agent.role] ?? []) {
        const item = instantiateItem(templateId, this.sequence++, agent.level ?? 1);
        if (item) agent.equipment[item.slot] = item;
      }
      agent.loadoutInitialized = true;
      agent.equipmentRevision += 1;
    }
    this.applyStats(agent);
  }

  initializeMerchant(merchant) {
    merchant.equipmentStock ??= [];
    while (merchant.equipmentStock.length < 4) {
      const item = this.randomItem('treasure', 1 + merchant.equipmentStock.length);
      if (item) merchant.equipmentStock.push(item);
    }
  }

  update(dt, sim) {
    for (const agent of sim.agents) {
      this.initializeAgent(agent);
      agent.tradeCooldown = Math.max(0, (agent.tradeCooldown ?? 0) - dt);
    }
    const merchant = sim.props.find(prop => prop.type === 'merchant_stall');
    if (merchant) this.initializeMerchant(merchant);

    this.pickupClock -= dt;
    if (this.pickupClock <= 0) {
      this.pickupClock = 0.38;
      this.autoPickup(sim);
    }
  }

  spawnLoot(sourceType, roomId, level = 1, position = null, guaranteed = false) {
    if (!guaranteed && Math.random() > dropChance(sourceType)) return null;
    const item = this.randomItem(sourceType, level);
    if (!item) return null;
    const drop = {
      id: `loot-${this.dropSequence++}`,
      roomId,
      item,
      x: position?.x ?? null,
      z: position?.z ?? null,
      age: 0
    };
    this.lootDrops.push(drop);
    return drop;
  }

  randomItem(sourceType, level = 1) {
    const pool = LOOT_TABLES[sourceType] ?? LOOT_TABLES.treasure;
    if (!pool?.length) return null;
    const templateId = pool[Math.floor(Math.random() * pool.length)];
    return instantiateItem(templateId, this.sequence++, level);
  }

  autoPickup(sim) {
    for (const drop of [...this.lootDrops]) {
      const candidates = sim.agents.filter(agent =>
        agent.faction === 'party' && agent.alive && !agent.downed && !agent.departed && !agent.queued && !agent.travel && agent.roomId === drop.roomId
      );
      if (!candidates.length) continue;

      const ranked = candidates
        .map(agent => ({ agent, gain: this.upgradeGain(agent, drop.item) }))
        .sort((a, b) => b.gain - a.gain);
      const receiver = ranked[0].gain > 0.25
        ? ranked[0].agent
        : candidates.find(agent => agent.inventory.length < MAX_INVENTORY);
      if (!receiver) continue;

      this.pickup(receiver, drop.item, sim);
      this.lootDrops = this.lootDrops.filter(candidate => candidate.id !== drop.id);
    }
  }

  pickup(agent, item, sim) {
    const equipped = this.tryEquip(agent, item, sim);
    if (!equipped) {
      if (agent.inventory.length >= MAX_INVENTORY) {
        const worst = [...agent.inventory].sort((a, b) => this.score(agent, a) - this.score(agent, b))[0];
        if (worst) agent.inventory = agent.inventory.filter(candidate => candidate.instanceId !== worst.instanceId);
      }
      agent.inventory.push(item);
      this.onEvent(`${agent.name} packed away ${item.name}.`);
    }
  }

  tryEquip(agent, item, sim) {
    const current = agent.equipment[item.slot];
    const newScore = this.score(agent, item);
    const currentScore = current ? this.score(agent, current) : -Infinity;
    if (newScore <= currentScore + 0.25) return false;

    if (current) agent.inventory.push(current);
    agent.inventory = agent.inventory.filter(candidate => candidate.instanceId !== item.instanceId);
    agent.equipment[item.slot] = item;
    agent.equipmentRevision += 1;
    this.applyStats(agent);
    sim?.emitEffect?.('equipment-upgrade', { roomId: agent.roomId, agentId: agent.id, duration: 1.15 });
    this.onEvent(`${agent.name} equipped ${item.name}.`);
    return true;
  }

  applyStats(agent) {
    const equipped = Object.values(agent.equipment ?? {}).filter(Boolean).filter(item => !item.broken);
    agent.attack = (agent.baseAttack ?? agent.attack ?? 1) + sum(equipped, 'attack');
    agent.maxHp = agent.baseMaxHp ?? agent.maxHp;
    agent.hp = Math.min(agent.hp, agent.maxHp);
    agent.defense = sum(equipped, 'defense');
    agent.healingBonus = sum(equipped, 'healing');
    agent.attackRange = sum(equipped, 'range');
    agent.attackSpeed = sum(equipped, 'speed');
  }

  score(agent, item) {
    if (!item || item.broken) return -20;
    const roleFit = item.roles?.length && !item.roles.includes(agent.role) ? -9 : item.roles?.includes(agent.role) ? 3 : 0;
    const durabilityRatio = item.maxDurability ? item.durability / item.maxDurability : 1;
    let value = roleFit + item.attack * 3 + item.defense * 2.8 + item.healing * (agent.role === 'cleric' ? 3.6 : 1.2) + item.speed * 4;
    if (['archer', 'wizard'].includes(agent.role)) value += item.range * 1.5;
    else value += item.range * 0.25;
    return value * (0.55 + durabilityRatio * 0.45);
  }

  upgradeGain(agent, item) {
    const current = agent.equipment?.[item.slot];
    return this.score(agent, item) - (current ? this.score(agent, current) : 0);
  }

  wearWeapon(agent, sim, amount = 1) {
    this.wearItem(agent, 'mainHand', amount, sim);
    if (agent.equipment?.offHand?.attack > 0) this.wearItem(agent, 'offHand', amount * 0.5, sim);
  }

  wearArmor(agent, sim, amount = 1) {
    const slots = ['body', 'offHand', 'head'].filter(slot => agent.equipment?.[slot] && !agent.equipment[slot].broken);
    if (!slots.length) return;
    const slot = slots[Math.floor(Math.random() * slots.length)];
    this.wearItem(agent, slot, amount, sim);
  }

  wearItem(agent, slot, amount, sim) {
    const item = agent.equipment?.[slot];
    if (!item || item.broken || item.maxDurability >= 90) return;
    item.durability = Math.max(0, item.durability - amount);
    if (item.durability > 0) return;
    item.broken = true;
    agent.equipmentRevision += 1;
    this.applyStats(agent);
    sim?.emitEffect?.('equipment-break', { roomId: agent.roomId, agentId: agent.id, duration: 1.05 });
    this.onEvent(`${agent.name} broke ${item.name}.`);
  }

  mitigateDamage(agent, amount) {
    const defense = agent.defense ?? 0;
    return Math.max(1, Math.round(amount - defense * 0.42));
  }

  adjustCombatTiming(agent) {
    if (!agent.combat) return;
    const modifier = clamp(1 - (agent.attackSpeed ?? 0) * 0.18, 0.72, 1.3);
    agent.combat.duration *= modifier;
    if (agent.combat.recovery) agent.combat.recovery *= modifier;
  }

  decideTrade(agent, sim) {
    if (agent.faction !== 'party' || !agent.alive || agent.departed || agent.travel || agent.queued || agent.tradeCooldown > 0) return null;
    const merchant = sim.props.find(prop => prop.type === 'merchant_stall' && prop.roomId === agent.roomId);
    if (!merchant) return null;
    const damaged = Object.values(agent.equipment ?? {}).some(item => item && item.durability < item.maxDurability * 0.55);
    const sellable = agent.inventory?.length > 0;
    const affordableUpgrade = merchant.equipmentStock?.some(item => item.value <= agent.gold && this.upgradeGain(agent, item) > 0.5);
    return damaged || sellable || affordableUpgrade ? { type: 'equipment-trade' } : null;
  }

  trade(agent, sim) {
    const merchant = sim.props.find(prop => prop.type === 'merchant_stall' && prop.roomId === agent.roomId);
    if (!merchant) return false;
    this.initializeMerchant(merchant);

    const damaged = Object.values(agent.equipment ?? {})
      .filter(item => item && item.durability < item.maxDurability)
      .sort((a, b) => a.durability / a.maxDurability - b.durability / b.maxDurability)[0];
    if (damaged) {
      const missing = damaged.maxDurability - damaged.durability;
      const cost = Math.max(1, Math.ceil(missing / 9));
      if (agent.gold >= cost) {
        agent.gold -= cost;
        damaged.durability = damaged.maxDurability;
        damaged.broken = false;
        agent.equipmentRevision += 1;
        agent.tradeCooldown = 6;
        this.applyStats(agent);
        this.onEvent(`${agent.name} paid ${cost} coins to repair ${damaged.name}.`);
        return true;
      }
    }

    const upgrade = [...(merchant.equipmentStock ?? [])]
      .filter(item => item.value <= agent.gold && this.upgradeGain(agent, item) > 0.5)
      .sort((a, b) => this.upgradeGain(agent, b) - this.upgradeGain(agent, a))[0];
    if (upgrade) {
      agent.gold -= upgrade.value;
      merchant.equipmentStock = merchant.equipmentStock.filter(item => item.instanceId !== upgrade.instanceId);
      this.tryEquip(agent, upgrade, sim);
      agent.tradeCooldown = 7;
      return true;
    }

    const sale = [...(agent.inventory ?? [])].sort((a, b) => this.score(agent, a) - this.score(agent, b))[0];
    if (sale) {
      const price = Math.max(1, Math.floor(sale.value * 0.55));
      agent.inventory = agent.inventory.filter(item => item.instanceId !== sale.instanceId);
      agent.gold += price;
      merchant.equipmentStock.push(sale);
      agent.tradeCooldown = 5;
      this.onEvent(`${agent.name} sold ${sale.name} for ${price} coins.`);
      return true;
    }
    return false;
  }

  snapshot() {
    return this.lootDrops.map(drop => ({
      ...drop,
      item: { ...drop.item }
    }));
  }
}

function sum(items, key) {
  return items.reduce((total, item) => total + (item[key] ?? 0), 0);
}

function dropChance(sourceType) {
  if (sourceType === 'treasure' || sourceType === 'mimic' || sourceType === 'ogre') return 1;
  if (sourceType === 'skeleton' || sourceType === 'orc' || sourceType === 'spider') return 0.62;
  return 0.44;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
