import { THREE } from '../ThreeScene.js';

const FLOOR_HEIGHT = 2.85;
const geometryCache = new Map();
const materialCache = new Map();

export class HeroWorldActorRenderer {
  constructor(group, agentMeshes = new Map()) {
    this.group = group;
    this.agentMeshes = agentMeshes;
    this.deployables = new Map();
    this.projectiles = new Map();
    this.fields = new Map();
    this.tethers = new Map();
  }

  render({ deployables = [], projectiles = [], fields = [], tethers = [] } = {}, rooms = [], time = 0) {
    const roomById = new Map(rooms.map(room => [room.id, room]));
    this.renderDeployables(deployables, roomById, time);
    this.renderProjectiles(projectiles, roomById, time);
    this.renderFields(fields, roomById, time);
    this.renderTethers(tethers, roomById, time);
  }

  renderDeployables(records, roomById, time) {
    syncMap(this.deployables, records, this.group, record => buildDeployable(record), (mesh, record) => {
      const room = roomById.get(record.roomId);
      if (!room) { mesh.visible = false; return; }
      mesh.visible = true;
      mesh.position.set((room.x ?? 0) + (record.ox ?? 0), roomY(room) + (record.y ?? 0), (room.z ?? 0) + (record.oz ?? 0));
      mesh.userData.state = record.state;
      animateDeployable(mesh, record, time);
    });
  }

  renderProjectiles(records, roomById, time) {
    syncMap(this.projectiles, records, this.group, record => buildProjectile(record), (mesh, record) => {
      const room = roomById.get(record.roomId);
      if (!room || record.state === 'queued') { mesh.visible = false; return; }
      mesh.visible = true;
      const t = clamp(record.progress ?? 0, 0, 1);
      const from = record.from ?? { x: 0, y: 1, z: 0 };
      const to = record.to ?? { x: 0, y: 0, z: 0 };
      const arc = Math.sin(t * Math.PI) * (record.arcHeight ?? 3);
      mesh.position.set((room.x ?? 0) + mix(from.x, to.x, t), roomY(room) + mix(from.y, to.y, t) + arc, (room.z ?? 0) + mix(from.z, to.z, t));
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.rotation.x = -0.55 + t * 1.1;
      mesh.rotation.z = time * 8;
    });
  }

  renderFields(records, roomById, time) {
    syncMap(this.fields, records, this.group, record => buildField(record), (mesh, record) => {
      const room = roomById.get(record.roomId);
      if (!room) { mesh.visible = false; return; }
      mesh.visible = true;
      mesh.position.set(room.x ?? 0, roomY(room) + 0.035, room.z ?? 0);
      mesh.scale.setScalar(Math.max(0.1, record.radius ?? 4) / Math.max(0.1, mesh.userData.baseRadius ?? 1));
      animateField(mesh, record, time);
    });
  }

  renderTethers(records, roomById, time) {
    syncMap(this.tethers, records, this.group, record => buildTether(record), (mesh, record) => {
      const room = roomById.get(record.roomId);
      const sourceMesh = this.agentMeshes.get(record.sourceAgentId);
      if (!room || !sourceMesh) { mesh.visible = false; return; }
      mesh.visible = true;
      const start = sourceMesh.position;
      const targetMesh = record.targetType === 'agent' ? this.agentMeshes.get(record.targetId) : null;
      const end = targetMesh?.position ?? new THREE.Vector3(
        (room.x ?? 0) + (record.targetX ?? 0),
        roomY(room) + 0.18,
        (room.z ?? 0) + (record.targetZ ?? 0)
      );
      updateTetherGeometry(mesh, start, end, time);
    });
  }

  destroy() {
    for (const map of [this.deployables, this.projectiles, this.fields, this.tethers]) {
      for (const mesh of map.values()) this.group?.remove(mesh);
      map.clear();
    }
  }
}

function buildDeployable(record) {
  const group = new THREE.Group();
  group.name = `hero-world-deployable:${record.kind}:${record.id}`;
  group.userData.heroWorldActor = true;
  if (record.kind === 'breach-charge') buildBreachCharge(group);
  else if (record.kind === 'pressure-seal') buildPressureSeal(group);
  else if (record.kind === 'healing-cauldron' || record.kind === 'war-cauldron') buildCauldron(group, record);
  else buildGenericDeployable(group);
  return group;
}

