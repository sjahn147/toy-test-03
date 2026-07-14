import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const floorScreen = await readFile(new URL('../src/screens/ObserveScreenFloorWP13.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/engine/StrategyDungeonRendererWP13.js', import.meta.url), 'utf8');

assert.match(floorScreen, /source === 'user' && this\.cameraController\?\.mode === 'focus'/);
assert.match(floorScreen, /leaveFocus\(\{ restore:false, reason:'floor-select' \}\)/);
assert.match(floorScreen, /if \(this\.cameraController\?\.mode !== 'focus'\) return;/);
assert.match(floorScreen, /source:'user'/);

assert.match(renderer, /routes: \(snapshot\.routes \?\? \[\]\)\.filter\(routeVisible\)/);
assert.match(renderer, /verticalConnectors: \(snapshot\.verticalConnectors \?\? \[\]\)\.filter\(isConnectorVisible\)/);
assert.doesNotMatch(renderer, /floorSceneManager\.reindex\(\)/);

console.log('WP13 floor navigation smoke passed');
