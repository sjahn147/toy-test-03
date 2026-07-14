import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const factory = await readFile(new URL('../src/engine/adventurers/AdventurerSkinnedFactory.js', import.meta.url), 'utf8');
const animator = await readFile(new URL('../src/engine/adventurers/AdventurerAnimator.js', import.meta.url), 'utf8');
const polished = await readFile(new URL('../src/engine/PolishedMiniatureFactory.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/engine/DungeonRenderer.js', import.meta.url), 'utf8');
const simulation = await readFile(new URL('../src/sim/DungeonSimulation.js', import.meta.url), 'utf8');
const agentAI = await readFile(new URL('../src/sim/AgentAI.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(factory, /new THREE\.SkinnedMesh/);
assert.match(factory, /new THREE\.Skeleton/);
assert.match(factory, /new THREE\.LOD/);
assert.match(factory, /morphAttributes\.position/);
assert.match(factory, /skinIndex/);
assert.match(factory, /skinWeight/);
assert.match(factory, /headwear:/);
assert.match(factory, /offhand:/);
assert.match(animator, /animateModernAdventurer/);
assert.match(animator, /root\.userData\.adventurerRigs/);
assert.match(polished, /createModernAdventurerMiniature/);
assert.match(renderer, /animateModernAdventurer/);
assert.match(renderer, /adventurerVisualSignature/);
assert.match(renderer, /disposeModernAdventurer/);
assert.match(simulation, /AdventurerAbilitySystem/);
assert.match(simulation, /adventurerAbilitySystem\.update/);
assert.match(agentAI, /ensureAdventurerProfile/);
assert.match(packageJson.scripts['test:wp12'], /wp12-adventurer-profile-smoke/);
assert.match(packageJson.scripts['test:production'], /test:wp12/);

console.log('WP12 modern adventurer source integration smoke: ok');
