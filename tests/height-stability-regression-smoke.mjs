import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildDungeonTopology, connectionSurfaceY, roomSurfaceY, DEFAULT_FLOOR_HEIGHT } from '../src/engine/DungeonTopology.js';

assert.ok(DEFAULT_FLOOR_HEIGHT >= 5.4, 'floor separation must clear tall room assets');
assert.equal(roomSurfaceY({ floor: 0 }), 0);
assert.equal(roomSurfaceY({ floor: -1 }), -DEFAULT_FLOOR_HEIGHT);
assert.equal(roomSurfaceY({ floor: 2 }), DEFAULT_FLOOR_HEIGHT * 2);

const rooms = [
  { id: 'UP', x: 0, z: 0, floor: 0, w: 12, d: 12 },
  { id: 'DOWN', x: 0, z: 0, floor: -1, w: 12, d: 12 }
];
const routes = [{
  id: 'vertical', from: 'UP', to: 'DOWN', kind: 'ordinary', defaultState: 'open', active: true,
  points: [{ x: 0, z: 5 }, { x: 3, z: 5 }, { x: 3, z: 0 }],
  ports: {
    UP: { roomId: 'UP', side: 'S', x: 0, z: 5, normalX: 0, normalZ: 1, width: 2 },
    DOWN: { roomId: 'DOWN', side: 'N', x: 3, z: 0, normalX: 0, normalZ: -1, width: 2 }
  },
  vertical: true, fromFloor: 0, toFloor: -1
}];
const topology = buildDungeonTopology(rooms, routes, { includeInactive: true });
const route = topology.connectionById.get('vertical');
const heights = [0, 0.25, 0.5, 0.75, 1].map(value => connectionSurfaceY(route, topology, value, DEFAULT_FLOOR_HEIGHT));
assert.equal(heights[0], 0);
assert.equal(heights.at(-1), -DEFAULT_FLOOR_HEIGHT);
for (let index = 1; index < heights.length; index += 1) assert.ok(heights[index] <= heights[index - 1], 'vertical route height must be monotonic');

const renderer = await readFile(new URL('../src/engine/DungeonRenderer.js', import.meta.url), 'utf8');
const phase8 = await readFile(new URL('../src/engine/DungeonRendererPhase8.js', import.meta.url), 'utf8');
const routesSource = await readFile(new URL('../src/engine/AuthoredRouteRenderer.js', import.meta.url), 'utf8');
const heroActors = await readFile(new URL('../src/engine/heroes/HeroWorldActorRenderer.js', import.meta.url), 'utf8');
const camera = await readFile(new URL('../src/camera/CameraTargetResolver.js', import.meta.url), 'utf8');
const scale = await readFile(new URL('../src/data/applyPhase8SpatialScale.js', import.meta.url), 'utf8');

assert.match(renderer, /agentGroundOffset\(agent, mesh/);
assert.match(renderer, /connectionSurfaceY\(connection, this\.topology/);
assert.doesNotMatch(renderer, /target\.y \+ bob/);
assert.match(phase8, /this\.agentGroundY\(agent, mesh, room\)/);
assert.match(phase8, /animatedByBaseRenderer/);
assert.match(routesSource, /this\.routeY\(connection, 0\.5\)/);
assert.match(routesSource, /undiscoveredSecret/);
assert.doesNotMatch(heroActors, /FLOOR_HEIGHT = 2\.85/);
assert.match(heroActors, /this\.roomY = roomY/);
assert.match(camera, /roomSurfaceY\(room, this\.floorHeight\)/);
assert.match(scale, /MINIMUM_FLOOR_HEIGHT = 5\.4/);

console.log('height stability regression smoke: ok');
