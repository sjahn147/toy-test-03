import { THREE } from './ThreeScene.js';
import { DungeonRendererPhase5 } from './DungeonRendererPhase5.js';
import { ADVANCED_LAIR_TYPES } from './AssetRegistryPhase6.js';

export class DungeonRendererPhase6 extends DungeonRendererPhase5 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.advancedPropMeshes = new Map();
    this.territoryMeshes = new Map();
    this.advancedTrapMeshes = new Map();
    this.attachmentMeshes = new Map();
    this.infectionMeshes = new Map();
    this.advancedSpawnMeshes = new Map();
  }

  renderState(snapshot) {
    const filtered = {
      ...snapshot,
      props: snapshot.props.filter(prop => !ADVANCED_LAIR_TYPES.has(prop.type))
    };
    super.renderState(filtered);
    const state = snapshot.advancedEcology ?? {};
    this.renderAdvancedProps(snapshot.props.filter(prop => ADVANCED_LAIR_TYPES.has(prop.type)), snapshot.rooms, snapshot.time);
    this.renderTerritories(state.territories ?? [], snapshot.rooms, snapshot.time);
    this.renderAdvancedTraps(state.traps ?? [], snapshot.rooms, snapshot.time);
    this.renderAttachments(state.attachments ?? [], snapshot.time);
    this.renderInfections(state.infections ?? [], snapshot.time);
    this.renderAdvancedSpawns(state.pendingSpawns ?? [], snapshot.props, snapshot.rooms, snapshot.time);
    this.animateAdvancedAgents(snapshot.agents, snapshot.time);
  }

  renderAdvancedProps(props, rooms, time) {
    const live = new Set(props.map(prop => prop.id));
    this.removeAdvancedMissing(this.advancedPropMeshes, live);
    for (const prop of props) {
      let mesh = this.advancedPropMeshes.get(prop.id);
      if (!mesh) {
        mesh = this.assets.makeProp(prop);
        if (!mesh) continue;
        mesh.userData.propId = prop.id;
        this.advancedPropMeshes.set(prop.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room), room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 1);
      this.animateAdvancedLair(mesh, time, prop.id.length);
    }
  }

  renderTerritories(territories, rooms, time) {
    const live = new Set(territories.map(territory => territory.roomId));
    this.removeAdvancedMissing(this.territoryMeshes, live);
    for (const territory of territories) {
      const room = rooms.find(candidate => candidate.id === territory.roomId);
      if (!room || !territory.ownerFaction) continue;
      const signature = `${territory.color}:${territory.contested}:${territory.contenders?.join('|')}`;
      let mesh = this.territoryMeshes.get(territory.roomId);
      if (!mesh || mesh.userData.signature !== signature) {
        if (mesh) this.group.remove(mesh);
        mesh = this.makeTerritoryMesh(territory);
        mesh.userData.signature = signature;
        this.territoryMeshes.set(territory.roomId, mesh);
        this.group.add(mesh);
      }
      mesh.position.set(room.x, this.roomY(room) + 0.025, room.z);
      mesh.scale.set(Math.max(1, room.w * 0.72), 1, Math.max(1, room.d * 0.72));
      const contested = mesh.getObjectByName('territory-contested');
      if (contested) contested.rotation.z = time * 0.42;
      const pulse = mesh.getObjectByName('territory-pulse');
      if (pulse) pulse.scale.setScalar(0.94 + Math.sin(time * 2.6 + room.id.length) * 0.05);
    }
  }

  makeTerritoryMesh(territory) {
    const group = new THREE.Group();
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: territory.color,
      transparent: true,
      opacity: territory.contested ? 0.08 : 0.055,
      depthWrite: false
    });
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: territory.color,
      transparent: true,
      opacity: territory.contested ? 0.5 : 0.28,
      depthWrite: false
    });
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.015, 32), fillMaterial);
    disk.name = 'territory-fill';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 5, 32), lineMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'territory-pulse';
    group.add(disk, ring);
    if (territory.contested) {
      const contested = new THREE.Group();
      contested.name = 'territory-contested';
      const contenderColors = [territory.color, 0xe7d7a0];
      for (let i = 0; i < 8; i += 1) {
        const arcMaterial = new THREE.MeshBasicMaterial({ color: contenderColors[i % 2], transparent: true, opacity: 0.55, depthWrite: false });
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.018, 5, 8, Math.PI / 5), arcMaterial);
        arc.rotation.x = Math.PI / 2;
        arc.rotation.z = i * Math.PI / 4;
        contested.add(arc);
      }
      group.add(contested);
    }
    return group;
  }

  renderAdvancedTraps(traps, rooms, time) {
    const live = new Set(traps.map(trap => trap.id));
    this.removeAdvancedMissing(this.advancedTrapMeshes, live);
    for (const trap of traps) {
      let mesh = this.advancedTrapMeshes.get(trap.id);
      if (!mesh) {
        mesh = this.assets.advancedLairs.createTrap();
        this.advancedTrapMeshes.set(trap.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === trap.roomId);
      if (!room) continue;
      const offset = deterministicOffset(trap.id, room);
      mesh.position.set(room.x + offset.x, this.roomY(room) + 0.08, room.z + offset.z);
      mesh.rotation.y = trap.id.length * 0.41;
      const pulse = 0.94 + Math.sin(time * 3.5 + trap.id.length) * 0.045;
      mesh.scale.setScalar(pulse);
    }
  }

  renderAttachments(attachments, time) {
    const live = new Set(attachments.map(attachment => attachment.id));
    this.removeAdvancedMissing(this.attachmentMeshes, live);
    for (const attachment of attachments) {
      let mesh = this.attachmentMeshes.get(attachment.id);
      if (!mesh) {
        mesh = this.assets.advancedCreatures.createAttachedStirge();
        this.attachmentMeshes.set(attachment.id, mesh);
        this.group.add(mesh);
      }
      const target = this.agentMeshes.get(attachment.targetId);
      if (!target) continue;
      mesh.position.copy(target.position);
      mesh.position.x += 0.28;
      mesh.position.y += 0.46 + Math.sin(time * 7 + attachment.id.length) * 0.035;
      mesh.position.z -= 0.15;
      mesh.rotation.y = target.rotation.y + 0.7;
    }
  }

  renderInfections(infections, time) {
    const live = new Set(infections.map(infection => infection.id));
    this.removeAdvancedMissing(this.infectionMeshes, live);
    for (const infection of infections) {
      let mesh = this.infectionMeshes.get(infection.id);
      if (!mesh) {
        mesh = this.assets.advancedLairs.createInfectionMarker();
        this.infectionMeshes.set(infection.id, mesh);
        this.group.add(mesh);
      }
      const target = this.agentMeshes.get(infection.targetId);
      if (!target) continue;
      mesh.position.copy(target.position);
      mesh.position.y += 0.06;
      mesh.rotation.y = time * 0.7;
      const progress = Math.min(1, infection.elapsed / Math.max(0.01, infection.duration));
      mesh.scale.setScalar(0.72 + progress * 0.38 + Math.sin(time * 5 + infection.id.length) * 0.035);
    }
  }

  renderAdvancedSpawns(spawns, props, rooms, time) {
    const live = new Set(spawns.map(spawn => spawn.id));
    this.removeAdvancedMissing(this.advancedSpawnMeshes, live);
    for (const spawn of spawns) {
      let mesh = this.advancedSpawnMeshes.get(spawn.id);
      if (!mesh) {
        mesh = this.assets.advancedLairs.createSpawnOmen(spawn);
        this.advancedSpawnMeshes.set(spawn.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === spawn.roomId);
      if (!room) continue;
      const lair = props.find(prop => prop.species === spawn.species && prop.roomId === spawn.roomId && ADVANCED_LAIR_TYPES.has(prop.type));
      const placement = lair?.placement ?? {};
      mesh.position.set(
        room.x + (placement.ox ?? 0) * 0.52,
        this.roomY(room) + 0.08,
        room.z + (placement.oz ?? 0) * 0.52
      );
      const progress = Math.min(1, spawn.progress / Math.max(0.01, spawn.duration));
      const pulse = 0.5 + progress * 0.55 + Math.sin(time * 5.5 + spawn.id.length) * 0.04;
      mesh.scale.setScalar(pulse);
      mesh.rotation.y = time * 0.22;
    }
  }

  animateAdvancedAgents(agents, time) {
    for (const agent of agents) {
      const mesh = this.agentMeshes.get(agent.id);
      if (!mesh || !mesh.visible) continue;
      mesh.traverse(child => {
        if (child.name === 'advanced-wing') {
          if (child.userData.baseRotationZ === undefined) child.userData.baseRotationZ = child.rotation.z;
          child.rotation.z = child.userData.baseRotationZ + Math.sin(time * 14 + child.id) * 0.18;
        }
        if (child.name === 'advanced-spore') {
          if (child.userData.baseY === undefined) child.userData.baseY = child.position.y;
          child.position.y = child.userData.baseY + Math.sin(time * 3.2 + child.id) * 0.06;
        }
        if (child.name === 'advanced-aura') {
          child.rotation.z = time * 0.35 + child.id * 0.1;
        }
      });
    }
  }

  animateAdvancedLair(mesh, time, seed) {
    mesh.traverse(child => {
      if (child.userData.baseY === undefined) child.userData.baseY = child.position.y;
      if (child.userData.baseScaleY === undefined) child.userData.baseScaleY = child.scale.y;
      if (child.name === 'advanced-flame') {
        const pulse = 0.88 + Math.sin(time * 8 + child.id) * 0.14;
        child.scale.set(pulse, child.userData.baseScaleY * (0.9 + Math.sin(time * 10 + child.id) * 0.18), pulse);
      }
      if (child.name === 'advanced-spore' || child.name === 'advanced-larva') {
        child.position.y = child.userData.baseY + Math.sin(time * 3.6 + child.id) * 0.045;
        child.rotation.y = time * 0.35 + child.id * 0.1;
      }
      if (child.name === 'advanced-sac' || child.name === 'advanced-spore-cap') {
        const pulse = 0.96 + Math.sin(time * 2.4 + child.id) * 0.045;
        child.scale.y = child.userData.baseScaleY * pulse;
      }
      if (child.name === 'advanced-fluid') {
        child.scale.y = child.userData.baseScaleY * (1 + Math.sin(time * 2.5 + seed) * 0.025);
      }
      if (child.name === 'advanced-gear') child.rotation.z = time * 0.5 + child.id;
      if (child.name === 'advanced-veil') child.material.opacity = 0.48 + Math.sin(time * 2.2 + seed) * 0.1;
    });
  }

  removeAdvancedMissing(map, live) {
    for (const [id, mesh] of map) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      map.delete(id);
    }
  }

  destroy() {
    this.advancedPropMeshes.clear();
    this.territoryMeshes.clear();
    this.advancedTrapMeshes.clear();
    this.attachmentMeshes.clear();
    this.infectionMeshes.clear();
    this.advancedSpawnMeshes.clear();
    super.destroy();
  }
}

function deterministicOffset(id, room) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const angle = (hash % 628) / 100;
  return {
    x: Math.cos(angle) * Math.min(1.1, room.w * 0.18),
    z: Math.sin(angle) * Math.min(1.1, room.d * 0.18)
  };
}
