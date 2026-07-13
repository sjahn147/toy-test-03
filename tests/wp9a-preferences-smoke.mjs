import assert from 'node:assert/strict';
import { loadChroniclePreferences, saveChroniclePreferences } from '../src/application/ChroniclePreferences.js';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'en', mode: 'chronicle' });
// 'ko' becomes a supported locale once WP9-B lands; use a genuinely unsupported
// locale here to keep exercising the unsupported-value sanitization fallback.
assert.equal(saveChroniclePreferences({ locale: 'xx-unsupported', mode: 'debug' }, storage), true);
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'en', mode: 'debug' });
console.log('WP9-A preferences smoke passed');
