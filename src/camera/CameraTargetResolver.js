import { clamp, copyPoint } from './CameraMath.js';

const SMALL_ROLES = new Set(['stirge', 'rat', 'parasite', 'goblin', 'kobold', 'slime']);
const LARGE_ROLES = new Set(['ogre', 'giant', 'carrion', 'gardener', 'goldback']);

export class CameraTargetResolver {
  constructor({ scenario, renderer, worldPicker = null, getViewModel = () => null } = {}) {
    this.scenario = scenario ?? { rooms: [] };
    this.renderer = renderer ?? null;
    this.worldPicker = worldPicker;
    this.getViewModel = getViewModel;
  }

  setWorldPicker(worldPicker) {
    this.worldPicker = worldPicker;
  }

  resolve(selection) {
    if (!selection) return null;
    if (selection.worldTarget) {
      const point = this.worldPicker?.focusPoint?.() ?? this.worldPicker?.focusPoint?.(selection.worldTarget) ?? null;
      if (point) return this.result(selection, point, 24, false, labelOf(selection.worldTarget));
    }
    if (selection.type === 'agent') return this.resolveAgent(selection.id);
    if (selection.type === 'room') return this.resolveRoom(selection.id);
    if (selection.type === 'settlement') return this.resolveSettlement(selection.id);
    if (selection.type === 'party') return this.resolveParty(selection.id);
    if (selection.type === 'faction') return this.resolveFaction(selection.id);
    return null;
  }

  resolveAgent(id) {
    const model = this.roster().find(agent => String(agent.id) === String(id)) ?? null;
    const world = this.renderer?.getAgentWorldPosition?.(id) ?? null;
    if (!world && model?.roomId) return this.resolveRoom(model.roomId, model.name ?? id);
    if (!world) return null;
    const role = model?.role ?? model?.species ?? '';
    const height = LARGE_ROLES.has(role) ? 2.4 : SMALL_ROLES.has(role) ? 1 : model?.heroId || model?.rank === 'hero' ? 1.9 : 1.45;
    const distance = LARGE_ROLES.has(role) ? 31 : SMALL_ROLES.has(role) ? 21 : model?.heroId || model?.rank === 'hero' ? 27 : 24;
    return this.result({ type: 'agent', id }, { x: world.x, y: world.y + height, z: world.z }, distance, true, model?.name ?? id, model);
  }

  resolveRoom(id, fallbackLabel = null) {
    const room = this.scenario.rooms?.find(candidate => String(candidate.id) === String(id));
    if (!room) return null;
    const distance = clamp(Math.max(room.w ?? 8, room.d ?? 8) * 1.7 + 12, 22, 64);
    return this.result({ type: 'room', id }, {
      x: room.x,
      y: (room.floor ?? 0) * 2.85 + 2.8,
      z: room.z
    }, distance, false, fallbackLabel ?? room.name ?? id, room);
  }

  resolveSettlement(id) {
    const row = this.getViewModel()?.navigator?.settlements?.find(item => String(item.id) === String(id));
    return row?.roomId ? this.resolveRoom(row.roomId, row.name ?? id) : null;
  }

  resolveParty(id) {
    const row = this.getViewModel()?.navigator?.parties?.find(item => String(item.id) === String(id));
    const roomId = row?.targetRoomId ?? row?.roomId ?? row?.baseRoomId ?? null;
    return roomId ? this.resolveRoom(roomId, row.name ?? id) : null;
  }

  resolveFaction(id) {
    const settlements = this.getViewModel()?.navigator?.settlements ?? [];
    const owned = settlements.filter(item => item.factionId === id);
    if (!owned.length) return null;
    const rooms = owned.map(item => this.scenario.rooms?.find(room => room.id === item.roomId)).filter(Boolean);
    if (!rooms.length) return null;
    const point = rooms.reduce((sum, room) => ({ x: sum.x + room.x, y: sum.y + (room.floor ?? 0) * 2.85 + 2.8, z: sum.z + room.z }), { x: 0, y: 0, z: 0 });
    point.x /= rooms.length; point.y /= rooms.length; point.z /= rooms.length;
    return this.result({ type: 'faction', id }, point, clamp(28 + rooms.length * 2, 28, 72), false, id);
  }

  cycleRoster({ heroesOnly = false } = {}) {
    return this.roster().filter(agent => {
      if (agent.alive === false || agent.departed || agent.hidden) return false;
      if (!heroesOnly) return true;
      return Boolean(agent.heroId || agent.rank === 'hero' || agent.isHero || agent.uniqueHero);
    });
  }

  roster() {
    return this.getViewModel()?.followRoster ?? [];
  }

  result(selection, point, distance, dynamic, label, source = null) {
    return {
      selection: { type: selection.type, id: selection.id, worldTarget: selection.worldTarget ?? null },
      point: copyPoint(point),
      distance,
      dynamic,
      label: String(label ?? selection.id ?? selection.type),
      source
    };
  }
}

function labelOf(target) {
  return target?.label ?? target?.name ?? target?.id ?? target?.type ?? 'selection';
}
