import assert from 'node:assert/strict';
import { ENGLISH_CHRONICLE_CATALOG } from '../src/localization/EnglishChronicleCatalog.js';

const chronicleKeys = Object.keys(ENGLISH_CHRONICLE_CATALOG).filter(key => !key.startsWith('system.') && !['combat.hit','combat.heal','agent.move.started','agent.move.arrived','logistics.carry.move','logistics.escort.move','construction.work','siege.hit','hero.physics.collision','legacy.unknown'].includes(key));
const banned = /\b(undefined|null|NaN|cooldown|socket id|target id|resolve failed|pathfinding failed)\b/i;
for (const key of chronicleKeys) {
  for (const line of ENGLISH_CHRONICLE_CATALOG[key].variants) {
    assert.ok(line.length <= 190, `${key} line is too long`);
    assert.ok(!banned.test(line), `${key} leaks implementation language: ${line}`);
  }
}
const sharpLines = chronicleKeys.flatMap(key => ENGLISH_CHRONICLE_CATALOG[key].variants).filter(line => /\.|;/.test(line));
assert.ok(sharpLines.length >= 80, 'catalog needs enough authored observation lines');
console.log('WP9-A copy quality smoke passed');
