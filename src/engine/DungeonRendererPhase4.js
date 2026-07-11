import { THREE } from './ThreeScene.js';
import { DungeonRendererPhase3 } from './DungeonRendererPhase3.js';
import { EquipmentAssetFactory } from './EquipmentAssetFactory.js';

const SLOT_BINDINGS = {
  mainHand: { socket: 'socket_handR', basePrefix: 'wpn_' },
  offHand: { socket: 'socket_handL', basePrefix: 'off_' },
  head: { socket: 'socket_headTop', basePrefix: 'hat_' },
  body: { socket: 'socket_chest', basePrefix: 'torso_' },
  accessory: { socket: 'socket_back', basePrefix: null }
};

export class DungeonRendererPhase4 extends DungeonRendererPhase3 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.equipmentFactory = new EquipmentAssetFactory();
    this.equipmentSignatures = new Map();
    this.lootMeshes = new Map();
  }

  renderState(snapshot) {
    super.renderState(snapshot);
    this.renderEquipment(snapshot.agents);
    this.renderLoot(snapshot.lootDrops ?? [], snapshot.time);
  }

  renderEquipment(agents) {
    const live = new Set(agents.map(agent => agent.id));
    for (const id of [...this.equipmentSignatures.keys()]) {
      if (!live.has(id)) this.equipmentSignatures.delete(id);
    }

    for (const agent of agents) {
      const mesh = this.agentMeshes.get(agent.id);
      if (!mesh) continue;
      const signature = equipmentSignature(agent);
      if (this.equipmentSignatures.get(agent.id) === signature) continue;
      this.equipmentSignatures.set(agent.id, signature);
      this.rebuildEquipment(mesh, agent);
    }
  }

  rebuildEquipment(mesh, agent) {
    for (const [slot, binding] of Object.entries(SLOT_BINDINGS)) {
      const socket = mesh.getObjectByName(binding.socket);
      if (!socket) continue;

      for (const child of [...socket.children]) {
        if (child.userData?.equipmentVisual) socket.remove(child);
      }

      const item = agent.equipment?.[slot] ?? null;
      for (const child of socket.children) {
        if (!binding.basePrefix || !child.name?.startsWith(binding.basePrefix)) continue;
        child.userData.originalEquipmentVisibility ??= child.visible;
        child.visible = item ? false : child.userData.originalEquipmentVisibility;
      }

      if (!item) continue;
      const visual = this.equipmentFactory.createItem(item);
      if (!visual) continue;
      visual.userData.equipmentVisual = true;
      visual.userData.equipmentSlot = slot;
      this.applySlotTransform(visual, slot, item);
      socket.add(visual);
    }
  }

  applySlotTransform(visual, slot, item) {
    if (slot === 'mainHand') {
      visual.position.set(0, 0.02, 0);
    } else if (slot === 'offHand') {
      visual.position.set(0, 0.04, 0.02);
      if (item.visualId?.startsWith('book_')) visual.rotation.y = -0.35;
    } else if (slot === 'head') {
      visual.position.set(0, 0.02, 0);
    } else if (slot === 'body') {
      visual.position.set(0, -0.02, 0);
    } else if (slot === 'accessory') {
      visual.position.set(0, -0.1, -0.08);
      visual.rotation.y = Math.PI;
      visual.scale.setScalar(0.82);
    }
  }

  renderLoot(drops, time) {
    const live = new Set(drops.map(drop => drop.id));
    for (const [id, mesh] of this.lootMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.lootMeshes.delete(id);
      }
    }

    for (const drop of drops) {
      let mesh = this.lootMeshes.get(drop.id);
      if (!mesh) {
        mesh = this.equipmentFactory.createLootPile(drop);
        mesh.userData.lootId = drop.id;
        this.lootMeshes.set(drop.id, mesh);
        this.group.add(mesh);
      }
      const room = this.topology.roomById.get(drop.roomId);
      if (!room) continue;
      const x = drop.x ?? room.x;
      const z = drop.z ?? room.z;
      mesh.position.set(x, this.roomY(room) + 0.04 + Math.sin(time * 3 + drop.id.length) * 0.018, z);
      const glow = mesh.getObjectByName('loot-glow');
      if (glow) {
        glow.rotation.z = time * 0.35;
        const pulse = 0.92 + Math.sin(time * 4.2 + drop.id.length) * 0.08;
        glow.scale.setScalar(pulse);
      }
    }
  }

  destroy() {
    this.equipmentSignatures.clear();
    this.lootMeshes.clear();
    super.destroy();
  }
}

function equipmentSignature(agent) {
  return JSON.stringify(Object.entries(agent.equipment ?? {}).map(([slot, item]) => [
    slot,
    item?.instanceId ?? null,
    item?.broken ?? false,
    item ? Math.ceil(item.durability ?? 0) : null
  ]));
}
