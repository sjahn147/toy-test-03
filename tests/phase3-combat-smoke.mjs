import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase3.js';

const originalRandom = Math.random;
Math.random = seededRandom(147);

try {
  const scenario = applyPhase2Facilities(SCENARIOS[0]);
  const sim = new DungeonSim(scenario);
  for (let frame = 0; frame < 240; frame += 1) sim.update(1 / 30);

  const threshold = sim.rooms.find(room => room.tags?.includes('entrance_threshold'));
  const wizard = sim.agents.find(agent => agent.role === 'wizard');
  const fighter = sim.agents.find(agent => agent.role === 'fighter');
  const cleric = sim.agents.find(agent => agent.role === 'cleric');
  const monster = sim.agents.find(agent => agent.faction === 'dungeon' && !agent.hidden);
  assert.ok(threshold && wizard && fighter && cleric && monster, 'required combat actors must exist');

  for (const agent of [wizard, fighter, cleric, monster]) {
    sim.occupancy.release(agent.id);
    agent.roomId = threshold.id;
    agent.travel = null;
    agent.departed = false;
    agent.queued = false;
    agent.alive = true;
    agent.downed = false;
    agent.combat = null;
    assert.ok(sim.occupancy.placeAgent(agent, threshold.id), `place ${agent.id}`);
  }

  const initialHp = monster.hp;
  assert.equal(sim.combatSystem.startAttack(wizard, monster, sim), true, 'wizard should launch a projectile');
  assert.equal(sim.projectileSystem.projectiles.length, 1, 'magic projectile should exist before impact');
  assert.equal(monster.hp, initialHp, 'ranged damage must not apply before impact');
  for (let frame = 0; frame < 180; frame += 1) sim.update(1 / 60);
  assert.ok(monster.hp < initialHp || !monster.alive, 'projectile impact should apply damage');

  monster.alive = true;
  monster.downed = false;
  monster.hp = monster.maxHp;
  monster.combat = null;
  fighter.combat = null;
  const meleeHp = monster.hp;
  assert.equal(sim.combatSystem.startAttack(fighter, monster, sim), true, 'fighter should begin melee attack');
  assert.equal(fighter.combat.phase, 'windup', 'melee begins with windup');
  sim.combatSystem.update(0.5, sim);
  assert.equal(fighter.combat.phase, 'impact', 'melee advances to impact');
  sim.combatSystem.update(0.1, sim);
  assert.ok(monster.hp < meleeHp, 'damage applies during impact phase');

  fighter.hp = 1;
  fighter.downed = false;
  fighter.alive = true;
  sim.applyCombatDamage(monster, fighter, 99, { melee: true });
  assert.equal(fighter.alive, true, 'adventurer remains alive while downed');
  assert.equal(fighter.downed, true, 'lethal adventurer damage creates downed state');
  assert.ok(fighter.bleedout > 0, 'downed adventurer gets bleedout timer');
  assert.equal(sim.combatSystem.tryRescue(cleric, fighter, sim), true, 'same-room ally can rescue');
  assert.equal(fighter.downed, false, 'rescue clears downed state');
  assert.ok(fighter.hp > 0, 'rescue restores minimal health');

  fighter.hp = 1;
  sim.applyCombatDamage(monster, fighter, 99, { melee: true });
  fighter.bleedout = 0.01;
  sim.combatSystem.update(0.02, sim);
  assert.equal(fighter.alive, false, 'expired bleedout finalizes death');
  assert.equal(fighter.resurrectable, true, 'finalized adventurer death becomes resurrectable');

  console.log(`PASS phase3: ${sim.projectileSystem.projectiles.length} live projectiles, ${sim.metrics().downed} downed`);
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
