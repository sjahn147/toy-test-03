import { THREE } from './ThreeScene.js';
import { factionColor } from './TerritoryAssetFactory.js';

export class RoomStateVisualRenderer {
  constructor({ parent, roomY } = {}) { this.parent = parent; this.roomY = roomY; this.entries = new Map(); }
  render(states = [], rooms = [], time = 0) {
    const roomById = new Map(rooms.map(room => [room.id, room]));
    const visible = states.filter(state => state.visualVariant !== 'default' || state.owner);
    const live = new Set(visible.map(state => state.roomId));
    for (const [roomId, entry] of this.entries) { if (live.has(roomId)) continue; this.remove(entry); this.entries.delete(roomId); }
    for (const state of visible) {
      const room = roomById.get(state.roomId); if (!room) continue;
      const signature = `${state.visualVariant}:${state.owner ?? ''}:${Math.floor((state.settlement?.structuralIntegrity ?? 100) / 20)}`;
      let entry = this.entries.get(state.roomId);
      if (!entry || entry.signature !== signature) { if (entry) this.remove(entry); entry = { signature, root: makeStateAccent(state, room) }; this.entries.set(state.roomId, entry); this.parent.add(entry.root); }
      entry.root.position.set(room.x, this.roomY(room) + 0.03, room.z);
      entry.root.traverse(node => {
        if (node.userData?.stateSpin) node.rotation.y = time * node.userData.stateSpin;
        if (node.userData?.statePulse) { const pulse = node.userData.statePulse; node.material.opacity = Math.max(0.025, pulse.base + Math.sin(time * pulse.speed + pulse.phase) * pulse.amount); }
      });
    }
  }
  remove(entry) { this.parent.remove(entry.root); disposeTree(entry.root); }
  destroy() { for (const entry of this.entries.values()) this.remove(entry); this.entries.clear(); }
}

function makeStateAccent(state, room) {
  const group = new THREE.Group(); group.name = `room-state-accent:${state.roomId}:${state.visualVariant}`;
  const radius = Math.max(0.8, Math.min(room.w, room.d) * 0.34);
  if (state.visualVariant === 'ruined' || state.visualVariant === 'damaged') {
    const color = state.visualVariant === 'ruined' ? 0x4f4a48 : 0x8d6b50;
    for (let index = 0; index < 5; index += 1) { const angle = hash01(`${state.roomId}:${index}`) * Math.PI * 2; const shard = new THREE.Mesh(new THREE.BoxGeometry(0.12 + index * 0.018, 0.025, radius * 0.45), material(color, 0.18)); shard.position.set(Math.cos(angle) * radius * 0.52, 0.01, Math.sin(angle) * radius * 0.52); shard.rotation.y = angle; group.add(shard); }
  }
  if (state.visualVariant === 'contested') { const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.76, radius, 42), material(0xd45b50, 0.13)); ring.rotation.x = -Math.PI / 2; ring.userData.statePulse = { base: 0.13, amount: 0.05, speed: 5.2, phase: hash01(state.roomId) * 6 }; group.add(ring); }
  if (state.visualVariant === 'burning') addMotes(group, radius, 0xe2763f, 7, 'fire');
  if (state.visualVariant === 'corrupted') addMotes(group, radius, 0x9068b6, 6, 'corrupt');
  if (state.visualVariant === 'flooded') { const water = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.82, 38), material(0x4f91bd, 0.08)); water.rotation.x = -Math.PI / 2; water.userData.statePulse = { base: 0.08, amount: 0.025, speed: 1.5, phase: hash01(state.roomId) * 5 }; group.add(water); }
  if (state.owner && !state.visualVariant.startsWith('controlled:') && !state.visualVariant.startsWith('occupied:')) { const ownerRing = new THREE.Mesh(new THREE.RingGeometry(radius * 0.45, radius * 0.5, 36), material(factionColor(state.owner), 0.07)); ownerRing.rotation.x = -Math.PI / 2; group.add(ownerRing); }
  return group;
}
function addMotes(group, radius, color, count, kind) { for (let index = 0; index < count; index += 1) { const angle = index * Math.PI * 2 / count + hash01(`${group.name}:${index}`) * 0.4; const mote = new THREE.Mesh(new THREE.SphereGeometry(kind === 'fire' ? 0.06 : 0.045, 6, 5), material(color, kind === 'fire' ? 0.36 : 0.28)); mote.position.set(Math.cos(angle) * radius * (0.35 + (index % 3) * 0.13), 0.08 + (index % 2) * 0.1, Math.sin(angle) * radius * (0.35 + (index % 3) * 0.13)); mote.userData.statePulse = { base: kind === 'fire' ? 0.36 : 0.28, amount: 0.12, speed: kind === 'fire' ? 6 : 2.7, phase: index }; group.add(mote); } }
function material(color, opacity) { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); }
function disposeTree(root) { root.traverse?.(node => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach(item => item?.dispose?.()); else node.material?.dispose?.(); }); }
function hash01(value) { let result = 2166136261; for (const char of String(value ?? '')) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0) / 0xffffffff; }
