import { DungeonRendererPhase7 } from './DungeonRendererPhase7.js';
import { PHASE8D_STRUCTURE_TYPES } from './AssetRegistryPhase8.js';
import { MiniatureAnimator } from './MiniatureAnimator.js';

export class DungeonRendererPhase8 extends DungeonRendererPhase7 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.scenario = scenario;
    this.miniatureAnimator = new MiniatureAnimator();
    this.settlementMeshes = new Map();
    this.settlementSignatures = new Map();
    this.fieldCampMeshes = new Map();
    this.cargoMeshes = new Map();
    this.structureMeshes = new Map();
    this.structureSignatures = new Map();
    this.landmarkMeshes = new Map();
    this.landmarkSignatures = new Map();
    this.activityMeshes = new Map();
    this.lastRenderTime = null;
  }

  renderState(snapshot) {
    const fieldCamps = snapshot.props.filter(prop => prop.type === 'adventurer_field_camp');
    const structures = snapshot.props.filter(prop => PHASE8D_STRUCTURE_TYPES.has(prop.type));
    const visualAgents = this.prepareVisualAgents(snapshot.agents, snapshot.time);
    const filtered = {
      ...snapshot,
      agents: visualAgents,
      props: snapshot.props.filter(prop => prop.type !== 'adventurer_field_camp' && !PHASE8D_STRUCTURE_TYPES.has(prop.type))
    };
    super.renderState(filtered);
    const deltaSeconds = this.lastRenderTime == null ? 0 : Math.max(0, Math.min(0.1, snapshot.time - this.lastRenderTime));
    this.lastRenderTime = snapshot.time;
    this.renderCampaignLandmarks(snapshot.rooms, snapshot.time, deltaSeconds);
    this.renderFieldCamps(fieldCamps, snapshot.rooms, snapshot.time);
    this.renderStructures(structures, snapshot.rooms, snapshot.time);
    const settlements = snapshot.settlement?.settlements ?? [];
    this.applyActivityAnchors(visualAgents, settlements, snapshot.props, snapshot.rooms);
    this.animateMiniatures(visualAgents, snapshot.effects ?? [], snapshot.time);
    this.renderActivityProps(visualAgents, settlements, snapshot.props, snapshot.rooms, snapshot.time);
    this.renderSettlements(settlements.filter(settlement => settlement.type !== 'field-camp'), snapshot.rooms, snapshot.time);
    this.renderCargo(snapshot.logistics?.cargo ?? [], snapshot.agents, snapshot.rooms, snapshot.time);
  }

  prepareVisualAgents(agents, time) {
    return agents.map(agent => {
      if (agent.alive || agent.deathAt === undefined || agent.deathAt === null) return agent;
      const corpseLinger = agent.corpseLinger ?? 2.4;
      const age = Math.max(0, time - agent.deathAt);
      if (age >= corpseLinger) return agent;
      return {
        ...agent,
        alive: true,
        departed: false,
        hidden: false,
        travel: null,
        downed: true,
        corpse: true,
        corpseLinger,
        hp: 0
      };
    });
  }

  animateMiniatures(agents, effects, time) {
    for (const agent of agents) {
      if ((!agent.alive && !agent.corpse) || agent.hidden || agent.departed) continue;
      const mesh = this.agentMeshes.get(agent.id);
      if (mesh) this.miniatureAnimator.update(mesh, agent, time, effects);
    }
  }

  applyActivityAnchors(agents, settlements, props, rooms) {
    const settlementById = new Map(settlements.map(settlement => [settlement.id, settlement]));
    const propById = new Map(props.map(prop => [prop.id, prop]));
    const roomById = new Map(rooms.map(room => [room.id, room]));
    for (const agent of agents) {
      const activity = agent.activity;
      if (!activity?.anchor || agent.travel || agent.combat || agent.corpse) continue;
      const mesh = this.agentMeshes.get(agent.id);
      const settlement = settlementById.get(activity.targetSettlementId ?? activity.settlementId);
      const room = roomById.get(activity.targetRoomId ?? activity.roomId ?? settlement?.roomId ?? agent.roomId);
      if (!mesh || !room) continue;
      const transform = resolveActivityTransform(activity.anchor, settlement, propById);
      mesh.position.set(room.x + transform.ox, this.roomY(room) + (activity.type === 'sleeping' || activity.type === 'monster-resting' ? 0.04 : 0.08), room.z + transform.oz);
      mesh.rotation.y = transform.facing;
      mesh.userData.activityAnchored = true;
    }
  }

  renderActivityProps(agents, settlements, props, rooms, time) {
    const live = new Set();
    const settlementById = new Map(settlements.map(settlement => [settlement.id, settlement]));
    const propById = new Map(props.map(prop => [prop.id, prop]));
    const roomById = new Map(rooms.map(room => [room.id, room]));
    for (const agent of agents) {
      const activity = agent.activity;
      if (!activity?.prop || !activity.anchor || agent.travel || agent.combat || agent.corpse || agent.hidden || agent.departed) continue;
      const key = `${agent.id}:${activity.id}:${activity.prop}`;
      live.add(key);
      let mesh = this.activityMeshes.get(key);
      if (!mesh) {
        mesh = this.assets.activity.create(activity, agent);
        if (!mesh) continue;
        this.activityMeshes.set(key, mesh);
        this.group.add(mesh);
      }
      const settlement = settlementById.get(activity.targetSettlementId ?? activity.settlementId);
      const room = roomById.get(activity.targetRoomId ?? activity.roomId ?? settlement?.roomId ?? agent.roomId);
      if (!room) continue;
      const transform = resolveActivityTransform(activity.anchor, settlement, propById);
      mesh.position.set(room.x + transform.ox, this.roomY(room) + activityPropHeight(activity.prop), room.z + transform.oz);
      mesh.rotation.y = transform.facing;
      mesh.scale.setScalar(Math.max(0.72, transform.scale));
      this.assets.activity.animate(mesh, activity, time);
    }
    for (const [key, mesh] of [...this.activityMeshes]) {
      if (live.has(key)) continue;
      this.group.remove(mesh);
      disposeTree(mesh);
      this.activityMeshes.delete(key);
    }
  }

  renderCampaignLandmarks(rooms, elapsedSeconds, deltaSeconds) {
    const desired = [];
    for (const room of rooms) {
      const bundleIds = room.landmarkBundle ? [room.landmarkBundle] : this.scenario?.meta?.propBundlesByRoom?.[room.id] ?? [];
      for (const assetId of bundleIds) {
        const recipe = this.assets.getCampaignLandmarkRecipe(assetId);
        if (recipe) desired.push({ room, assetId, recipe });
      }
    }

    const live = new Set(desired.map(entry => landmarkKey(entry.room.id, entry.assetId)));
    for (const [key, mesh] of this.landmarkMeshes) {
      if (!live.has(key)) this.removeLandmark(key, mesh);
    }

    for (const { room, assetId, recipe } of desired) {
      const key = landmarkKey(room.id, assetId);
      const state = room.visualState ?? room.stateVariant ?? room.state ?? recipe.defaultState ?? null;
      const signature = `${assetId}:${state ?? 'default'}`;
      let mesh = this.landmarkMeshes.get(key);
      if (!mesh || this.landmarkSignatures.get(key) !== signature) {
        if (mesh) this.removeLandmark(key, mesh);
        mesh = this.assets.makeCampaignLandmark(assetId, { room, state, recipe });
        if (!mesh) continue;
        mesh.userData.roomId = room.id;
        mesh.userData.assetId = assetId;
        this.landmarkMeshes.set(key, mesh);
        this.landmarkSignatures.set(key, signature);
        this.group.add(mesh);
      }
      const placement = recipe.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.04, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 1);
      this.assets.animateCampaignLandmark(mesh, elapsedSeconds, deltaSeconds);
    }
  }

  removeLandmark(key, mesh) {
    this.group.remove(mesh);
    this.assets.releaseCampaignLandmark(mesh);
    disposeTree(mesh);
    this.landmarkMeshes.delete(key);
    this.landmarkSignatures.delete(key);
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
        if (!mesh) continue;
        mesh.userData.fieldCampId = camp.id;
        this.fieldCampMeshes.set(camp.id, mesh);
        this.group.add(mesh);
      }
      const room = rooms.find(candidate => candidate.id === camp.roomId);
      if (!room) continue;
      const placement = camp.placement ?? {};
      mesh.position.set(room.x + (placement.ox ?? 0), this.roomY(room) + 0.035, room.z + (placement.oz ?? 0));
      mesh.rotation.y = placement.rotation ?? 0;
      mesh.scale.setScalar(placement.scale ?? 0.82);
      this.assets.expedition.animateFieldCamp(mesh, time);
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
    for (const [key, mesh] of [...this.landmarkMeshes]) this.removeLandmark(key, mesh);
    for (const mesh of this.activityMeshes.values()) disposeTree(mesh);
    this.settlementMeshes.clear();
    this.settlementSignatures.clear();
    this.fieldCampMeshes.clear();
    this.cargoMeshes.clear();
    this.structureMeshes.clear();
    this.structureSignatures.clear();
    this.activityMeshes.clear();
    super.destroy();
  }
}

