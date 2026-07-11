const DEFAULT_CELL_SIZE = 0.78;
const WALL_MARGIN = 0.82;

const MELEE_ROLES = new Set(['fighter', 'paladin', 'barbarian', 'goblin', 'skeleton', 'orc', 'ogre', 'mimic']);
const RANGED_ROLES = new Set(['wizard', 'archer', 'ranger', 'warlock']);
const SUPPORT_ROLES = new Set(['cleric', 'druid', 'bard']);

export class RoomOccupancySystem {
  constructor(rooms, topology, { cellSize = DEFAULT_CELL_SIZE } = {}) {
    this.rooms = rooms;
    this.topology = topology;
    this.cellSize = cellSize;
    this.grids = new Map();
    this.occupiedByCell = new Map();
    this.agentCells = new Map();
    this.reservations = new Map();
    this.blockedCells = new Map();
    this.buildGrids();
  }

  buildGrids() {
    for (const room of this.rooms) {
      const usableW = Math.max(this.cellSize, room.w - WALL_MARGIN * 2);
      const usableD = Math.max(this.cellSize, room.d - WALL_MARGIN * 2);
      const cols = Math.max(1, Math.floor(usableW / this.cellSize));
      const rows = Math.max(1, Math.floor(usableD / this.cellSize));
      const cells = [];

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = room.x + (col - (cols - 1) / 2) * this.cellSize;
          const z = room.z + (row - (rows - 1) / 2) * this.cellSize;
          cells.push({
            id: `${room.id}:cell:${col}:${row}`,
            roomId: room.id,
            col,
            row,
            x,
            z,
            walkable: true
          });
        }
      }

