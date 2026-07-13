import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THREE_STUB = `
class Vec {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){this.x=this.y=this.z=v;return this;}
  clone(){return new Vec(this.x,this.y,this.z);}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this;}
}
class Object3D {
  constructor(){this.children=[];this.parent=null;this.name='';this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.userData={};this.visible=true;}
  add(...items){for(const item of items){if(!item)continue;this.children.push(item);item.parent=this;}return this;}
  traverse(fn){fn(this);for(const child of this.children)child.traverse?child.traverse(fn):fn(child);}
  getObjectByName(name){if(this.name===name)return this;for(const child of this.children){const result=child.getObjectByName?child.getObjectByName(name):(child.name===name?child:null);if(result)return result;}return null;}
  clone(){const copy=new this.constructor();copy.name=this.name;copy.position.copy(this.position);copy.rotation.copy(this.rotation);copy.scale.copy(this.scale);copy.userData={...this.userData};copy.visible=this.visible;for(const child of this.children)copy.add(child.clone?child.clone():child);return copy;}
}
class Group extends Object3D {}
class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;} clone(){const copy=new Mesh(this.geometry,this.material);copy.name=this.name;copy.position.copy(this.position);copy.rotation.copy(this.rotation);copy.scale.copy(this.scale);copy.userData={...this.userData};copy.visible=this.visible;for(const child of this.children)copy.add(child.clone?child.clone():child);return copy;}}
class Geometry {constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{} class SphereGeometry extends Geometry{} class CylinderGeometry extends Geometry{} class CapsuleGeometry extends Geometry{} class ConeGeometry extends Geometry{} class TorusGeometry extends Geometry{} class OctahedronGeometry extends Geometry{}
class Material {constructor(options={}){Object.assign(this,options);this.color=options.color??0xffffff;this.opacity=options.opacity??1;this.transparent=options.transparent??false;this.emissiveIntensity=options.emissiveIntensity??0;this.depthWrite=options.depthWrite??true;}}
class MeshStandardMaterial extends Material{} class MeshBasicMaterial extends Material{}
export const THREE={Group,Mesh,BoxGeometry,SphereGeometry,CylinderGeometry,CapsuleGeometry,ConeGeometry,TorusGeometry,OctahedronGeometry,MeshStandardMaterial,MeshBasicMaterial};
`;

const here = dirname(fileURLToPath(import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'wp8b-factory-'));
await mkdir(join(temp, 'src/engine/heroes'), { recursive: true });
await mkdir(join(temp, 'src/engine'), { recursive: true });
await mkdir(join(temp, 'src/content/heroes'), { recursive: true });
await copyFile(join(here, '../src/engine/heroes/HeroMiniatureFactory.js'), join(temp, 'src/engine/heroes/HeroMiniatureFactory.js'));
await copyFile(join(here, '../src/content/heroes/HeroDefinitions.js'), join(temp, 'src/content/heroes/HeroDefinitions.js'));
await writeFile(join(temp, 'src/engine/ThreeScene.js'), THREE_STUB);

const { createHeroMiniature } = await import(`${pathToFileURL(join(temp, 'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=${Date.now()}`);

const heroes = [
  { id: 'isara-agent', heroId: 'hero.isara', role: 'hero-isara', faction: 'dungeon', ecologyFaction: 'undead-host', hp: 88, maxHp: 88 },
  { id: 'orum-agent', heroId: 'hero.orum-bell', role: 'hero-orum-bell', faction: 'dungeon', ecologyFaction: 'bluecap-colony', hp: 94, maxHp: 94 },
  { id: 'glop-agent', heroId: 'hero.glop', role: 'hero-glop', faction: 'dungeon', ecologyFaction: 'slime-bloom', hp: 146, maxHp: 146, heroStance: 'crown' }
];

const [isara, orum, glop] = heroes.map(createHeroMiniature);
for (const model of [isara, orum, glop]) {
  assert.ok(model);
  assert.equal(model.userData.isHero, true);
  assert.equal(model.userData.articulated, true);
  assert.ok(model.userData.heroMeshCount >= 45, `${model.userData.heroId} needs hero-level mesh density`);
  assert.ok(model.getObjectByName('hero-ring'));
  assert.ok(model.getObjectByName('hero-marker'));
  assert.ok(model.getObjectByName('hp'));
  assert.ok(model.userData.secondaryMotionConfig.length >= 2);
  assert.ok(model.userData.dynamicMaterials.length >= 1);
}

for (const name of ['veilRoot','crown','handL','handR','faceVoid']) assert.ok(isara.userData.joints[name], `Isara missing ${name}`);
assert.ok(isara.userData.heroMeshCount >= 60, `Isara silhouette density too low: ${isara.userData.heroMeshCount}`);
assert.ok(isara.userData.secondaryMotionConfig.some(item => item.mode === 'veil-chain'));
assert.ok(isara.userData.secondaryMotionConfig.some(item => item.mode === 'floating-hands'));

for (const name of ['rootLeg0','rootLeg1','rootLeg2','capRoot','spearRoot','spearShaft','mantleRoot','memoryLights']) assert.ok(orum.userData.joints[name], `Orum-Bell missing ${name}`);
assert.ok(orum.userData.heroMeshCount >= 55, `Orum-Bell silhouette density too low: ${orum.userData.heroMeshCount}`);
assert.ok(orum.userData.secondaryMotionConfig.some(item => item.mode === 'root-tendrils'));

for (const name of ['blobRoot','shell','core','crown','artifactOrbit','royalSeal','keyRingArtifact','chalice','throneFragment','boneHand','scribePen']) assert.ok(glop.userData.joints[name], `Glop missing ${name}`);
assert.ok(glop.userData.heroMeshCount >= 65, `Glop silhouette density too low: ${glop.userData.heroMeshCount}`);
assert.ok(glop.userData.secondaryMotionConfig.some(item => item.mode === 'artifact-float'));
assert.ok(glop.userData.damageParts.stage1Show.length > 0);
assert.ok(glop.userData.damageParts.stage2Show.length > 0);

const formAgents = [
  { id: 'shade', heroFormOf: 'hero.isara', heroFormKind: 'shade-1', faction: 'dungeon', hp: 18, maxHp: 18 },
  { id: 'king', heroFormOf: 'hero.glop', heroFormKind: 'king', faction: 'dungeon', hp: 48, maxHp: 48 },
  { id: 'guard', heroFormOf: 'hero.glop', heroFormKind: 'guard', faction: 'dungeon', hp: 60, maxHp: 60 },
  { id: 'scribe', heroFormOf: 'hero.glop', heroFormKind: 'scribe', faction: 'dungeon', hp: 40, maxHp: 40 }
];
for (const agent of formAgents) {
  const model = createHeroMiniature(agent);
  assert.ok(model);
  assert.equal(model.userData.isHeroForm, true);
  assert.ok(model.userData.heroMeshCount >= 2);
  assert.ok(model.getObjectByName('hero-form-ring'));
}

console.log('WP8-B irregular hero and temporary-form factory smoke passed');
