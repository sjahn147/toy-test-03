import { DungeonRendererPhase7 } from './DungeonRendererPhase7.js';

export class DungeonRendererPhase8 extends DungeonRendererPhase7 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.settlementMeshes = new Map();
    this.settlementSignatures = new Map();
  }

  renderState(snapshot) {
    super.renderState(snapshot);
    this.renderSettlements(snapshot.settlement?.settlements ?? [], snapshot.rooms, snapshot.time);
  }

  renderSettlements(settlements, rooms, time) {
    const live = new Set(settlements.map(settlement => settlement.id));
    for (const [id, mesh] of this.settlementMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      this.settlementMeshes.delete(id);
      this.settlementSignatures.delete(id);
    }

    for (const settlement of settlements) {
      const signature = settlementSignature(settlement);
      let mesh = this.settlementMeshes.get(settlement.id);
      if (!mesh || this.settlementSignatures.get(settlement.id) !== signature) {
        if (mesh) this.group.remove(mesh);
        mesh = this.assets.settlement.create(settlement);
        mesh.userData.settlementId = settlement.id;
        mesh.userData.state = settlement.state;
        this.settlementMeshes.set(settlement.id, mesh);
        this.settlementSignatures.set(settlement.id, signature);
        this.group.add(mesh);
      }

      const room = rooms.find(candidate => candidate.id === settlement.roomId);
      if (!room) continue;
      const placement = settlement.visualPlacement ?? {};
      mesh.position.set(
        room.x + (placement.ox ?? 0),
        this.roomY(room) + 0.035,
        room.z + (placement.oz ?? 0)
      );
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 0.68);
      this.animateSettlement(mesh, settlement, time);
    }
  }

  animateSettlement(mesh, settlement, time) {
    const threatened = settlement.state === 'threatened';
    const collapsing = settlement.state === 'collapsing';
    const overcrowded = settlement.overcrowded > 0;
    const rootPulse = collapsing
      ? 0.94 + Math.sin(time * 8 + settlement.id.length) * 0.055
      : threatened
        ? 0.98 + Math.sin(time * 5 + settlement.id.length) * 0.025
        : 1;
    const baseScale = settlement.visualPlacement?.scale ?? 0.68;
    mesh.scale.setScalar(baseScale * rootPulse);

    mesh.traverse(child => {
      if (child.userData.settlementBaseY === undefined) child.userData.settlementBaseY = child.position.y;
      if (child.name === 'settlement-light') {
        const pulse = 0.88 + Math.sin(time * 6.2 + child.id) * 0.16;
        child.scale.setScalar(pulse);
      }
      if (child.name === 'settlement-integrity-gauge') {
        child.rotation.z = threatened || collapsing ? time * 0.22 : 0;
      }
      if (child.name?.startsWith('settlement-slot-')) {
        const occupied = Boolean(child.userData.occupied);
        const bounce = overcrowded && occupied ? Math.sin(time * 7 + child.id) * 0.018 : 0;
        child.position.y = child.userData.settlementBaseY + bounce;
      }
    });
  }

  destroy() {
    this.settlementMeshes.clear();
    this.settlementSignatures.clear();
    super.destroy();
  }
}

function settlementSignature(settlement) {
  return JSON.stringify([
    settlement.state,
    settlement.factionId,
    settlement.tier,
    settlement.capacity,
    settlement.population,
    settlement.overcrowded,
    Math.floor((settlement.structuralIntegrity ?? 0) / 8),
    Math.floor((settlement.control ?? 0) / 10),
    settlement.anchorPresent
  ]);
}
