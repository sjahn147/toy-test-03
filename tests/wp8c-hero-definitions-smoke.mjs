import assert from 'node:assert/strict';
import { listHeroDefinitions, getHeroDefinition, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { HERO_ANIMATION_CLIPS, getHeroAnimationClip } from '../src/content/heroes/HeroAnimationClips.js';
import manifest from '../content/campaigns/sleeping-citadel/faction-heroes.json' with { type: 'json' };

assert.deepEqual(validateHeroDefinitions(), []);
// Later work packages (WP8d onward) append more heroes to this shared
// registry, so these check WP8-A/B/C's 9 are present, not that the roster is
// frozen at exactly 9.
const heroes = listHeroDefinitions();
assert.ok(heroes.length >= 9);
assert.ok(manifest.heroes.length >= 9);
const heroIds = heroes.map(hero => hero.id);
for (const id of [
  'hero.nibble', 'hero.kirik', 'hero.karg',
  'hero.isara', 'hero.orum-bell', 'hero.glop',
  'hero.jijik', 'hero.tissa', 'hero.murga'
]) assert.ok(heroIds.includes(id), `missing ${id}`);
for (const id of ['hero.jijik', 'hero.tissa', 'hero.murga']) {
  const hero = getHeroDefinition(id);
  assert.ok(hero, id);
  assert.equal(hero.skills.length, 3);
  assert.ok(hero.visual.dedicatedParts.length >= 8);
  assert.ok(hero.visual.silhouette.length >= 3);
  assert.ok(HERO_ANIMATION_CLIPS[hero.visual.animationProfile]);
  for (const skill of hero.skills) {
    assert.ok(getHeroAnimationClip(hero.visual.animationProfile, `skill:${skill.id}`), `${skill.id} missing animation`);
    assert.ok(skill.windup > 0 && skill.recovery >= 0 && skill.cooldown > 0);
    assert.ok(skill.telegraph.shape);
  }
}
assert.deepEqual(getHeroDefinition('hero.jijik').skills[0].costs, { powder: 2, scrap: 1 });
assert.deepEqual(getHeroDefinition('hero.murga').skills[2].costs, { meat: 6 });
console.log('WP8-C hero definitions smoke passed');
