import assert from 'node:assert/strict';
import { loadChroniclePreferences, saveChroniclePreferences } from '../src/application/ChroniclePreferences.js';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'en', mode: 'chronicle' });
assert.equal(saveChroniclePreferences({ locale: 'ko', mode: 'debug' }, storage), true);
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'en', mode: 'debug' });
console.log('WP9-A preferences smoke passed');
