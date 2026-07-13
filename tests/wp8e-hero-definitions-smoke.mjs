import assert from 'node:assert/strict';
import { listHeroDefinitions, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
const heroes=listHeroDefinitions();
assert.equal(heroes.length,18);
assert.equal(heroes.reduce((sum,h)=>sum+h.skills.length,0),54);
assert.deepEqual(validateHeroDefinitions(),[]);
for(const id of ['hero.pev','hero.eighth-cocoon','hero.empty-queen-hand','hero.failed-successor','hero.sleeping-gardener','hero.goldcrown-back']){
 const h=heroes.find(x=>x.id===id); assert.ok(h,id); assert.equal(h.skills.length,3); assert.ok(h.visual.dedicatedParts.length>=6); assert.ok(h.visual.silhouette.length>=3);
}
console.log('WP8-E complete hero definitions smoke passed');
