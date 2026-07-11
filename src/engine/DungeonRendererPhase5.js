import { DungeonRendererPhase4 } from './DungeonRendererPhase4.js';
import { ECOLOGY_PROP_TYPES } from './AssetRegistryPhase5.js';

export class DungeonRendererPhase5 extends DungeonRendererPhase4 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.ecologyPropMeshes = new Map();
    this.corpseMeshes = new Map();
    this.hostMeshes = new Map();
    this.spawnMeshes = new Map();
  }

  renderState(snapshot) {
    const filtered = {
      ...snapshot,
      props: snapshot.props.filter(prop => !ECOLOGY_PROP_TYPES.has(prop.type))
    };
    super.renderState(filtered);
    this.renderEcologyProps(snapshot.props.filter(prop => ECOLOGY_PROP_TYPES.has(prop.type)), snapshot.rooms, snapshot.time);
    this.renderCorpses(snapshot.ecology?.corpses ?? [], snapshot.rooms, snapshot.time);
    this.renderHosts(snapshot.ecology?.hosts ?? [], snapshot.rooms, snapshot.time);
    this.renderPendingSpawns(snapshot.ecology?.pendingSpawns ?? [], snapshot.props, snapshot.rooms, snapshot.time);
  }

  renderEcologyProps(props, rooms, time) {
    const live = new Set(props.map(prop => prop.id));
    this.removeMissing(this.ecologyPropMeshes, live);
    for (const prop of props) {
      let mesh = this.ecologyPropMeshes.get(prop.id);
      if (!mesh) {
        mesh = this.assets.makeProp(prop);
        if (!mesh) continue;
        mesh.userData.propId = prop.id;
        this.ecologyPropMeshes.set(prop.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room), room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 1);
      this.animateEcologyMesh(mesh, time, prop.id.length);
    }
  }

  renderCorpses(corpses, rooms, time) {
    const live = new Set(corpses.map(corpse => corpse.id));
    this.removeMissing(this.corpseMeshes, live);
    for (const corpse of corpses) {
      let mesh = this.corpseMeshes.get(corpse.id);
      if (!mesh) {
        mesh = this.assets.ecology.createCorpse(corpse);
        this.corpseMeshes.set(corpse.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === corpse.roomId);
      if (!room) continue;
      mesh.position.set(corpse.x ?? room.x, this.roomY(room) + 0.025, corpse.z ?? room.z);
      mesh.rotation.y = corpse.id.length * 0.37;
      const decay = Math.max(0.55, 1 - corpse.age / 260);
      mesh.scale.setScalar(decay);
    }
  }

  renderHosts(hosts, rooms, time) {
    const live = new Set(hosts.map(host => host.id));
    this.removeMissing(this.hostMeshes, live);
    for (const host of hosts) {
      let mesh = this.hostMeshes.get(host.id);
      if (!mesh) {
        mesh = this.assets.ecology.createHost(host);
        this.hostMeshes.set(host.id, mesh);
        this.group.add(mesh);
      }
      const carrier = host.carrierId ? this.agentMeshes.get(host.carrierId) : null;
      if (carrier) {
        mesh.position.copy(carrier.position);
        mesh.position.x -= 0.42;
        mesh.position.y += 0.3;
        mesh.rotation.y = carrier.rotation.y + Math.PI / 2;
      } else {
        const room = rooms.find(candidate => candidate.id === host.roomId);
        if (!room) continue;
        mesh.position.set(host.x ?? room.x + 0.55, this.roomY(room) + 0.34, host.z ?? room.z + 0.55);
        mesh.rotation.y = -0.45;
      }
      const pulse = 0.96 + Math.sin(time * 2.8 + host.id.length) * 0.035;
      mesh.scale.setScalar(pulse);
    }
  }

  renderPendingSpawns(spawns, props, rooms, time) {
    const live = new Set(spawns.map(spawn => spawn.id));
    this.removeMissing(this.spawnMeshes, live);
    for (const spawn of spawns) {
      let mesh = this.spawnMeshes.get(spawn.id);
      if (!mesh) {
        mesh = this.assets.ecology.createSpawnOmen(spawn);
        mesh.userData.baseScale = 0.55;
        this.spawnMeshes.set(spawn.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === spawn.roomId);
      if (!room) continue;
      const lair = props.find(prop => prop.species === spawn.species && prop.roomId === spawn.roomId);
      const placement = lair?.placement ?? {};
      mesh.position.set(
        room.x + (placement.ox ?? 0) * 0.65,
        this.roomY(room) + 0.08,
        room.z + (placement.oz ?? 0) * 0.65
      );
      const progress = Math.min(1, spawn.progress / Math.max(0.01, spawn.duration));
      const pulse = 0.54 + progress * 0.48 + Math.sin(time * 5 + spawn.id.length) * 0.04;
      mesh.scale.setScalar(pulse);
      mesh.rotation.y = time * 0.18;
    }
  }

  animateEcologyMesh(mesh, time, seed) {
    mesh.traverse(child => {
      if (child.userData.baseY === undefined) child.userData.baseY = child.position.y;
      if (child.name === 'ecology-flame') {
        const pulse = 0.88 + Math.sin(time * 8 + child.id) * 0.14;
        child.scale.set(pulse, 0.9 + Math.sin(time * 10 + child.id) * 0.18, pulse);
      }
      if (child.name === 'ecology-bubble') {
        child.position.y = child.userData.baseY + Math.sin(time * 3.8 + child.id) * 0.045;
        child.scale.setScalar(0.92 + Math.sin(time * 4.6 + child.id) * 0.1);
      }
      if (child.name === 'ecology-egg') {
        child.scale.y = 1.35 + Math.sin(time * 2.1 + child.id) * 0.06;
      }
      if (child.name === 'ecology-fluid') {
        child.scale.y = 1 + Math.sin(time * 2.4 + seed) * 0.025;
      }
    });
  }

  removeMissing(map, live) {
    for (const [id, mesh] of map) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      map.delete(id);
    }
  }

  destroy() {
    this.ecologyPropMeshes.clear();
    this.corpseMeshes.clear();
    this.hostMeshes.clear();
    this.spawnMeshes.clear();
    super.destroy();
  }
}
