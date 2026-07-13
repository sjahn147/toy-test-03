import assert from 'node:assert/strict';
import { HERO_DEFINITIONS, listHeroDefinitions, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { HERO_ANIMATION_CLIPS } from '../src/content/heroes/HeroAnimationClips.js';

assert.deepEqual(validateHeroDefinitions(), []);
const heroes = listHeroDefinitions();
// WP8a's own roster is these 3; later work packages (WP8b onward) append more
// to the same registry, so this checks WP8a's heroes are present rather than
// that the registry's total size is frozen at exactly 3.
assert.ok(heroes.length >= 3);
for (const id of ['hero.nibble', 'hero.kirik', 'hero.karg']) {
  assert.ok(heroes.some(hero => hero.id === id), `missing WP8a hero ${id}`);
}

for (const hero of heroes.filter(hero => ['hero.nibble', 'hero.kirik', 'hero.karg'].includes(hero.id))) {
  assert.equal(hero.unique, true);
  assert.equal(hero.rank, 'faction-hero');
  assert.equal(hero.skills.length, 3);
  assert.ok(hero.visual.dedicatedParts.length >= 6);
  assert.ok(hero.visual.silhouette.length >= 3);
  assert.ok(HERO_ANIMATION_CLIPS[hero.visual.animationProfile]);
  for (const skill of hero.skills) {
    assert.ok(skill.windup > 0);
    assert.ok(skill.cooldown > 0);
    assert.ok(skill.telegraph?.shape);
    assert.ok(skill.effects.length > 0);
    assert.ok(HERO_ANIMATION_CLIPS[hero.visual.animationProfile][`skill:${skill.id}`], `${skill.id} needs a dedicated clip`);
  }
}

assert.equal(HERO_DEFINITIONS['hero.nibble'].visual.bodyPlan, 'hero-goblin-coat');
assert.equal(HERO_DEFINITIONS['hero.kirik'].visual.bodyPlan, 'hero-kobold-tripod');
assert.equal(HERO_DEFINITIONS['hero.karg'].visual.bodyPlan, 'hero-orc-heavy');
console.log('WP8-A hero definition smoke passed');
