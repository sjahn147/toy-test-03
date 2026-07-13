import assert from 'node:assert/strict';
import { ELITE_BESTIARY, validateEliteBestiary } from '../src/content/elite/EliteBestiary.js';

const roles = Object.keys(ELITE_BESTIARY);
assert.equal(roles.length, 50, 'WP7-C should ship the full 50-role elite roster');
assert.deepEqual(validateEliteBestiary(), []);
assert.equal(roles.some(role => /auction/i.test(role) || /auction/i.test(ELITE_BESTIARY[role].name)), false, 'auction-themed goblin was intentionally removed');

for (const role of ['skeleton-guard', 'skeleton-archer', 'skeleton-knight', 'ghoul', 'ghast', 'wight', 'wraith-lord', 'death-knight', 'bone-golem', 'crypt-horror']) {
  assert.ok(ELITE_BESTIARY[role], `missing conventional fantasy undead ${role}`);
}
for (const role of ['corpse-colossus', 'bell-tower-revenant']) assert.equal(ELITE_BESTIARY[role].tier, 'abomination');

const major = ['goblin-clan', 'copper-tail-clutch', 'red-tusk-tribe', 'undead-host', 'bluecap-colony', 'red-wing-brood', 'pale-brood'];
for (const faction of major) {
  const entries = Object.values(ELITE_BESTIARY).filter(item => item.factionId === faction || (faction === 'pale-brood' && item.factionId === 'carrion-brood'));
  assert.ok(entries.some(item => ['medium', 'large', 'huge'].includes(item.size)), `${faction} needs medium+ elites`);
  assert.ok(entries.some(item => ['large', 'huge'].includes(item.size)), `${faction} needs a large creature`);
  assert.ok(entries.some(item => ['specialist', 'elite', 'champion', 'abomination'].includes(item.tier)), `${faction} needs a special role`);
}

for (const definition of Object.values(ELITE_BESTIARY)) {
  assert.ok(definition.visual.kit.length >= 2, `${definition.role} needs an explicit assembly kit`);
  assert.ok(definition.abilities.every(action => action.windup > 0 && action.telegraph), `${definition.role} abilities must be telegraphed`);
  assert.ok(definition.ecology.siteTypes.length > 0);
}

console.log('WP7-C bestiary smoke passed');
