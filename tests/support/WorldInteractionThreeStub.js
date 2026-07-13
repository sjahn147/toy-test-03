export class Object3D {
  constructor(name = '') {
    this.name = name;
    this.children = [];
    this.parent = null;
    this.userData = {};
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
  }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } return this; }
  remove(child) { this.children = this.children.filter(item => item !== child); if (child) child.parent = null; }
  traverse(callback) { callback(this); for (const child of this.children) child.traverse(callback); }
  updateWorldMatrix() {}
  getWorldPosition(target) { return target.copy(this.position); }
}

export class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } }
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(value) { this.x = value.x; this.y = value.y; this.z = value.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
}

export class Box3 {
  constructor() { this.center = new Vector3(); this.empty = false; }
  setFromObject(object) { this.center.copy(object.__boxCenter ?? object.position ?? new Vector3()); this.empty = object.__emptyBox === true; return this; }
  isEmpty() { return this.empty; }
  getCenter(target) { return target.copy(this.center); }
}

export class Box3Helper extends Object3D {
  constructor(box, color) { super('box-helper'); this.box = box; this.color = color; this.material = { dispose() {} }; }
}

export class Raycaster {
  constructor() { this.nextHits = []; }
  setFromCamera(pointer, camera) { this.pointer = pointer; this.camera = camera; }
  intersectObjects() { return this.nextHits; }
}

export const THREE = { Vector2, Vector3, Box3, Box3Helper, Raycaster };
