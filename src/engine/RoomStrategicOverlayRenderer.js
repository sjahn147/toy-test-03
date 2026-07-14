import { THREE } from './ThreeScene.js';
import { factionColor } from './TerritoryAssetFactory.js';

const MODES = new Set(['world', 'control', 'population', 'supply', 'danger', 'resources', 'activity']);

export class RoomStrategicOverlayRenderer {
  constructor({ parent, roomY } = {}) {
    this.parent = parent;
    this.roomY = roomY;
    this.mode = 'world';
    this.context = {};
    this.root = new THREE.Group();
    this.root.name = 'wp11-room-strategic-overlay';
    this.root.renderOrder = 40;
    this.parent.add(this.root);
    this.signature = '';
    this.summary = { mode: 'world', label: 'World', summary: '', legend: [] };
  }
  setMode(mode) { this.mode = MODES.has(mode) ? mode : 'world'; return this.mode; }
  setContext(context = {}) { this.context = context ?? {}; }
  getSummary() { return this.summary; }

  render(snapshot = {}, roomStates = [], time = 0) {
    const rooms = new Map((snapshot.rooms ?? []).map(room => [room.id, room]));
    const signature = JSON.stringify([
      this.mode,
      roomStates.map(state => [state.roomId, state.owner, Math.round(state.control / 4), state.contested, state.population, state.capacity, Math.round(state.danger * 10), state.visualVariant, state.settlement?.supplyStatus ?? null, state.jobs?.length ?? 0, state.tasks?.length ?? 0]),
      (snapshot.logistics?.cargo ?? []).filter(item => item.state === 'carried').map(item => [item.id, item.route?.join('>'), Math.round((item.routeRisk ?? 0) * 10), item.routeCut])
    ]);
    if (signature !== this.signature) { this.signature = signature; this.rebuild(snapshot, roomStates, rooms); }
    this.animate(time);
  }

  rebuild(snapshot, roomStates, rooms) {
    clearGroup(this.root);
    let markerCount = 0;
    for (const state of roomStates) {
      const room = rooms.get(state.roomId);
      if (!room) continue;
      const marker = this.makeRoomMarker(state, room);
      if (!marker) continue;
      marker.position.set(room.x, this.roomY(room) + 0.045, room.z);
      this.root.add(marker);
      markerCount += 1;
    }
    if (this.mode === 'supply' || this.mode === 'world') {
      for (const cargo of snapshot.logistics?.cargo ?? []) {
        if (cargo.state !== 'carried' || !Array.isArray(cargo.route) || cargo.route.length < 2) continue;
        const line = makeSupplyRoute(cargo, rooms, this.roomY);
        if (line) this.root.add(line);
      }
    }
    this.summary = summaryFor(this.mode, roomStates, markerCount, snapshot);
  }

  makeRoomMarker(state, room) {
    if (this.mode === 'world') {
      if (!(state.contested || state.danger >= 0.5 || state.flags.siege || state.flags.collapsing || state.flags.blockaded)) return null;
      return makeDangerRing(state, room, true);
    }
    if (this.mode === 'control') return makeControlMarker(state, room);
    if (this.mode === 'population') return state.population > 0 ? makePopulationMarker(state, room) : null;
    if (this.mode === 'danger') return state.danger > 0.06 ? makeDangerRing(state, room, false) : null;
    if (this.mode === 'supply') return state.settlement ? makeSupplyNode(state, room) : null;
    if (this.mode === 'resources') return makeResourceMarker(state, room);
    if (this.mode === 'activity') return state.jobs.length || state.tasks.length || state.flags.combat ? makeActivityMarker(state) : null;
    return null;
  }

  animate(time) {
    this.root.traverse(node => {
      if (node.userData?.pulse) {
        const { speed, amount, phase, base = 1 } = node.userData.pulse;
        node.scale.setScalar(base * (1 + Math.sin(time * speed + phase) * amount));
      }
      if (node.userData?.spin) node.rotation.y = time * node.userData.spin;
      if (node.material?.isLineDashedMaterial) node.material.dashOffset = -time * (node.userData.speed ?? 0.32);
      if (node.material?.transparent && node.userData?.opacityWave) {
        const wave = node.userData.opacityWave;
        node.material.opacity = Math.max(0.04, wave.base + Math.sin(time * wave.speed + wave.phase) * wave.amount);
      }
    });
  }
  destroy() { clearGroup(this.root); this.parent.remove(this.root); this.signature = ''; }
}

