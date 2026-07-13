import { THREE } from './ThreeScene.js';

const TYPE_HEIGHT = Object.freeze({ core: 0.16, outpost: 0.13, 'field-camp': 0.1, emergent: 0.08 });

export class SpawnSiteOverlayRenderer {
  constructor({ parent, roomY }) {
    this.parent = parent;
    this.roomY = roomY;
    this.entries = new Map();
  }

  render(spawnNetwork, rooms, time = 0) {
    const roomById = new Map((rooms ?? []).map(room => [room.id, room]));
    const sites = (spawnNetwork?.sites ?? []).filter(site => !['destroyed', 'sealed'].includes(site.state));
    const live = new Set(sites.map(site => site.id));
    for (const [id, entry] of this.entries) {
      if (live.has(id)) continue;
      this.parent.remove(entry.group);
      disposeTree(entry.group);
      this.entries.delete(id);
    }

    for (const site of sites) {
      const room = roomById.get(site.roomId);
      if (!room) continue;
      const signature = `${site.type}:${site.state}:${site.factionId}:${site.eventLocked}:${site.telegraphRemaining != null}`;
      let entry = this.entries.get(site.id);
      if (!entry || entry.signature !== signature) {
        if (entry) {
          this.parent.remove(entry.group);
          disposeTree(entry.group);
        }
        entry = { group: createMarker(site), signature };
        this.entries.set(site.id, entry);
        this.parent.add(entry.group);
      }
      const socket = (room.spawnSockets ?? []).find(candidate => candidate.id === site.socketId) ?? room.spawnSockets?.[0] ?? null;
      const [ox, oz] = socket?.position ?? [0, 0];
      entry.group.position.set(room.x + ox, this.roomY(room) + (TYPE_HEIGHT[site.type] ?? 0.08), room.z + oz);
      const pulse = site.telegraphRemaining != null
        ? 1 + Math.sin(time * 10 + hash(site.id)) * 0.14
        : site.state === 'active'
          ? 1 + Math.sin(time * 2.2 + hash(site.id)) * 0.035
          : 0.84;
      entry.group.scale.setScalar(pulse);
      entry.group.rotation.y = site.type === 'emergent' ? time * 0.45 : 0;
      entry.group.visible = site.state !== 'dormant' || site.eventLocked !== true;
    }
  }

  destroy() {
    for (const entry of this.entries.values()) {
      this.parent.remove(entry.group);
      disposeTree(entry.group);
    }
    this.entries.clear();
  }
}

function createMarker(site) {
  const group = new THREE.Group();
  group.name = `spawn-site:${site.id}`;
  group.userData = {
    entityType: 'spawn-site',
    spawnSiteId: site.id,
    roomId: site.roomId,
    factionId: site.factionId,
    siteType: site.type,
    siteState: site.state
  };
  const color = factionColor(site.factionId, site.species?.[0]);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: site.state === 'active' ? 0.72 : 0.28, depthWrite: false });
  const ringCount = site.type === 'core' ? 2 : 1;
  for (let i = 0; i < ringCount; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25 + i * 0.12, 0.035, 6, 20), material.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 0.02;
    group.add(ring);
  }
  if (site.type === 'outpost' || site.type === 'field-camp') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.34, 6), material.clone());
    mast.position.y = 0.17;
    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 3), material.clone());
    pennant.rotation.z = Math.PI / 2;
    pennant.position.set(0.08, 0.28, 0);
    group.add(mast, pennant);
  }
  if (site.type === 'emergent') {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), material.clone());
    shard.position.y = 0.2;
    group.add(shard);
  }
  if (site.telegraphRemaining != null) {
    const warning = new THREE.Mesh(
      new THREE.RingGeometry(0.38, 0.48, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide })
    );
    warning.rotation.x = -Math.PI / 2;
    warning.position.y = 0.025;
    warning.name = 'spawn-telegraph';
    group.add(warning);
  }
  group.traverse(node => {
    node.userData ??= {};
    node.userData.entityType ??= 'spawn-site';
    node.userData.spawnSiteId ??= site.id;
    node.userData.roomId ??= site.roomId;
  });
  return group;
}

function factionColor(factionId, species) {
  const key = String(factionId ?? species ?? 'unknown');
  if (key.includes('goblin')) return 0xa2a84f;
  if (key.includes('copper') || key.includes('kobold')) return 0xd19a57;
  if (key.includes('orc') || key.includes('tusk')) return 0xb95f4f;
  if (key.includes('undead') || ['skeleton', 'zombie', 'wraith'].includes(species)) return 0x9f91c7;
  if (key.includes('bluecap') || species === 'myconid') return 0x6aa7a1;
  if (key.includes('red-wing') || ['spider', 'stirge'].includes(species)) return 0xb96576;
  if (key.includes('pale') || ['parasite', 'carrion'].includes(species)) return 0xc5b48d;
  if (species === 'slime') return 0x6eaa7d;
  if (species === 'rat') return 0x9a8875;
  return 0xb0a98e;
}

function disposeTree(root) {
  root.traverse(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}
