const PAIR_PARTICLES = Object.freeze({
  '은': ['은', '는'],
  '이': ['이', '가'],
  '을': ['을', '를'],
  '과': ['과', '와'],
  '아': ['아', '야'],
  '이여': ['이여', '여'],
  '이라는': ['이라는', '라는'],
  '이라고': ['이라고', '라고']
});

const INVARIANT_PARTICLES = new Set(['의', '도', '에', '에서', '에게', '에게서', '부터', '까지', '처럼', '보다', '만']);

export function formatKoreanTemplate(template, params = {}) {
  return String(template ?? '').replace(/\{([a-zA-Z0-9_.-]+)(?::([^}]+))?\}/g, (_match, path, particle = null) => {
    const raw = getPath(params, path);
    if (raw === undefined || raw === null || raw === '') return '—';
    const value = formatValue(raw);
    return particle ? `${value}${selectKoreanParticle(value, particle)}` : value;
  });
}

export function selectKoreanParticle(value, requested) {
  const particle = String(requested ?? '');
  if (!particle) return '';
  if (INVARIANT_PARTICLES.has(particle)) return particle;
  if (particle === '으로') return hasBatchim(value) && finalConsonantIndex(value) !== 8 ? '으로' : '로';
  const pair = PAIR_PARTICLES[particle];
  if (pair) return hasBatchim(value) ? pair[0] : pair[1];
  return particle;
}

export function hasBatchim(value) {
  const char = lastPronounceableCharacter(value);
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(char)) return ['0', '1', '3', '6', '7', '8'].includes(char);
  return /[lmnrptk]$/i.test(char);
}

function finalConsonantIndex(value) {
  const char = lastPronounceableCharacter(value);
  if (!char) return 0;
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
}

function lastPronounceableCharacter(value) {
  const cleaned = String(value ?? '').trim().replace(/[\s.,!?…:;)'"\]}>]+$/g, '');
  return cleaned.at(-1) ?? '';
}

function formatValue(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function getPath(source, path) {
  return String(path).split('.').reduce((value, key) => value?.[key], source);
}
