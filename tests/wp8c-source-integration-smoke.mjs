import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async relative => readFile(new URL(`../${relative}`, import.meta.url), 'utf8');
const simulation = await source('src/sim/DungeonSimulation.js');
const combat = await source('src/sim/CombatSystem.js');
const phase3 = await source('src/sim/DungeonSimPhase3.js');
const renderer = await source('src/engine/DungeonRenderer.js');
const contract = await source('src/domain/snapshotContract.js');
const normalizer = await source('src/compat/normalizeLegacySnapshot.js');
const pkg = JSON.parse(await source('package.json'));

for (const token of [
  'HeroFormSystem', 'HeroPhysicsSystem', 'HeroDeployableSystem', 'HeroEnvironmentSystem',
  'this.heroFormSystem.update(dt, this)', 'this.heroDeployableSystem.update(dt, this)',
  'this.heroEnvironmentSystem.update(dt, this)', 'this.heroPhysicsSystem.update(dt, this)',
  'modifyIncomingDamage?.(source, target, amount, metadata)',
  'this.heroEnvironmentSystem?.onDamageDealt?.(source, target, dealt)',
  'heroForms: this.heroFormSystem.snapshot(this)',
  'heroPhysics: this.heroPhysicsSystem.snapshot()',
  'heroDeployables: this.heroDeployableSystem.snapshot()',
  'heroEnvironment: this.heroEnvironmentSystem.snapshot()'
]) assert.ok(simulation.includes(token), `DungeonSimulation missing ${token}`);

assert.ok(combat.includes('heroEnvironmentSystem?.modifyOutgoingDamage'));
assert.ok(phase3.includes('a.heroPhysicsOffset?.x'));
for (const token of [
  'HeroWorldActorRenderer', 'snapshot.heroDeployables?.deployables',
  'snapshot.heroEnvironment?.fields', 'snapshot.heroPhysics?.tethers',
  'target.x + physicsOffset.x', 'animateHeroMiniature'
]) assert.ok(renderer.includes(token), `DungeonRenderer missing ${token}`);

for (const table of ['heroes', 'heroForms', 'heroDeployables', 'heroProjectiles', 'heroFields']) {
  assert.ok(contract.includes(`'${table}'`), `snapshot contract missing ${table}`);
}
for (const index of ['heroesByFaction', 'heroFormsByOwner', 'heroDeployablesByRoom', 'heroProjectilesByRoom', 'heroFieldsByRoom']) {
  assert.ok(contract.includes(`'${index}'`), `snapshot contract missing ${index}`);
  assert.ok(normalizer.includes(`${index}:`), `normalizer missing ${index}`);
}
assert.ok(normalizer.includes("tableOf(raw.heroForms?.forms, 'hero-form')"));
assert.ok(normalizer.includes("tableOf(raw.heroDeployables?.deployables, 'hero-deployable')"));
assert.ok(normalizer.includes("tableOf(raw.heroEnvironment?.fields, 'hero-field')"));
assert.ok(pkg.scripts?.['test:wp8c']);
assert.ok(pkg.scripts?.['test:wp8b']);
assert.equal(pkg.scripts['test:production'].split('test:wp8c').length - 1, 1);
assert.equal(pkg.scripts['test:production'].split('test:wp8b').length - 1, 1);

console.log('WP8-C cumulative source integration smoke passed');
