import { selectWorldTaskActions } from './selectWorldTaskActions.js';

const RESOURCE_KEYS = ['food', 'water', 'medicine', 'materials', 'wealth'];
function table(state, name) { const records = state?.entities?.[name]; return records && typeof records === 'object' ? records : {}; }

export function selectSettlementInspector(state, settlementId) {
  if (typeof settlementId !== 'string' || !settlementId) return null;
  const settlement = table(state, 'settlements')[settlementId];
  if (!settlement || typeof settlement !== 'object') return null;
  const identity = { id: settlementId, state: settlement.state ?? 'unknown', name: settlement.name ?? settlement.type?.replaceAll?.('-', ' ') ?? settlementId, tier: settlement.tier ?? 0 };
  const current = typeof settlement.population === 'number' ? settlement.population : (settlement.residentIds?.length ?? 0);
  const resources = {};
  const stocks = settlement.resources ?? settlement.stocks ?? settlement;
  for (const key of RESOURCE_KEYS) resources[key] = typeof stocks[key] === 'number' ? stocks[key] : 0;
  const taskSurface = selectWorldTaskActions(state, { type: 'settlement', id: settlementId, settlementId, roomId: settlement.roomId, label: identity.name });
  return {
    identity,
    factionId: settlement.factionId ?? settlement.ecologyFaction ?? settlement.faction ?? null,
    roomId: settlement.roomId ?? null,
    population: { current, capacity: settlement.capacity ?? 0 },
    integrity: settlement.integrity ?? settlement.structuralIntegrity ?? null,
    control: settlement.control ?? null,
    resources,
    buildings: Array.isArray(settlement.buildings) ? settlement.buildings.map(item => typeof item === 'object' ? { ...item } : item) : [],
    services: { ...(settlement.services ?? {}) },
    nextUpgrade: settlement.nextUpgrade ? { ...settlement.nextUpgrade } : null,
    upgradeProgress: settlement.upgradeProgress ?? settlement.innUpgradeProgress ?? null,
    management: {
      supplyReserve: settlement.supplyReserve ?? 0,
      workerTarget: settlement.workerTarget ?? 0,
      garrisonTarget: settlement.garrisonTarget ?? 0,
      workers: settlement.assignedWorkerIds?.length ?? 0,
      garrison: settlement.assignedGarrisonIds?.length ?? 0,
      defenseMode: settlement.defenseMode ?? 'normal'
    },
    actions: taskSurface.actions,
    tasks: taskSurface.tasks
  };
}
