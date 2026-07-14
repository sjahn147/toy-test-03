export const ROOM_STATUS_PRIORITY = Object.freeze([
  'ruined', 'collapsing', 'siege', 'combat', 'blockaded', 'contested',
  'infected', 'burning', 'flooded', 'overcrowded', 'supply-threatened',
  'construction', 'work', 'spawning', 'hero', 'secret', 'stable'
]);

export const ROOM_STATUS_ICONS = Object.freeze({
  ruined: { glyph: '◆', shape: 'diamond', severity: 5 },
  collapsing: { glyph: '⌁', shape: 'fracture', severity: 5 },
  siege: { glyph: '⚔', shape: 'crossed', severity: 5 },
  combat: { glyph: '⚔', shape: 'crossed', severity: 4 },
  blockaded: { glyph: '⛓', shape: 'chain', severity: 4 },
  contested: { glyph: '◒', shape: 'split', severity: 4 },
  infected: { glyph: '✣', shape: 'spore', severity: 4 },
  burning: { glyph: '♨', shape: 'flame', severity: 4 },
  flooded: { glyph: '≋', shape: 'wave', severity: 3 },
  overcrowded: { glyph: '♟', shape: 'crowd', severity: 3 },
  'supply-threatened': { glyph: '⇣', shape: 'supply', severity: 3 },
  construction: { glyph: '⚒', shape: 'tools', severity: 2 },
  work: { glyph: '⌛', shape: 'progress', severity: 2 },
  spawning: { glyph: '✦', shape: 'growth', severity: 2 },
  hero: { glyph: '★', shape: 'star', severity: 2 },
  secret: { glyph: '◇', shape: 'secret', severity: 1 },
  stable: { glyph: '·', shape: 'dot', severity: 0 }
});

export const ROOM_STATUS_COPY = Object.freeze({
  en: {
    ruined: 'Ruined', collapsing: 'Collapsing', siege: 'Siege', combat: 'Combat', blockaded: 'Blockaded',
    contested: 'Contested', infected: 'Infected', burning: 'Burning', flooded: 'Flooded',
    overcrowded: 'Overcrowded', 'supply-threatened': 'Supply threatened', construction: 'Construction',
    work: 'Field work', spawning: 'Population pressure', hero: 'Hero present', secret: 'Secret discovered', stable: 'Stable',
    control: 'Control', population: 'Population', danger: 'Danger', supply: 'Supply', integrity: 'Integrity',
    physicalSpace: 'Usable floor', noOwner: 'Unclaimed', rising: 'rising', falling: 'falling', steady: 'steady'
  },
  ko: {
    ruined: '폐허', collapsing: '붕괴 중', siege: '공성 중', combat: '교전 중', blockaded: '봉쇄',
    contested: '점령전', infected: '감염', burning: '화재', flooded: '침수', overcrowded: '과밀',
    'supply-threatened': '보급 위협', construction: '건설 중', work: '현장 작업', spawning: '증식 압력',
    hero: '영웅 주둔', secret: '비밀 발견', stable: '안정', control: '점령', population: '인구',
    danger: '위험', supply: '보급', integrity: '내구도', physicalSpace: '가용 바닥', noOwner: '미점령',
    rising: '상승', falling: '하락', steady: '유지'
  }
});

const FACTION_COLORS = Object.freeze({
  'adventurer-expedition': '#79bce8',
  'goblin-clan': '#d2a24b',
  'brass-button-market': '#d2a24b',
  'copper-tail-clutch': '#d77d47',
  'red-tusk-tribe': '#d35b50',
  'red-tusk-host': '#d35b50',
  'undead-host': '#8d79c6',
  'choir-of-unfinished-names': '#8d79c6',
  'bluecap-colony': '#65b49a',
  'bluecap-communion': '#65b49a',
  'red-silk-brood': '#b96b8e',
  'pale-brood': '#c7b7d8',
  unaffiliated: '#9aa2ad'
});

export function roomStatusCopy(locale = 'en') {
  return ROOM_STATUS_COPY[locale === 'ko' ? 'ko' : 'en'];
}

export function factionUiColor(factionId) {
  const id = String(factionId ?? 'unaffiliated');
  if (FACTION_COLORS[id]) return FACTION_COLORS[id];
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  return `hsl(${hue} 48% 58%)`;
}

export function chooseRoomStatuses(flags = {}, limit = 3) {
  const selected = ROOM_STATUS_PRIORITY.filter(status => Boolean(flags[status]));
  if (!selected.length) selected.push('stable');
  return selected.slice(0, Math.max(1, limit)).map(id => ({ id, ...ROOM_STATUS_ICONS[id] }));
}

export function roomStatusSeverity(statuses = []) {
  return statuses.reduce((value, status) => Math.max(value, status?.severity ?? 0), 0);
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}
