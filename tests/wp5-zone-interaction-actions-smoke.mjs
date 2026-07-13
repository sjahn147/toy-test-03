import assert from 'node:assert/strict';
import { selectZoneInteractions } from '../src/presentation/selectors/selectZoneInteractions.js';
import { selectWorldTaskActions } from '../src/presentation/selectors/selectWorldTaskActions.js';

const state = {
  entities: {
    rooms: {
      C14: { id: 'C14', name: 'Drainage Engine Hall' },
      D16: { id: 'D16', name: 'Abandoned Workshop' },
      D20: { id: 'D20', name: 'Powder Magazine' },
      E22: { id: 'E22', name: 'Funeral Chapel', choirBroken: true },
      E25: { id: 'E25', name: 'Well of Last Names' },
      F30: { id: 'F30', name: 'Mycelial Heart' },
      I44: { id: 'I44', name: 'Neutral Well' },
      K53: { id: 'K53', name: 'Sealed Observatory', observatoryCalibrated: true },
      K54: { id: 'K54', name: 'Failed Summoning Room', summoningStabilized: true },
      M61: { id: 'M61', name: 'Seal Gate', sealGateOpened: true },
      M63: { id: 'M63', name: 'Heart Chamber' }
    },
    connections: {
      'conn-D20-J48': { id: 'conn-D20-J48', state: 'locked' }
    },
    settlements: {
      'settlement-old-lantern-inn': { id: 'settlement-old-lantern-inn', factionId: 'adventurer-expedition', materials: 4, wealth: 2 }
    },
    zoneInteractions: {
      active: { id: 'zone-interaction-4', actionId: 'sluice.drain-system', label: 'Drain the flooded storehouses', targetRoomId: 'C14', status: 'working', progress: 0.4, assignedAgentIds: ['rogue'] }
    },
    environmentTasks: {},
    settlementOrders: {},
    props: {},
    structures: {},
    agents: {},
    cargo: {},
    factions: {},
    parties: {},
    effects: {}
  },
  indexes: {
    agentsByRoom: {}, propsByRoom: {}, settlementsByFaction: {},
    environmentTasksByRoom: {}, environmentTasksByTarget: {},
    settlementOrdersByRoom: {}, settlementOrdersBySettlement: {},
    zoneInteractionsByRoom: { C14: ['active'] }, zoneInteractionsByAction: { 'sluice.drain-system': ['active'] }
  },
  clock: { time: 0, turn: 0, ended: false },
  events: []
};

const sluice = selectZoneInteractions(state, { type: 'room', id: 'C14', roomId: 'C14' });
assert.equal(sluice.actions.length, 1);
assert.equal(sluice.actions[0].enabled, false);
assert.match(sluice.actions[0].reason, /already working/);
assert.equal(sluice.tasks.length, 1);

const breach = selectZoneInteractions(state, { type: 'room', id: 'D20', roomId: 'D20' });
assert.equal(breach.actions[0].enabled, false);
assert.match(breach.actions[0].reason, /Reactivate D16/);
state.entities.rooms.D16.workshopOperational = true;
assert.equal(selectZoneInteractions(state, { type: 'room', id: 'D20', roomId: 'D20' }).actions[0].enabled, true);

const ossuary = selectZoneInteractions(state, { type: 'room', id: 'E25', roomId: 'E25' });
assert.equal(ossuary.actions[0].enabled, true);

const final = selectZoneInteractions(state, { type: 'room', id: 'M63', roomId: 'M63' });
assert.equal(final.actions.length, 3);
assert.ok(final.actions.every(action => action.enabled));
state.entities.rooms.M63.campaignResolution = 'seal';
assert.ok(selectZoneInteractions(state, { type: 'room', id: 'M63', roomId: 'M63' }).actions.every(action => !action.enabled));

const merged = selectWorldTaskActions(state, { type: 'room', id: 'F30', roomId: 'F30' });
assert.ok(merged.actions.some(action => action.id === 'fungal.communion'));
assert.ok(merged.actions.some(action => action.id === 'fungal.burn-heart'));

console.log('wp5 zone interaction actions smoke: ok');
