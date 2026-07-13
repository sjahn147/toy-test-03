import assert from 'node:assert/strict';
import { createWorldEvent, EVENT_NAMESPACES } from '../src/domain/eventContract.js';

const event = createWorldEvent({
  id: 'event-1',
  time: 3.5,
  type: 'hero.skill.started',
  severity: 'major',
  channel: 'chronicle',
  salience: 0.8,
  actorIds: ['hero-1'],
  localizationKey: 'hero.skill.started',
  params: { actor: 'Arvek', skill: 'Close the City' },
  detailKey: 'hero.skill.started',
  dedupeKey: 'hero-1:close-city',
  variantSeed: 9
});
assert.equal(event.channel, 'chronicle');
assert.equal(event.salience, 0.8);
assert.equal(event.params.actor, 'Arvek');
assert.ok(Object.isFrozen(event));
assert.ok(Object.isFrozen(event.params));
assert.ok(EVENT_NAMESPACES.includes('hero'));
assert.ok(EVENT_NAMESPACES.includes('system'));
assert.throws(() => createWorldEvent({ id: 'bad', time: 0, type: 'hero.x', channel: 'noise' }), /channel/);
console.log('WP9-A event contract smoke passed');
