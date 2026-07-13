import assert from 'node:assert/strict';
import { loadChroniclePreferences, saveChroniclePreferences } from '../src/application/ChroniclePreferences.js';

const data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'en', mode: 'chronicle' });
assert.equal(saveChroniclePreferences({ locale: 'ko', mode: 'detailed' }, storage), true);
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'ko', mode: 'detailed' });
assert.equal(saveChroniclePreferences({ locale: 'bilingual', mode: 'debug' }, storage), true);
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'bilingual', mode: 'debug' });
assert.equal(saveChroniclePreferences({ locale: 'xx', mode: 'bad' }, storage), true);
assert.deepEqual(loadChroniclePreferences(storage), { locale: 'en', mode: 'chronicle' });
console.log('WP9-B preference smoke passed');