function buildBreachCharge(group) {
  const dark = mat('deploy:dark', 0x24211e, { roughness: 0.78 });
  const brass = mat('deploy:brass', 0xc48635, { metalness: 0.35, roughness: 0.4 });
  const ember = mat('deploy:ember', 0xff8c3e, { emissive: 0xff5a22, emissiveIntensity: 0.7 });
  const body = new THREE.Mesh(geo('deploy:charge-body', () => new THREE.CylinderGeometry(0.18, 0.2, 0.55, 10)), dark);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.22;
  group.add(body);
  for (const x of [-0.18, 0.18]) {
    const band = new THREE.Mesh(geo('deploy:charge-band', () => new THREE.TorusGeometry(0.2, 0.025, 6, 16)), brass);
    band.rotation.y = Math.PI / 2;
    band.position.set(x, 0.22, 0);
    group.add(band);
  }
  const fuse = new THREE.Mesh(geo('deploy:fuse', () => new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6)), dark);
  fuse.position.set(0.2, 0.48, 0);
  fuse.rotation.z = -0.5;
  fuse.name = 'fuse';
  const spark = new THREE.Mesh(geo('deploy:spark', () => new THREE.SphereGeometry(0.055, 8, 6)), ember);
  spark.position.y = 0.22;
  spark.name = 'spark';
  fuse.add(spark);
  group.add(fuse);
}

function buildPressureSeal(group) {
  const metal = mat('seal:metal', 0x677476, { metalness: 0.32, roughness: 0.44 });
  const brass = mat('seal:brass', 0xa9783d, { metalness: 0.35, roughness: 0.38 });
  const water = mat('seal:water', 0x7fd7e6, { transparent: true, opacity: 0.68, emissive: 0x2e7580, emissiveIntensity: 0.35 });
  const plate = new THREE.Mesh(geo('seal:plate', () => new THREE.BoxGeometry(1.1, 0.9, 0.16)), metal);
  plate.position.y = 0.48;
  group.add(plate);
  const wheel = new THREE.Mesh(geo('seal:wheel', () => new THREE.TorusGeometry(0.3, 0.045, 8, 24)), brass);
  wheel.position.set(0, 0.5, 0.12);
  wheel.name = 'wheel';
  group.add(wheel);
  for (let i = 0; i < 4; i += 1) {
    const spoke = new THREE.Mesh(geo('seal:spoke', () => new THREE.BoxGeometry(0.52, 0.035, 0.035)), brass);
    spoke.position.set(0, 0.5, 0.13);
    spoke.rotation.z = i * Math.PI / 4;
    group.add(spoke);
  }
  const ring = new THREE.Mesh(geo('seal:water-ring', () => new THREE.TorusGeometry(0.48, 0.025, 6, 28)), water);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  ring.name = 'water-ring';
  group.add(ring);
}

function buildCauldron(group, record) {
  const iron = mat('cauldron:iron', 0x292b29, { metalness: 0.22, roughness: 0.56 });
  const broth = mat('cauldron:broth', 0x8e3e30, { transparent: true, opacity: 0.78, emissive: 0x5d211b, emissiveIntensity: 0.3 });
  const ember = mat('cauldron:ember', 0xff7045, { emissive: 0xff3f20, emissiveIntensity: 0.85 });
  const pot = new THREE.Mesh(geo('cauldron:pot', () => new THREE.SphereGeometry(0.48, 14, 10, 0, Math.PI * 2, 0.35, Math.PI * 0.65)), iron);
  pot.scale.y = 0.72;
  pot.position.y = 0.43;
  group.add(pot);
  const rim = new THREE.Mesh(geo('cauldron:rim', () => new THREE.TorusGeometry(0.42, 0.055, 8, 28)), iron);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.66;
  group.add(rim);
  const liquid = new THREE.Mesh(geo('cauldron:liquid', () => new THREE.CylinderGeometry(0.37, 0.37, 0.025, 24)), broth);
  liquid.position.y = 0.65;
  liquid.name = 'liquid';
  group.add(liquid);
  for (const x of [-0.22, 0, 0.22]) {
    const coal = new THREE.Mesh(geo('cauldron:coal', () => new THREE.DodecahedronGeometry(0.09, 0)), ember);
    coal.position.set(x, 0.08, x === 0 ? 0.06 : -0.04);
    coal.name = 'ember';
    group.add(coal);
  }
  const steamRoot = new THREE.Group();
  steamRoot.name = 'steam-root';
  for (let i = 0; i < 4; i += 1) {
    const puff = new THREE.Mesh(geo('cauldron:steam', () => new THREE.SphereGeometry(0.1, 8, 6)), mat('cauldron:steam-mat', 0xd8d5cc, { transparent: true, opacity: 0.32 }));
    puff.position.set((i % 2 ? 1 : -1) * 0.12, 0.78 + i * 0.15, (i % 3 - 1) * 0.06);
    steamRoot.add(puff);
  }
  group.add(steamRoot);
  group.userData.warFeast = record.kind === 'war-cauldron';
}

