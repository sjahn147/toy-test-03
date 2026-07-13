import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THREE_STUB = `
class Vec {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}setScalar(v){this.x=this.y=this.z=v;return this;}clone(){return new Vec(this.x,this.y,this.z);}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this;}}
class Object3D {constructor(){this.children=[];this.parent=null;this.name='';this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.userData={};this.visible=true;}add(...items){for(const item of items){if(!item)continue;this.children.push(item);item.parent=this;}return this;}traverse(fn){fn(this);for(const child of this.children)child.traverse?child.traverse(fn):fn(child);}getObjectByName(name){if(this.name===name)return this;for(const child of this.children){const result=child.getObjectByName?child.getObjectByName(name):(child.name===name?child:null);if(result)return result;}return null;}clone(){const copy=new this.constructor();copy.name=this.name;copy.position.copy(this.position);copy.rotation.copy(this.rotation);copy.scale.copy(this.scale);copy.userData={...this.userData};copy.visible=this.visible;for(const child of this.children)copy.add(child.clone?child.clone():child);return copy;}}
class Group extends Object3D {}
class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}clone(){const copy=new Mesh(this.geometry,this.material);copy.name=this.name;copy.position.copy(this.position);copy.rotation.copy(this.rotation);copy.scale.copy(this.scale);copy.userData={...this.userData};copy.visible=this.visible;for(const child of this.children)copy.add(child.clone?child.clone():child);return copy;}}
class Geometry {constructor(...args){this.args=args;}} class BoxGeometry extends Geometry{} class SphereGeometry extends Geometry{} class CylinderGeometry extends Geometry{} class CapsuleGeometry extends Geometry{} class ConeGeometry extends Geometry{} class TorusGeometry extends Geometry{} class OctahedronGeometry extends Geometry{}
class Material {constructor(options={}){Object.assign(this,options);this.color=options.color??0xffffff;this.opacity=options.opacity??1;this.transparent=options.transparent??false;this.emissiveIntensity=options.emissiveIntensity??0;this.depthWrite=options.depthWrite??true;}}
class MeshStandardMaterial extends Material{} class MeshBasicMaterial extends Material{}
export const THREE={Group,Mesh,BoxGeometry,SphereGeometry,CylinderGeometry,CapsuleGeometry,ConeGeometry,TorusGeometry,OctahedronGeometry,MeshStandardMaterial,MeshBasicMaterial};
`;

const here = dirname(fileURLToPath(import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'wp8b-animation-'));
for (const directory of ['src/engine/heroes','src/engine','src/content/heroes']) await mkdir(join(temp, directory), { recursive: true });
for (const file of ['HeroMiniatureFactory.js','HeroAnimator.js','HeroSecondaryMotion.js']) await copyFile(join(here, `../src/engine/heroes/${file}`), join(temp, `src/engine/heroes/${file}`));
for (const file of ['HeroDefinitions.js','HeroAnimationClips.js']) await copyFile(join(here, `../src/content/heroes/${file}`), join(temp, `src/content/heroes/${file}`));
await writeFile(join(temp, 'src/engine/ThreeScene.js'), THREE_STUB);

const stamp = Date.now();
const { createHeroMiniature } = await import(`${pathToFileURL(join(temp, 'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=${stamp}`);
const { animateHeroMiniature } = await import(`${pathToFileURL(join(temp, 'src/engine/heroes/HeroAnimator.js')).href}?v=${stamp}`);

const cases = [
  {
    agent: { id: 'isara', heroId: 'hero.isara', role: 'hero-isara', faction: 'dungeon', ecologyFaction: 'undead-host', hp: 88, maxHp: 88, alive: true, heroStatuses: {}, heroCooldowns: {} },
    skills: ['isara-mourning-veil','isara-soul-procession','isara-unburied-queen'],
    signatureJoint: 'veilRoot'
  },
  {
    agent: { id: 'orum', heroId: 'hero.orum-bell', role: 'hero-orum-bell', faction: 'dungeon', ecologyFaction: 'bluecap-colony', hp: 94, maxHp: 94, alive: true, heroStatuses: {}, heroCooldowns: {} },
    skills: ['orum-mycelial-lance','orum-memory-bloom','orum-solitary-bloom'],
    signatureJoint: 'mantle0'
  },
  {
    agent: { id: 'glop', heroId: 'hero.glop', role: 'hero-glop', faction: 'dungeon', ecologyFaction: 'slime-bloom', hp: 146, maxHp: 146, alive: true, heroStatuses: {}, heroCooldowns: {}, heroStance: 'crown' },
    skills: ['glop-royal-command','glop-digest-evidence','glop-one-court'],
    signatureJoint: 'artifactOrbit'
  }
];

