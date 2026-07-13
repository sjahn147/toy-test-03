import { CHRONICLE_MODES } from '../domain/chronicleContract.js';
import { SUPPORTED_CHRONICLE_LOCALES } from '../localization/LocalizationService.js';

const STORAGE_KEY = 'sleeping-citadel.chronicle.preferences.v2';
const LEGACY_STORAGE_KEY = 'sleeping-citadel.chronicle.preferences.v1';

export function loadChroniclePreferences(storage = safeStorage()) {
  const defaults = { locale: 'en', mode: 'chronicle' };
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY) ?? '{}';
    const parsed = JSON.parse(raw);
    return {
      locale: SUPPORTED_CHRONICLE_LOCALES.includes(parsed.locale) ? parsed.locale : 'en',
      mode: CHRONICLE_MODES.includes(parsed.mode) ? parsed.mode : 'chronicle'
    };
  } catch {
    return defaults;
  }
}

export function saveChroniclePreferences(preferences, storage = safeStorage()) {
  if (!storage) return false;
  const next = {
    locale: SUPPORTED_CHRONICLE_LOCALES.includes(preferences?.locale) ? preferences.locale : 'en',
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
