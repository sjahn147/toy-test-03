import { graphDistance, nextStep } from './Pathfinding.js';

const ADVENTURER_FACTION = 'adventurer-expedition';
const ACTIVE_SETTLEMENT_STATES = new Set(['active', 'threatened', 'damaged']);

export class ExpeditionSystem {
  constructor({ rooms, props, graph, partySystem, settlementSystem, territorySystem, occupancy, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.graph = graph;
    this.partySystem = partySystem;
