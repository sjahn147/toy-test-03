import { ENGLISH_CHRONICLE_CATALOG } from './EnglishChronicleCatalog.js';
import { KOREAN_CHRONICLE_CATALOG } from './KoreanChronicleCatalog.js';
import { formatKoreanTemplate } from './KoreanParticle.js';
import { localizeKoreanParams } from './KoreanLexicon.js';

export const SUPPORTED_CHRONICLE_LOCALES = Object.freeze(['en', 'ko', 'bilingual']);

export class LocalizationService {
  constructor({
    catalogs = { en: ENGLISH_CHRONICLE_CATALOG, ko: KOREAN_CHRONICLE_CATALOG },
    defaultLocale = 'en'
  } = {}) {
    this.catalogs = { ...catalogs };
    this.defaultLocale = this.catalogs[defaultLocale] ? defaultLocale : Object.keys(this.catalogs)[0] ?? 'en';
  }

  hasKey(key, locale = this.defaultLocale) {
    const normalized = normalizeCatalogLocale(locale, this.defaultLocale);
    return Boolean(key && this.catalogs[normalized]?.[key]);
  }

  render(event, { locale = this.defaultLocale, detail = false } = {}) {
    if (!event || typeof event !== 'object') return '';
    const normalizedLocale = normalizeCatalogLocale(locale, this.defaultLocale);
    const catalog = this.catalogs[normalizedLocale] ?? this.catalogs[this.defaultLocale] ?? {};
    const key = detail ? (event.detailKey ?? event.localizationKey) : event.localizationKey;
    const entry = key ? catalog[key] : null;
    const variants = detail && entry?.detailVariants?.length ? entry.detailVariants : entry?.variants;
    if (!variants?.length) {
      if (detail && event.debug?.message) return String(event.debug.message);
      return event.fallbackText ?? event.text ?? '';
    }
    const seed = event.variantSeed ?? event.params?.variantSeed ?? event.id ?? `${key}:${event.time ?? 0}`;
    const template = variants[stableIndex(seed, variants.length)];
    const params = normalizeParams(event.params ?? {}, normalizedLocale);
    return normalizedLocale === 'ko' ? formatKoreanTemplate(template, params) : formatTemplate(template, params);
  }

  renderPair(event, { primaryLocale = this.defaultLocale, secondaryLocale = null, detail = true } = {}) {
    const primary = normalizeCatalogLocale(primaryLocale, this.defaultLocale);
    const secondary = secondaryLocale ? normalizeCatalogLocale(secondaryLocale, this.defaultLocale) : null;
    return {
      primary: this.render(event, { locale: primary }),
      secondary: secondary && secondary !== primary ? this.render(event, { locale: secondary }) : null,
      detail: detail ? this.render(event, { locale: primary, detail: true }) : null
    };
  }

  assertKeyParity(primaryLocale, secondaryLocale) {
    const primary = new Set(Object.keys(this.catalogs[normalizeCatalogLocale(primaryLocale, this.defaultLocale)] ?? {}));
    const secondary = new Set(Object.keys(this.catalogs[normalizeCatalogLocale(secondaryLocale, this.defaultLocale)] ?? {}));
    return {
      missingInPrimary: [...secondary].filter(key => !primary.has(key)).sort(),
      missingInSecondary: [...primary].filter(key => !secondary.has(key)).sort()
    };
  }
}

export const defaultLocalizationService = new LocalizationService();

export function formatTemplate(template, params = {}) {
  return String(template ?? '').replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_match, key) => {
    const value = getPath(params, key);
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : trimNumber(value);
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });
}

export function stableIndex(seed, length) {
  if (!Number.isInteger(length) || length <= 1) return 0;
  let hash = 2166136261;
  for (const char of String(seed ?? '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function normalizeParams(input, locale) {
  const params = { ...input };
  if (!params.speciesPlural && params.species) params.speciesPlural = pluralize(params.species, params.count);
  if (!params.summonPlural && params.summon) params.summonPlural = pluralize(params.summon, params.count);
  if (!params.actor && params.actorName) params.actor = params.actorName;
  if (!params.target && params.targetName) params.target = params.targetName;
  if (!params.room && params.roomName) params.room = params.roomName;
  if (!params.site && params.siteName) params.site = params.siteName;
  if (!params.structure && params.structureName) params.structure = params.structureName;
  if (!params.faction && params.factionName) params.faction = params.factionName;
  return locale === 'ko' ? localizeKoreanParams(params) : params;
}

function normalizeCatalogLocale(locale, fallback) {
  if (locale === 'bilingual') return 'ko';
  return locale === 'ko' || locale === 'en' ? locale : fallback;
}

function pluralize(value, count) {
  const word = String(value ?? 'creature');
  if (Number(count) === 1) return word;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

function getPath(source, path) {
  return String(path).split('.').reduce((value, key) => value?.[key], source);
}

function trimNumber(value) {
  return Number(value.toFixed(2)).toString();
}
