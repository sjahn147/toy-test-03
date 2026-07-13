import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE_STUB } from './helpers/three-stub.mjs';

const root=await mkdtemp(join(tmpdir(),'wp8d-animation-'));
await mkdir(join(root,'src/engine/heroes'),{recursive:true}); await mkdir(join(root,'src/content/heroes'),{recursive:true});
await writeFile(join(root,'package.json'),JSON.stringify({type:'module'})); await writeFile(join(root,'src/engine/ThreeScene.js'),THREE_STUB);
for(const f of ['HeroMiniatureFactory.js','HeroAnimator.js','HeroSecondaryMotion.js']) await copyFile(new URL(`../src/engine/heroes/${f}`,import.meta.url),join(root,`src/engine/heroes/${f}`));
for(const f of ['HeroDefinitions.js','HeroAnimationClips.js']) await copyFile(new URL(`../src/content/heroes/${f}`,import.meta.url),join(root,`src/content/heroes/${f}`));
const {createHeroMiniature}=await import(`${pathToFileURL(join(root,'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=1`);
const {animateHeroMiniature}=await import(`${pathToFileURL(join(root,'src/engine/heroes/HeroAnimator.js')).href}?v=1`);
const cases=[
  ['hero.aldren','hero-aldren','aldren-shield-judgment','shieldRoot','swordRoot'],
  ['hero.malcor','hero-malcor','malcor-predators-cry','jaw','vaporRoot'],
  ['hero.arvek','hero-arvek','arvek-black-gate','crossbar','shieldRoot']
];
for(const [id,role,skill,movingJoint,skillJoint] of cases){
 const agent={id:`agent-${role}`,heroId:id,role,faction:'dungeon',hp:100,maxHp:100,alive:true,index:1,travel:{phase:'corridor'},mood:'moving',heroDamageStage:0};
 const mesh=createHeroMiniature(agent); assert.equal(animateHeroMiniature(mesh,agent,1.2),true);
 const joint=mesh.userData.joints[movingJoint]; const locomotion=joint.rotation.x+joint.rotation.y+joint.rotation.z+joint.position.x+joint.position.y+joint.position.z; assert.ok(Number.isFinite(locomotion));
 agent.travel=null; agent.heroCast={skillId:skill,phase:'windup',elapsed:0.65,duration:1}; animateHeroMiniature(mesh,agent,2.1);
 const active=mesh.userData.joints[skillJoint]; const value=Math.abs(active.rotation.x)+Math.abs(active.rotation.y)+Math.abs(active.rotation.z)+Math.abs(active.position.x)+Math.abs(active.position.y)+Math.abs(active.position.z); assert.ok(value>0.02,`${id} skill pose`);
 const snapshot={rx:active.rotation.x,ry:active.rotation.y,rz:active.rotation.z,px:active.position.x,py:active.position.y,pz:active.position.z}; animateHeroMiniature(mesh,agent,2.1); assert.deepEqual({rx:active.rotation.x,ry:active.rotation.y,rz:active.rotation.z,px:active.position.x,py:active.position.y,pz:active.position.z},snapshot);
 agent.heroCast=null; agent.heroDamageStage=2; animateHeroMiniature(mesh,agent,2.5); assert.ok(mesh.userData.damageParts.stage2Show.some(node=>node.visible));
}
for(const kind of ['royal-skeleton','ghoul','spectral-guard']){
 const agent={id:`sum-${kind}`,role:kind,heroSummonKind:kind,hp:20,maxHp:20,alive:true,index:1,travel:{phase:'corridor'}};
 const mesh=createHeroMiniature(agent); assert.equal(animateHeroMiniature(mesh,agent,1.3),true);
}
console.log('WP8-D undead hero animation smoke passed');
