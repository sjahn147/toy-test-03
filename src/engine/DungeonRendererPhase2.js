import { DungeonRenderer } from './DungeonRenderer.js';
import { isFacilityType } from './AssetRegistryPhase2.js';

export class DungeonRendererPhase2 extends DungeonRenderer {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.facilityMeshes = new Map();
  }

  renderState(snapshot) {
    this.renderProps(snapshot.props.filter(prop => !isFacilityType(prop.type)), snapshot.rooms);
    this.renderFacilities(snapshot.props.filter(prop => isFacilityType(prop.type)), snapshot.rooms, snapshot.time);
    this.renderAgents(snapshot.agents, snapshot.rooms, snapshot.time);
    this.renderEffects(snapshot.effects ?? [], snapshot.rooms, snapshot.time);
  }

  renderFacilities(props, rooms, time) {
    const live = new Set(props.map(prop => prop.id));
    for (const [id, mesh] of this.facilityMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.facilityMeshes.delete(id);
      }
    }

    for (const prop of props) {
      let mesh = this.facilityMeshes.get(prop.id);
      if (!mesh) {
        mesh = this.assets.makeProp(prop);
        if (!mesh) continue;
        mesh.userData.propId = prop.id;
        this.facilityMeshes.set(prop.id, mesh);
        this.group.add(mesh);
      }

      const room = rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      mesh.position.set(
        room.x + (placement.ox ?? 0),
        this.roomY(room),
        room.z + (placement.oz ?? 0)
      );
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 1);
      this.animateFacility(mesh, prop, time);
    }
  }

  animateFacility(mesh, prop, time) {
    mesh.traverse(child => {
      if (child.name === 'facility-flame') {
        const pulse = 0.9 + Math.sin(time * 7 + child.id) * 0.12;
        child.scale.set(pulse, 0.9 + Math.sin(time * 9 + child.id) * 0.18, pulse);
      }
      if (child.name === 'facility-water') {
        child.position.y += Math.sin(time * 3.2 + child.id) * 0.0007;
      }
      if (child.name === 'facility-glow') {
        const pulse = 0.94 + Math.sin(time * 4.5 + child.id) * 0.07;
        child.scale.setScalar(pulse);
      }
    });

    if (prop.type === 'goddess_statue') {
      const charge = prop.maxResurrectionCharges
        ? (prop.resurrectionCharges ?? prop.maxResurrectionCharges) / prop.maxResurrectionCharges
        : 1;
      mesh.traverse(child => {
        if (child.name === 'facility-divine-light') child.visible = charge > 0;
      });
    }
  }

  destroy() {
    this.facilityMeshes.clear();
    super.destroy();
  }
}