      this.grids.set(room.id, { roomId: room.id, cols, rows, cells });
    }
  }

  initializeAgents(agents) {
    const ordered = [...agents].sort((a, b) => this.roleOrder(a.role) - this.roleOrder(b.role) || a.index - b.index);
    for (const agent of ordered) {
      if (!agent.alive || agent.departed || agent.hidden) continue;
      this.placeAgent(agent, agent.roomId, null);
    }
  }

  placeAgent(agent, roomId, entryPort = null) {
    this.release(agent.id);
    const reservation = this.reserveDestination(agent, roomId, entryPort);
    if (!reservation) {
      agent.roomCell = null;
      return null;
    }
    return this.commitReservation(agent, reservation);
  }

  reserveDestination(agent, roomId, entryPort = null) {
    this.cancelReservation(agent.id);
    const grid = this.grids.get(roomId);
    if (!grid) return null;

    const footprintSize = agent.size === 'large' || agent.role === 'ogre' ? 2 : 1;
    const candidates = grid.cells
      .map(cell => ({
        cell,
        footprint: this.getFootprint(grid, cell, footprintSize),
        score: this.scoreCell(agent, cell, entryPort, grid)
      }))
      .filter(candidate => candidate.footprint.length === footprintSize * footprintSize)
      .filter(candidate => candidate.footprint.every(cell => this.isCellFree(cell.id, agent.id)))
      .sort((a, b) => a.score - b.score || a.cell.id.localeCompare(b.cell.id));

    const selected = candidates[0];
    if (!selected) return null;

    const reservation = {
      agentId: agent.id,
      roomId,
      cellId: selected.cell.id,
      x: average(selected.footprint.map(cell => cell.x)),
      z: average(selected.footprint.map(cell => cell.z)),
      footprint: selected.footprint.map(cell => cell.id)
    };

    this.reservations.set(agent.id, reservation);
    return reservation;
  }

  commitReservation(agent, reservation = this.reservations.get(agent.id)) {
    if (!reservation) return null;
    this.release(agent.id);
    for (const cellId of reservation.footprint) this.occupiedByCell.set(cellId, agent.id);
    this.agentCells.set(agent.id, reservation);
    this.reservations.delete(agent.id);
    agent.roomCell = { ...reservation };
    return agent.roomCell;
  }

  blockArea(roomId, worldX, worldZ, radius, blockerId) {
    const grid = this.grids.get(roomId);
    if (!grid) return [];
    const blocked = [];
    for (const cell of grid.cells) {
      if (Math.hypot(cell.x - worldX, cell.z - worldZ) > radius) continue;
      this.blockedCells.set(cell.id, blockerId);
      blocked.push(cell.id);
    }
    return blocked;
  }

  unblockByBlocker(blockerId) {
    const released = [];
    for (const [cellId, currentBlocker] of [...this.blockedCells.entries()]) {
      if (currentBlocker !== blockerId) continue;
      this.blockedCells.delete(cellId);
      released.push(cellId);
    }
    return released;
  }

  release(agentId) {
    const current = this.agentCells.get(agentId);
    if (current) {
      for (const cellId of current.footprint ?? []) {
        if (this.occupiedByCell.get(cellId) === agentId) this.occupiedByCell.delete(cellId);
      }
    }
    this.agentCells.delete(agentId);
  }

  cancelReservation(agentId) {
    this.reservations.delete(agentId);
  }

  getAgentCell(agentId) {
    return this.agentCells.get(agentId) ?? null;
  }

  getReservation(agentId) {
    return this.reservations.get(agentId) ?? null;
  }

  isCellFree(cellId, requestingAgentId = null) {
    if (this.blockedCells.has(cellId)) return false;
    const occupant = this.occupiedByCell.get(cellId);
    if (occupant && occupant !== requestingAgentId) return false;
    for (const reservation of this.reservations.values()) {
      if (reservation.agentId === requestingAgentId) continue;
      if (reservation.footprint.includes(cellId)) return false;
    }
    return true;
  }

  getFootprint(grid, anchor, size) {
    if (size === 1) return [anchor];
    const cells = [];
    for (let rowOffset = 0; rowOffset < size; rowOffset += 1) {
      for (let colOffset = 0; colOffset < size; colOffset += 1) {
        const cell = grid.cells.find(candidate => candidate.col === anchor.col + colOffset && candidate.row === anchor.row + rowOffset);
        if (!cell) return [];
        cells.push(cell);
      }
    }
    return cells;
  }

  scoreCell(agent, cell, entryPort, grid) {
    const room = this.rooms.find(candidate => candidate.id === cell.roomId);
    const centerDistance = room ? Math.hypot(cell.x - room.x, cell.z - room.z) : 0;
    const portDistance = entryPort ? Math.hypot(cell.x - entryPort.x, cell.z - entryPort.z) : centerDistance;
    const depth = entryPort
      ? (cell.x - entryPort.x) * -entryPort.normalX + (cell.z - entryPort.z) * -entryPort.normalZ
      : 0;
    const lateral = entryPort
      ? Math.abs((cell.x - entryPort.x) * entryPort.normalZ - (cell.z - entryPort.z) * entryPort.normalX)
      : centerDistance;

    if (agent.role === 'rogue') return portDistance * 0.55 + Math.abs(lateral - this.cellSize * 1.2) * 0.75;
    if (RANGED_ROLES.has(agent.role)) return portDistance * 0.35 + Math.abs(depth - this.cellSize * 0.7) + lateral * 0.15;
    if (SUPPORT_ROLES.has(agent.role)) return centerDistance * 0.65 + portDistance * 0.25;
    if (MELEE_ROLES.has(agent.role)) return portDistance * 0.25 + Math.abs(depth - this.cellSize * 2.1) * 0.75 + lateral * 0.2;
    return portDistance * 0.5 + centerDistance * 0.3;
  }

  roleOrder(role) {
    if (MELEE_ROLES.has(role)) return 0;
    if (role === 'rogue') return 1;
    if (SUPPORT_ROLES.has(role)) return 2;
    if (RANGED_ROLES.has(role)) return 3;
    return 4;
  }

  snapshot() {
    return {
      grids: [...this.grids.values()].map(grid => ({
        roomId: grid.roomId,
        cols: grid.cols,
        rows: grid.rows,
        cells: grid.cells
      })),
      occupied: [...this.agentCells.entries()].map(([agentId, cell]) => ({ agentId, ...cell })),
      reserved: [...this.reservations.values()],
      blocked: [...this.blockedCells.entries()].map(([cellId, blockerId]) => ({ cellId, blockerId }))
    };
  }
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
