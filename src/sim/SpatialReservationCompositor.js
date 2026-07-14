const DEFAULT_PLACEMENT_MARGIN = 0.18;

export class SpatialReservationCompositor {
  constructor({ rooms, topology, grids, blockedCells, occupiedByCell = null, reservations = null, cellSize = 0.78 } = {}) {
    this.rooms = Array.isArray(rooms) ? rooms : [];
    this.roomById = new Map(this.rooms.map(room => [room.id, room]));
    this.topology = topology ?? { roomPorts: new Map() };
    this.grids = grids instanceof Map ? grids : new Map();
    this.blockedCells = blockedCells instanceof Map ? blockedCells : new Map();
    this.occupiedByCell = occupiedByCell instanceof Map ? occupiedByCell : new Map();
    this.agentReservations = reservations instanceof Map ? reservations : new Map();
    this.cellSize = cellSize;
    this.blockersByCell = new Map();
    this.cellsByBlocker = new Map();
    this.placementReservationsByCell = new Map();
    this.placementCellsByBlocker = new Map();
    this.metadataByBlocker = new Map();
    this.reserveTopologyClearance();
  }

  reserveTopologyClearance() {
    const entries = this.topology?.roomPorts instanceof Map
      ? this.topology.roomPorts.entries()
      : Object.entries(this.topology?.roomPorts ?? {});
    for (const [roomId, ports] of entries) {
      for (const port of ports ?? []) {
        const width = Math.max(this.cellSize, Number(port.width) || 1.5);
        const inwardX = Number(port.x) - (Number(port.normalX) || 0) * Math.max(0.72, width * 0.45);
        const inwardZ = Number(port.z) - (Number(port.normalZ) || 0) * Math.max(0.72, width * 0.45);
        this.reserveCircle({
          roomId,
          worldX: inwardX,
          worldZ: inwardZ,
          radius: width * 0.58 + DEFAULT_PLACEMENT_MARGIN,
          blockerId: `route-clearance:${port.id ?? `${roomId}:${port.side}`}`,
          blocksMovement: false,
          blocksPlacement: true,
          metadata: { kind: 'route-clearance', roomId, portId: port.id ?? null, persistent: true }
        });
      }
    }
  }

  reserveCircle({ roomId, worldX, worldZ, radius, blockerId, blocksMovement = true, blocksPlacement = true, metadata = {} } = {}) {
    const grid = this.grids.get(roomId);
    if (!grid || !blockerId) return [];
    const id = String(blockerId);
    this.releaseBlocker(id);
    const affected = [];
    const safeRadius = Math.max(0.05, Number(radius) || 0.05);
    for (const cell of grid.cells ?? []) {
      if (Math.hypot(cell.x - Number(worldX), cell.z - Number(worldZ)) > safeRadius) continue;
      affected.push(cell.id);
      if (blocksMovement) this.addMovementBlocker(cell.id, id, roomId);
      if (blocksPlacement) this.addPlacementBlocker(cell.id, id);
    }
    this.metadataByBlocker.set(id, {
      id, roomId, worldX: Number(worldX), worldZ: Number(worldZ), radius: safeRadius,
      blocksMovement: Boolean(blocksMovement), blocksPlacement: Boolean(blocksPlacement),
      kind: metadata.kind ?? inferKind(id), ...metadata
    });
    return affected;
  }

  addMovementBlocker(cellId, blockerId, roomId) {
    let blockers = this.blockersByCell.get(cellId);
    if (!blockers) {
      blockers = new Set();
      this.blockersByCell.set(cellId, blockers);
    }
    blockers.add(blockerId);
    let cells = this.cellsByBlocker.get(blockerId);
    if (!cells) {
      cells = new Set();
      this.cellsByBlocker.set(blockerId, cells);
    }
    cells.add(cellId);
    this.blockedCells.set(cellId, [...blockers][0]);
  }

  addPlacementBlocker(cellId, blockerId) {
    let blockers = this.placementReservationsByCell.get(cellId);
    if (!blockers) {
      blockers = new Set();
      this.placementReservationsByCell.set(cellId, blockers);
    }
    blockers.add(blockerId);
    let cells = this.placementCellsByBlocker.get(blockerId);
    if (!cells) {
      cells = new Set();
      this.placementCellsByBlocker.set(blockerId, cells);
    }
    cells.add(cellId);
  }

  releaseBlocker(blockerId) {
    const id = String(blockerId ?? '');
    if (!id) return [];
    const released = new Set();
    for (const cellId of this.cellsByBlocker.get(id) ?? []) {
      const blockers = this.blockersByCell.get(cellId);
      if (!blockers) continue;
      blockers.delete(id);
      released.add(cellId);
      if (!blockers.size) {
        this.blockersByCell.delete(cellId);
        this.blockedCells.delete(cellId);
      } else {
        this.blockedCells.set(cellId, [...blockers][0]);
      }
    }
    for (const cellId of this.placementCellsByBlocker.get(id) ?? []) {
      const blockers = this.placementReservationsByCell.get(cellId);
      if (!blockers) continue;
      blockers.delete(id);
      released.add(cellId);
      if (!blockers.size) this.placementReservationsByCell.delete(cellId);
    }
    this.cellsByBlocker.delete(id);
    this.placementCellsByBlocker.delete(id);
    this.metadataByBlocker.delete(id);
    return [...released];
  }

  isMovementBlocked(cellId) { return this.blockersByCell.has(cellId) || this.blockedCells.has(cellId); }

  isPlacementBlocked(cellId, ignoreBlockerId = null) {
    return hasForeign(this.placementReservationsByCell.get(cellId), ignoreBlockerId)
      || hasForeign(this.blockersByCell.get(cellId), ignoreBlockerId);
  }

