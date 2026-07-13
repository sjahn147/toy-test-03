import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAuthoredCampaignLayout } from '../src/content/layout/AuthoredCampaignLayout.js';
import { buildDungeonTopology, sampleConnection } from '../src/engine/DungeonTopology.js';

const manifest = JSON.parse(await readFile(new URL('./sleeping-citadel-manifest-min.json', import.meta.url), 'utf8'));
manifest.entryRoomId = 'A01';
const layout = getAuthoredCampaignLayout(manifest);
const rooms = manifest.rooms.map(room => ({
  id: room.id,
  w: room.size[0],
  d: room.size[1],
  ...layout.rooms[room.id]
}));
const topology = buildDungeonTopology(rooms, layout.routes, { includeInactive: true });

assert.equal(topology.authored, true);
assert.equal(topology.connections.length, 90);
assert.equal(topology.connectionById.size, 90);
const descent = topology.connectionById.get('route-A05-B06');
assert.ok(descent.authored);
assert.equal(descent.vertical, true);
assert.equal(descent.fromFloor, 0);
assert.equal(descent.toFloor, -1);
assert.ok(descent.routeType.includes('descent'));
assert.ok(Array.isArray(descent.modules));
const middle = sampleConnection(descent, 0.5);
assert.ok(Number.isFinite(middle.x) && Number.isFinite(middle.z) && Number.isFinite(middle.yOffset));
const funeral = topology.connectionById.get('route-L56-E25');
assert.equal(funeral.kind, 'ordinary');
assert.equal(funeral.routeType, 'royal-funeral-stair');
const hidden = topology.connectionById.get('secret-B10-E21');
assert.equal(hidden.kind, 'secret');
assert.equal(hidden.state, 'hidden');

console.log(JSON.stringify({ connections: topology.connections.length, roomsWithPorts: [...topology.roomPorts.values()].filter(ports => ports.length).length }, null, 2));
