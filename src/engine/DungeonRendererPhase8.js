import { DungeonRendererPhase7 } from './DungeonRendererPhase7.js';
import { PHASE8D_STRUCTURE_TYPES } from './AssetRegistryPhase8.js';
import { getCampaignLandmarkRecipe } from './CampaignLandmarkRecipes.js';

export class DungeonRendererPhase8 extends DungeonRendererPhase7 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.scenario = scenario;
    this.settlementMeshes = new Map();
    this.settlementSignatures = new Map();
    this.fieldCampMeshes = new Map();
    this.cargoMeshes = new Map();
    this.structureMeshes = new Map();
    this.structureSignatures = new Map();
    this.campaignLandmarkMeshes = new Map();
    this.campaignLandmarkSignatures = new Map();
  }

  renderState(snapshot) {
    const fieldCamps = snapshot.props.filter(prop => prop.type === 'adventurer_field_camp');
    const structures = snapshot.props.filter(prop => PHASE8D_STRUCTURE_TYPES.has(prop.type));
    const filtered = {
      ...snapshot,
      props: snapshot.props.filter(prop => prop.type !== 'adventurer_field_camp' && !PHASE8D_STRUCTURE_TYPES.has(prop.type))
    };
    super.renderState(filtered);
    this.renderCampaignLandmarks(snapshot.rooms, snapshot.time);
    this.renderFieldCamps(fieldCamps, snapshot.rooms, snapshot.time);
    this.renderStructures(structures, snapshot.rooms, snapshot.time);
    const settlements = (snapshot.settlement?.settlements ?? []).filter(settlement => settlement.type !== 'field-camp');
    this.renderSettlements(settlements, snapshot.rooms, snapshot.time);
    this.renderCargo(snapshot.logistics?.cargo ?? [], snapshot.agents, snapshot.rooms, snapshot.time);
  }

  renderCampaignLandmarks(rooms, time) {
    const bundlesByRoom = this.scenario?.meta?.propBundlesByRoom ?? {};
    const desired = [];
    for (const [roomId, bundleIds] of Object.entries(bundlesByRoom)) {
      for (const bundleId of bundleIds ?? []) {
        const recipe = getCampaignLandmarkRecipe(bundleId);
        if (recipe) desired.push({ roomId, bundleId, recipe });
      }
    }

    const live = new Set(desired.map(entry => landmarkKey(entry.roomId, entry.bundleId)));
    for (const [key, mesh] of this.campaignLandmarkMeshes) {
      if (live.has(key)) continue;
      this.group.remove(mesh);
      disposeTree(mesh);
      this.campaignLandmarkMeshes.delete(key);
      this.campaignLandmarkSignatures.delete(key);
    }

    for (const entry of desired) {
      const room = rooms.find(candidate => candidate.id === entry.roomId);
      if (!room) continue;
      const state = room.visualState ?? room.stateVariant ?? room.state ?? entry.recipe.defaultState ?? null;
      const key = landmarkKey(entry.roomId, entry.bundleId);
      const signature = `${entry.bundleId}:${state ?? 'default'}`;
      let mesh = this.campaignLandmarkMeshes.get(key);

      if (!mesh || this.campaignLandmarkSignatures.get(key) !== signature) {
        if (mesh) {
          this.group.remove(mesh);
          disposeTree(mesh);
        }
        mesh = this.assets.makeCampaignLandmark(entry.bundleId, { room, state });
        if (!mesh) continue;
        mesh.userData.campaignLandmarkKey = key;
        mesh.userData.assetId = entry.bundleId;
        mesh.userData.roomId = entry.roomId;
        this.campaignLandmarkMeshes.set(key, mesh);
        this.campaignLandmarkSignatures.set(key, signature);
        this.group.add(mesh);
      }

      const placement = entry.recipe.placement ?? {};
      mesh.position.set(
        room.x + (placement.ox ?? 0),
        this.roomY(room) + 0.04,
        room.z + (placement.oz ?? 0)
      );
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 1);
      animateLandmark(mesh, time, key);
    }
  }

  renderStructures(structures, rooms, time) {
    const live = new Set(structures.map(prop => prop.id));
    for (const [id, mesh] of this.structureMeshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      this.structureMeshes.delete(id);
      this.structureSignatures.delete(id);
    }
    for (const prop of structures) {
      const signature = `${prop.type}:${prop.structureFaction}:${Math.floor((prop.integrity ?? 0) / 8)}:${Math.floor((prop.buildProgress ?? 1) * 10)}`;
      let mesh = this.structureMeshes.get(prop.id);
      if (!mesh || this.structureSignatures.get(prop.id) !== signature) {
        if (mesh) this.group.remove(mesh);
        mesh = this.assets.makeProp(prop);
        if (!mesh) continue;
        this.structureMeshes.set(prop.id, mesh);
        this.structureSignatures.set(prop.id, signature);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === prop.roomId);
      if (!room) continue;
      const placement = prop.placement ?? {};
      const progress = Math.max(0.08, prop.buildProgress ?? 1);
      const integrityRatio = Math.max(0.08, (prop.integrity ?? prop.maxIntegrity ?? 1) / Math.max(1, prop.maxIntegrity ?? 1));
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.035, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      const baseScale = placement.scale ?? 1;
      const damagePulse = integrityRatio < 0.4 ? 1 + Math.sin(time * 9 + prop.id.length) * 0.025 : 1;
      mesh.scale.set(baseScale * damagePulse, baseScale * (0.25 + progress * 0.75), baseScale * damagePulse);
      mesh.rotation.z = integrityRatio < 0.25 ? Math.sin(time * 5 + prop.id.length) * 0.025 : 0;
    }
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
      mesh.traverse(child => { if (child.name === 'cargo-mote') child.rotation.y = time * 1.4 + child.id; });
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
    const baseScale = settlement.visualPlacement?.scale ?? 0.68;
    mesh.scale.setScalar(baseScale * (collapsing ? 0.94 + Math.sin(time * 8) * 0.055 : threatened ? 0.98 + Math.sin(time * 5) * 0.025 : 1));
  }

  destroy() {
    for (const mesh of this.campaignLandmarkMeshes.values()) disposeTree(mesh);
    this.campaignLandmarkMeshes.clear();
    this.campaignLandmarkSignatures.clear();
    this.settlementMeshes.clear();
    this.settlementSignatures.clear();
    this.fieldCampMeshes.clear();
    this.cargoMeshes.clear();
    this.structureMeshes.clear();
    this.structureSignatures.clear();
    super.destroy();
  }
}

function landmarkKey(roomId, bundleId) {
  return `${roomId}:${bundleId}`;
}

function animateLandmark(mesh, time, key) {
  const phase = hash(key) * Math.PI * 2;
  mesh.traverse(node => {
    if (!node.isMesh) return;
    if (node.name === 'landmark-flame') {
      const pulse = 0.92 + Math.sin(time * 7.2 + phase + node.id * 0.17) * 0.08;
      node.scale.set(pulse, 0.94 + Math.sin(time * 8.7 + node.id) * 0.12, pulse);
    }
    if (node.name === 'water-surface') {
      node.rotation.y = time * 0.08 + phase;
      node.position.y += Math.sin(time * 1.6 + phase) * 0.0008;
    }
    if (node.name === 'hanging-prop') {
      node.rotation.z = Math.sin(time * 0.7 + phase + node.id) * 0.018;
    }
  });
}

function disposeTree(root) {
  root.traverse(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
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
    settlement.anchorPresent,
    settlement.supplyStatus
  ]);
}

function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}
