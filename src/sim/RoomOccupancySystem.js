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