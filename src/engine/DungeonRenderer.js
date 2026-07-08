import { THREE } from './ThreeScene.js';

const ROOM_COLORS = {
  start: 0x4f6d7a,
  hall: 0x6b5b48,
  treasure: 0x8a6a2b,
  crypt: 0x595b6d,
  trap: 0x6e3f3d,
  lair: 0x4c5a38
};

const ROLE_COLORS = {
  fighter: 0xd65f4c,
  rogue: 0xe8c46a,
  cleric: 0xd7e9ff,
  wizard: 0x9b87ff,
  goblin: 0x8ed06f,
  skeleton: 0xd8d5c4,
  slime: 0x79d1b0,
  mimic: 0xa66b3f
};

export class DungeonRenderer {
  constructor(three, scenario) {
    this.three = three;
    this.scenario = scenario;
    this.roomMeshes = new Map();
    this.agentMeshes = new Map();
    this.propMeshes = new Map();
    this.group = new THREE.Group();
    three.scene.add(this.group);
    this.buildRooms();
    this.buildLinks();
  }

  buildRooms() {
    for (const room of this.scenario.rooms) {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(room.w, 0.35, room.d),
        new THREE.MeshStandardMaterial({
          color: ROOM_COLORS[room.kind] ?? 0x555555,
          roughness: 0.82,
          metalness: 0.02
        })
      );
      floor.position.set(room.x, 0, room.z);
      floor.userData.roomId = room.id;
      this.group.add(floor);
      this.roomMeshes.set(room.id, floor);

      const wallMat = new THREE.MeshStandardMaterial({ color: 0x252435, roughness: 0.88 });
      const north = wall(room.w, 0.45); north.position.set(room.x, 0.5, room.z - room.d / 2);
      const south = wall(room.w, 0.45); south.position.set(room.x, 0.5, room.z + room.d / 2);
      const west = wall(0.45, room.d); west.position.set(room.x - room.w / 2, 0.5, room.z);
      const east = wall(0.45, room.d); east.position.set(room.x + room.w / 2, 0.5, room.z);
      for (const m of [north, south, west, east]) {
        m.material = wallMat;
        this.group.add(m);
      }
    }
  }

  buildLinks() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3342, roughness: 0.9 });
    for (const [aId, bId] of this.scenario.links) {
      const a = this.scenario.rooms.find(r => r.id === aId);
      const b = this.scenario.rooms.find(r => r.id === bId);
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const dx = Math.abs(a.x - b.x);
      const dz = Math.abs(a.z - b.z);
      const corridor = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.2, dx), 0.22, Math.max(1.2, dz)), mat);
      corridor.position.set(midX, 0.04, midZ);
      this.group.add(corridor);
    }
  }

  renderState(snapshot) {
    this.renderProps(snapshot.props, snapshot.rooms);
    this.renderAgents(snapshot.agents, snapshot.rooms);
  }

  renderProps(props, rooms) {
    const live = new Set(props.map(p => p.id));
    for (const [id, mesh] of this.propMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.propMeshes.delete(id);
      }
    }

    for (const prop of props) {
      let mesh = this.propMeshes.get(prop.id);
      if (!mesh) {
        mesh = makeProp(prop);
        this.propMeshes.set(prop.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(r => r.id === prop.roomId);
      const offset = prop.type === 'trap' ? [-room.w * 0.22, -room.d * 0.18] : [room.w * 0.22, room.d * 0.18];
      mesh.position.set(room.x + offset[0], prop.type === 'trap' ? 0.25 : 0.8, room.z + offset[1]);
      mesh.visible = prop.type !== 'treasure' || !prop.opened;
    }
  }

  renderAgents(agents, rooms) {
    const live = new Set(agents.map(a => a.id));
    for (const [id, mesh] of this.agentMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.agentMeshes.delete(id);
      }
    }

    const roomCounts = new Map();
    for (const agent of agents) {
      if (!agent.alive || agent.hidden) continue;
      const idx = roomCounts.get(agent.roomId) ?? 0;
      roomCounts.set(agent.roomId, idx + 1);

      let mesh = this.agentMeshes.get(agent.id);
      if (!mesh) {
        mesh = makeAgent(agent);
        this.agentMeshes.set(agent.id, mesh);
        this.group.add(mesh);
      }

      const room = rooms.find(r => r.id === agent.roomId);
      const slot = idx % 6;
      const ox = ((slot % 3) - 1) * 0.85;
      const oz = (Math.floor(slot / 3) - 0.5) * 0.85;
      mesh.position.lerp(new THREE.Vector3(room.x + ox, 0.9, room.z + oz), 0.18);
      mesh.rotation.y += 0.04;
      mesh.visible = true;
      const hpScale = Math.max(0.15, agent.hp / agent.maxHp);
      mesh.children.find(c => c.name === 'hp').scale.x = hpScale;
    }

    for (const agent of agents) {
      if (agent.alive && !agent.hidden) continue;
      const mesh = this.agentMeshes.get(agent.id);
      if (mesh) mesh.visible = false;
    }
  }

  destroy() {
    this.three.scene.remove(this.group);
  }
}

function wall(w, d) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d));
}

function makeAgent(agent) {
  const group = new THREE.Group();
  const color = ROLE_COLORS[agent.role] ?? 0xffffff;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.72, 4, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.62 })
  );
  body.position.y = 0.15;
  group.add(body);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 6, 20),
    new THREE.MeshBasicMaterial({ color: agent.faction === 'party' ? 0x88c7ff : 0xff8e73 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.46;
  group.add(ring);

  const hpBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0x330b0b }));
  hpBack.position.set(0, 1.12, 0);
  group.add(hpBack);

  const hp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.05), new THREE.MeshBasicMaterial({ color: 0x9ee0a3 }));
  hp.name = 'hp';
  hp.position.set(0, 1.12, 0.01);
  group.add(hp);

  return group;
}

function makeProp(prop) {
  if (prop.type === 'trap') {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.16, 5),
      new THREE.MeshStandardMaterial({ color: 0xbd3d38, roughness: 0.7 })
    );
  }

  const group = new THREE.Group();
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.65, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x8a542c, roughness: 0.75 })
  );
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.18, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xe8c46a, roughness: 0.45 })
  );
  lid.position.y = 0.42;
  group.add(chest, lid);
  return group;
}
