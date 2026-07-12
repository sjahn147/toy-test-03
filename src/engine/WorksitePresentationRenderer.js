export class WorksitePresentationRenderer {
  constructor({ group, roomY, assets, cargoMeshes }) {
    this.group = group;
    this.roomY = roomY;
    this.assets = assets;
    this.cargoMeshes = cargoMeshes;
    this.scaffolds = new Map();
    this.signatures = new Map();
  }

  render(snapshot, time) {
    const rooms = new Map((snapshot.rooms ?? []).map(room => [room.id, room]));
    this.renderScaffolds(snapshot.props ?? [], rooms, time);
    this.positionUnloadingCargo(snapshot.agents ?? [], snapshot.logistics?.cargo ?? [], rooms, time);
  }

  renderScaffolds(props, rooms, time) {
    const worksites = props.filter(prop => prop.underConstruction && (prop.buildProgress ?? 0) < 1);
    const live = new Set(worksites.map(prop => prop.id));
    for (const [id, mesh] of this.scaffolds) {
      if (live.has(id)) continue;
      this.remove(id, mesh);
    }

    for (const prop of worksites) {
      const signature = `${prop.type}:${Math.floor((prop.buildProgress ?? 0) * 12)}`;
      let mesh = this.scaffolds.get(prop.id);
      if (!mesh || this.signatures.get(prop.id) !== signature) {
        if (mesh) this.remove(prop.id, mesh);
        mesh = this.assets.worksite?.createScaffold(prop);
        if (!mesh) continue;
        this.scaffolds.set(prop.id, mesh);
        this.signatures.set(prop.id, signature);
        this.group.add(mesh);
      }
      const room = rooms.get(prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.035, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      const baseScale = (placement.scale ?? 1) * (0.82 + Math.min(1, prop.buildProgress ?? 0) * 0.18);
      mesh.scale.setScalar(baseScale);
      this.assets.worksite?.animateScaffold(mesh, prop, time);
    }
  }

  positionUnloadingCargo(agents, cargoItems, rooms, time) {
    const agentByCargo = new Map();
    for (const agent of agents) {
      const activity = agent.activity;
      if (activity?.source === 'operations' && activity.type === 'unloading' && activity.cargoId) agentByCargo.set(activity.cargoId, agent);
    }

    for (const cargo of cargoItems) {
      const agent = agentByCargo.get(cargo.id);
      const mesh = this.cargoMeshes.get(cargo.id);
      if (!agent || !mesh) continue;
      const activity = agent.activity;
      const room = rooms.get(activity.roomId ?? agent.roomId);
      if (!room) continue;
      const anchor = activity.anchor ?? {};
      const progress = Math.max(0, Math.min(1, activity.progress ?? 0));
      const bob = Math.sin(time * 5.2 + cargo.id.length) * 0.018 * (1 - progress);
      mesh.position.set(
        room.x + (anchor.ox ?? 0) + Math.sin(anchor.facing ?? 0) * 0.42,
        this.roomY(room) + 0.12 + bob,
        room.z + (anchor.oz ?? 0) + Math.cos(anchor.facing ?? 0) * 0.42
      );
      mesh.rotation.y = (anchor.facing ?? 0) + Math.PI * 0.5;
      mesh.rotation.z = -0.08 + progress * 0.08;
      mesh.scale.setScalar(0.72 + progress * 0.08);
      mesh.userData.unloading = true;
    }
  }

  remove(id, mesh) {
    this.group.remove(mesh);
    disposeTree(mesh);
    this.scaffolds.delete(id);
    this.signatures.delete(id);
  }

  destroy() {
    for (const [id, mesh] of [...this.scaffolds]) this.remove(id, mesh);
  }
}

function disposeTree(root) {
  root.traverse(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}
