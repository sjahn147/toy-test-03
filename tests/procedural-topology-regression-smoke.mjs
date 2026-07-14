import assert from 'node:assert/strict';
import { buildDungeonTopology } from '../src/engine/DungeonTopology.js';

const rooms = [
  { id:'entry', floor:0, x:0, z:0, w:6, d:6 },
  { id:'hall', floor:0, x:12, z:0, w:8, d:6 }
];
const route = {
  id:'generated-like-route',
  from:'entry',
  to:'hall',
  kind:'ordinary',
  points:[{ x:3, z:0 }, { x:9, z:0 }],
  ports:{
    entry:{ roomId:'entry', side:'E', x:3, z:0, normalX:1, normalZ:0, width:1.5 },
    hall:{ roomId:'hall', side:'W', x:9, z:0, normalX:-1, normalZ:0, width:1.5 }
  }
};

const procedural = buildDungeonTopology(rooms, [route], { includeInactive:true, authoredPhysicalLayout:false });
assert.equal(procedural.authored, false);
assert.equal(procedural.connections[0].authored, false);
assert.equal(procedural.connections[0].points.length >= 2, true);

const authored = buildDungeonTopology(rooms, [route], { includeInactive:true, authoredPhysicalLayout:true });
assert.equal(authored.authored, true);
assert.equal(authored.connections[0].authored, true);

console.log('procedural topology regression smoke passed');
