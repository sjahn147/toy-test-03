import assert from 'node:assert/strict';
import { KOREAN_CHRONICLE_CATALOG } from '../src/localization/KoreanChronicleCatalog.js';

const forbidden = [/타겟/i, /스폰/i, /소켓/i, /쿨다운/i, /리졸브/i, /실패함에 따라/, /그것은/, /하였다/, /되어졌다/];
let total = 0;
for (const [key, entry] of Object.entries(KOREAN_CHRONICLE_CATALOG)) {
  for (const line of entry.variants) {
    total += 1;
    assert.ok(line.length <= 125, `${key} is too long for the chronicle surface`);
    for (const pattern of forbidden) assert.doesNotMatch(line, pattern, `${key} exposes awkward or technical copy`);
    assert.doesNotMatch(line, /!!+|\?\?+/, `${key} is tonally loud`);
  }
}
assert.ok(total >= 150);
const all = Object.values(KOREAN_CHRONICLE_CATALOG).flatMap(entry => entry.variants).join('\n');
assert.match(all, /던전은 맛을 기억했다/);
assert.match(all, /칭호는 몇 초 동안 다음 몸을 찾았다/);
assert.ok((all.match(/운명/g) ?? []).length <= 2, 'high-flown motif is overused');
console.log('WP9-B Korean copy quality smoke passed');
