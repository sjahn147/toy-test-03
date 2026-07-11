import { DungeonRendererPhase7 } from './DungeonRendererPhase7.js';

export class DungeonRendererPhase8 extends DungeonRendererPhase7 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.settlementMeshes = new Map();
    this.settlementSignatures = new Map();
    this.fieldCampMeshes = new Map();
    this.cargoMeshes = new Map();
  }

  renderState(snapshot) {
    const fieldCamps = snapshot.props.filter(prop => prop.type === 'adventurer_field_camp');
    const filtered = { ...snapshot, props: snapshot.props.filter(prop => prop.type !== 'adventurer_field_camp') };
    super.renderState(filtered);
    this.renderFieldCamps(fieldCamps, snapshot.rooms, snapshot.time);
    const settlements = (snapshot.settlement?.settlements ?? []).filter(settlement => settlement.type !== 'field-camp');
    this.renderSettlements(settlements, snapshot.rooms, snapshot.time);
    this.renderCargo(snapshot.logistics?.cargo ?? [], snapshot.agents, snapshot.rooms, snapshot.time);
  }

  renderFieldCamps(camps, rooms, time) {
    const live = new Set(camps.map(camp => camp.id));
    for (const [id, mesh] of this.fieldCampMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      this.fieldCampMeshes.delete(id);
    }
    for (const camp of camps) {
      let mesh = this.fieldCampMeshes.get(camp.id);
      if (!mesh) {
        mesh = this.assets.makeProp(camp);
        mesh.userData.fieldCampId = camp.id;
        this.fieldCampMeshes.set(camp.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === camp.roomId);
      if (!room) continue;
      const placement = camp.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.035, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar((placement.scale ?? 0.82) * (1 + Math.sin(time * 3.4 + camp.id.length) * 0.008));
    }
  }

  renderCargo(cargoItems, agents, rooms, time) {
    const live = new Set(cargoItems.map(cargo => cargo.id));
    for (const [id, mesh] of this.cargoMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      this.cargoMeshes.delete(id);
    }
    for (const cargo of cargoItems) {
      let mesh = this.cargoMeshes.get(cargo.id);
      if (!mesh) {
        mesh = this.assets.logistics.createCargo(cargo);
        mesh.userData.cargoId = cargo.id;
        this.cargoMeshes.set(cargo.id, mesh);
        this.group.add(mesh);
      }
      const carrierMesh = cargo.carrierId ? this.agentMeshes.get(cargo.carrierId) : null;
      if (cargo.state === 'carried' && carrierMesh) {
        mesh.position.copy(carrierMesh.position);
        mesh.position.y += 0.78;
        mesh.position.x -= Math.sin(carrierMesh.rotation.y) * 0.28;
        mesh.position.z -= Math.cos(carrierMesh.rotation.y) * 0.28;
        mesh.rotation.y = carrierMesh.rotation.y;
        mesh.scale.setScalar(0.68);
      } else {
        const room = rooms.find(candidate => candidate.id === cargo.roomId);
        if (!room) continue;
        const angle = hash(cargo.id) * Math.PI * 2;
        mesh.position.set(room.x + Math.cos(angle) * Math.min(2.2, room.w * 0.22), this.roomY(room) + 0.05, room.z + Math.sin(angle) * Math.min(2.2, room.d * 0.22));
        mesh.rotation.y = angle;
        mesh.scale.setScalar(0.78 + Math.sin(time * 2.8 + angle) * 0.015);
      }
      mesh.traverse(child => {
        if (child.name === 'cargo-mote') child.rotation.y = time * 1.4 + child.id;
      });
    }
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
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.035, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 0.68);
      this.animateSettlement(mesh, settlement, time);
    }
  }

  animateSettlement(mesh, settlement, time) {
    const threatened = settlement.state === 'threatened';
    const collapsing = settlement.state === 'collapsing';
    const overcrowded = settlement.overcrowded > 0;
    const rootPulse = collapsing ? 0.94 + Math.sin(time * 8 + settlement.id.length) * 0.055 : threatened ? 0.98 + Math.sin(time * 5 + settlement.id.length) * 0.025 : 1;
    const baseScale = settlement.visualPlacement?.scale ?? 0.68;
    mesh.scale.setScalar(baseScale * rootPulse);
    mesh.traverse(child => {
      if (child.userData.settlementBaseY === undefined) child.userData.settlementBaseY = child.position.y;
      if (child.name === 'settlement-light') child.scale.setScalar(0.88 + Math.sin(time * 6.2 + child.id) * 0.16);
      if (child.name === 'settlement-integrity-gauge') child.rotation.z = threatened || collapsing ? time * 0.22 : 0;
      if (child.name?.startsWith('settlement-slot-')) child.position.y = child.userData.settlementBaseY + (overcrowded && child.userData.occupied ? Math.sin(time * 7 + child.id) * 0.018 : 0);
    });
  }

  destroy() {
    this.settlementMeshes.clear();
    this.settlementSignatures.clear();
    this.fieldCampMeshes.clear();
    this.cargoMeshes.clear();
    super.destroy();
  }
}

function settlementSignature(settlement) {
  return JSON.stringify([settlement.state, settlement.factionId, settlement.tier, settlement.capacity, settlement.population, settlement.overcrowded, Math.floor((settlement.structuralIntegrity ?? 0) / 8), Math.floor((settlement.control ?? 0) / 10), settlement.anchorPresent]);
}

function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}