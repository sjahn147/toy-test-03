import { THREE } from './ThreeScene.js';
import { deriveStrategicOverlay, normalizeOverlayMode } from './StrategicOverlayModel.js';

const COLORS = Object.freeze({
  territory: 0x6ea8e0,
  contested: 0xe0a35c,
  danger: 0xee746c,
  supply: 0x86d29a,
  resource: 0xe8c46a,
  infection: 0xb28bd8,
  secret: 0x9a82ca,
  path: 0x79d7ee,
  task: 0xf0c56f
});

export class StrategicOverlayRenderer {
  constructor({ parent, roomY }) {
    this.parent = parent;
    this.roomY = roomY;
    this.root = new THREE.Group();
    this.root.name = 'wp6-strategic-overlay';
    this.parent.add(this.root);
    this.mode = 'world';
    this.context = {};
    this.signature = '';
    this.summary = { mode: 'world', label: 'World', summary: 'Physical world view', legend: [] };
  }

  setMode(mode) {
    this.mode = normalizeOverlayMode(mode);
    return this.mode;
  }

  setContext(context = {}) {
    this.context = context ?? {};
  }

  render(snapshot, time = 0) {
    const model = deriveStrategicOverlay(snapshot, this.mode, this.context);
    const signature = JSON.stringify({
      mode: model.mode,
      rooms: model.roomMarkers,
      routes: model.routeMarkers,
      points: model.pointMarkers
    });
    if (signature !== this.signature) {
      this.signature = signature;
      this.rebuild(model, snapshot);
    }
    this.animate(time);
    this.summary = { mode: model.mode, label: model.label, summary: model.summary, legend: model.legend.map(item => ({ ...item })) };
    return this.summary;
  }

  getSummary() {
    return { ...this.summary, legend: this.summary.legend.map(item => ({ ...item })) };
  }

  rebuild(model, snapshot) {
    clearGroup(this.root);
    const roomById = new Map((snapshot.rooms ?? []).map(room => [room.id, room]));
    for (const marker of model.roomMarkers) {
      const room = roomById.get(marker.roomId);
      if (!room) continue;
      const mesh = makeRoomMarker(marker, room);
      mesh.position.set(room.x, this.roomY(room) + 0.07, room.z);
      this.root.add(mesh);
    }
    for (const marker of model.pointMarkers) {
      const room = roomById.get(marker.roomId);
      if (!room) continue;
      const mesh = makePointMarker(marker);
      const angle = hash01(marker.id) * Math.PI * 2;
      const radius = Math.min(room.w, room.d) * 0.18;
      mesh.position.set(room.x + Math.cos(angle) * radius, this.roomY(room) + 0.28, room.z + Math.sin(angle) * radius);
      this.root.add(mesh);
    }
    for (const marker of model.routeMarkers) {
      const points = routePoints(marker, roomById, this.roomY);
      if (points.length < 2) continue;
      const mesh = makeRouteMarker(marker, points);
      this.root.add(mesh);
    }
    this.root.traverse(node => {
      node.userData ??= {};
      node.userData.overlayMode = model.mode;
      node.userData.interactionIgnore = true;
      node.raycast = () => {};
    });
  }

  animate(time) {
    this.root.traverse(node => {
      if (node.userData?.overlayPulse) {
        const base = node.userData.baseScale ?? 1;
        const pulse = 1 + Math.sin(time * node.userData.overlayPulse.speed + node.userData.overlayPulse.phase) * node.userData.overlayPulse.amount;
        node.scale.setScalar(base * pulse);
      }
      if (node.userData?.overlaySpin) node.rotation.y = time * node.userData.overlaySpin;
      if (node.material?.isLineDashedMaterial) node.material.dashOffset = -time * (node.userData.routeSpeed ?? 0.35);
      if (node.material?.transparent && node.userData?.opacityWave) {
        const wave = node.userData.opacityWave;
        node.material.opacity = Math.max(0.05, wave.base + Math.sin(time * wave.speed + wave.phase) * wave.amount);
      }
    });
  }

  destroy() {
    clearGroup(this.root);
    this.parent.remove(this.root);
    this.signature = '';
  }
}