function buildGenericDeployable(group) {
  const mesh = new THREE.Mesh(geo('deploy:generic', () => new THREE.BoxGeometry(0.6, 0.5, 0.6)), mat('deploy:generic-mat', 0x8c744e));
  mesh.position.y = 0.25;
  group.add(mesh);
}

function buildProjectile(record) {
  const group = new THREE.Group();
  group.name = `hero-world-projectile:${record.id}`;
  const shell = new THREE.Mesh(geo('projectile:shell', () => new THREE.CapsuleGeometry(0.08, 0.25, 4, 8)), mat('projectile:shell-mat', 0x4c4b46, { metalness: 0.25, roughness: 0.45 }));
  shell.rotation.x = Math.PI / 2;
  group.add(shell);
  const fuse = new THREE.Mesh(geo('projectile:fuse-glow', () => new THREE.SphereGeometry(0.055, 8, 6)), mat('projectile:fuse-mat', 0xff7a39, { emissive: 0xff4a1c, emissiveIntensity: 0.9 }));
  fuse.position.z = -0.22;
  group.add(fuse);
  for (let i = 0; i < 3; i += 1) {
    const smoke = new THREE.Mesh(geo('projectile:smoke', () => new THREE.SphereGeometry(0.07, 7, 5)), mat('projectile:smoke-mat', 0x4a4541, { transparent: true, opacity: 0.35 }));
    smoke.position.z = -0.3 - i * 0.13;
    smoke.scale.setScalar(1 + i * 0.25);
    group.add(smoke);
  }
  return group;
}

function buildField(record) {
  const group = new THREE.Group();
  group.name = `hero-world-field:${record.kind}:${record.id}`;
  group.userData.baseRadius = record.radius ?? 4;
  const color = fieldColor(record.kind);
  const material = mat(`field:${record.kind}`, color, { transparent: true, opacity: 0.46, depthWrite: false, emissive: color, emissiveIntensity: 0.14 });
  const radius = group.userData.baseRadius;
  const ring = new THREE.Mesh(geo(`field:ring:${record.kind}`, () => new THREE.TorusGeometry(radius, 0.06, 8, 48)), material);
  ring.rotation.x = Math.PI / 2;
  ring.name = 'field-ring';
  group.add(ring);
  if (record.kind === 'emergency-drain') {
    for (let i = 0; i < 3; i += 1) {
      const spiral = new THREE.Mesh(geo(`field:drain:${i}`, () => new THREE.TorusGeometry(radius * (0.25 + i * 0.22), 0.03, 6, 36, Math.PI * 1.65)), material);
      spiral.rotation.x = Math.PI / 2;
      spiral.rotation.z = i * 0.7;
      spiral.userData.baseRotationZ = spiral.rotation.z;
      spiral.name = `drain-${i}`;
      group.add(spiral);
    }
  } else if (record.kind === 'war-feast') {
    for (let i = 0; i < 8; i += 1) {
      const marker = new THREE.Mesh(geo('field:feast-marker', () => new THREE.ConeGeometry(0.12, 0.4, 5)), material);
      const angle = i / 8 * Math.PI * 2;
      marker.position.set(Math.cos(angle) * radius * 0.78, 0.12, Math.sin(angle) * radius * 0.78);
      marker.rotation.z = -angle;
      group.add(marker);
    }
  } else if (record.kind === 'healing-cauldron') {
    const inner = new THREE.Mesh(geo('field:broth-inner', () => new THREE.TorusGeometry(radius * 0.55, 0.035, 7, 40)), material);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);
  }
  return group;
}

