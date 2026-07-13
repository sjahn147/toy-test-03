export const CHRONICLE_UI_COPY = Object.freeze({
  en: Object.freeze({
    title: 'Chronicle',
    densityLabel: 'Chronicle density',
    languageLabel: 'Chronicle language',
    modes: Object.freeze({ chronicle: 'Chronicle', detailed: 'Detailed', debug: 'Debug' }),
    filters: Object.freeze({
      all: 'all', combat: 'combat', ecology: 'ecology', party: 'party', settlement: 'settlement',
      logistics: 'logistics', construction: 'construction', discovery: 'discovery', hero: 'hero',
      relationship: 'relationship', major: 'major'
    }),
    channels: Object.freeze({ chronicle: 'chronicle', detail: 'detail', debug: 'debug' }),
    pinned: 'Pinned',
    detail: 'mechanical detail',
    empty: 'The chronicle is quiet.',
    fallback: 'World state changed.'
  }),
  ko: Object.freeze({
    title: '연대기',
    densityLabel: '로그 밀도',
    languageLabel: '연대기 언어',
    modes: Object.freeze({ chronicle: '연대기', detailed: '상세', debug: '디버그' }),
    filters: Object.freeze({
      all: '전체', combat: '전투', ecology: '생태', party: '원정대', settlement: '거점',
      logistics: '물류', construction: '건설', discovery: '발견', hero: '영웅',
      relationship: '관계', major: '중대 사건'
    }),
    channels: Object.freeze({ chronicle: '연대기', detail: '상세', debug: '디버그' }),
    pinned: '고정',
    detail: '기계 정보',
    empty: '연대기는 조용하다.',
    fallback: '세계 상태가 변했다.'
  })
});

export function chronicleUiCopy(locale = 'en') {
  return CHRONICLE_UI_COPY[locale === 'ko' || locale === 'bilingual' ? 'ko' : 'en'];
}
