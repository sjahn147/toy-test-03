import { graphDistance, nextStep } from './Pathfinding.js';

const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);
const ESCORT_ROLES = new Set(['fighter', 'rogue', 'archer', 'goblin', 'skeleton', 'orc', 'kobold', 'wraith']);

export class LogisticsSystem {
  constructor({ rooms, props, graph, settlementSystem, territorySystem, partySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this