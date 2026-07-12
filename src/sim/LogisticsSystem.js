import { graphDistance, nextStep } from './Pathfinding.js';

const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);
const ESCORT_ROLES = new Set(['fighter', 'rogue', 'archer', 'goblin', 'skeleton', 'orc', 'kobold', 'wraith']);
const ESCORT_RISK_THRESHOLD = 0.42;
const MAX_ROUTE_RISK = 0.9;

export class LogisticsSystem {
  constructor({ rooms, props, graph, settlementSystem, territorySystem, partySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.partySystem = partySystem;
    this.onEvent = onEvent;
    this.constructionSystem = null;
    this.cargo = [];