import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE_STUB } from './helpers/three-stub.mjs';

const root = await mkdtemp(join(tmpdir(), 'wp8d-factory-'));
await mkdir(join(root, 'src/engine/heroes'), { recursive: true });
await mkdir(join(root, 'src/content/heroes'), { recursive: true });
await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
await writeFile(join(root, 'src/engine/ThreeScene.js'), THREE_STUB);
await copyFile(new URL('../src/engine/heroes/HeroMiniatureFactory.js', import.meta.url), join(root, 'src/engine/heroes/HeroMiniatureFactory.js'));
await copyFile(new URL('../src/content/heroes/HeroDefinitions.js', import.meta.url), join(root, 'src/content/heroes/HeroDefinitions.js'));
const { createHeroMiniature } = await import(`${pathToFileURL(join(root, 'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=${Date.now()}`);

const cases = [
  { id: 'hero.aldren', role: 'hero-aldren', minimumMeshes: 55, joints: ['soulCore','shieldRoot','swordRoot','cloakL','cloakR','commandChain'] },
  { id: 'hero.malcor', role: 'hero-malcor', minimumMeshes: 55, joints: ['jaw','coatTailL','coatTailR','cutlery','vaporRoot','handL','handR'] },
  { id: 'hero.arvek', role: 'hero-arvek', minimumMeshes: 60, joints: ['towerL','towerR','crossbar','shieldRoot','swordRoot','keyRing','chainCloak'] }
];
for (const test of cases) {
  const mesh = createHeroMiniature({ id: `agent-${test.role}`, heroId: test.id, role: test.role, faction: 'dungeon', hp: 100, maxHp: 100 });
  assert.ok(mesh);
  assert.equal(mesh.userData.articulated, true);
  assert.ok(mesh.userData.heroMeshCount >= test.minimumMeshes, `${test.id} density ${mesh.userData.heroMeshCount}`);
  for (const joint of test.joints) assert.ok(mesh.userData.joints[joint], `${test.id} missing ${joint}`);
  assert.ok(mesh.userData.damageParts.stage1Show.length + mesh.userData.damageParts.stage1Hide.length > 0);
  assert.ok(mesh.userData.damageParts.stage2Show.length + mesh.userData.damageParts.stage2Hide.length > 0);
  assert.ok(mesh.getObjectByName('hero-ring'));
}
for (const kind of ['royal-skeleton','ghoul','spectral-guard']) {
  const mesh = createHeroMiniature({ id: `summon-${kind}`, role: kind, heroSummonKind: kind });
  assert.ok(mesh, `summon ${kind}`);
  assert.equal(mesh.userData.heroSummonKind, kind);
  assert.ok(mesh.userData.heroMeshCount >= 8);
}
console.log('WP8-D undead hero factory smoke passed');
