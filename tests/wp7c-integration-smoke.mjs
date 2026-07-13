import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const simulation = await readFile(new URL('../src/sim/DungeonSimulation.js', import.meta.url), 'utf8');
const spawn = await readFile(new URL('../src/sim/SpawnNetworkSystem.js', import.meta.url), 'utf8');
const factory = await readFile(new URL('../src/engine/MiniatureFactory.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/engine/DungeonRenderer.js', import.meta.url), 'utf8');

for (const token of ['EliteEcologySystem', 'EliteAbilitySystem', 'EliteBehaviorSystem']) assert.ok(simulation.includes(token));
assert.ok(spawn.includes('pendingRole'));
assert.ok(spawn.includes('eliteEcologySystem.spawn'));
assert.ok(factory.includes('createEliteMiniature'));
assert.ok(renderer.includes('animateEliteMiniature'));
assert.ok(renderer.includes('agentRenderHeight'));
console.log('WP7-C integration smoke passed');
