import assert from 'node:assert/strict';
import { ChronicleEditorializer } from '../src/application/ChronicleEditorializer.js';
import { createChronicleDescriptor } from '../src/domain/chronicleContract.js';

const editor = new ChronicleEditorializer();
for (let i = 0; i < 4; i += 1) {
  const descriptor = createChronicleDescriptor({
    type: 'ecology.spawn', channel: 'chronicle', salience: 0.35,
    localizationKey: 'ecology.spawn.single', fallbackText: 'spawn',
    params: { actor: `Goblin ${i}`, species: 'goblin', site: 'Brass Warrens', count: 1 },
    aggregateKey: 'spawn:Brass Warrens:goblin', aggregateWindow: 2.8
  });
  assert.equal(editor.ingest(descriptor, i * 0.2).length, 0);
}
const flushed = editor.flush(4);
assert.equal(flushed.length, 1);
assert.equal(flushed[0].localizationKey, 'ecology.spawn.cluster');
assert.equal(flushed[0].params.count, 4);

const repeated = createChronicleDescriptor({
  type: 'settlement.threatened', channel: 'chronicle', salience: 0.7,
  localizationKey: 'settlement.threatened', params: { site: 'Nest', room: 'C4' }, dedupeKey: 'threat:Nest'
});
assert.equal(editor.ingest(repeated, 10).length, 1);
assert.equal(editor.ingest(repeated, 11).length, 0);
assert.ok(editor.snapshot().stats.deduped >= 1);
console.log('WP9-A editorializer smoke passed');