for (const item of cases) {
  const model = createHeroMiniature(item.agent);
  assert.ok(model);
  const joints = model.userData.joints;
  const signature = joints[item.signatureJoint];
  const initial = transformSignature(signature);

  for (let frame = 0; frame < 3600; frame += 1) {
    const time = frame / 60;
    item.agent.travel = frame % 240 < 120 ? { progress: (frame % 120) / 120 } : null;
    item.agent.heroCast = null;
    assert.equal(animateHeroMiniature(model, item.agent, time), true);
    assertFiniteModel(model, item.agent.heroId);
  }
  assert.notDeepEqual(transformSignature(signature), initial, `${item.agent.heroId} secondary animation should move its signature joint`);

  for (const skillId of item.skills) {
    const before = snapshotJoints(joints);
    for (const phase of ['windup','impact','recovery']) {
      item.agent.heroCast = { skillId, phase, elapsed: phase === 'windup' ? 0.7 : 0.03, duration: phase === 'windup' ? 1.4 : phase === 'impact' ? 0.08 : 0.8 };
      animateHeroMiniature(model, item.agent, 65.5 + item.skills.indexOf(skillId));
      assertFiniteModel(model, `${item.agent.heroId}:${skillId}:${phase}`);
    }
    const after = snapshotJoints(joints);
    assert.ok(anyDifference(before, after), `${skillId} must produce a bespoke articulated pose`);
  }

  item.agent.heroCast = null;
  item.agent.heroDamageStage = 1;
  animateHeroMiniature(model, item.agent, 80);
  for (const node of model.userData.damageParts.stage1Show ?? []) assert.equal(node.visible, true);
  item.agent.heroDamageStage = 2;
  animateHeroMiniature(model, item.agent, 81);
  for (const node of model.userData.damageParts.stage2Show ?? []) assert.equal(node.visible, true);
  for (const node of model.userData.damageParts.stage2Hide ?? []) assert.equal(node.visible, false);
}

for (const formAgent of [
  { id: 'shade', heroFormOf: 'hero.isara', heroFormKind: 'shade-1', hp: 18, maxHp: 18, alive: true },
  { id: 'king', heroFormOf: 'hero.glop', heroFormKind: 'king', hp: 48, maxHp: 48, alive: true },
  { id: 'guard', heroFormOf: 'hero.glop', heroFormKind: 'guard', hp: 60, maxHp: 60, alive: true },
  { id: 'scribe', heroFormOf: 'hero.glop', heroFormKind: 'scribe', hp: 40, maxHp: 40, alive: true }
]) {
  const model = createHeroMiniature(formAgent);
  for (let frame = 0; frame < 300; frame += 1) {
    formAgent.travel = frame % 60 < 30 ? { progress: 0.5 } : null;
    assert.equal(animateHeroMiniature(model, formAgent, frame / 60), true);
    assertFiniteModel(model, formAgent.id);
  }
}

console.log('WP8-B articulated irregular hero animation and long-run stability smoke passed');

function transformSignature(joint) {
  return [joint.position.x,joint.position.y,joint.position.z,joint.rotation.x,joint.rotation.y,joint.rotation.z,joint.scale.x,joint.scale.y,joint.scale.z];
}
function snapshotJoints(joints) { return Object.fromEntries(Object.entries(joints).map(([key, value]) => [key, transformSignature(value)])); }
function anyDifference(a, b) { return Object.keys(a).some(key => a[key].some((value, index) => Math.abs(value - b[key][index]) > 1e-5)); }
function assertFiniteModel(model, label) {
  model.traverse(node => {
    for (const property of ['position','rotation','scale']) {
      for (const axis of ['x','y','z']) {
        const value = node[property]?.[axis];
        if (value === undefined) continue;
        assert.ok(Number.isFinite(value), `${label} ${node.name}.${property}.${axis} non-finite`);
        assert.ok(Math.abs(value) < 50, `${label} ${node.name}.${property}.${axis} drifted to ${value}`);
      }
    }
    if (node.material) {
      if ('opacity' in node.material) assert.ok(Number.isFinite(node.material.opacity));
      if ('emissiveIntensity' in node.material) assert.ok(Number.isFinite(node.material.emissiveIntensity));
    }
  });
}
