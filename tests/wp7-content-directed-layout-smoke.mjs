import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAuthoredCampaignLayout, authoredRouteSummary } from '../src/content/layout/AuthoredCampaignLayout.js';
import { getCampaignSpawnNetwork } from '../src/content/spawn/SpawnNetworkCatalog.js';

const manifest = JSON.parse(await readFile(new URL('./sleeping-citadel-manifest-min.json', import.meta.url), 'utf8'));
manifest.entryRoomId = 'A01';
const layout = getAuthoredCampaignLayout(manifest);
const spawn = getCampaignSpawnNetwork(manifest);
const summary = authoredRouteSummary(layout);

assert.equal(Object.keys(layout.rooms).length, 63);
assert.equal(summary.total, 90);
assert.equal(summary.ordinary, 80);
assert.equal(summary.conditional, 3);
assert.equal(summary.secret, 7);
assert.deepEqual(summary.floors, [-3, -2, -1, 0]);
assert.ok(summary.spawnSockets >= 63);
assert.equal(layout.entryPolicy, 'authored-hub');
assert.equal(layout.entryRoomId, 'A01');
assert.ok(!Object.hasOwn(layout.rooms, 'A01-threshold'));
assert.ok(layout.routes.some(route => route.kind === 'ordinary' && pair(route.from, route.to) === 'E25::L56'));
assert.ok(!layout.routes.some(route => route.kind === 'ordinary' && pair(route.from, route.to) === 'B10::E21'));
assert.ok(layout.routes.some(route => route.id === 'secret-B10-E21' && route.kind === 'secret'));

const roomById = new Map(manifest.rooms.map(room => [room.id, room]));
for (const room of manifest.rooms) Object.assign(room, layout.rooms[room.id]);
assertNoRoomOverlap(manifest.rooms, 2.4);
assertRoutesAvoidRooms(layout.routes, manifest.rooms);
for (const route of layout.routes) {
  if (route.points.length < 2) assert.fail(`${route.id} has no polyline`);
  const length = polylineLength(route.points);
  if (length > 20) assert.ok(route.modules.length >= 1, `${route.id} is long but has no corridor dressing`);
  assert.ok(route.routeType, `${route.id} has no content route type`);
  assert.ok(roomById.has(route.from) && roomById.has(route.to));
}

assert.equal(Object.keys(spawn.socketsByRoom).length, 63);
assert.equal(spawn.sites.filter(site => site.state === 'active').length, 24);
assert.ok(spawn.sites.filter(site => site.state === 'active').every(site => !['A', 'H'].includes(site.roomId[0])));
assert.ok(spawn.sites.some(site => site.id === 'site.goblin.D19.core'));
assert.ok(spawn.sites.some(site => site.id === 'site.kobold.C14.repair-post'));
assert.ok(spawn.sites.some(site => site.id === 'site.orc.I42.toll-post'));
assert.ok(spawn.sites.some(site => site.id === 'site.zombie.E22.core'));

console.log(JSON.stringify({
  rooms: Object.keys(layout.rooms).length,
  routes: summary,
  activeSpawnSites: spawn.sites.filter(site => site.state === 'active').length,
  totalSpawnSites: spawn.sites.length
}, null, 2));

function assertNoRoomOverlap(rooms, margin) {
  for (let i = 0; i < rooms.length; i += 1) {
    const a = rooms[i];
    for (let j = i + 1; j < rooms.length; j += 1) {
      const b = rooms[j];
      if (a.floor !== b.floor) continue;
      const overlapX = Math.abs(a.x - b.x) < (a.size[0] + b.size[0]) / 2 + margin;
      const overlapZ = Math.abs(a.z - b.z) < (a.size[1] + b.size[1]) / 2 + margin;
      assert.ok(!(overlapX && overlapZ), `${a.id} overlaps ${b.id}`);
    }
  }
}

function assertRoutesAvoidRooms(routes, rooms) {
  for (const route of routes) {
    if (route.fromFloor !== route.toFloor) continue;
    for (const room of rooms) {
      if (room.id === route.from || room.id === route.to || room.floor !== route.fromFloor) continue;
      const rect = {
        minX: room.x - room.size[0] / 2 - route.width / 2,
        maxX: room.x + room.size[0] / 2 + route.width / 2,
        minZ: room.z - room.size[1] / 2 - route.width / 2,
        maxZ: room.z + room.size[1] / 2 + route.width / 2
      };
      for (let index = 0; index < route.points.length - 1; index += 1) {
        const a = route.points[index];
        const b = route.points[index + 1];
        assert.ok(!segmentIntersectsRect(a, b, rect), `${route.id} crosses unrelated room ${room.id}`);
      }
    }
  }
}

function segmentIntersectsRect(a, b, rect) {
  if (inside(a, rect) || inside(b, rect)) return true;
  const edges = [
    [{ x: rect.minX, z: rect.minZ }, { x: rect.maxX, z: rect.minZ }],
    [{ x: rect.maxX, z: rect.minZ }, { x: rect.maxX, z: rect.maxZ }],
    [{ x: rect.maxX, z: rect.maxZ }, { x: rect.minX, z: rect.maxZ }],
    [{ x: rect.minX, z: rect.maxZ }, { x: rect.minX, z: rect.minZ }]
  ];
  return edges.some(([c, d]) => intersects(a, b, c, d));
}

function inside(point, rect) {
  return point.x > rect.minX && point.x < rect.maxX && point.z > rect.minZ && point.z < rect.maxZ;
}

function intersects(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < -1e-8 && o3 * o4 < -1e-8;
}

function orient(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function polylineLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
  return total;
}

function pair(a, b) {
  return [a, b].sort().join('::');
}
