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
        mesh = this.assets.makeWorksiteScaffold?.(prop);
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
      this.assets.animateWorksiteScaffold?.(mesh, prop, time);
    }
  }

  positionUnloadingCargo(agents, cargoItems, rooms, time) {
    const unloadingByCargo = new Map();
    for (const agent of agents) {
      const activity = agent.activity;
      if (activity?.source === 'operations' && activity.type === 'unloading' && activity.cargoId) {
        unloadingByCargo.set(activity.cargoId, { agent, activity });
      }
    }

    for (const cargo of cargoItems) {
      const unloading = unloadingByCargo.get(cargo.id);
      const mesh = this.cargoMeshes.get(cargo.id);
      if (!unloading || !mesh) continue;
      const { agent, activity } = unloading;
      const room = rooms.get(activity.roomId ?? agent.roomId);
      if (!room) continue;
      const anchor = activity.anchor ?? {};
      const progress = clamp(activity.progress ?? 0, 0, 1);
      const facing = anchor.facing ?? 0;
      const lower = smoothstep(0.05, 0.62, progress);
      const settle = smoothstep(0.62, 1, progress);
      const forward = 0.3 + settle * 0.16;
      const bob = Math.sin(time * 5.2 + cargo.id.length) * 0.018 * (1 - lower);
      mesh.position.set(
        room.x + (anchor.ox ?? 0) + Math.sin(facing) * forward,
        this.roomY(room) + 0.12 + (1 - lower) * 0.72 + bob,
        room.z + (anchor.oz ?? 0) + Math.cos(facing) * forward
      );
      mesh.rotation.y = facing + Math.PI * 0.5;
      mesh.rotation.z = -0.32 * (1 - lower) + settle * 0.04;
      mesh.scale.setScalar(0.74 + settle * 0.08);
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

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function disposeTree(root) {
  root.traverse(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}