function makeRoomMarker(marker, room) {
  const group = new THREE.Group();
  group.name = `overlay-room:${marker.kind}:${marker.roomId}`;
  const intensity = clamp(marker.intensity ?? 0.5, 0.08, 1);
  const radius = Math.max(0.7, Math.min(room.w, room.d) * (0.18 + intensity * 0.14));

  if (marker.kind === 'population') {
    const height = 0.35 + Math.max(1, marker.count ?? 1) * 0.16;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.28, radius * 0.4, height, 12),
      material(0x6ea8e0, 0.46)
    );
    base.position.y = height / 2;
    base.userData.opacityWave = { base: 0.46, amount: 0.08, speed: 1.8, phase: hash01(marker.id) * 6 };
    const cap = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.31, 0.045, 6, 20), material(marker.partyCount > marker.dungeonCount ? 0x79c6ef : 0xb28bd8, 0.82));
    cap.rotation.x = Math.PI / 2;
    cap.position.y = height;
    group.add(base, cap);
    return group;
  }

  const color = roomMarkerColor(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.68, radius, 36), material(color, 0.42));
  ring.rotation.x = -Math.PI / 2;
  ring.userData.overlayPulse = { speed: marker.kind.includes('danger') ? 5.2 : 2.4, amount: marker.kind.includes('contested') ? 0.08 : 0.035, phase: hash01(marker.id) * 6 };
  ring.userData.baseScale = 1;
  group.add(ring);

  if (marker.kind.startsWith('territory')) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.64, 32), material(factionColor(marker.factionId), 0.12 + intensity * 0.12));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.01;
    group.add(disc);
    if (marker.kind === 'territory-contested') addCross(group, radius * 0.65, COLORS.contested);
  } else if (marker.kind.startsWith('danger')) {
    addCross(group, radius * 0.72, COLORS.danger, marker.kind === 'danger-siege');
  } else if (marker.kind.startsWith('infection')) {
    const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.46, 0.055, 6, 28), material(COLORS.infection, 0.68));
    inner.rotation.x = Math.PI / 2;
    inner.userData.overlaySpin = marker.kind === 'infection-environment' ? 0.35 : -0.22;
    group.add(inner);
    for (let index = 0; index < 5; index += 1) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.045 + index * 0.006, 7, 5), material(COLORS.infection, 0.55));
      const angle = index * Math.PI * 2 / 5;
      mote.position.set(Math.cos(angle) * radius * 0.55, 0.12 + (index % 2) * 0.08, Math.sin(angle) * radius * 0.55);
      group.add(mote);
    }
  }
  return group;
}

function makePointMarker(marker) {
  const group = new THREE.Group();
  group.name = `overlay-point:${marker.kind}:${marker.id}`;
  const color = pointMarkerColor(marker);
  if (marker.kind.startsWith('resource')) {
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.24 + clamp(marker.intensity ?? 0, 0, 1) * 0.14, 0), material(color, 0.82));
    diamond.userData.overlaySpin = 0.7;
    group.add(diamond);
    if (marker.kind === 'resource-stockpile') {
      const lower = diamond.clone();
      lower.position.y = -0.22;
      lower.scale.setScalar(0.72);
      group.add(lower);
    }
  } else if (marker.kind.startsWith('supply')) {
    const shape = marker.kind === 'supply-blockaded' ? new THREE.BoxGeometry(0.34, 0.34, 0.34) : new THREE.ConeGeometry(0.2, 0.48, 6);
    const icon = new THREE.Mesh(shape, material(color, 0.82));
    icon.position.y = 0.28;
    icon.rotation.y = Math.PI / 4;
    group.add(icon);
  } else if (marker.kind.startsWith('path')) {
    const target = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 22), material(color, 0.88));
    target.rotation.x = Math.PI / 2;
    target.userData.overlayPulse = { speed: 4.4, amount: 0.12, phase: 0 };
    target.userData.baseScale = 1;
    group.add(target);
  } else {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 18), material(color, 0.82));
    ring.rotation.x = Math.PI / 2;
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 5), material(color, 0.88));
    pointer.position.y = -0.18;
    pointer.rotation.z = Math.PI;
    group.userData.overlayPulse = { speed: 3.2, amount: 0.07, phase: hash01(marker.id) * 6 };
    group.userData.baseScale = 1;
    group.add(ring, pointer);
  }
  return group;
}

