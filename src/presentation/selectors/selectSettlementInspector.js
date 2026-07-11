// settlement inspector selector (surface.inspector.settlement).

const RESOURCE_KEYS = ['food', 'water', 'medicine', 'materials', 'wealth'];

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

export function selectSettlementInspector(state, settlementId) {
  if (typeof settlementId !== 'string' || settlementId.length === 0) return null;
  const settlement = table(state, 'settlements')[settlementId];
  if (!settlement || typeof settlement !== 'object') return null;

  const identity = {
    id: settlementId,
    state: typeof settlement.state === 'string' ? settlement.state : 'unknown'
  };
  if (typeof settlement.name === 'string' && settlement.name.length > 0) {
    identity.name = settlement.name;
  }
  if (settlement.tier !== undefined && settlement.tier !== null) {
    identity.tier = settlement.tier;
  }

  const current = typeof settlement.population === 'number'
    ? settlement.population
    : (Array.isArray(settlement.residentIds) ? settlement.residentIds.length : 0);

  const result = {
    identity,
    factionId: settlement.factionId ?? settlement.ecologyFaction ?? settlement.faction ?? null,
    roomId: settlement.roomId ?? null,
    population: {
      current,
      capacity: typeof settlement.capacity === 'number' ? settlement.capacity : 0
    }
  };

  const integrity = settlement.integrity ?? settlement.structuralIntegrity;
  if (typeof integrity === 'number') result.integrity = integrity;
  if (typeof settlement.control === 'number') result.control = settlement.control;

  const stocks = settlement.resources ?? settlement.stocks;
  if (stocks && typeof stocks === 'object') {
    result.resources = {};
    for (const key of RESOURCE_KEYS) {
      result.resources[key] = typeof stocks[key] === 'number' ? stocks[key] : 0;
    }
  }

  if (Array.isArray(settlement.buildings) && settlement.buildings.length > 0) {
    result.buildings = settlement.buildings.map(building =>
      building && typeof building === 'object' ? { ...building } : building
    );
  }

  return result;
}