function resolveActivityTransform(anchor, settlement, propById) {
  if (Number.isFinite(anchor.ox) && Number.isFinite(anchor.oz)) {
    return { ox: anchor.ox, oz: anchor.oz, facing: anchor.facing ?? 0, scale: settlement?.visualPlacement?.scale ?? 1 };
  }
  const anchorProp = propById.get(settlement?.anchorPropId);
  const placement = anchorProp?.placement ?? settlement?.visualPlacement ?? {};
  const local = rotatePoint(anchor.x ?? 0, anchor.z ?? 0, placement.rotation ?? 0);
  const scale = placement.scale ?? 1;
  return {
    ox: (placement.ox ?? 0) + local.x * scale,
    oz: (placement.oz ?? 0) + local.z * scale,
    facing: (placement.rotation ?? 0) + (anchor.facing ?? 0),
    scale
  };
}

function rotatePoint(x, z, rotation) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return { x: x * cosine - z * sine, z: x * sine + z * cosine };
}

function activityPropHeight(prop) {
  if (prop === 'bedroll-blanket' || prop === 'rough-bedroll') return 0.055;
  if (prop === 'bowl-spoon') return 0.04;
  if (prop === 'cookpot-ladle') return 0.04;
  if (prop === 'hammer-plank') return 0.04;
  return 0.04;
}

function landmarkKey(roomId, assetId) {
  return `${roomId}:${assetId}`;
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
  return JSON.stringify([settlement.state, settlement.factionId, settlement.tier, settlement.capacity, settlement.population, settlement.overcrowded, Math.floor((settlement.structuralIntegrity ?? 0) / 8), Math.floor((settlement.control ?? 0) / 10), settlement.anchorPresent, settlement.supplyStatus]);
}

function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}