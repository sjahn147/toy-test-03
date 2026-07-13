export const THREE_STUB = `
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
  remove(item){this.children=this.children.filter(child=>child!==item);if(item)item.parent=null;return this;}
  traverse(fn){fn(this);for(const child of this.children)child.traverse?child.traverse(fn):fn(child);}
  getObjectByName(name){if(this.name===name)return this;for(const child of this.children){const result=child.getObjectByName?child.getObjectByName(name):(child.name===name?child:null);if(result)return result;}return null;}
  clone(){const copy=new this.constructor();copy.name=this.name;copy.position.copy(this.position);copy.rotation.copy(this.rotation);copy.scale.copy(this.scale);copy.userData={...this.userData};copy.visible=this.visible;for(const child of this.children)copy.add(child.clone?child.clone():child);return copy;}
}
class Group extends Object3D {}
class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;} clone(){const copy=new Mesh(this.geometry,this.material);copy.name=this.name;copy.position.copy(this.position);copy.rotation.copy(this.rotation);copy.scale.copy(this.scale);copy.userData={...this.userData};copy.visible=this.visible;for(const child of this.children)copy.add(child.clone?child.clone():child);return copy;}}
class Geometry {constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{} class SphereGeometry extends Geometry{} class CylinderGeometry extends Geometry{} class CapsuleGeometry extends Geometry{} class ConeGeometry extends Geometry{} class TorusGeometry extends Geometry{} class OctahedronGeometry extends Geometry{} class DodecahedronGeometry extends Geometry{}
class Material {constructor(options={}){Object.assign(this,options);this.color=options.color??0xffffff;this.opacity=options.opacity??1;this.transparent=options.transparent??false;this.emissiveIntensity=options.emissiveIntensity??0;}}
class MeshStandardMaterial extends Material{} class MeshBasicMaterial extends Material{}
export const THREE={Group,Mesh,Vector3:Vec,BoxGeometry,SphereGeometry,CylinderGeometry,CapsuleGeometry,ConeGeometry,TorusGeometry,OctahedronGeometry,DodecahedronGeometry,MeshStandardMaterial,MeshBasicMaterial};
`;

export class Vec {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){this.x=this.y=this.z=v;return this;}
  clone(){return new Vec(this.x,this.y,this.z);}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this;}
}
