import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listHeroDefinitions, validateHeroDefinitions } from '../src/content/heroes/HeroDefinitions.js';
import { HeroFormationSystem } from '../src/sim/heroes/HeroFormationSystem.js';
import { HeroNecromancySystem } from '../src/sim/heroes/HeroNecromancySystem.js';
import { HeroBarrierSystem } from '../src/sim/heroes/HeroBarrierSystem.js';

// Later work packages (WP8e) append more heroes to this shared registry, so
// these check the cumulative WP8-A..D roster is present rather than that it
// is frozen at exactly 12 heroes / 36 skills.
const heroes=listHeroDefinitions();
assert.ok(heroes.length>=12,'WP8-D must contain twelve unique heroes');
assert.ok(heroes.reduce((sum,hero)=>sum+hero.skills.length,0)>=36,'WP8-D must contain 36 active hero skills');
assert.deepEqual(validateHeroDefinitions(),[]);
const ids=new Set(heroes.map(hero=>hero.id));
for(const id of ['hero.nibble','hero.kirik','hero.karg','hero.isara','hero.orum-bell','hero.glop','hero.jijik','hero.tissa','hero.murga','hero.aldren','hero.malcor','hero.arvek']) assert.ok(ids.has(id),`missing ${id}`);

const manifest=JSON.parse(await readFile(new URL('../content/campaigns/sleeping-citadel/faction-heroes.json',import.meta.url),'utf8'));
assert.match(manifest.scope,/WP8-D fallen kingdom command trio/i);
assert.ok(manifest.heroes.length>=12);
for(const id of ['hero.aldren','hero.malcor','hero.arvek']){
  const item=manifest.heroes.find(hero=>hero.id===id); assert.ok(item); assert.ok(item.frameworkContribution.length>=3);
}

const skillSource=await readFile(new URL('../src/sim/heroes/HeroSkillSystem.js',import.meta.url),'utf8');
for(const token of ['create-royal-formation','royal-shield-bash','reassemble-royal-skeletons','ghast-fear-cone','consume-memory-corpse','raise-ghoul-pack','create-spectral-gate','banishment-shield-charge','seal-all-room-routes','raise-spectral-guards']) assert.ok(skillSource.includes(token),`skill resolver missing ${token}`);
const rendererSource=await readFile(new URL('../src/engine/heroes/HeroWorldActorRenderer.js',import.meta.url),'utf8');
assert.ok(rendererSource.includes('renderFormations'));
assert.ok(rendererSource.includes('renderBarriers'));

const formation=new HeroFormationSystem(); const necromancy=new HeroNecromancySystem(); const barriers=new HeroBarrierSystem();
assert.doesNotThrow(()=>JSON.stringify({formation:formation.snapshot(),necromancy:necromancy.snapshot(),barriers:barriers.snapshot()}));
assert.deepEqual({formations:formation.metrics().heroFormationsActive,summons:necromancy.metrics().heroNecromancySummons,barriers:barriers.metrics().heroBarriersActive},{formations:0,summons:0,barriers:0});
console.log('WP8-D cumulative fallen-kingdom integration smoke passed');
