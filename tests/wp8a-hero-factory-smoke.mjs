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
class Material {constructor(options={}){Object.assign(this,options);this.color=options.color??0xffffff;this.opacity=options.opacity??1;this.transparent=options.transparent??false;}}
class MeshStandardMaterial extends Material{} class MeshBasicMaterial extends Material{}
export const THREE={Group,Mesh,BoxGeometry,SphereGeometry,CylinderGeometry,CapsuleGeometry,ConeGeometry,TorusGeometry,OctahedronGeometry,MeshStandardMaterial,MeshBasicMaterial};
`;


const here = dirname(fileURLToPath(import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'wp8a-factory-'));
await mkdir(join(temp, 'src/engine/heroes'), { recursive: true });
await mkdir(join(temp, 'src/engine'), { recursive: true });
await mkdir(join(temp, 'src/content/heroes'), { recursive: true });
await copyFile(join(here, '../src/engine/heroes/HeroMiniatureFactory.js'), join(temp, 'src/engine/heroes/HeroMiniatureFactory.js'));
await copyFile(join(here, '../src/content/heroes/HeroDefinitions.js'), join(temp, 'src/content/heroes/HeroDefinitions.js'));
await writeFile(join(temp, 'src/engine/ThreeScene.js'), THREE_STUB);

const { createHeroMiniature } = await import(`${pathToFileURL(join(temp, 'src/engine/heroes/HeroMiniatureFactory.js')).href}?v=${Date.now()}`);

const heroes = [
  { id: 'nibble', heroId: 'hero.nibble', role: 'hero-nibble', faction: 'dungeon', hp: 68, maxHp: 68 },
  { id: 'kirik', heroId: 'hero.kirik', role: 'hero-kirik', faction: 'dungeon', hp: 82, maxHp: 82 },
  { id: 'karg', heroId: 'hero.karg', role: 'hero-karg', faction: 'dungeon', hp: 118, maxHp: 118 }
];

const models = heroes.map(createHeroMiniature);
for (const model of models) {
  assert.ok(model);
  assert.equal(model.userData.isHero, true);
  assert.ok(model.userData.heroMeshCount >= 30, `${model.userData.heroId} must be visibly denser than a minion`);
  assert.ok(model.getObjectByName('hero-ring'));
  assert.ok(model.getObjectByName('hero-marker'));
  assert.ok(model.getObjectByName('hp'));
}

const nibble = models[0];
assert.ok(nibble.userData.joints.coatLeft && nibble.userData.joints.keyRing && nibble.userData.joints.staff);
assert.ok(nibble.userData.heroMeshCount >= 50);
const kirik = models[1];
for (const name of ['leg0','leg1','leg2','knee0','knee1','knee2','gear','toolArmL','toolArmR']) assert.ok(kirik.userData.joints[name], `Kirik missing ${name}`);
assert.ok(kirik.userData.heroMeshCount >= 40);
const karg = models[2];
assert.ok(karg.userData.joints.weaponRoot && karg.userData.joints.armorShell && karg.userData.joints.bannerL);
assert.ok(karg.userData.damageParts.stage2Show.length > 0);

console.log('WP8-A hero factory smoke passed');

