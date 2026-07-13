import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listHeroDefinitions, getHeroDefinition, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { listHeroAnimationProfiles, getHeroAnimationProfile } from '../src/content/heroes/HeroAnimationClips.js';

assert.deepEqual(validateHeroDefinitions(), []);
const heroes = listHeroDefinitions();
assert.equal(heroes.length, 6, 'WP8-B must preserve the WP8-A trio and add exactly three irregular heroes');

const expected = [
  ['hero.isara', 'hero-isara', 'undead-host', 'E25', 'isara-spectral'],
  ['hero.orum-bell', 'hero-orum-bell', 'bluecap-colony', 'F28', 'orum-fungal'],
  ['hero.glop', 'hero-glop', 'slime-bloom', 'L57', 'glop-regal']
];
for (const [id, role, factionId, roomId, animationProfile] of expected) {
  const hero = getHeroDefinition(id);
  assert.ok(hero, `missing ${id}`);
  assert.equal(hero.role, role);
  assert.equal(hero.factionId, factionId);
  assert.equal(hero.initialRoomId, roomId);
  assert.equal(hero.visual.animationProfile, animationProfile);
  assert.ok(hero.visual.dedicatedParts.length >= 8, `${id} must have a key-visual-density part list`);
  assert.ok(hero.visual.silhouette.length >= 3, `${id} must have three silhouette anchors`);
  assert.equal(hero.skills.length, 3);
  assert.ok(hero.runtimeDefaults && typeof hero.runtimeDefaults === 'object');
  for (const skill of hero.skills) {
    assert.ok(skill.windup >= 1, `${skill.id} must have a readable windup`);
    assert.ok(skill.cooldown >= 8, `${skill.id} cooldown too short for a hero signature skill`);
    assert.ok(skill.telegraph.shape);
    assert.ok(skill.effects.length > 0);
  }
  assert.ok(getHeroAnimationProfile(animationProfile));
}

const profiles = listHeroAnimationProfiles();
for (const id of ['isara-spectral', 'orum-fungal', 'glop-regal']) {
  const profile = profiles.find(item => item.id === id);
  assert.ok(profile, `missing animation profile ${id}`);
  for (const clip of ['idle-primary', 'idle-secondary', 'death']) {
    assert.ok(profile[clip], `${id} missing ${clip}`);
  }
  assert.equal(Object.keys(profile).filter(key => key.startsWith('skill:')).length, 3, `${id} must expose three bespoke skill clips`);
}

const content = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/faction-heroes.json', import.meta.url), 'utf8'));
assert.equal(content.schemaVersion, 2);
assert.equal(content.heroes.length, 6);
for (const id of expected.map(entry => entry[0])) {
  const record = content.heroes.find(hero => hero.id === id);
  assert.ok(record);
  assert.equal(record.slice, 'wp8b');
  assert.ok(record.frameworkContribution.length >= 3);
}

console.log('WP8-B hero definition and content contract smoke passed');
