import assert from 'node:assert/strict';
import { HERO_DEFINITIONS, listHeroDefinitions, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { HERO_ANIMATION_CLIPS } from '../src/content/heroes/HeroAnimationClips.js';

assert.deepEqual(validateHeroDefinitions(), []);
const heroes = listHeroDefinitions();
assert.equal(heroes.length, 3);
assert.deepEqual(heroes.map(hero => hero.id), ['hero.nibble', 'hero.kirik', 'hero.karg']);

for (const hero of heroes) {
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
