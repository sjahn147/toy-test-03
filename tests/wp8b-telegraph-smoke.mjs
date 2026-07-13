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
class Geometry {constructor(...args){this.args=args;}} class BoxGeometry extends Geometry{} class SphereGeometry extends Geometry{} class CylinderGeometry extends Geometry{} class ConeGeometry extends Geometry{} class TorusGeometry extends Geometry{} class OctahedronGeometry extends Geometry{}
class Material {constructor(options={}){Object.assign(this,options);this.color=options.color??0xffffff;this.opacity=options.opacity??1;this.transparent=options.transparent??false;this.depthWrite=options.depthWrite??true;}}
class MeshBasicMaterial extends Material{}
export const THREE={Group,Mesh,BoxGeometry,SphereGeometry,CylinderGeometry,ConeGeometry,TorusGeometry,OctahedronGeometry,MeshBasicMaterial};
`;

const here = dirname(fileURLToPath(import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'wp8b-telegraph-'));
await mkdir(join(temp, 'src/engine/heroes'), { recursive: true });
await mkdir(join(temp, 'src/engine'), { recursive: true });
await copyFile(join(here, '../src/engine/heroes/HeroTelegraphRenderer.js'), join(temp, 'src/engine/heroes/HeroTelegraphRenderer.js'));
await writeFile(join(temp, 'src/engine/ThreeScene.js'), THREE_STUB);
const { createHeroEffect, animateHeroEffect } = await import(`${pathToFileURL(join(temp, 'src/engine/heroes/HeroTelegraphRenderer.js')).href}?v=${Date.now()}`);

const shapes = [
  ['mourning-veil','undead-veil',4.6],
  ['soul-procession','undead-crown',4.2],
  ['ethereal-domain','undead-crown',6],
  ['fungal-lance','fungal-gold',1.2,5.2,0.8],
  ['memory-flower','fungal-blue',4.4],
  ['solitary-bloom','fungal-gold',3.2],
  ['royal-sigil','slime-gold',4.2],
  ['digest-spiral','slime-teal',2.6],
  ['triune-court','slime-gold',5]
];
for (const [shape, colorRole, radius, length = 0, width = 0] of shapes) {
  const effect = { type: 'hero-telegraph', shape, colorRole, radius, length, width, duration: 2.4, skillId: `test-${shape}` };
  const model = createHeroEffect(effect);
  assert.ok(model, `missing effect for ${shape}`);
  let meshes = 0;
  model.traverse(node => { if (node.isMesh) meshes += 1; });
  assert.ok(meshes >= (shape === 'fungal-lance' ? 7 : 3), `${shape} lacks visual construction density`);
  for (let frame = 0; frame <= 120; frame += 1) {
    const age = frame / 60 * effect.duration;
    const progress = frame / 120;
    assert.equal(animateHeroEffect(model, effect, age, progress), true);
    assertFinite(model, shape);
  }
}

for (const effect of [
  { type: 'hero-form-reveal', formKind: 'shade-1', colorRole: 'undead-veil', duration: 1.1 },
  { type: 'hero-form-reveal', formKind: 'king', colorRole: 'slime-gold', duration: 1.1 },
  { type: 'hero-form-merge', colorRole: 'slime-gold', duration: 1.25 },
  { type: 'hero-form-effect', formKind: 'scribe', colorRole: 'slime-gold', duration: 0.9 }
]) {
  const model = createHeroEffect(effect);
  assert.ok(model);
  for (let frame = 0; frame <= 60; frame += 1) {
    animateHeroEffect(model, effect, frame / 60 * effect.duration, frame / 60);
    assertFinite(model, effect.type);
  }
}

assert.equal(createHeroEffect({ type: 'ordinary-effect' }), null);
console.log('WP8-B irregular telegraph and temporary-form presentation smoke passed');

function assertFinite(root, label) {
  root.traverse(node => {
    for (const property of ['position','rotation','scale']) {
      for (const axis of ['x','y','z']) {
        const value = node[property]?.[axis];
        if (value === undefined) continue;
        assert.ok(Number.isFinite(value), `${label} ${node.name}.${property}.${axis} non-finite`);
        assert.ok(Math.abs(value) < 100, `${label} ${node.name}.${property}.${axis} drifted`);
      }
    }
    if (node.material?.transparent) assert.ok(Number.isFinite(node.material.opacity));
  });
}
