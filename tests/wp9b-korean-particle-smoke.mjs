import assert from 'node:assert/strict';
import { formatKoreanTemplate, hasBatchim, selectKoreanParticle } from '../src/localization/KoreanParticle.js';

assert.equal(hasBatchim('카르그'), false);
assert.equal(hasBatchim('글롭'), true);
assert.equal(hasBatchim('오룸-벨'), true);
assert.equal(selectKoreanParticle('카르그', '은'), '는');
assert.equal(selectKoreanParticle('글롭', '은'), '은');
assert.equal(selectKoreanParticle('니블', '으로'), '로');
assert.equal(selectKoreanParticle('성당', '으로'), '으로');
assert.equal(selectKoreanParticle('왕관', '이라는'), '이라는');
assert.equal(selectKoreanParticle('이사라', '이라는'), '라는');
assert.equal(formatKoreanTemplate('{actor:은} {room:으로} 갔다.', { actor: '글롭', room: '정원' }), '글롭은 정원으로 갔다.');
assert.equal(formatKoreanTemplate('{actor:이} {target:을} 보았다.', { actor: '이사라', target: '글롭' }), '이사라가 글롭을 보았다.');
console.log('WP9-B Korean particle smoke passed');
