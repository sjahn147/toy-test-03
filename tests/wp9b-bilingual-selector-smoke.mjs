import assert from 'node:assert/strict';
import { selectTimelineEvents } from '../src/presentation/selectors/selectTimelineEvents.js';

const state = { events: [{
  id: 'e1', time: 4, type: 'ecology.spawn', severity: 'minor', channel: 'chronicle',
  localizationKey: 'ecology.spawn.cluster', variantSeed: 'same-seed',
  params: { site: 'Brass Warrens', count: 4, species: 'goblin', speciesPlural: 'goblins' },
  actorIds: [], targetIds: [], factionIds: [], tags: []
}] };
const ko = selectTimelineEvents(state, { locale: 'ko' });
assert.equal(ko.length, 1);
assert.match(ko[0].text, /고블린|굴|서식지/);
assert.equal(ko[0].secondaryText, null);
const bilingual = selectTimelineEvents(state, { locale: 'bilingual' });
assert.equal(bilingual.length, 1);
assert.match(bilingual[0].text, /[가-힣]/);
assert.match(bilingual[0].secondaryText, /Brass Warrens/);
const en = selectTimelineEvents(state, { locale: 'en' });
assert.match(en[0].text, /Brass Warrens/);
assert.equal(en[0].secondaryText, null);
console.log('WP9-B bilingual selector smoke passed');
