let nextId = 1;
class Euler {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  clone(){return new Euler(this.x,this.y,this.z);}
}
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  normalize(){const l=this.length()||1;return this.multiplyScalar(1/l);}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  setScalar(s){this.x=this.y=this.z=s;return this;}
}
class Quaternion { setFromUnitVectors(){return this;} }
class Color {
  constructor(hex=0xffffff){this.set(hex);}
  set(hex){this.hex=hex;return this;}
  copy(c){this.hex=c.hex;return this;}
  multiplyScalar(s){this.hex=this.hex;this.scaled=(this.scaled??1)*s;return this;}
  lerp(c,t){this.hex=t>0.5?c.hex:this.hex;return this;}
}
class Object3D {
  constructor(){this.id=nextId++;this.name='';this.children=[];this.parent=null;this.position=new Vector3();this.rotation=new Euler();this.scale=new Vector3(1,1,1);this.quaternion=new Quaternion();this.userData={};this.visible=true;this.matrix={};}
  add(...nodes){for(const n of nodes){if(!n)continue;n.parent=this;this.children.push(n);}return this;}
  traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}
  getObjectByName(name){if(this.name===name)return this;for(const c of this.children){const hit=c.getObjectByName(name);if(hit)return hit;}return null;}
  updateMatrix(){this.matrix={position:this.position.clone(),rotation:this.rotation.clone(),scale:this.scale.clone()};}
}
class Group extends Object3D {}
class Geometry { constructor(...args){this.args=args;} dispose(){} }
class Material { constructor(o={}){Object.assign(this,o);this.color=new Color(o.color??0xffffff);this.emissive=new Color(o.emissive??0x000000);this.opacity=o.opacity??1;this.emissiveIntensity=o.emissiveIntensity??0;} dispose(){} }
class Mesh extends Object3D { constructor(geometry,material){super();this.geometry=geometry;this.material=material;} }
class InstancedMesh extends Mesh { constructor(geometry,material,count){super(geometry,material);this.count=count;this.matrices=[];this.instanceMatrix={needsUpdate:false};} setMatrixAt(i,m){this.matrices[i]=m;} }
export const THREE={
  Group,Mesh,InstancedMesh,Object3D,Vector3,MeshStandardMaterial:Material,
  BoxGeometry:Geometry,CylinderGeometry:Geometry,SphereGeometry:Geometry,TorusGeometry:Geometry,
  ConeGeometry:Geometry,PlaneGeometry:Geometry,
  FrontSide:0,DoubleSide:2
};
