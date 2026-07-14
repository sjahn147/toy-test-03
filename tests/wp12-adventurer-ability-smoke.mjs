import assert from 'node:assert/strict';
import { AdventurerAbilitySystem } from '../src/sim/AdventurerAbilitySystem.js';
import { ensureAdventurerProfile } from '../src/adventurers/AdventurerProfile.js';

const fighter = ensureAdventurerProfile({ id: 'fighter-a', name: 'Rana', role: 'fighter', faction: 'party', level: 5, roomId: 'A', hp: 18, maxHp: 24, attack: 7, alive: true });
const ally = ensureAdventurerProfile({ id: 'rogue-a', name: 'Milo', role: 'rogue', faction: 'party', level: 2, roomId: 'A', hp: 4, maxHp: 12, attack: 4, alive: true });
const enemy = { id: 'enemy-a', name: 'Goblin', role: 'goblin', faction: 'dungeon', roomId: 'A', hp: 15, maxHp: 15, alive: true };
const events = [];
const sim = {
  agents: [fighter, ally, enemy],
  event(text, meta) { events.push({ text, ...meta }); },
  applyCombatDamage(source, target, amount) { target.hp = Math.max(0, target.hp - amount); return amount; },
  emitEffect() {}
};

const system = new AdventurerAbilitySystem();
system.initialize(sim);
const action = system.decide(fighter, sim);
assert.equal(action.type, 'adventurer-ability');
assert.equal(action.abilityId, 'fighter.guard');
assert.equal(system.resolve(fighter, action, sim), true);
assert.ok(fighter.adventurerGuard.remaining > 0);
const reduced = system.modifyIncomingDamage(enemy, fighter, 10);
assert.ok(reduced < 10);

system.update(20, sim);
assert.equal(fighter.adventurerGuard, null);
assert.ok(events.some(event => event.type === 'adventurer-ability'));
assert.equal(system.snapshot(sim).roster.length, 2);

console.log('WP12 adventurer ability smoke: ok');
