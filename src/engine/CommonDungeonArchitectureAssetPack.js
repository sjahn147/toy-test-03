import { THREE } from './ThreeScene.js';
import { CommonDungeonArchitectureKit, createDungeonMaterials } from './CommonDungeonArchitectureKit.js';

export const COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS = Object.freeze([
  'environment.room-floor',
  'environment.wall-segment',
  'environment.door-frame',
  'environment.corridor'
]);

export const COMMON_DUNGEON_ARCHITECTURE_PACK_ID = 'environment.common-dungeon-architecture';

export function createCommonDungeonArchitectureAssetPack(options = {}) {
  const ids = new Set(COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS);
  return Object.freeze({
    id: COMMON_DUNGEON_ARCHITECTURE_PACK_ID,
    assetIds: COMMON_DUNGEON_ARCHITECTURE_ASSET_IDS,
    canCreate(assetId) { return ids.has(assetId); },
    create(assetId, context = {}) {
      if (!ids.has(assetId)) return null;
      const materials = createDungeonMaterials(context.palette ?? options.palette);
      const kit = new CommonDungeonArchitectureKit({ materials, seed: context.seed ?? options.seed ?? 17 });
      return createCommonAsset(assetId, kit, context);
    }
  });
}

function createCommonAsset(assetId, kit, context) {
  const root = new THREE.Group();
  root.name = assetId;
  const variant = context.variant ?? context.state ?? 'stone';
  const wet = variant === 'wet' || variant === 'drain' ? 0.8 : variant === 'mossy' ? 0.35 : 0;
  const damaged = variant === 'cracked' || variant === 'collapsed' ? 0.34 : 0.12;

  if (assetId === 'environment.room-floor') {
    kit.addMasonryFloor(root, { width: 8, depth: 8, wetness: wet, damaged, name: 'common-room-floor' });
    if (variant === 'organic') kit.addRubble(root, { count: 9, radius: 3.1, name: 'organic-floor-clutter' });
    return root;
  }

  if (assetId === 'environment.wall-segment') {
    kit.addWallSegment(root, { width: 8, height: 4.8, wetness: wet, damaged, name: 'common-wall-segment' });
    kit.addColumn(root, { height: 4.9, position: [-3.5, -2.4, 0.15], cracked: damaged > 0.2, name: 'wall-buttress-left' });
    kit.addColumn(root, { height: 4.9, position: [3.5, -2.4, 0.15], cracked: false, name: 'wall-buttress-right' });
    return root;
  }

  if (assetId === 'environment.door-frame') {
    kit.addArchway(root, { width: 4, height: 4.8, name: 'common-door-frame' });
    if (variant === 'locked' || variant === 'closed') {
      const door = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.4, 0.28), kit.materials.wood);
      door.position.y = 1.7;
      door.name = 'door-leaf';
      root.add(door);
    }
    if (variant === 'broken') kit.addRubble(root, { count: 12, radius: 2.2, name: 'broken-door-rubble' });
    return root;
  }

  kit.addMasonryFloor(root, { width: 6.4, depth: 12, wetness: wet, damaged, name: 'common-corridor-floor' });
  kit.addWallSegment(root, { width: 12, height: 4.8, position: [-3.2, 2.4, 0], rotationY: Math.PI / 2, wetness: wet, damaged, name: 'corridor-wall-left' });
  kit.addWallSegment(root, { width: 12, height: 4.8, position: [3.2, 2.4, 0], rotationY: Math.PI / 2, wetness: wet, damaged, name: 'corridor-wall-right' });
  for (const z of [-4.5, 0, 4.5]) kit.addArchway(root, { width: 6.2, height: 4.6, depth: 0.52, position: [0, 0, z], rotationY: Math.PI / 2, name: 'corridor-arch-rib' });
  if (variant === 'drain') kit.addDrainChannel(root, { length: 11.2, width: 1.1, name: 'corridor-central-drain' });
  if (variant === 'collapsed') kit.addRubble(root, { count: 24, radius: 4.5, position: [0, 0.1, 2.8], name: 'collapsed-corridor-rubble' });
  return root;
}
