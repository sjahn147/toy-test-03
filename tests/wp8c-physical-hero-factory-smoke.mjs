import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE_STUB } from './helpers/three-stub.mjs';

const root = await mkdtemp(join(tmpdir(), 'wp8c-factory-'));
await mkdir(join(root, 'src/engine/heroes'), { recursive: true });
await mkdir(join(root, 'src/content/heroes'), { recursive: true });
await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
await writeFile(join(root, 'src/engine/ThreeScene.js'), THREE_STUB);
await copyFile(new URL('../src/engine/heroes/HeroMiniatureFactory.js', import.meta.url), join(root, 'src/engine/heroes/HeroMiniatureFactory.js'));
await copyFile(new URL('../src/content/heroes/HeroDefinitions.js', import.meta.url), join(root, 'src/content/heroes/HeroDefinitions.js'));

const { createHeroMiniature } = await import(`${pathToFileURL(join(root, 'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=${Date.now()}`);
const cases = [
  {
    id: 'hero.jijik', role: 'hero-jijik', minimumMeshes: 48,
    joints: ['mechanicalShoulder', 'mechanicalElbow', 'toolRotor', 'toolHammer', 'toolNozzle', 'toolMortar', 'powderPack', 'gauge'],
    skillParts: ['toolRotor', 'toolHammer', 'toolNozzle', 'toolMortar', 'recoilBrace']
  },
  {
    id: 'hero.tissa', role: 'hero-tissa', minimumMeshes: 40,
    joints: ['helmet', 'tankRoot', 'tankL', 'tankR', 'hoseL', 'hoseR', 'tailBase', 'tailMid', 'tailFin', 'wrench', 'harpoon'],
    skillParts: ['wrench', 'harpoon', 'tailBase', 'tankRoot']
  },
  {
    id: 'hero.murga', role: 'hero-murga', minimumMeshes: 50,
    joints: ['cauldronRoot', 'cauldron', 'lid', 'brazier', 'hookRoot', 'chainRoot', 'cleaverRoot', 'necklace'],
    skillParts: ['cauldronRoot', 'lid', 'hookRoot', 'chainRoot', 'cleaverRoot']
  }
];

for (const test of cases) {
  const miniature = createHeroMiniature({ id: `agent-${test.role}`, heroId: test.id, role: test.role, faction: 'dungeon', hp: 100, maxHp: 100 });
  assert.ok(miniature, `${test.id} should create a miniature`);
  assert.equal(miniature.userData.heroId, test.id);
  assert.equal(miniature.userData.articulated, true);
  assert.ok(miniature.userData.heroMeshCount >= test.minimumMeshes, `${test.id} should exceed hero-quality mesh density (${miniature.userData.heroMeshCount})`);
  for (const joint of test.joints) assert.ok(miniature.userData.joints[joint], `${test.id} missing joint ${joint}`);
  for (const part of test.skillParts) assert.ok(miniature.userData.skillParts[part], `${test.id} missing skill part ${part}`);
  assert.ok(miniature.getObjectByName('hero-ring'));
  assert.ok(miniature.getObjectByName('hp'));
  assert.ok(miniature.userData.damageParts.stage1Show.length + miniature.userData.damageParts.stage1Hide.length > 0);
  assert.ok(miniature.userData.damageParts.stage2Show.length + miniature.userData.damageParts.stage2Hide.length > 0);
  let meshes = 0;
  miniature.traverse(node => { if (node.isMesh) meshes += 1; });
  assert.ok(meshes > miniature.userData.heroMeshCount, 'indicator meshes should be additive to authored model density');
}

assert.equal(createHeroMiniature({ id: 'common', role: 'goblin' }), null);
console.log('WP8-C hero factory smoke passed');
