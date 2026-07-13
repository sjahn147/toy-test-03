import assert from 'node:assert/strict';
import { localizeKoreanParams, localizeKoreanValue } from '../src/localization/KoreanLexicon.js';

assert.equal(localizeKoreanValue('Grubbs'), '그럽스');
assert.equal(localizeKoreanValue('Goblin A'), '고블린 A');
assert.equal(localizeKoreanValue('Milo 3'), '마일로 3');
assert.equal(localizeKoreanValue('Arvek Who Closed the Gate'), '아르벡, 성문을 닫은 자');
assert.equal(localizeKoreanValue('deathEnergy', 'resource'), '사령 에너지');
assert.equal(localizeKoreanValue('core-assault', 'phase'), '중심부 공격');
const params = localizeKoreanParams({ actor: 'Rana', species: 'goblin', speciesPlural: 'goblins', resource: 'scrap' });
assert.deepEqual(params, { actor: '라나', species: '고블린', speciesPlural: '고블린', resource: '고철' });
console.log('WP9-B Korean lexicon smoke passed');
