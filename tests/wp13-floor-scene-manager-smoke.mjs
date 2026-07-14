import assert from 'node:assert/strict';
import { FloorSceneManager } from '../src/engine/FloorSceneManager.js';

function node(userData={}) { return { userData, visible:true, children:[], parent:null, add(child){child.parent=this;this.children.push(child);}, traverse(fn){fn(this);for(const child of this.children)child.traverse(fn);} }; }
const root=node();
const f0=node({roomId:'A01'}), b1=node({roomId:'B06'}), nested=node();
b1.add(nested); root.add(f0); root.add(b1);
const scenario={rooms:[{id:'A01',floorId:'F0',floor:0},{id:'B06',floorId:'B1',floor:-1}],floors:[{id:'F0'},{id:'B1'}]};
const manager=new FloorSceneManager({root,scenario,activeFloorId:'F0'});
assert.equal(f0.visible,true);assert.equal(b1.visible,false);assert.equal(nested.visible,false);
manager.setActiveFloor('B1');
assert.equal(f0.visible,false);assert.equal(b1.visible,true);assert.equal(nested.visible,true);
for(let i=0;i<100;i++)manager.setActiveFloor(i%2?'B1':'F0');
assert.equal(manager.index.size,2);
manager.destroy();
console.log('WP13 floor scene manager smoke passed');
