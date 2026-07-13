import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroLeadershipSystem } from '../src/sim/heroes/HeroLeadershipSystem.js';

const structure = { id: 'workbench', roomId: 'D18', factionId: 'copper-tail-clutch', hp: 50, maxHp: 100 };
const goblin = { id: 'goblin-1', role: 'goblin', faction: 'dungeon', ecologyFaction: 'goblin-clan', roomId: 'D19', alive: true, attack: 4, courage: 5, armor: 0, speedMultiplier: 1, mood: 'retreating' };
const orc = { id: 'orc-1', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'J49', alive: true, attack: 6, courage: 8, armor: 1, speedMultiplier: 1 };
const sim = {
  rooms: [{ id: 'D19' }, { id: 'D18' }, { id: 'J49' }],
  agents: [goblin, orc],
  graph: new Map([['D19', []], ['D18', []], ['J49', []]]),
  combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
  equipmentSystem: { initializeAgent() {} },
  occupancy: { placeAgent() { return true; } },
  constructionSystem: { structures: [structure] },
  advancedEcologySystem: { traps: [] },
  heroSkillSystem: { duelForHero() { return null; } }
};
const heroes = new HeroSystem();
heroes.initialize(sim);
const leadership = new HeroLeadershipSystem();
leadership.update(1, sim);
assert.ok(goblin.speedMultiplier > 1, 'Nibble leadership speeds retreating goblins');
assert.ok(orc.attack > 6 && orc.courage > 8, 'Karg leadership strengthens orcs in his room');
assert.ok(structure.hp > 50, 'Kirik field maintenance repairs real structures');
const attackAfterFirst = orc.attack;
leadership.update(1, sim);
assert.equal(orc.attack, attackAfterFirst, 'leadership modifiers must not stack every tick');
assert.ok(leadership.metrics().heroLeadershipEffectsActive >= 2);
console.log('WP8-A hero leadership smoke passed');
