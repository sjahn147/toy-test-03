const DANGER_EVENT_SEVERITIES = new Set(['major', 'critical', 'historic']);

export function selectOverlayAvailability(state) {
  const rooms = Object.values(state?.entities?.rooms ?? {});
  const cargo = Object.values(state?.entities?.cargo ?? {});
  return {
    normal: { id: 'normal', available: true, count: rooms.length },
    territory: { id: 'territory', available: rooms.some(room => room.territoryOwner || room.owner), count: rooms.filter(room => room.territoryOwner || room.owner).length },
    supply: { id: 'supply', available: cargo.length > 0 || Object.keys(state?.entities?.settlements ?? {}).length > 0, count: cargo.length },
    danger: { id: 'danger', available: rooms.length > 0, count: rooms.filter(room => dangerScore(state, room.id) > 0).length }
  };
}

export function selectTerritoryOverlay(state) {
  return Object.values(state?.entities?.rooms ?? {}).map(room => ({
    roomId: room.id,
    ownerId: room.territoryOwner ?? room.owner ?? null,
    contested: room.contested === true || Number(room.contestedBy?.length ?? 0) > 0,
    intensity: clamp01(Number(room.control ?? room.territoryControl ?? 0) / 100),
    label: room.territoryOwner ?? room.owner ?? 'Unclaimed'
  }));
}

export function selectSupplyOverlay(state) {
  const cargo = Object.values(state?.entities?.cargo ?? {});
  const settlements = Object.values(state?.entities?.settlements ?? {});
  const byRoom = new Map();
  for (const item of cargo) {
    const roomId = item.roomId ?? item.destinationRoomId ?? null;
    if (!roomId) continue;
    const row = byRoom.get(roomId) ?? { incoming: 0, risk: 0, blocked: false };
    row.incoming += Number(item.amount ?? 1);
    row.risk = Math.max(row.risk, Number(item.routeRisk ?? 0));
    row.blocked ||= ['blocked', 'lost', 'raided'].includes(item.state);
    byRoom.set(roomId, row);
  }
  for (const settlement of settlements) {
    if (!settlement.roomId) continue;
    const row = byRoom.get(settlement.roomId) ?? { incoming: 0, risk: 0, blocked: false };
    row.supplyStatus = settlement.supplyStatus ?? null;
    row.efficiency = Number(settlement.supplyEfficiency ?? 0);
    row.blocked ||= ['cut-off', 'blocked', 'starving'].includes(settlement.supplyStatus);
    byRoom.set(settlement.roomId, row);
  }
  return Object.values(state?.entities?.rooms ?? {}).map(room => {
    const row = byRoom.get(room.id) ?? {};
    const intensity = clamp01(Math.max(Number(row.efficiency ?? 0), Math.min(1, Number(row.incoming ?? 0) / 10)));
    return { roomId: room.id, intensity, risk: clamp01(Number(row.risk ?? 0)), blocked: row.blocked === true, label: row.blocked ? 'Supply blocked' : row.supplyStatus ?? (row.incoming ? `${row.incoming} cargo` : 'No supply') };
  });
}

export function selectDangerOverlay(state) {
  return Object.values(state?.entities?.rooms ?? {}).map(room => {
    const score = dangerScore(state, room.id);
    return { roomId: room.id, intensity: clamp01(score), critical: score >= 0.75, label: score >= 0.75 ? 'Critical' : score >= 0.4 ? 'Threatened' : score > 0 ? 'Watch' : 'Quiet' };
  });
}

function dangerScore(state, roomId) {
  const agents = (state?.indexes?.agentsByRoom?.[roomId] ?? []).map(id => state.entities.agents[id]).filter(Boolean);
  const hostile = agents.filter(agent => agent.faction !== 'party' && agent.factionId !== 'adventurer-expedition').length;
  const wounded = agents.filter(agent => Number(agent.hp ?? 1) / Math.max(1, Number(agent.maxHp ?? 1)) < 0.35).length;
  const recent = (state?.events ?? []).filter(event => (event.roomId ?? event.locationRoomId) === roomId && (DANGER_EVENT_SEVERITIES.has(event.severity) || String(event.type ?? '').startsWith('combat.'))).length;
  const settlement = Object.values(state?.entities?.settlements ?? {}).find(item => item.roomId === roomId);
  const siege = settlement && (['threatened', 'collapsing', 'sacked'].includes(settlement.state) || Number(settlement.structuralIntegrity ?? 100) < 45) ? 0.45 : 0;
  return Math.min(1, hostile * 0.16 + wounded * 0.1 + recent * 0.22 + siege);
}

function clamp01(value) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
