import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE_STUB } from './helpers/three-stub.mjs';

const root = await mkdtemp(join(tmpdir(), 'wp8c-world-actors-'));
await mkdir(join(root, 'src/engine/heroes'), { recursive: true });
await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
await writeFile(join(root, 'src/engine/ThreeScene.js'), THREE_STUB);
await copyFile(new URL('../src/engine/heroes/HeroWorldActorRenderer.js', import.meta.url), join(root, 'src/engine/heroes/HeroWorldActorRenderer.js'));
const { THREE } = await import(`${pathToFileURL(join(root, 'src/engine/ThreeScene.js')).href}?v=1`);
const { HeroWorldActorRenderer } = await import(`${pathToFileURL(join(root, 'src/engine/heroes/HeroWorldActorRenderer.js')).href}?v=1`);

const group = new THREE.Group();
const source = new THREE.Group(); source.position.set(1, 0.5, 1);
const target = new THREE.Group(); target.position.set(4, 0.5, 2);
const agentMeshes = new Map([['source', source], ['target', target]]);
const renderer = new HeroWorldActorRenderer(group, agentMeshes);
const rooms = [{ id: 'R', x: 10, z: -4, floor: 1, w: 12, d: 10 }];
const state = {
  deployables: [
    { id: 'charge', kind: 'breach-charge', roomId: 'R', ox: 1, oz: 2, state: 'active' },
    { id: 'seal', kind: 'pressure-seal', roomId: 'R', ox: -1, oz: 1, state: 'active' },
    { id: 'pot', kind: 'healing-cauldron', roomId: 'R', ox: 0, oz: -1, state: 'active' }
  ],
  projectiles: [{ id: 'shell', kind: 'three-point-shell', roomId: 'R', state: 'flying', progress: 0.5, from: { x: 0, y: 1, z: 0 }, to: { x: 3, y: 0, z: -2 }, arcHeight: 3 }],
  fields: [{ id: 'drain', kind: 'emergency-drain', roomId: 'R', radius: 5, remaining: 4 }],
  tethers: [{ id: 'chain', roomId: 'R', sourceAgentId: 'source', targetId: 'target', targetType: 'agent' }]
};
renderer.render(state, rooms, 2.5);
assert.equal(renderer.deployables.size, 3);
assert.equal(renderer.projectiles.size, 1);
assert.equal(renderer.fields.size, 1);
assert.equal(renderer.tethers.size, 1);
assert.equal(group.children.length, 6);
assert.deepEqual({ x: renderer.deployables.get('charge').position.x, y: renderer.deployables.get('charge').position.y, z: renderer.deployables.get('charge').position.z }, { x: 11, y: 2.85, z: -2 });
assert.ok(renderer.projectiles.get('shell').position.y > 2.85);
assert.ok(Math.abs(renderer.fields.get('drain').position.y - 2.885) < 1e-9);
const drain = renderer.fields.get('drain').getObjectByName('drain-1');
const link = renderer.tethers.get('chain').userData.links[5];
const stable = { drainZ: drain.rotation.z, linkX: link.position.x, linkY: link.position.y, linkZ: link.position.z, linkRotZ: link.rotation.z };
renderer.render(state, rooms, 2.5);
assert.deepEqual({ drainZ: drain.rotation.z, linkX: link.position.x, linkY: link.position.y, linkZ: link.position.z, linkRotZ: link.rotation.z }, stable);

renderer.render({}, rooms, 3);
assert.equal(renderer.deployables.size, 0);
assert.equal(renderer.projectiles.size, 0);
assert.equal(renderer.fields.size, 0);
assert.equal(renderer.tethers.size, 0);
assert.equal(group.children.length, 0);
renderer.destroy();
console.log('WP8-C world actor renderer smoke passed');
