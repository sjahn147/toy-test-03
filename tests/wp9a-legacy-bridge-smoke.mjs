import assert from 'node:assert/strict';
import { LegacyChronicleBridge } from '../src/application/LegacyChronicleBridge.js';

const bridge = new LegacyChronicleBridge();
const sim = {
  agents: [{ id: 'a1', name: 'Grubbs' }, { id: 'a2', name: 'Arvek' }],
  rooms: [{ id: 'E21', name: 'Ossuary Stair' }]
};

const route = bridge.translate({ text: 'Grubbs could not find a legal corridor to E21.', time: 2 }, { sim });
assert.equal(route.channel, 'debug');
assert.equal(route.localizationKey, 'system.route.invalid');

const death = bridge.translate({ text: 'Milo stopped participating in the experiment.', type: 'death', targetId: 'milo' }, { sim });
assert.equal(death.channel, 'chronicle');
assert.equal(death.type, 'combat.death');

const spawn = bridge.translate({ text: 'Goblin A crawled out of Brass Warrens and immediately had opinions.' }, { sim });
assert.equal(spawn.aggregateKey, 'spawn:Brass Warrens:goblin');
assert.equal(spawn.localizationKey, 'ecology.spawn.single');

const hero = bridge.translate({ text: 'Arvek was defeated permanently.', type: 'hero-death', heroId: 'hero.arvek', agentId: 'a2' }, { sim });
assert.equal(hero.severity, 'historic');
assert.equal(hero.localizationKey, 'hero.death');

const capacity = bridge.translate({ text: 'Bluecap Nursery could not produce another myconid; its 8 habitat slots were occupied or unsafe.' }, { sim });
assert.equal(capacity.channel, 'debug');
assert.equal(capacity.type, 'system.capacity.blocked');
console.log('WP9-A legacy bridge smoke passed');
