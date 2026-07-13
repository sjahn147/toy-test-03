import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { THREE_STUB } from './helpers/three-stub.mjs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'wp8d-telegraph-'));
await mkdir(join(temp, 'src/engine/heroes'), { recursive: true });
await mkdir(join(temp, 'src/engine'), { recursive: true });
await copyFile(join(here, '../src/engine/heroes/HeroTelegraphRenderer.js'), join(temp, 'src/engine/heroes/HeroTelegraphRenderer.js'));
await writeFile(join(temp, 'src/engine/ThreeScene.js'), THREE_STUB);
const { createHeroEffect, animateHeroEffect } = await import(`${pathToFileURL(join(temp, 'src/engine/heroes/HeroTelegraphRenderer.js')).href}?v=${Date.now()}`);

const shapes = [
  ['command-line','royal-blue',5.5,5.5,0.9,3],
  ['shield-wedge','royal-blue',4.2,4.2,2.6,5],
  ['three-grave-sigils','royal-soul',4.5,0,0,6],
  ['ghast-scream-cone','ghast-green',5.2,5.2,3.8,5],
  ['corpse-grasp','ghast-green',3.4,0,0,5],
  ['carrion-banquet-ring','ghast-green',5.5,0,0,8],
  ['spectral-gate-wall','death-knight-blue',4.4,0,2.8,7],
  ['door-shield-charge','death-knight-blue',5.0,5.0,1.8,2],
  ['all-gates-closing','death-knight-blue',6.4,0,0,8]
];
for (const [shape,colorRole,radius,length,width,minMeshes] of shapes) {
  const effect={type:'hero-telegraph',shape,colorRole,radius,length,width,duration:2.6,skillId:`test-${shape}`};
  const model=createHeroEffect(effect);
  assert.ok(model, `missing ${shape}`);
  let meshes=0; model.traverse(node=>{if(node.isMesh)meshes+=1;});
  assert.ok(meshes>=minMeshes, `${shape} visual density ${meshes} < ${minMeshes}`);
  for(let frame=0;frame<=180;frame+=1){
    const progress=frame/180; const age=progress*effect.duration;
    assert.equal(animateHeroEffect(model,effect,age,progress),true);
    assertFinite(model,shape);
  }
}
for (const effect of [
  {type:'hero-formation-impact',colorRole:'royal-blue',duration:0.8},
  {type:'hero-necromancy-rite',colorRole:'royal-soul',radius:3.2,duration:1.4},
  {type:'hero-summon-emerge',colorRole:'royal-soul',formKind:'royal-skeleton',duration:1.1},
  {type:'hero-ghast-retch',colorRole:'ghast-green',duration:0.9},
  {type:'hero-barrier-rise',colorRole:'death-knight-blue',width:3.2,duration:1.0},
  {type:'hero-barrier-hit',colorRole:'death-knight-blue',width:3.2,duration:0.55},
  {type:'hero-barrier-fall',colorRole:'death-knight-blue',width:3.2,duration:1.0},
  {type:'hero-gate-collision',colorRole:'death-knight-blue',duration:0.7}
]) {
  const model=createHeroEffect(effect); assert.ok(model, `missing ${effect.type}`);
  for(let frame=0;frame<=90;frame+=1){const p=frame/90;animateHeroEffect(model,effect,p*effect.duration,p);assertFinite(model,effect.type);}
}
assert.equal(createHeroEffect({type:'ordinary-effect'}),null);
console.log('WP8-D undead hero telegraph and command presentation smoke passed');

function assertFinite(root,label){root.traverse(node=>{for(const prop of ['position','rotation','scale'])for(const axis of ['x','y','z']){const value=node[prop]?.[axis];if(value===undefined)continue;assert.ok(Number.isFinite(value),`${label} ${node.name}.${prop}.${axis} non-finite`);assert.ok(Math.abs(value)<100,`${label} ${node.name}.${prop}.${axis} drifted`);}if(node.material?.transparent)assert.ok(Number.isFinite(node.material.opacity));});}
