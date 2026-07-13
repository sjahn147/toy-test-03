import { CHRONICLE_MODES } from '../domain/chronicleContract.js';

const STORAGE_KEY = 'sleeping-citadel.chronicle.preferences.v1';

export function loadChroniclePreferences(storage = safeStorage()) {
  const defaults = { locale: 'en', mode: 'chronicle' };
  if (!storage) return defaults;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}');
    return {
      locale: parsed.locale === 'en' ? 'en' : 'en',
      mode: CHRONICLE_MODES.includes(parsed.mode) ? parsed.mode : 'chronicle'
    };
  } catch {
    return defaults;
  }
}

export function saveChroniclePreferences(preferences, storage = safeStorage()) {
  if (!storage) return false;
  const next = {
    locale: 'en',
    mode: CHRONICLE_MODES.includes(preferences?.mode) ? preferences.mode : 'chronicle'
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
