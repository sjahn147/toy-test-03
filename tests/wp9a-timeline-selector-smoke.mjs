import assert from 'node:assert/strict';
import { selectTimelineEvents } from '../src/presentation/selectors/selectTimelineEvents.js';

const state = { events: [
  { id: 'c', time: 1, type: 'settlement.ruined', severity: 'historic', channel: 'chronicle', localizationKey: 'settlement.ruined', params: { site: 'Bluecap Garden' }, fallbackText: 'fallback' },
  { id: 'd', time: 2, type: 'combat.hit', severity: 'ambient', channel: 'detail', localizationKey: 'combat.hit', params: { actor: 'A', target: 'B', amount: 4 }, fallbackText: 'hit' },
  { id: 'x', time: 3, type: 'system.route.invalid', severity: 'ambient', channel: 'debug', localizationKey: 'system.route.invalid', params: { actor: 'A', room: 'E21' }, fallbackText: 'route' }
] };
const chronicle = selectTimelineEvents(state, { mode: 'chronicle' });
assert.deepEqual(chronicle.map(item => item.id), ['c']);
assert.match(chronicle[0].text, /Bluecap Garden/);
const detailed = selectTimelineEvents(state, { mode: 'detailed' });
assert.deepEqual(detailed.map(item => item.id), ['c', 'd']);
const debug = selectTimelineEvents(state, { mode: 'debug' });
assert.deepEqual(debug.map(item => item.id), ['c', 'd', 'x']);
assert.equal(debug[2].channel, 'debug');
console.log('WP9-A timeline selector smoke passed');
