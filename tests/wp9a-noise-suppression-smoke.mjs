import assert from 'node:assert/strict';
import { LegacyChronicleBridge } from '../src/application/LegacyChronicleBridge.js';
import { ChronicleEditorializer } from '../src/application/ChronicleEditorializer.js';
import { createWorldEvent } from '../src/domain/eventContract.js';
import { selectTimelineEvents } from '../src/presentation/selectors/selectTimelineEvents.js';

const bridge = new LegacyChronicleBridge();
const editor = new ChronicleEditorializer();
const published = [];
let id = 0;
for (let i = 0; i < 90; i += 1) {
  const text = i % 3 === 0
    ? 'Grubbs could not find a legal corridor to E21.'
    : i % 3 === 1
      ? 'Grubbs entered the corridor toward Hall.'
      : 'Goblin A hit Grubbs for 3.';
  const descriptor = bridge.translate({ text, time: i * 0.2 });
  for (const item of editor.ingest(descriptor, i * 0.2)) {
    published.push(createWorldEvent({ id: `e-${id++}`, time: i * 0.2, ...item }));
  }
}
const chronicle = selectTimelineEvents({ events: published }, { mode: 'chronicle', limit: 200 });
assert.equal(chronicle.length, 0, 'movement, ordinary hits and route diagnostics do not pollute Chronicle');
const debug = selectTimelineEvents({ events: published }, { mode: 'debug', limit: 200 });
assert.ok(debug.length < 25, `dedupe should cap repetitive noise, got ${debug.length}`);
console.log('WP9-A noise suppression smoke passed');
