import assert from 'node:assert/strict';
import { listHeroDefinitions, getHeroDefinition, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { HERO_ANIMATION_CLIPS, getHeroAnimationClip } from '../src/content/heroes/HeroAnimationClips.js';
import manifest from '../content/campaigns/sleeping-citadel/faction-heroes.json' with { type: 'json' };

const expected = [
  'hero.nibble', 'hero.kirik', 'hero.karg',
  'hero.isara', 'hero.orum-bell', 'hero.glop',
  'hero.jijik', 'hero.tissa', 'hero.murga'
];
assert.deepEqual(validateHeroDefinitions(), []);
const heroes = listHeroDefinitions();
assert.ok(heroes.length >= 9, 'WP8-C must contain at least the cumulative nine heroes');
assert.ok(manifest.heroes.length >= 9, 'WP8-C manifest must contain at least the cumulative nine heroes');
const heroIds = new Set(heroes.map(hero => hero.id));
for (const id of expected) assert.ok(heroIds.has(id), `missing ${id}`);
const manifestIds = new Set(manifest.heroes.map(hero => hero.id));
assert.equal(manifestIds.size, manifest.heroes.length, 'manifest hero ids must be unique');
for (const id of expected) assert.ok(manifestIds.has(id), `manifest missing ${id}`);
for (const id of expected) {
  const hero = getHeroDefinition(id);
  assert.ok(hero, id);
  assert.equal(hero.skills.length, 3, `${id} requires three active skills`);
  assert.ok(hero.visual.dedicatedParts.length >= 6, `${id} must have hero-grade unique parts`);
  assert.ok(hero.visual.silhouette.length >= 3, `${id} must declare a readable silhouette`);
  assert.ok(HERO_ANIMATION_CLIPS[hero.visual.animationProfile], `${id} missing animation profile`);
  for (const skill of hero.skills) {
    assert.ok(getHeroAnimationClip(hero.visual.animationProfile, `skill:${skill.id}`), `${skill.id} missing animation clip`);
    assert.ok(skill.windup > 0 && skill.recovery >= 0 && skill.cooldown > 0, `${skill.id} invalid lifecycle`);
    assert.ok(skill.telegraph?.shape, `${skill.id} missing telegraph`);
  }
}
for (const id of ['hero.jijik', 'hero.tissa', 'hero.murga']) {
  assert.equal(manifest.heroes.find(hero => hero.id === id)?.slice, 'wp8c');
}
assert.deepEqual(getHeroDefinition('hero.jijik').skills[0].costs, { powder: 2, scrap: 1 });
assert.deepEqual(getHeroDefinition('hero.murga').skills[2].costs, { meat: 6 });
console.log('WP8-C cumulative nine-hero definition contract passed');
