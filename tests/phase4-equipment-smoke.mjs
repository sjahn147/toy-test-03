import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase4.js';
import { instantiateItem } from '../src/data/itemCatalog.js';

const originalRandom = Math.random;
Math.random = seededRandom(147);

try {
  const scenario = applyPhase2Facilities(SCENARIOS.find(candidate => candidate.id === 'cellar'));
  const sim = new DungeonSim(scenario);
  const fighter = sim.agents.find(agent => agent.role === 'fighter' && agent.faction === 'party');
  assert.ok(fighter, 'expected a fighter');
  assert.ok(fighter.equipment.mainHand, 'fighter must start with a main-hand item');
  assert.ok(fighter.equipment.body, 'fighter must start with body armor');
  assert.ok(fighter.attack > fighter.baseAttack, 'equipment attack bonus must affect combat stats');
  assert.ok(fighter.defense > 0, 'armor must provide defense');

  fighter.queued = false;
  fighter.departed = false;
  fighter.roomId = 'expedition-waystation';
  fighter.gold = 30;

  const oldRevision = fighter.equipmentRevision;
  const oldAttack = fighter.attack;
  const upgrade = instantiateItem('orc_axe', 999, 3);
  const equipped = sim.equipmentSystem.tryEquip(fighter, upgrade, sim);
  assert.equal(equipped, true, 'fighter should equip a clearly stronger axe');
  assert.equal(fighter.equipment.mainHand.templateId, 'orc_axe');
  assert.ok(fighter.equipmentRevision > oldRevision, 'equipment revision must change after swap');
  assert.ok(fighter.attack > oldAttack, 'stronger weapon must increase attack');

  const weapon = fighter.equipment.mainHand;
  const attackWithWeapon = fighter.attack;
  sim.equipmentSystem.wearItem(fighter, 'mainHand', weapon.maxDurability + 1, sim);
  assert.equal(weapon.broken, true, 'weapon must break at zero durability');
  assert.ok(fighter.attack < attackWithWeapon, 'broken weapon bonus must be removed');

  const merchant = sim.props.find(prop => prop.type === 'merchant_stall');
  assert.ok(merchant, 'waystation must include a merchant');
  sim.equipmentSystem.trade(fighter, sim);
  assert.equal(weapon.broken, false, 'merchant trade should repair the most damaged equipped item first');
  assert.equal(weapon.durability, weapon.maxDurability, 'repair must restore durability');
  assert.equal(fighter.attack, attackWithWeapon, 'repaired weapon bonus must return');

  const drop = sim.equipmentSystem.spawnLoot('treasure', fighter.roomId, 2, { x: 1, z: 1 }, true);
  assert.ok(drop?.item, 'guaranteed treasure must create equipment loot');
  const snapshot = sim.snapshot();
  assert.equal(snapshot.lootDrops.some(candidate => candidate.id === drop.id), true, 'loot must be exposed in simulation snapshot');

  console.log(`PASS phase4: ${fighter.name} attack ${fighter.attack}, defense ${fighter.defense}, loot ${snapshot.lootDrops.length}`);
} finally {
  Math.random = originalRandom;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
