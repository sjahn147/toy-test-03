import { THREE } from './ThreeScene.js';

const PRIORITY = Object.freeze({
  agent: 100,
  'story-prop': 90,
  'interaction-socket': 84,
  structure: 76,
  cargo: 74,
  settlement: 70,
  prop: 64,
  landmark: 58,
  room: 42,
  route: 34
});

const SEMANTIC_PREFIXES = Object.freeze({
  'story-prop': ['story.', 'story-', 'story_'],
  'interaction-socket': ['socket.', 'socket-', 'socket_', 'staging.', 'staging-', 'staging_'],
  route: ['portal.', 'portal-', 'portal_', 'secret.', 'secret-', 'secret_']
});

export class WorldInteractionPicker {
  constructor({ renderer, three, rebuildIntervalMs = 240 } = {}) {
    if (!renderer || !three) throw new Error('WorldInteractionPicker requires renderer and three');
    this.renderer = renderer;
    this.three = three;
    this.rebuildIntervalMs = rebuildIntervalMs;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.targetByObject = new WeakMap();
    this.targetByKey = new Map();
    this.candidateRoots = [];
    this.lastBuildAt = -Infinity;
    this.hoveredTarget = null;
    this.selectedTarget = null;
    this.hoverHelper = null;
    this.selectedHelper = null;
  }

  invalidate() {
    this.lastBuildAt = -Infinity;
  }

  pick(clientX, clientY, now = performanceNow()) {
    this.rebuildIndex(now);
    const rect = this.three.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.three.camera);
    const hits = this.raycaster.intersectObjects(this.candidateRoots, true);
    if (!hits.length) return null;

    const nearest = hits[0].distance;
    const candidates = [];
    for (const hit of hits) {
      if (hit.distance > nearest + 0.35) break;
      const target = this.resolveTarget(hit.object);
      if (!target) continue;
      candidates.push({ target, distance: hit.distance, priority: PRIORITY[target.type] ?? 0 });
    }
    candidates.sort((a, b) => b.priority - a.priority || a.distance - b.distance);
    return candidates[0]?.target ?? null;
  }

  rebuildIndex(now = performanceNow()) {
    if (now - this.lastBuildAt < this.rebuildIntervalMs && this.candidateRoots.length) return;
    this.lastBuildAt = now;
    const hoveredKey = targetKey(this.hoveredTarget);
    const selectedKey = targetKey(this.selectedTarget);
    this.targetByObject = new WeakMap();
    this.targetByKey = new Map();
    this.candidateRoots = [];

    this.registerMap(this.renderer.agentMeshes, 'agent', 'agentId');
    this.registerLandmarks();
    this.registerMap(this.renderer.structureMeshes, 'structure', 'structureId');
    this.registerMap(this.renderer.fieldCampMeshes, 'structure', 'fieldCampId');
    this.registerMap(this.renderer.cargoMeshes, 'cargo', 'cargoId');
    this.registerMap(this.renderer.settlementMeshes, 'settlement', 'settlementId');
    this.registerMap(this.renderer.facilityMeshes, 'prop', 'propId');
    this.registerMap(this.renderer.advancedPropMeshes, 'prop', 'propId');
    this.registerMap(this.renderer.ecologyPropMeshes, 'prop', 'propId');
    this.registerMap(this.renderer.propMeshes, 'prop', 'propId');
    this.registerRooms();
    this.registerRoutes();
    if (hoveredKey) this.hoveredTarget = this.targetByKey.get(hoveredKey) ?? null;
    if (selectedKey) this.selectedTarget = this.targetByKey.get(selectedKey) ?? null;
  }

  registerMap(map, type, idField) {
    if (!(map instanceof Map)) return;
    for (const [id, object] of map) {
      if (!object) continue;
      const roomId = findRoomId(object);
      const target = makeTarget({ type, id: object.userData?.[idField] ?? id, roomId, object });
      this.register(object, target);
    }
  }

  registerLandmarks() {
    const map = this.renderer.landmarkMeshes;
    if (!(map instanceof Map)) return;
    for (const [key, root] of map) {
      if (!root) continue;
      const roomId = root.userData?.roomId ?? String(key).split(':')[0] ?? null;
      const assetId = root.userData?.assetId ?? root.userData?.bundleId ?? String(key).slice(String(key).indexOf(':') + 1);
      const recipe = this.renderer.assets?.getCampaignLandmarkRecipe?.(assetId) ?? null;
      const storyNode = root.userData?.storyNode ?? recipe?.storyNode ?? null;
      const sockets = new Set(root.userData?.sockets ?? recipe?.sockets ?? []);
      const landmark = makeTarget({
        type: 'landmark', id: assetId, roomId, assetId, object: root,
        label: root.userData?.label ?? readable(assetId)
      });
      this.register(root, landmark);

      root.traverse(node => {
        if (!node?.name) return;
        const semanticType = semanticTypeFor(node.name, storyNode, sockets);
        if (!semanticType) return;
        const semanticRoute = semanticType === 'route'
          ? resolveSemanticRoute(this.renderer.scenario?.routes ?? [], roomId, node.name)
          : null;
        const target = makeTarget({
          type: semanticType,
          id: semanticRoute?.id ?? `${roomId ?? 'room'}:${node.name}`,
          roomId: semanticRoute ? roomId : roomId,
          assetId,
          semanticName: node.name,
          object: node,
          label: semanticRoute ? routeLabel(semanticRoute) : readable(node.name)
        });
        this.targetByObject.set(node, target);
        this.targetByKey.set(targetKey(target), target);
      });
    }
  }

  registerRooms() {
    const map = this.renderer.roomMeshes;
    if (!(map instanceof Map)) return;
    for (const [roomId, object] of map) {
      const room = this.renderer.scenario?.rooms?.find(candidate => candidate.id === roomId);
      this.register(object, makeTarget({
        type: 'room', id: roomId, roomId, object,
        label: room?.name ?? roomId
      }));
    }
  }

  registerRoutes() {
    const directChildren = this.renderer.group?.children ?? [];
    const seenIds = new Set();
    for (const object of directChildren) {
      if (object?.userData?.pickable === false) continue;
      const routeId = object?.userData?.routeId ?? object?.userData?.connectionId;
      if (!routeId || seenIds.has(routeId)) continue;
      seenIds.add(routeId);
      const route = this.renderer.scenario?.routes?.find(candidate => candidate.id === routeId) ?? null;
      this.register(object, makeTarget({
        type: 'route',
        id: routeId,
        roomId: object.userData?.roomId ?? object.userData?.fromRoomId ?? route?.from ?? null,
        object,
        label: route ? routeLabel(route) : `Route ${readable(routeId)}`
      }));
    }
  }

  register(object, target) {
    if (!object || !target) return;
    this.targetByObject.set(object, target);
    this.targetByKey.set(targetKey(target), target);
    this.candidateRoots.push(object);
  }

  resolveTarget(object) {
    let current = object;
    while (current) {
      const target = this.targetByObject.get(current);
      if (target) return target;
      current = current.parent;
    }
    return null;
  }

  setHovered(target) {
    if (sameTarget(this.hoveredTarget, target)) return;
    this.hoveredTarget = target ?? null;
    this.hoverHelper = this.replaceHelper(this.hoverHelper, target, 0xf7c96a);
  }

  setSelected(target) {
    if (sameTarget(this.selectedTarget, target)) return;
    this.selectedTarget = target ?? null;
    this.selectedHelper = this.replaceHelper(this.selectedHelper, target, 0x7fd7ff);
  }

  refreshHighlights() {
    refreshHelper(this.hoverHelper, this.hoveredTarget?.object);
    refreshHelper(this.selectedHelper, this.selectedTarget?.object);
  }

  focusPoint(target = this.selectedTarget) {
    const object = target?.object;
    if (!object) return null;
    object.updateWorldMatrix?.(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty?.()) return worldPosition(object);
    return box.getCenter(new THREE.Vector3());
  }

  publicTarget(target) {
    if (!target) return null;
    const { object: _object, ...value } = target;
    return { ...value };
  }

  replaceHelper(previous, target, color) {
    if (previous) {
      this.renderer.group?.remove(previous);
      previous.material?.dispose?.();
    }
    if (!target?.object || typeof THREE.Box3Helper !== 'function') return null;
    target.object.updateWorldMatrix?.(true, true);
    const box = new THREE.Box3().setFromObject(target.object);
    if (box.isEmpty?.()) return null;
    const helper = new THREE.Box3Helper(box, color);
    helper.name = 'world-interaction-highlight';
    helper.raycast = () => {};
    helper.userData.worldInteractionDecoration = true;
    this.renderer.group?.add(helper);
    return helper;
  }

  dispose() {
    this.setHovered(null);
    this.setSelected(null);
    this.candidateRoots = [];
    this.targetByObject = new WeakMap();
    this.targetByKey.clear();
  }
}