function makeControlMarker(state, room) {
  const group = new THREE.Group();
  const radius = Math.max(0.75, Math.min(room.w, room.d) * 0.28);
  const control = clamp(state.control / 100, 0.05, 1);
  const ownerColor = factionColor(state.owner);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * (0.58 + control * 0.3), 40), basic(ownerColor, 0.08 + control * 0.2));
  disc.rotation.x = -Math.PI / 2; group.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.78, radius, 48), basic(ownerColor, state.contested ? 0.62 : 0.42));
  ring.rotation.x = -Math.PI / 2;
  ring.userData.pulse = { speed: state.contested ? 5.2 : 2.1, amount: state.contested ? 0.075 : 0.025, phase: hash01(state.roomId) * 6 };
  group.add(ring);
  if (state.contested && state.challenger) {
    const challenger = new THREE.Mesh(new THREE.RingGeometry(radius * 0.62, radius * 0.75, 36, 1, 0, Math.PI), basic(factionColor(state.challenger), 0.72));
    challenger.rotation.x = -Math.PI / 2; challenger.position.y = 0.015; challenger.rotation.z = Math.PI * 0.5; group.add(challenger);
  }
  return group;
}

function makePopulationMarker(state, room) {
  const group = new THREE.Group();
  const ratio = state.capacity > 0 ? state.population / state.capacity : Math.min(1.5, state.population / 8);
  const height = 0.32 + Math.min(2.8, state.population * 0.13);
  const radius = Math.max(0.18, Math.min(room.w, room.d) * 0.045 + Math.min(0.22, state.population * 0.012));
  const color = ratio > 1 ? 0xd85b52 : ratio > 0.85 ? 0xe0a354 : factionColor(state.owner);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.75, radius, height, 14), basic(color, 0.48));
  column.position.y = height / 2;
  column.userData.opacityWave = { base: 0.48, amount: ratio > 1 ? 0.16 : 0.06, speed: ratio > 1 ? 5.8 : 1.9, phase: hash01(state.roomId) * 6 };
  group.add(column);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.9, 0.045, 6, 22), basic(color, 0.88));
  cap.rotation.x = Math.PI / 2; cap.position.y = height; group.add(cap);
  if (state.capacity > 0) { const capacityRing = new THREE.Mesh(new THREE.RingGeometry(radius * 1.15, radius * 1.35, 28), basic(0xe8e1d2, 0.22)); capacityRing.rotation.x = -Math.PI / 2; group.add(capacityRing); }
  return group;
}

function makeDangerRing(state, room, subtle) {
  const group = new THREE.Group();
  const radius = Math.max(0.78, Math.min(room.w, room.d) * (0.2 + state.danger * 0.12));
  const color = state.flags.infected ? 0x9a79c8 : state.flags.flooded ? 0x5a9dca : 0xd65a50;
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.72, radius, 40), basic(color, subtle ? 0.24 : 0.42 + state.danger * 0.22));
  ring.rotation.x = -Math.PI / 2;
  ring.userData.pulse = { speed: state.flags.siege ? 7.2 : 4.4, amount: subtle ? 0.04 : 0.08, phase: hash01(state.roomId) * 6 };
  group.add(ring);
  if (!subtle) {
    const barMaterial = basic(color, 0.7);
    for (const rotation of [Math.PI / 4, -Math.PI / 4]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.45, 0.025, 0.075), barMaterial); bar.position.y = 0.025; bar.rotation.y = rotation; group.add(bar); }
  }
  return group;
}

