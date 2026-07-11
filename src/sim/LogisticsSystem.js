import { graphDistance, nextStep } from './Pathfinding.js';

const ACTIVE_STATES = new Set(['active', 'threatened', 'damaged']);

export class LogisticsSystem {
  constructor({ rooms, props, graph, settlementSystem, territorySystem, partySystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.settlementSystem = settlementSystem;
    this.territorySystem = territorySystem;
    this.partySystem = partySystem;
    this.onEvent = onEvent;
    this.cargo = [];
    this.sequence = 0;
    this