function buildTether(record) {
  const group = new THREE.Group();
  group.name = `hero-world-tether:${record.id}`;
  const material = mat('tether:chain', 0x6b5a48, { metalness: 0.2, roughness: 0.58 });
  const links = [];
  for (let i = 0; i < 12; i += 1) {
    const link = new THREE.Mesh(geo('tether:link', () => new THREE.TorusGeometry(0.07, 0.018, 5, 10)), material);
    link.rotation.x = i % 2 ? Math.PI / 2 : 0;
    link.userData.baseRotationX = link.rotation.x;
    group.add(link);
    links.push(link);
  }
  group.userData.links = links;
  return group;
}

function animateDeployable(mesh, record, time) {
  if (record.kind === 'breach-charge') {
    const spark = mesh.getObjectByName('spark');
    if (spark) spark.scale.setScalar(record.state === 'arming' ? 0.5 : 0.8 + Math.sin(time * 14) * 0.35);
    const fuse = mesh.getObjectByName('fuse');
    if (fuse) fuse.rotation.y = time * 0.7;
  }
  if (record.kind === 'pressure-seal') {
    const wheel = mesh.getObjectByName('wheel');
    if (wheel) wheel.rotation.z = time * 0.65;
    const ring = mesh.getObjectByName('water-ring');
    if (ring) ring.scale.setScalar(0.92 + Math.sin(time * 3) * 0.08);
  }
  if (record.kind.includes('cauldron')) {
    const liquid = mesh.getObjectByName('liquid');
    if (liquid) liquid.scale.set(1 + Math.sin(time * 2.4) * 0.03, 1, 1 + Math.cos(time * 2.2) * 0.03);
    const steam = mesh.getObjectByName('steam-root');
    if (steam) {
      steam.position.y = (time * 0.18) % 0.3;
      steam.rotation.y = time * 0.25;
    }
    for (const child of mesh.children.filter(item => item.name === 'ember')) child.scale.setScalar(0.8 + Math.sin(time * 8 + child.position.x * 10) * 0.25);
  }
}

function animateField(mesh, record, time) {
  mesh.rotation.y = time * (record.kind === 'emergency-drain' ? -0.45 : 0.18);
  const ring = mesh.getObjectByName('field-ring');
  if (ring) ring.material.opacity = 0.34 + Math.sin(time * 3) * 0.12;
  for (const child of mesh.children) {
    if (!child.name?.startsWith('drain-')) continue;
    child.rotation.z = (child.userData.baseRotationZ ?? 0) + time * 0.08 * (1 + Number(child.name.at(-1)));
  }
}

function updateTetherGeometry(mesh, start, end, time) {
  const links = mesh.userData.links ?? [];
  const count = Math.max(1, links.length - 1);
  for (let index = 0; index < links.length; index += 1) {
    const t = index / count;
    const sag = Math.sin(t * Math.PI) * -0.22;
    const link = links[index];
    link.position.set(mix(start.x, end.x, t) - mesh.position.x, mix(start.y, end.y, t) + sag - mesh.position.y, mix(start.z, end.z, t) - mesh.position.z);
    link.rotation.x = link.userData.baseRotationX ?? 0;
    link.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    link.rotation.z = Math.sin(time * 3.2 + index * 0.7) * 0.12;
  }
}

function syncMap(map, records, group, create, update) {
  const live = new Set(records.map(record => record.id));
  for (const [id, mesh] of map) {
    if (live.has(id)) continue;
    group?.remove(mesh);
    map.delete(id);
  }
  for (const record of records) {
    let mesh = map.get(record.id);
    if (!mesh) {
      mesh = create(record);
      map.set(record.id, mesh);
      group?.add(mesh);
    }
    update(mesh, record);
  }
}

function roomY(room) {
  return (room.floor ?? 0) * FLOOR_HEIGHT;
}

function fieldColor(kind) {
  if (kind === 'emergency-drain' || kind === 'pressure-seal') return 0x75d4e5;
  if (kind === 'war-feast') return 0xd84f36;
  if (kind === 'healing-cauldron') return 0xe39a56;
  return 0xe0c06b;
}

function geo(key, builder) {
  if (!geometryCache.has(key)) geometryCache.set(key, builder());
  return geometryCache.get(key);
}

function mat(key, color, options = {}) {
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.7,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  }));
  return materialCache.get(key);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function mix(a, b, t) { return a + (b - a) * t; }
