const EXACT_NAMES = Object.freeze({
  Rana: '라나',
  Milo: '마일로',
  'Sister Pell': '펠 수녀',
  Orwin: '오윈',
  Tamsin: '탬신',
  Berric: '베릭',
  Nell: '넬',
  Grubbs: '그럽스',

  'Nibble Brasscoat': '니블 백단추',
  'Jjik Soot-Hand': '찌직 검댕손',
  'Kirik, Third Cog': '세 번째 톱니 키릭',
  'Tisa Water-Scale': '물비늘 티사',
  'Karg Twice-Defeated': '카르그 두 번 패한 자',
  'Murga Bloodpot': '무르가 피솥',
  'Ser Aldren Vale': '세르 알드렌 베일',
  'Malcor Rotten-Tooth': '구린이빨 말코르',
  'Isara of the Black Veil': '검은 베일의 이사라',
  'Arvek Who Closed the Gate': '아르벡, 성문을 닫은 자',
  'Orum-Bell': '오룸-벨',
  'Glop XVII': '글롭 17세',
  Peb: '페브',
  'Eighth Cocoon': '여덟 번째 고치',
  'Hand of the Empty Queen': '빈 여왕의 손',
  'Failed Successor': '실패한 계승자',
  'Sleeping Gardener': '잠든 정원사',
  Goldback: '금관등'
});

const PLACE_AND_OBJECT_NAMES = Object.freeze({
  'Sleeping Citadel': '잠든 성채',
  'The Sleeping Citadel': '잠든 성채',
  'Brass Warrens': '놋쇠 굴',
  'Bluecap Garden': '푸른갓 정원',
  'Red Tusk Barracks': '붉은 엄니 병영',
  'Red-Tusk Barracks': '붉은 엄니 병영',
  'Royal Gate': '왕실 관문',
  'Royal Sanctum': '왕실 성소',
  'Central Cross-Market': '중앙 교차시장',
  'Old Lantern Inn': '낡은 등불 여관',
  'Ossuary Cathedral': '납골 대성당',
  'Industrial Corridor': '산업 회랑',
  'Old Chest': '낡은 상자',
  'Freshly Rumored Chest': '새로 소문난 상자',
  'Dropped Coin': '떨어진 동전',
  'powder charge': '폭약',
  gatehouse: '관문소',
  'needle trap': '바늘 함정',
  'mourning veil': '애도의 베일',
  'Close the City': '도시를 닫아라'
});

const TERMS = Object.freeze({
  goblin: '고블린',
  goblins: '고블린',
  kobold: '코볼트',
  kobolds: '코볼트',
  orc: '오크',
  orcs: '오크',
  skeleton: '해골',
  skeletons: '해골',
  slime: '슬라임',
  slimes: '슬라임',
  mimic: '미믹',
  mimics: '미믹',
  spider: '거미',
  spiders: '거미',
  zombie: '좀비',
  zombies: '좀비',
  ogre: '오거',
  ogres: '오거',
  wraith: '레이스',
  wraiths: '레이스',
  ghoul: '구울',
  ghouls: '구울',
  myconid: '미코니드',
  myconids: '미코니드',
  carrion: '시체포식자',
  creature: '개체',
  creatures: '개체',
  shade: '망령',
  shades: '망령',
  guard: '경비병',
  guards: '경비병',

  food: '식량',
  meat: '고기',
  water: '물',
  scrap: '고철',
  scraps: '고철',
  bones: '뼈',
  bone: '뼈',
  biomass: '생체질량',
  spore: '포자',
  spores: '포자',
  deathEnergy: '사령 에너지',
  'death energy': '사령 에너지',
  medicine: '약품',
  materials: '자재',
  gold: '금화',

  approach: '접근',
  breach: '돌파',
  'core-assault': '중심부 공격',
  occupation: '점거',

  clear: '투명',
  metal: '금속',
  fungal: '균류',
  spectral: '영체',
  summer: '여름',
  winter: '겨울',
  spring: '봄',
  autumn: '가을'
});

const GENERIC_NAME_PATTERNS = Object.freeze([
  [/^Goblin\s+([A-Z]+|\d+)$/i, '고블린 $1'],
  [/^Kobold\s+([A-Z]+|\d+)$/i, '코볼트 $1'],
  [/^Orc\s+([A-Z]+|\d+)$/i, '오크 $1'],
  [/^Skeleton\s+([A-Z]+|\d+)$/i, '해골 $1'],
  [/^Slime\s+([A-Z]+|\d+)$/i, '슬라임 $1'],
  [/^Mimic\s+([A-Z]+|\d+)$/i, '미믹 $1'],
  [/^Spider\s+([A-Z]+|\d+)$/i, '거미 $1'],
  [/^Wraith\s+([A-Z]+|\d+)$/i, '레이스 $1'],
  [/^Ghoul\s+([A-Z]+|\d+)$/i, '구울 $1'],
  [/^Ogre\s+([A-Z]+|\d+)$/i, '오거 $1'],
  [/^(Rana|Milo|Orwin|Tamsin|Berric|Nell|Grubbs)\s+(\d+)$/i, (_match, name, generation) => `${EXACT_NAMES[name] ?? name} ${generation}`]
]);

export function localizeKoreanValue(value, key = '') {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value.map(item => localizeKoreanValue(item, key));
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return value;
  if (EXACT_NAMES[trimmed]) return EXACT_NAMES[trimmed];
  if (PLACE_AND_OBJECT_NAMES[trimmed]) return PLACE_AND_OBJECT_NAMES[trimmed];
  if (TERMS[trimmed]) return TERMS[trimmed];
  if (TERMS[trimmed.toLowerCase()]) return TERMS[trimmed.toLowerCase()];

  for (const [pattern, replacement] of GENERIC_NAME_PATTERNS) {
    if (!pattern.test(trimmed)) continue;
    pattern.lastIndex = 0;
    return typeof replacement === 'function' ? trimmed.replace(pattern, replacement) : trimmed.replace(pattern, replacement);
  }

  if (['resource', 'species', 'speciesPlural', 'summon', 'summonPlural', 'phase', 'adaptation'].includes(key)) {
    return TERMS[trimmed] ?? TERMS[trimmed.toLowerCase()] ?? trimmed;
  }
  return trimmed;
}

export function localizeKoreanParams(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) output[key] = localizeKoreanValue(value, key);
  if (!output.speciesPlural && output.species) output.speciesPlural = output.species;
  if (!output.summonPlural && output.summon) output.summonPlural = output.summon;
  return output;
}

export const KOREAN_EXACT_NAMES = EXACT_NAMES;
export const KOREAN_TERMS = TERMS;
export const KOREAN_PLACE_AND_OBJECT_NAMES = PLACE_AND_OBJECT_NAMES;
