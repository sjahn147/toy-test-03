import assert from 'node:assert/strict';
import { EliteAbilitySystem } from '../src/sim/EliteAbilitySystem.js';

const elite = {
  id: 'bombardier-1', name: 'Bombardier', role: 'goblin-bombardier', faction: 'dungeon', ecologyFaction: 'goblin-clan',
  roomId: 'D19', alive: true, departed: false, hidden: false, downed: false, travel: null, combat: null,
  hp: 17, maxHp: 17, attack: 4, armor: 0
};
const partyA = { id: 'party-a', name: 'A', role: 'fighter', faction: 'party', roomId: 'D19', alive: true, departed: false, hidden: false, hp: 30, maxHp: 30, armor: 0 };
const partyB = { id: 'party-b', name: 'B', role: 'cleric', faction: 'party', roomId: 'D19', alive: true, departed: false, hidden: false, hp: 24, maxHp: 24, armor: 0 };
const effects = [];
const sim = {
  agents: [elite, partyA, partyB],
  applyCombatDamage(source, target, amount) { target.hp -= amount; },
  emitEffect(type, payload) { effects.push({ type, ...payload }); },
  ecosystem: { corpses: [] },
  advancedEcologySystem: { traps: [] }
};
const system = new EliteAbilitySystem();
system.initialize(sim);
const action = system.decide(elite, sim);
assert.equal(action.type, 'elite-cast');
assert.equal(action.abilityId, 'lob-fire-pot');
assert.equal(system.resolve(elite, action, sim), true);
assert.equal(elite.eliteCast.phase, 'windup');
system.update(2, sim);
assert.equal(elite.eliteCast.phase, 'impact');
system.update(0.1, sim);
assert.equal(elite.eliteCast.phase, 'recovery');
assert.ok(partyA.hp < 30 && partyB.hp < 24, 'area impact damages hostile cluster');
system.update(1, sim);
assert.equal(elite.eliteCast, null);
assert.ok(elite.eliteCooldowns['lob-fire-pot'] > 0);
assert.ok(effects.some(effect => effect.type === 'elite-telegraph'));
console.log('WP7-C elite abilities smoke passed');
