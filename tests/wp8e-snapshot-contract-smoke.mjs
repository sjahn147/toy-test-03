import assert from 'node:assert/strict';
import { HeroAdaptationSystem } from '../src/sim/heroes/HeroAdaptationSystem.js';
import { HeroBroodSystem } from '../src/sim/heroes/HeroBroodSystem.js';
import { HeroMimicrySystem } from '../src/sim/heroes/HeroMimicrySystem.js';
import { HeroGardenSystem } from '../src/sim/heroes/HeroGardenSystem.js';
import { HeroHoardSystem } from '../src/sim/heroes/HeroHoardSystem.js';

const adaptation = new HeroAdaptationSystem();
const brood = new HeroBroodSystem();
const mimicry = new HeroMimicrySystem();
const garden = new HeroGardenSystem();
const hoard = new HeroHoardSystem();

adaptation.bubbles.push({ id: 'adapt-1', kind: 'purifying-bubble', roomId: 'R1', ownerId: 'pev', clearKinds: ['poison'], remaining: 3 });
brood.guards.push({ id: 'guard-1', kind: 'silk-guard', roomId: 'R2', ownerId: 'cocoon', hp: 10, remaining: 3 });
brood.clutches.push({ id: 'clutch-1', kind: 'royal-clutch', roomId: 'R2', ownerId: 'queen', remaining: 3 });
mimicry.husks.push({ id: 'husk-1', kind: 'prince-husk', roomId: 'R3', ownerId: 'successor', remaining: 3 });
garden.patches.push({ id: 'garden-1', kind: 'rooted-orchard', roomId: 'R4', ownerId: 'gardener', remaining: 3 });
hoard.shells.push({ id: 'shell-1', kind: 'relic-shell', roomId: 'R5', ownerId: 'goldcrown', hp: 20, remaining: 3, trophies: [] });
hoard.projectiles.push({ id: 'shot-1', kind: 'relic-projectile', roomId: 'R5', ownerId: 'goldcrown', remaining: 1, duration: 1, from: { x: 0, y: 1, z: 0 }, to: { x: 1, y: 1, z: 1 } });

const snapshot = {
  heroAdaptation: adaptation.snapshot(),
  heroBrood: brood.snapshot(),
  heroMimicry: mimicry.snapshot(),
  heroGarden: garden.snapshot(),
  heroHoard: hoard.snapshot()
};
assert.doesNotThrow(() => JSON.stringify(snapshot));
assert.equal(snapshot.heroAdaptation.bubbles[0].roomId, 'R1');
assert.equal(snapshot.heroBrood.guards[0].roomId, 'R2');
assert.equal(snapshot.heroMimicry.husks[0].roomId, 'R3');
assert.equal(snapshot.heroGarden.patches[0].roomId, 'R4');
assert.equal(snapshot.heroHoard.shells[0].roomId, 'R5');
assert.equal(snapshot.heroHoard.projectiles[0].roomId, 'R5');
for (const value of Object.values(snapshot)) assert.ok(value && typeof value === 'object' && !Array.isArray(value));
console.log('WP8-E snapshot contract smoke passed');
