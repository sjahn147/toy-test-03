import assert from 'node:assert/strict';
import { KOREAN_CHRONICLE_CATALOG } from '../src/localization/KoreanChronicleCatalog.js';
import { LocalizationService } from '../src/localization/LocalizationService.js';

const service = new LocalizationService();
const params = {
  scenario: '잠든 성채', actor: 'Grubbs', target: 'Glop XVII', room: '푸른 정원', fromRoom: '동쪽 회랑',
  site: 'Brass Warrens', faction: 'Red Tusk', structure: 'gatehouse', object: 'powder charge', objectId: 'd-1',
  mimic: 'Mimic A', trap: 'needle trap', field: 'mourning veil', skill: 'Close the City', adaptation: 'metal',
  species: 'goblin', speciesPlural: 'goblins', summon: 'wraith', summonPlural: 'wraiths', resource: 'scrap',
  phase: 'breach', action: 'attack', amount: 7, count: 4, gold: 3, level: 2, population: 8, capacity: 8,
  cargoId: 'cargo-1', text: '기록되지 않은 사건'
};
for (const key of Object.keys(KOREAN_CHRONICLE_CATALOG)) {
  const text = service.render({ id: key, localizationKey: key, params, variantSeed: `${key}:test`, fallbackText: '' }, { locale: 'ko' });
  assert.ok(text.length > 3, `${key} rendered empty`);
  assert.doesNotMatch(text, /\{[^}]+\}/, `${key} left an unresolved placeholder`);
  assert.match(text, /[가-힣]/, `${key} did not render Korean`);
}
const death = service.render({ id: 'death', localizationKey: 'combat.death', params: { target: 'Glop XVII' }, variantSeed: 0 }, { locale: 'ko' });
assert.match(death, /글롭 17세/);
const english = service.render({ id: 'death', localizationKey: 'combat.death', params: { target: 'Glop XVII' }, variantSeed: 0 }, { locale: 'en' });
assert.match(english, /Glop XVII/);
console.log('WP9-B Korean rendering smoke passed');
