import assert from 'node:assert/strict';
import { ENGLISH_CHRONICLE_CATALOG } from '../src/localization/EnglishChronicleCatalog.js';
import { LocalizationService } from '../src/localization/LocalizationService.js';

assert.ok(Object.keys(ENGLISH_CHRONICLE_CATALOG).length >= 65, 'catalog should cover the initial simulation and world systems');
for (const [key, entry] of Object.entries(ENGLISH_CHRONICLE_CATALOG)) {
  assert.ok(entry.variants.length > 0, `${key} has variants`);
  for (const variant of entry.variants) {
    assert.equal(typeof variant, 'string');
    assert.ok(variant.trim().length > 0);
  }
}
const service = new LocalizationService();
const event = {
  id: 'sample-1',
  localizationKey: 'settlement.ruined',
  params: { site: 'Bluecap Garden' },
  fallbackText: 'fallback'
};
const first = service.render(event);
const second = service.render(event);
assert.equal(first, second, 'variant choice is deterministic');
assert.match(first, /Bluecap Garden/);
const unknown = service.render({ id: 'x', localizationKey: 'missing.key', fallbackText: 'Fallback remains.' });
assert.equal(unknown, 'Fallback remains.');
console.log('WP9-A English catalog smoke passed');
