import assert from 'node:assert/strict';
import {
  adventurerVisualSignature,
  ensureAdventurerProfile,
  grantAdventurerExperience,
  levelForExperience
} from '../src/adventurers/AdventurerProfile.js';

const a = ensureAdventurerProfile({ id: 'party-a', name: 'A', role: 'fighter', faction: 'party', level: 1 });
const b = ensureAdventurerProfile({ id: 'party-a', name: 'A', role: 'fighter', faction: 'party', level: 1 });
const c = ensureAdventurerProfile({ id: 'party-b', name: 'B', role: 'fighter', faction: 'party', level: 1 });

assert.equal(a.appearanceSeed, b.appearanceSeed);
assert.equal(adventurerVisualSignature(a), adventurerVisualSignature(b));
assert.notEqual(a.appearanceSeed, c.appearanceSeed);
assert.ok(a.visualArchetype);
assert.ok(a.specialization);
assert.equal(a.abilityIds.length, 1);
assert.equal(a.equipmentTier, 'recruit');

a.level = 5;
ensureAdventurerProfile(a);
assert.equal(a.equipmentTier, 'veteran');
assert.equal(a.abilityIds.length, 2);

const before = a.level;
const result = grantAdventurerExperience(a, 5000);
assert.ok(a.level >= before);
assert.equal(result.level, a.level);
assert.ok(levelForExperience(0) === 1);
assert.ok(levelForExperience(5000) > 1);

const monster = ensureAdventurerProfile({ id: 'goblin-a', role: 'goblin', faction: 'dungeon', level: 1 });
assert.equal(monster.appearanceSeed, undefined);

console.log('WP12 adventurer profile smoke: ok');