function makeRouteMarker(marker, points) {
  const color = routeMarkerColor(marker);
  const materialOptions = routeMaterialOptions(marker);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity: materialOptions.opacity,
      dashSize: materialOptions.dashSize,
      gapSize: materialOptions.gapSize,
      depthWrite: false
    })
  );
  line.name = `overlay-route:${marker.kind}:${marker.id}`;
  line.computeLineDistances();
  line.userData.routeSpeed = materialOptions.speed;
  line.userData.opacityWave = { base: materialOptions.opacity, amount: 0.08, speed: materialOptions.waveSpeed, phase: hash01(marker.id) * 6 };
  return line;
}

function routePoints(marker, roomById, roomY) {
  if (Array.isArray(marker.points) && marker.points.length > 1) {
    const endpoints = marker.roomPath ?? [];
    const firstRoom = roomById.get(endpoints[0]);
    const lastRoom = roomById.get(endpoints.at(-1));
    return marker.points.map((point, index) => {
      const progress = index / Math.max(1, marker.points.length - 1);
      const baseY = firstRoom && lastRoom ? roomY(firstRoom) + (roomY(lastRoom) - roomY(firstRoom)) * progress : 0;
      return new THREE.Vector3(point.x, baseY + 0.19 + (point.yOffset ?? 0), point.z);
    });
  }
  return (marker.roomPath ?? []).map(roomId => roomById.get(roomId)).filter(Boolean).map(room => new THREE.Vector3(room.x, roomY(room) + 0.2, room.z));
}

function addCross(group, radius, color, double = false) {
  const barMaterial = material(color, 0.66);
  for (const rotation of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.55, 0.025, 0.08), barMaterial);
    bar.rotation.y = rotation;
    bar.position.y = 0.03;
    group.add(bar);
  }
  if (double) {
    const outer = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, 0.055, 6, 28), material(color, 0.7));
    outer.rotation.x = Math.PI / 2;
    outer.position.y = 0.05;
    group.add(outer);
  }
}

function roomMarkerColor(marker) {
  if (marker.kind.startsWith('territory')) return factionColor(marker.factionId);
  if (marker.kind.startsWith('danger')) return COLORS.danger;
  if (marker.kind.startsWith('infection')) return COLORS.infection;
  return COLORS.territory;
}

function pointMarkerColor(marker) {
  if (marker.kind.startsWith('resource')) return COLORS.resource;
  if (marker.kind.startsWith('supply')) return marker.kind === 'supply-blockaded' ? COLORS.danger : marker.kind === 'supply-threatened' ? COLORS.contested : COLORS.supply;
  if (marker.kind.startsWith('secret')) return COLORS.secret;
  if (marker.kind.startsWith('path')) return COLORS.path;
  return COLORS.task;
}

function routeMarkerColor(marker) {
  if (marker.kind.includes('danger') || marker.kind.includes('cut') || marker.kind.includes('obstruction')) return COLORS.danger;
  if (marker.kind.includes('risk')) return COLORS.contested;
  if (marker.kind.startsWith('secret')) return COLORS.secret;
  if (marker.kind.startsWith('path')) return COLORS.path;
  if (marker.factionId) return factionColor(marker.factionId);
  return COLORS.supply;
}

function routeMaterialOptions(marker) {
  const solid = marker.kind === 'secret-open' || marker.kind === 'path-current';
  const faint = marker.kind === 'secret-suspected';
  return {
    opacity: faint ? 0.28 : marker.kind.includes('danger') ? 0.74 : 0.58,
    dashSize: solid ? 1.2 : marker.kind.includes('secret') ? 0.18 : 0.42,
    gapSize: solid ? 0.04 : marker.kind.includes('secret') ? 0.2 : 0.24,
    speed: marker.kind.includes('danger') ? 0.18 : 0.42,
    waveSpeed: marker.kind.includes('danger') ? 5.5 : 2.4
  };
}

function factionColor(id) {
  const palette = [0x6ea8e0, 0xee746c, 0xe0a35c, 0xb28bd8, 0x86d29a, 0xe8c46a, 0x79c6ef, 0xd58ab4];
  return palette[Math.floor(hash01(id) * palette.length) % palette.length];
}

function material(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[group.children.length - 1];
    group.remove(child);
    disposeTree(child);
  }
}

function disposeTree(root) {
  root.traverse?.(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(item => item?.dispose?.());
    else node.material?.dispose?.();
  });
}

function hash01(value) {
  let result = 2166136261;
  for (const char of String(value ?? '')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 0xffffffff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
