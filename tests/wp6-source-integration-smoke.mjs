import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const screen = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/engine/DungeonRendererPhase8.js', import.meta.url), 'utf8');
const three = await readFile(new URL('../src/engine/ThreeScene.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

// WP10 swaps in StrategyObserverShellCameraPhase10, which extends StrategyObserverShellWP6,
// so either literal class name confirms the WP6 shell is still wired into this screen.
assert.ok(screen.includes('StrategyObserverShellWP6') || screen.includes('StrategyObserverShellCameraPhase10'), 'ObserveScreenPhase8 missing a WP6-descended shell');
for (const token of ['CameraDirector', 'setOverlayMode(mode)', 'cycleOverlay(direction = 1)', "event.key.toLowerCase() === 'v'"]) {
  assert.ok(screen.includes(token), `ObserveScreenPhase8 missing ${token}`);
}
for (const token of ['StrategicOverlayRenderer', 'setOverlayMode(mode', 'setOverlayContext(context', 'getOverlaySummary()']) {
  assert.ok(renderer.includes(token), `DungeonRendererPhase8 missing ${token}`);
}
for (const token of ['orbitBy(', 'setAutoOrbitEnabled(', 'AUTO_ORBIT_IDLE_SECONDS', "pointerType === 'touch' ? -1 : 1"]) {
  assert.ok(three.includes(token), `ThreeScene missing ${token}`);
}
assert.ok(index.includes('wp6-observer-controls.css'));
console.log('WP6 source integration smoke: ok');
