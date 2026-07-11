import { DungeonRendererPhase6 } from './DungeonRendererPhase6.js';
import { TERRITORY_PROP_TYPES } from './AssetRegistryPhase7.js';

export class DungeonRendererPhase7 extends DungeonRendererPhase6 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.territoryPropMeshes = new Map();
    this.controlMeshes = new Map();
  }

  renderState(snapshot) {
    const filtered = { ...snapshot, props: snapshot.props.filter(prop => !TERRITORY_PROP_TYPES.has(prop.type)) };
    super.renderState(filtered);
    this.renderTerritoryProps(snapshot.props.filter(prop => TERRITORY_PROP_TYPES.has(prop.type)), snapshot.rooms, snapshot.time);
    this.renderControl(snapshot.territory?.rooms ?? [], snapshot.rooms, snapshot.time);
  }

  renderTerritoryProps(props, rooms, time) {
    const live = new Set(props.map(prop => prop.id));
    for (const [id, mesh] of this.territoryPropMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      this.territoryPropMeshes.delete(id);
    }
    for (const prop of props) {
      let mesh = this.territoryPropMeshes.get(prop.id);
      if (!mesh) {
        mesh = this.assets.makeProp(prop);
        if (!mesh) continue;
        this.territoryPropMeshes.set(prop.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room), room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 1);
      const glow = mesh.getObjectByName('resource-glow');
      if (glow) glow.rotation.z = time * 0.28;
    }
  }

  renderControl(states, rooms, time) {
    const owned = states.filter(state => state.owner);
    const live = new Set(owned.map(state => state.roomId));
    for (const [id, mesh] of this.controlMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      this.controlMeshes.delete(id);
    }
    for (const state of owned) {
      let mesh = this.controlMeshes.get(state.roomId);
      if (!mesh || mesh.userData.owner !== state.owner || mesh.userData.contested !== state.contested) {
        if (mesh) this.group.remove(mesh);
        mesh = this.assets.territory.createControlRing(state);
        mesh.userData.owner = state.owner;
        mesh.userData.contested = state.contested;
        this.controlMeshes.set(state.roomId, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === state.roomId);
      if (!room) continue;
      mesh.position.set(room.x, this.roomY(room) + 0.045, room.z);
      const controlScale = 0.72 + Math.min(100, state.control) / 100 * 0.5;
      const pulse = state.contested ? 1 + Math.sin(time * 7 + state.roomId.length) * 0.09 : 1;
      mesh.scale.setScalar(controlScale * pulse);
      mesh.rotation.y = state.contested ? time * 0.35 : 0;
    }
  }

  destroy() {
    this.territoryPropMeshes.clear();
    this.controlMeshes.clear();
    super.destroy();
  }
}
