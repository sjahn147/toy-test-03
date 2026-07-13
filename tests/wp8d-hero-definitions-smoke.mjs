import assert from 'node:assert/strict';
import { getHeroDefinition, listHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';

const expected = [
  ['hero.aldren', 'aldren-royal-guard', ['aldren-royal-line', 'aldren-shield-judgment', 'aldren-unrevoked-order']],
  ['hero.malcor', 'malcor-ghast-lord', ['malcor-predators-cry', 'malcor-memory-flesh', 'malcor-hungry-feast']],
  ['hero.arvek', 'arvek-black-gate', ['arvek-black-gate', 'arvek-banishment-sentence', 'arvek-close-the-city']]
];
for (const [id, animationProfile, skills] of expected) {
  const hero = getHeroDefinition(id);
  assert.ok(hero, `missing ${id}`);
  assert.equal(hero.visual.animationProfile, animationProfile);
  assert.equal(hero.rank, 'faction-hero');
  assert.equal(hero.unique, true);
  assert.equal(hero.visual.dedicatedParts.length >= 8, true);
  assert.deepEqual(hero.skills.map(skill => skill.id), skills);
  for (const skill of hero.skills) {
    assert.ok(skill.windup > 0 && skill.recovery > 0 && skill.cooldown > 0);
    assert.ok(skill.telegraph?.shape);
    assert.ok(skill.effects.length > 0);
  }
}
assert.ok(listHeroDefinitions().length >= 12);
console.log('WP8-D hero definitions smoke passed');
