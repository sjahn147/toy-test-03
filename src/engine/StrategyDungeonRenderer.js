import { DungeonRendererPhase8 } from './DungeonRendererPhase8.js';
import { WorldStatusOverlayRenderer } from './WorldStatusOverlayRenderer.js';
import { isForwardOutpost } from './StrategyAssetRegistry.js';

export class StrategyDungeonRenderer extends DungeonRendererPhase8 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.forwardOutpostMeshes = new Map();
    this.forwardOutpostSignatures = new Map();
    this.worldStatusOverlay = new WorldStatusOverlayRenderer({ group: this.group, roomY: room => this.roomY(room) });
  }

  renderState(snapshot) {
    const outposts = (snapshot.props ?? []).filter(isForwardOutpost);
    super.renderState({ ...snapshot, props: (snapshot.props ?? []).filter(prop => !isForwardOutpost(prop)) });
    this.renderForwardOutposts(outposts, snapshot.rooms ?? [], snapshot.time ?? 0);
    this.worldStatusOverlay.render(snapshot, snapshot.time ?? 0);
  }

  renderForwardOutposts(outposts, rooms, time) {
    const live = new Set(outposts.map(outpost => outpost.id));
    for (const [id, mesh] of this.forwardOutpostMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      disposeTree(mesh);
      this.forwardOutpostMeshes.delete(id);
      this.forwardOutpostSignatures.delete(id);
    }
    for (const outpost of outposts) {
      const signature = JSON.stringify([outpost.outpostProfile, outpost.ecologyFaction, Math.floor((outpost.integrity ?? 0) / 8), Math.floor((outpost.buildProgress ?? 1) * 10)]);
      let mesh = this.forwardOutpostMeshes.get(outpost.id);
      if (!mesh || this.forwardOutpostSignatures.get(outpost.id) !== signature) {
        if (mesh) { this.group.remove(mesh); disposeTree(mesh); }
        mesh = this.assets.makeProp(outpost);
        if (!mesh) continue;
        mesh.userData.forwardOutpostId = outpost.id;
        this.forwardOutpostMeshes.set(outpost.id, mesh);
        this.forwardOutpostSignatures.set(outpost.id, signature);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === outpost.roomId);
      if (!room) continue;
      const placement = outpost.placement ?? {};
      const progress = Math.max(0.12, outpost.buildProgress ?? 1);
      const integrity = Math.max(0.08, (outpost.integrity ?? outpost.maxIntegrity ?? 1) / Math.max(1, outpost.maxIntegrity ?? 1));
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.035, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      const scale = placement.scale ?? 0.76;
      const damagePulse = integrity < 0.35 ? 1 + Math.sin(time * 7 + outpost.id.length) * 0.025 : 1;
      mesh.scale.set(scale * damagePulse, scale * (0.3 + progress * 0.7), scale * damagePulse);
      this.assets.animateForwardOutpost?.(mesh, outpost, time);
    }
  }

  destroy() {
    this.worldStatusOverlay.destroy();
    for (const mesh of this.forwardOutpostMeshes.values()) { this.group.remove(mesh); disposeTree(mesh); }
    this.forwardOutpostMeshes.clear();
    this.forwardOutpostSignatures.clear();
    super.destroy();
  }
}

function disposeTree(root) {
  root.traverse(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}
