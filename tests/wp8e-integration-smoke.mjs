import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listHeroDefinitions, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { HeroAdaptationSystem } from '../src/sim/heroes/HeroAdaptationSystem.js';
import { HeroBroodSystem } from '../src/sim/heroes/HeroBroodSystem.js';
import { HeroMimicrySystem } from '../src/sim/heroes/HeroMimicrySystem.js';
import { HeroGardenSystem } from '../src/sim/heroes/HeroGardenSystem.js';
import { HeroHoardSystem } from '../src/sim/heroes/HeroHoardSystem.js';

const heroes = listHeroDefinitions();
assert.equal(heroes.length, 18, 'WP8-E must complete the eighteen-hero roster');
assert.equal(heroes.reduce((sum, hero) => sum + hero.skills.length, 0), 54, 'WP8-E must expose 54 active skills');
assert.deepEqual(validateHeroDefinitions(), []);
const finalIds = ['hero.pev','hero.eighth-cocoon','hero.empty-queen-hand','hero.failed-successor','hero.sleeping-gardener','hero.goldcrown-back'];
for (const id of finalIds) assert.ok(heroes.some(hero => hero.id === id), `missing ${id}`);

const manifest = JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/faction-heroes.json', import.meta.url), 'utf8'));
assert.match(manifest.scope, /WP8-E|complete|final/i);
assert.equal(manifest.heroes.length, 18);
for (const id of finalIds) {
  const item = manifest.heroes.find(hero => hero.id === id);
  assert.ok(item, `manifest missing ${id}`);
  assert.ok(Array.isArray(item.frameworkContribution) && item.frameworkContribution.length >= 3, `${id} framework contribution`);
}

const skillSource = await readFile(new URL('../src/sim/heroes/HeroSkillSystem.js', import.meta.url), 'utf8');
for (const token of [
  'pev-purifying-bubble','pev-borrow-shape','pev-selective-assimilation',
  'cocoon-silk-lance','cocoon-thread-guard','cocoon-cast-off-shell','queen-lay-royal-clutch','queen-reassign-brood','queen-without-body',
  'successor-borrowed-gesture','successor-false-investiture','successor-shed-the-prince','gardener-rooted-orchard','gardener-prune-the-blight','gardener-turn-of-seasons',
  'goldcrown-bone-rake-charge','goldcrown-trophy-volley','goldcrown-royal-molt'
]) assert.ok(skillSource.includes(token), `skill resolver missing ${token}`);
for (const system of ['heroAdaptationSystem','heroBroodSystem','heroMimicrySystem','heroGardenSystem','heroHoardSystem']) assert.ok(skillSource.includes(system), `skill dispatch missing ${system}`);

const leadership = await readFile(new URL('../src/sim/heroes/HeroLeadershipSystem.js', import.meta.url), 'utf8');
for (const id of finalIds) assert.ok(leadership.includes(id), `leadership missing ${id}`);
const renderer = await readFile(new URL('../src/engine/heroes/HeroWorldActorRenderer.js', import.meta.url), 'utf8');
for (const token of ['royal-clutch','knight-husk','prince-husk','relic-shell','relic-projectile','purifying-bubble','brood-domain','rooted-orchard','silk-guard']) assert.ok(renderer.includes(token), `world actor renderer missing ${token}`);

const systems = [new HeroAdaptationSystem(), new HeroBroodSystem(), new HeroMimicrySystem(), new HeroGardenSystem(), new HeroHoardSystem()];
assert.doesNotThrow(() => JSON.stringify(systems.map(system => system.snapshot())));
for (const system of systems) for (const value of Object.values(system.metrics())) assert.equal(typeof value, 'number');
console.log('WP8-E complete roster integration smoke passed');