function makeSupplyNode(state, room) {
  const group = new THREE.Group();
  const status = state.settlement?.supplyStatus ?? 'open';
  const color = status === 'blockaded' ? 0xd65a50 : status === 'threatened' ? 0xe0a354 : 0x6fc18c;
  const radius = Math.max(0.42, Math.min(room.w, room.d) * 0.08);
  const node = new THREE.Mesh(status === 'blockaded' ? new THREE.BoxGeometry(radius, radius, radius) : new THREE.OctahedronGeometry(radius, 0), basic(color, 0.72));
  node.position.y = radius + 0.12; node.rotation.y = Math.PI / 4;
  node.userData.pulse = { speed: status === 'open' ? 2 : 6, amount: status === 'open' ? 0.035 : 0.11, phase: hash01(state.roomId) * 6 };
  group.add(node); return group;
}

function makeResourceMarker(state, room) {
  const group = new THREE.Group();
  const economy = state.economy ?? {};
  const total = Object.entries(economy)
    .filter(([key]) => !key.startsWith('cargo'))
    .reduce((sum, [, amount]) => sum + Math.max(0, Number(amount) || 0), 0);
  if (total <= 0) return null;
  const radius = Math.max(0.2, Math.min(0.42, 0.2 + total * 0.01));
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(radius, 0), basic(0xe5bf62, 0.78));
  diamond.position.y = 0.45; diamond.userData.spin = 0.65; group.add(diamond); return group;
}

function makeActivityMarker(state) {
  const group = new THREE.Group();
  const color = state.flags.combat ? 0xd65a50 : state.jobs.length ? 0xe0bd68 : 0x72b9df;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 24), basic(color, 0.82));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.48;
  ring.userData.pulse = { speed: state.flags.combat ? 6.2 : 3.2, amount: 0.1, phase: hash01(state.roomId) * 6 };
  group.add(ring);
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), basic(color, 0.88));
  pointer.position.y = 0.25; pointer.rotation.z = Math.PI; group.add(pointer); return group;
}

function makeSupplyRoute(cargo, rooms, roomY) {
  const points = cargo.route.map(roomId => rooms.get(roomId)).filter(Boolean).map(room => new THREE.Vector3(room.x, roomY(room) + 0.18, room.z));
  if (points.length < 2) return null;
  const color = cargo.routeCut ? 0xd65a50 : (cargo.routeRisk ?? 0) > 0.55 ? 0xe0a354 : factionColor(cargo.factionId);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color, transparent: true, opacity: cargo.routeCut ? 0.72 : 0.56, dashSize: 0.42, gapSize: cargo.routeCut ? 0.42 : 0.22, depthWrite: false }));
  line.computeLineDistances(); line.userData.speed = cargo.routeCut ? 0.12 : 0.38; return line;
}

function summaryFor(mode, states, markerCount, snapshot) {
  const contested = states.filter(state => state.contested).length;
  const crowded = states.filter(state => state.capacity > 0 && state.population > state.capacity).length;
  const danger = states.filter(state => state.danger >= 0.5).length;
  const blockaded = states.filter(state => state.settlement?.supplyStatus === 'blockaded').length;
  const jobs = states.reduce((sum, state) => sum + state.jobs.length + state.tasks.length, 0);
  const label = mode[0].toUpperCase() + mode.slice(1);
  const summaries = {
    world: `${contested} contested · ${danger} high danger`, control: `${contested} contested rooms`,
    population: `${states.reduce((sum, state) => sum + state.population, 0)} entities · ${crowded} overcrowded`,
    supply: `${(snapshot.logistics?.cargo ?? []).filter(item => item.state === 'carried').length} cargo · ${blockaded} blockaded`,
    danger: `${danger} rooms at high danger`, resources: `${markerCount} rooms with strategic stock`, activity: `${jobs} active jobs and field orders`
  };
  return { mode, label, summary: summaries[mode] ?? '', legend: [] };
}

function basic(color, opacity) { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); }
function clearGroup(group) { while (group.children.length) { const child = group.children[group.children.length - 1]; group.remove(child); disposeTree(child); } }
function disposeTree(root) { root.traverse?.(node => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach(item => item?.dispose?.()); else node.material?.dispose?.(); }); }
function hash01(value) { let result = 2166136261; for (const char of String(value ?? '')) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0) / 0xffffffff; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
