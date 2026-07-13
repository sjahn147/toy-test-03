import assert from 'node:assert/strict';
import { ENGLISH_CHRONICLE_CATALOG } from '../src/localization/EnglishChronicleCatalog.js';
import { KOREAN_CHRONICLE_CATALOG } from '../src/localization/KoreanChronicleCatalog.js';
import { LocalizationService } from '../src/localization/LocalizationService.js';

const enKeys = Object.keys(ENGLISH_CHRONICLE_CATALOG).sort();
const koKeys = Object.keys(KOREAN_CHRONICLE_CATALOG).sort();
assert.deepEqual(koKeys, enKeys);
assert.equal(koKeys.length, 76);
const service = new LocalizationService();
assert.deepEqual(service.assertKeyParity('en', 'ko'), { missingInPrimary: [], missingInSecondary: [] });
const multiVariant = Object.values(KOREAN_CHRONICLE_CATALOG).filter(entry => entry.variants.length >= 2).length;
assert.ok(multiVariant >= 72, `expected broad variant coverage, got ${multiVariant}`);
console.log('WP9-B Korean catalog parity smoke passed');
