import assert from 'node:assert/strict';
import { CameraTargetResolver } from '../src/camera/CameraTargetResolver.js';

const viewModel = {
  followRoster: [
    { id: 'a', name: 'Nibble', role: 'goblin', alive: true, heroId: 'nibble', roomId: 'r1' },
    { id: 'b', name: 'Skeleton B', role: 'skeleton', alive: true, roomId: 'r2' },
    { id: 'dead', name: 'Former Unit', role: 'orc', alive: false, roomId: 'r2' }
  ],
  navigator: {
    settlements: [{ id: 's1', name: 'Brass Warrens', roomId: 'r2', factionId: 'goblins' }],
    parties: [{ id: 'p1', name: 'Expedition', targetRoomId: 'r1' }]
  }
};
const resolver = new CameraTargetResolver({
  scenario: { rooms: [{ id: 'r1', name: 'Entry', x: 1, z: 2, w: 8, d: 9, floor: 0 }, { id: 'r2', name: 'Crypt', x: 20, z: -4, w: 12, d: 10, floor: 1 }] },
  renderer: { getAgentWorldPosition: id => id === 'a' ? { x: 3, y: 0, z: 5 } : null },
  getViewModel: () => viewModel
});
const agent = resolver.resolve({ type: 'agent', id: 'a' });
assert.equal(agent.dynamic, true);
assert.equal(agent.label, 'Nibble');
assert.ok(agent.point.y > 0.8);
assert.equal(resolver.resolve({ type: 'settlement', id: 's1' }).label, 'Brass Warrens');
assert.equal(resolver.resolve({ type: 'party', id: 'p1' }).label, 'Expedition');
assert.equal(resolver.cycleRoster().length, 2);
assert.deepEqual(resolver.cycleRoster({ heroesOnly: true }).map(item => item.id), ['a']);
console.log('WP10 camera target resolver smoke passed');
