import assert from 'node:assert/strict';
import { getHeroDefinition } from '../src/content/heroes/HeroDefinitions.js';
import { ensureHeroRuntime } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';
import { HeroFormationSystem } from '../src/sim/heroes/HeroFormationSystem.js';
import { HeroNecromancySystem } from '../src/sim/heroes/HeroNecromancySystem.js';
import { HeroBarrierSystem } from '../src/sim/heroes/HeroBarrierSystem.js';
import { HeroPhysicsSystem } from '../src/sim/heroes/HeroPhysicsSystem.js';

function makeHero(id,roomId){const d=getHeroDefinition(id);const a={id:`agent-${id.split('.').at(-1)}`,heroId:id,role:d.role,name:d.displayName,displayName:d.displayName,faction:'dungeon',ecologyFaction:d.factionId,roomId,roomCell:{x:0,z:0},alive:true,departed:false,hidden:false,downed:false,travel:null,combat:null,hp:d.baseStats.hp,maxHp:d.baseStats.hp,attack:d.baseStats.attack,baseAttack:d.baseStats.attack,courage:d.baseStats.courage,armor:d.baseStats.armor,size:d.size,index:1};ensureHeroRuntime(a,d);return a;}
const aldren=makeHero('hero.aldren','E22'), malcor=makeHero('hero.malcor','E24'), arvek=makeHero('hero.arvek','L59');
const skeleton={id:'sk',name:'Skeleton',role:'skeleton',species:'skeleton',faction:'dungeon',ecologyFaction:'undead-host',roomId:'E22',roomCell:{x:1,z:0},alive:true,hp:30,maxHp:30,attack:5,armor:2,index:4};
const enemies=[
 {id:'e1',name:'Fighter',role:'fighter',faction:'party',roomId:'E22',roomCell:{x:0,z:2},alive:true,hp:80,maxHp:80,attack:8,armor:2,index:5},
 {id:'e2',name:'Cleric',role:'cleric',faction:'party',roomId:'E24',roomCell:{x:0,z:2},alive:true,hp:70,maxHp:70,attack:7,armor:1,index:6},
 {id:'e3',name:'Rogue',role:'rogue',faction:'party',roomId:'L59',roomCell:{x:0,z:2},alive:true,hp:65,maxHp:65,attack:8,armor:1,index:7}
];
const corpses=[{id:'c1',roomId:'E22',role:'fighter'},{id:'c2',roomId:'E24',role:'cleric'},{id:'c3',roomId:'E24',role:'fighter'},{id:'c4',roomId:'E24',role:'rogue'}];
const routes=[{id:'L59-M61',from:'L59',to:'M61',width:3,active:true},{id:'L59-L58',from:'L59',to:'L58',width:2.3,active:true}];
const effects=[];
const formation=new HeroFormationSystem(), necro=new HeroNecromancySystem(), barriers=new HeroBarrierSystem(), physics=new HeroPhysicsSystem(), skills=new HeroSkillSystem();
const sim={agents:[aldren,malcor,arvek,skeleton,...enemies],rooms:[{id:'E22'},{id:'E24'},{id:'L59'}],ecosystem:{corpses},graph:new Map([['E22',[]],['E24',[]],['L59',['M61','L58']]]),routeGraph:{allRoutes:()=>routes,getRoute:id=>routes.find(r=>r.id===id)},heroFormationSystem:formation,heroNecromancySystem:necro,heroBarrierSystem:barriers,heroPhysicsSystem:physics,heroSkillSystem:skills,heroResourceLedger:{'undead-host':{bone:12,deathEnergy:30,corpse:6}},combatSystem:{initializeAgent(){}},emitEffect:(type,data)=>effects.push({type,...data}),applyCombatDamage:(_s,t,a)=>{t.hp-=a;},beginTravel(){return false;}};
skills.initialize(sim);
function finish(hero,skillId){const skill=getHeroDefinition(hero.heroId).skills.find(s=>s.id===skillId);skills.update(skill.windup+0.02,sim);skills.update(skill.impactDuration+0.02,sim);skills.update(skill.recovery+0.02,sim);assert.equal(hero.heroCast,null);}
assert.equal(skills.resolve(aldren,{type:'hero-cast',skillId:'aldren-royal-line'},sim),true);finish(aldren,'aldren-royal-line');assert.equal(formation.formations.length,1);
aldren.heroCooldowns['aldren-unrevoked-order']=0;assert.equal(skills.resolve(aldren,{type:'hero-cast',skillId:'aldren-unrevoked-order'},sim),true);finish(aldren,'aldren-unrevoked-order');assert.ok([...necro.summons.values()].some(x=>x.kind==='royal-skeleton'));
assert.equal(skills.resolve(malcor,{type:'hero-cast',skillId:'malcor-predators-cry',targetId:'e2'},sim),true);finish(malcor,'malcor-predators-cry');assert.ok(enemies[1].heroStatuses.heroFear);
malcor.heroCooldowns['malcor-memory-flesh']=0;assert.equal(skills.resolve(malcor,{type:'hero-cast',skillId:'malcor-memory-flesh',targetCorpseId:'c2'},sim),true);finish(malcor,'malcor-memory-flesh');assert.ok(malcor.memoryBuff);
malcor.heroCooldowns['malcor-hungry-feast']=0;assert.equal(skills.resolve(malcor,{type:'hero-cast',skillId:'malcor-hungry-feast'},sim),true);finish(malcor,'malcor-hungry-feast');assert.ok([...necro.summons.values()].some(x=>x.kind==='ghoul'));
assert.equal(skills.resolve(arvek,{type:'hero-cast',skillId:'arvek-black-gate',targetRouteId:'L59-M61'},sim),true);finish(arvek,'arvek-black-gate');assert.equal(barriers.barriers.length,1);assert.equal(barriers.isRouteBlocked('L59','M61',enemies[2]),true);
arvek.heroCooldowns['arvek-banishment-sentence']=0;assert.equal(skills.resolve(arvek,{type:'hero-cast',skillId:'arvek-banishment-sentence',targetId:'e3'},sim),true);finish(arvek,'arvek-banishment-sentence');assert.ok(enemies[2].hp<65);
arvek.heroCooldowns['arvek-close-the-city']=0;assert.equal(skills.resolve(arvek,{type:'hero-cast',skillId:'arvek-close-the-city'},sim),true);finish(arvek,'arvek-close-the-city');assert.equal(barriers.barriers.length,2);assert.ok([...necro.summons.values()].filter(x=>x.kind==='spectral-guard').length===2);assert.ok(arvek.heroStatuses.gateLockdown);
assert.ok(effects.some(e=>e.type==='hero-telegraph'));assert.doesNotThrow(()=>JSON.stringify(skills.snapshot()));
console.log('WP8-D undead hero skills smoke passed');