  findPlacement(roomId, { radius = 0.8, preferred = null, avoidOccupied = true, ignoreBlockerId = null, edgeBias = 0.35 } = {}) {
    const room = this.roomById.get(roomId);
    const grid = this.grids.get(roomId);
    if (!room || !grid?.cells?.length) return null;
    const preferredWorld = { x: room.x + Number(preferred?.ox ?? 0), z: room.z + Number(preferred?.oz ?? 0) };
    const requiredRadius = Math.max(this.cellSize * 0.45, Number(radius) || 0.8);
    const selected = grid.cells
      .map(cell => {
        const footprint = this.cellsWithin(roomId, cell.x, cell.z, requiredRadius);
        const blocked = footprint.some(item => this.isPlacementBlocked(item.id, ignoreBlockerId));
        const occupied = avoidOccupied && footprint.some(item => this.occupiedByCell.has(item.id) || this.isAgentReserved(item.id));
        const centerDistance = Math.hypot(cell.x - room.x, cell.z - room.z);
        const preferredDistance = Math.hypot(cell.x - preferredWorld.x, cell.z - preferredWorld.z);
        return { cell, footprint, blocked, occupied, score: preferredDistance + centerDistance * edgeBias };
      })
      .filter(item => item.footprint.length > 0 && !item.blocked && !item.occupied)
      .sort((a, b) => a.score - b.score || a.cell.id.localeCompare(b.cell.id))[0];
    if (!selected) return null;
    return {
      ox: round(selected.cell.x - room.x), oz: round(selected.cell.z - room.z),
      x: selected.cell.x, z: selected.cell.z, cellId: selected.cell.id,
      footprint: selected.footprint.map(cell => cell.id)
    };
  }

  cellsWithin(roomId, worldX, worldZ, radius) {
    const grid = this.grids.get(roomId);
    if (!grid) return [];
    return grid.cells.filter(cell => Math.hypot(cell.x - worldX, cell.z - worldZ) <= radius);
  }

  isAgentReserved(cellId) {
    for (const reservation of this.agentReservations.values()) {
      if (reservation?.overflow) continue;
      if (reservation?.footprint?.includes(cellId)) return true;
    }
    return false;
  }

  roomState(roomId) {
    const grid = this.grids.get(roomId);
    if (!grid) return emptyRoomState(roomId);
    const cells = grid.cells ?? [];
    const blocked = cells.filter(cell => this.isMovementBlocked(cell.id));
    const placement = cells.filter(cell => this.placementReservationsByCell.has(cell.id));
    const routeReserved = cells.filter(cell => [...(this.placementReservationsByCell.get(cell.id) ?? [])].some(id => String(id).startsWith('route-clearance:')));
    return {
      roomId,
      totalCells: cells.length,
      walkableCells: cells.length - blocked.length,
      actorCapacity: cells.length - blocked.length,
      blockedCells: blocked.length,
      placementReservedCells: placement.length,
      routeReservedCells: routeReserved.length,
      largeAnchors: cells.filter(cell => this.largeFootprintFree(grid, cell)).length,
      conflicts: this.roomConflicts(roomId).length
    };
  }

  roomConflicts(roomId) {
    const grid = this.grids.get(roomId);
    if (!grid) return [];
    const conflicts = [];
    for (const cell of grid.cells ?? []) {
      const blockers = new Set([
        ...(this.blockersByCell.get(cell.id) ?? []),
        ...(this.placementReservationsByCell.get(cell.id) ?? [])
      ]);
      if (blockers.size <= 1) continue;
      conflicts.push({ roomId, cellId: cell.id, blockerIds: [...blockers].sort(), kind: 'reservation-overlap' });
    }
    return conflicts;
  }

  largeFootprintFree(grid, anchor) {
    const cells = [];
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const cell = grid.cells.find(item => item.col === anchor.col + col && item.row === anchor.row + row);
        if (!cell || this.isMovementBlocked(cell.id)) return false;
        cells.push(cell);
      }
    }
    return cells.length === 4;
  }

  snapshot() {
    return {
      schemaVersion: 1,
      rooms: [...this.grids.keys()].map(roomId => this.roomState(roomId)),
      blockers: [...this.metadataByBlocker.values()].map(item => ({ ...item })),
      conflicts: [...this.grids.keys()].flatMap(roomId => this.roomConflicts(roomId))
    };
  }
}

function emptyRoomState(roomId) {
  return { roomId, totalCells: 0, walkableCells: 0, actorCapacity: 0, blockedCells: 0, placementReservedCells: 0, routeReservedCells: 0, largeAnchors: 0, conflicts: 0 };
}

function hasForeign(set, ignoreBlockerId) {
  if (!set?.size) return false;
  if (!ignoreBlockerId) return true;
  for (const value of set) if (String(value) !== String(ignoreBlockerId)) return true;
  return false;
}

function inferKind(id) {
  const value = String(id).toLowerCase();
  if (value.includes('route') || value.includes('door') || value.includes('portal')) return 'route-clearance';
  if (value.includes('construction') || value.includes('gatehouse') || value.includes('barricade')) return 'structure';
  if (value.includes('settlement') || value.includes('camp') || value.includes('outpost')) return 'settlement';
  if (value.includes('lair') || value.includes('garden') || value.includes('pool') || value.includes('warren')) return 'ecology';
  if (value.includes('fountain') || value.includes('statue') || value.includes('merchant')) return 'facility';
  return 'prop';
}

function round(value) { return Math.round(Number(value) * 100) / 100; }
