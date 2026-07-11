import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  selectOverlayAvailability,
  selectTerritoryOverlay,
  selectSupplyOverlay,
  selectDangerOverlay
} from '../src/presentation/selectors/index.js';

const state = {
  clock: { time: 12, turn: 1, ended: false },
  entities: {
    rooms: {
      hall: { id: 'hall', territoryOwner: 'adventurer-expedition', control: 80, contested: false },
      gate: { id: 'gate', territoryOwner: 'goblins', control: 45, contested: true }
    },
    agents: {
      hero: { id: 'hero', faction: 'party', roomId: 'hall', hp: 10, maxHp: 10 },
      goblin: { id: 'goblin', faction: 'dungeon', factionId: 'goblins', roomId: 'gate', hp: 2, maxHp: 10 }
    },
    settlements: {
      camp: { id: 'camp', roomId: 'hall', supplyStatus: 'open', supplyEfficiency: 0.8 },
      fort: { id: 'fort', roomId: 'gate', supplyStatus: 'cut-off', structuralIntegrity: 30, state: 'threatened' }
    },
    cargo: {
      food: { id: 'food', roomId: 'hall', amount: 4, routeRisk: 0.2, state: 'stored' },
      ore: { id: 'ore', roomId: 'gate', amount: 2, routeRisk: 0.8, state: 'raided' }
    },
    factions: {}, parties: {}, connections: {}, props: {}, structures: {}, effects: {}
  },
  indexes: { agentsByRoom: { hall: ['hero'], gate: ['goblin'] }, propsByRoom: {}, settlementsByFaction: {} },
  events: [{ id: 'battle', type: 'combat.attack', severity: 'major', roomId: 'gate' }],
  metrics: {}
};

const availability = selectOverlayAvailability(state);
assert.equal(availability.territory.available, true);
assert.equal(availability.supply.available, true);
assert.equal(availability.danger.available, true);

const territory = selectTerritoryOverlay(state);
assert.equal(territory.find(row => row.roomId === 'gate').contested, true);
assert.equal(territory.find(row => row.roomId === 'hall').ownerId, 'adventurer-expedition');

const supply = selectSupplyOverlay(state);
assert.equal(supply.find(row => row.roomId === 'gate').blocked, true);
assert.ok(supply.find(row => row.roomId === 'hall').intensity > 0);

const danger = selectDangerOverlay(state);
assert.equal(danger.find(row => row.roomId === 'gate').critical, true);
assert.equal(danger.find(row => row.roomId === 'hall').critical, false);

const facadeSource = await readFile(new URL('../src/application/GameRuntimeFacade.js', import.meta.url), 'utf8');
assert.match(facadeSource, /overlayMode/);
assert.match(facadeSource, /selectOverlayAvailability/);

const screenSource = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
assert.match(screenSource, /StrategicOverlayLayer/);
assert.match(screenSource, /StrategyOverlayToolbar/);
assert.match(screenSource, /overlayMode: this\.activeOverlay/);

const layerSource = await readFile(new URL('../src/ui/StrategicOverlayLayer.js', import.meta.url), 'utf8');
assert.match(layerSource, /depthWrite: false/);
assert.match(layerSource, /dispose/);

const toolbarSource = await readFile(new URL('../src/ui/StrategyOverlayToolbar.js', import.meta.url), 'utf8');
assert.match(toolbarSource, /aria-pressed/);
assert.match(toolbarSource, /territory/);
assert.match(toolbarSource, /supply/);
assert.match(toolbarSource, /danger/);

console.log('strategic overlay selectors, toolbar and layer smoke passed');
