import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tempRoot = await mkdtemp(join(tmpdir(), 'world-interaction-picker-'));
const engineRoot = join(tempRoot, 'engine');
await cp(new URL('../src/engine/WorldInteractionPicker.js', import.meta.url), join(engineRoot, 'WorldInteractionPicker.js'));
await writeFile(join(engineRoot, 'ThreeScene.js'), await readFile(new URL('./support/WorldInteractionThreeStub.js', import.meta.url), 'utf8'));
await writeFile(join(tempRoot, 'package.json'), '{"type":"module"}\n');
const stub = await import(pathToFileURL(join(engineRoot, 'ThreeScene.js')).href);
const { WorldInteractionPicker } = await import(pathToFileURL(join(engineRoot, 'WorldInteractionPicker.js')).href);
const { Object3D, Vector3 } = stub;

const group = new Object3D('renderer-root');
const roomFloor = new Object3D('room-floor');
roomFloor.userData.roomId = 'H36';
roomFloor.position.set(1, 0, 2);
const agentRoot = new Object3D('agent-root');
agentRoot.userData.agentId = 'fighter-1';
agentRoot.userData.roomId = 'H36';
const agentMesh = new Object3D('agent-body');
agentRoot.add(agentMesh);
const landmarkRoot = new Object3D('campaign-landmark:inn.old-lantern.common-room');
landmarkRoot.userData = { roomId: 'H36', assetId: 'inn.old-lantern.common-room', storyNode: 'reservation-ledger', sockets: ['socket.trade-counter'] };
const storyGroup = new Object3D('reservation-ledger');
const storyMesh = new Object3D('ledger-mesh');
storyGroup.add(storyMesh);
const socketGroup = new Object3D('socket.trade-counter');
const socketMesh = new Object3D('counter-mesh');
socketGroup.add(socketMesh);
landmarkRoot.add(storyGroup, socketGroup);
group.add(roomFloor, agentRoot, landmarkRoot);

const renderer = {
  group,
  scenario: { rooms: [{ id: 'H36', name: 'Old Lantern Common Room' }] },
  assets: { getCampaignLandmarkRecipe: () => ({ storyNode: 'reservation-ledger', sockets: ['socket.trade-counter'] }) },
  roomMeshes: new Map([['H36', roomFloor]]),
  agentMeshes: new Map([['fighter-1', agentRoot]]),
  landmarkMeshes: new Map([['H36:inn.old-lantern.common-room', landmarkRoot]]),
  structureMeshes: new Map(), fieldCampMeshes: new Map(), cargoMeshes: new Map(), settlementMeshes: new Map(),
  facilityMeshes: new Map(), advancedPropMeshes: new Map(), ecologyPropMeshes: new Map(), propMeshes: new Map()
};
const three = { renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } }, camera: {} };
const picker = new WorldInteractionPicker({ renderer, three, rebuildIntervalMs: 0 });

picker.raycaster.nextHits = [
  { object: storyMesh, distance: 1 },
  { object: agentMesh, distance: 1.2 }
];
let target = picker.pick(50, 50, 1);
assert.equal(target.type, 'agent', 'near-overlap priority should prefer agent');
assert.equal(target.id, 'fighter-1');

picker.raycaster.nextHits = [
  { object: storyMesh, distance: 1 },
  { object: agentMesh, distance: 1.6 }
];
target = picker.pick(50, 50, 2);
assert.equal(target.type, 'story-prop', 'distant agent must not steal foreground semantic target');
assert.equal(target.semanticName, 'reservation-ledger');
assert.equal(target.roomId, 'H36');

picker.raycaster.nextHits = [{ object: socketMesh, distance: 1 }];
target = picker.pick(50, 50, 3);
assert.equal(target.type, 'interaction-socket');
assert.equal(picker.publicTarget(target).object, undefined, 'public target must be serializable');

storyGroup.__boxCenter = new Vector3(4, 2, -1);
picker.setSelected({ ...target, object: storyGroup });
const point = picker.focusPoint();
assert.deepEqual([point.x, point.y, point.z], [4, 2, -1]);
picker.dispose();

console.log('world interaction picker runtime smoke passed');