function semanticTypeFor(name, storyNode, sockets) {
  if (storyNode && name === storyNode) return 'story-prop';
  if (sockets.has(name)) {
    if (matchesPrefix(name, SEMANTIC_PREFIXES.route)) return 'route';
    return 'interaction-socket';
  }
  for (const [type, prefixes] of Object.entries(SEMANTIC_PREFIXES)) {
    if (matchesPrefix(name, prefixes)) return type;
  }
  return null;
}

function matchesPrefix(value, prefixes) {
  const normalized = String(value).toLowerCase();
  return prefixes.some(prefix => normalized.startsWith(prefix));
}

function makeTarget({ type, id, roomId = null, label = null, semanticName = null, assetId = null, object }) {
  return {
    type,
    id: String(id),
    roomId: roomId == null ? null : String(roomId),
    label: label ?? readable(id),
    semanticName,
    assetId,
    object
  };
}

function resolveSemanticRoute(routes, roomId, semanticName) {
  if (!roomId || !semanticName) return null;
  const tokens = String(semanticName).split(/[._:-]+/).filter(Boolean);
  const candidateRoomId = tokens.find(token => /^[A-M]\d{2}$/i.test(token))?.toUpperCase() ?? null;
  if (!candidateRoomId) return null;
  return routes.find(route =>
    (route.from === roomId && route.to === candidateRoomId) ||
    (route.to === roomId && route.from === candidateRoomId)
  ) ?? null;
}

function routeLabel(route) {
  return `${route.from ?? '?'} → ${route.to ?? '?'} · ${readable(route.kind ?? 'route')}`;
}

function readable(value) {
  return String(value ?? '')
    .replace(/^campaign-landmark:/, '')
    .replace(/[._:-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
}

function findRoomId(object) {
  let current = object;
  while (current) {
    if (current.userData?.roomId) return String(current.userData.roomId);
    current = current.parent;
  }
  return null;
}

function worldPosition(object) {
  if (!object) return null;
  if (typeof object.getWorldPosition === 'function') return object.getWorldPosition(new THREE.Vector3());
  return object.position?.clone?.() ?? null;
}

function refreshHelper(helper, object) {
  if (!helper || !object) return;
  object.updateWorldMatrix?.(true, true);
  helper.box?.setFromObject?.(object);
}

function targetKey(target) {
  return target ? `${target.type}:${target.id}` : null;
}

function sameTarget(a, b) {
  return targetKey(a) === targetKey(b);
}


function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}
