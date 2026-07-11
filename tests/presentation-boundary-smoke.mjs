import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectAgentInspector } from '../src/presentation/selectors/selectAgentInspector.js';

const snapshot = {
  clock: { time: 12, turn: 4, ended: false },
  entities: {
    agents: {
      hero: {
        id: 'hero',
        name: 'Mira',
        role: 'fighter',
        faction: 'party',
        roomId: 'hall',
        hp: 8,
        maxHp: 10,
        attack: 3,
        defense: 2,
        fatigue: 17,
        gold: 9,
        homeSettlementId: 'camp',
        cargoId: 'cargo-1',
        partyId: 'party-1',
        personalityState: 'watchful',
        personality: { courage: 0.8, greed: 0.2, loyalty: 0.6 },
        relationships: { ally: 0.7, rival: -0.5 },
        roomCell: { overflow: true },
        blockedMoveCount: 2,
        memories: [{ type: 'rescued-ally', intensity: 0.7 }],
        equipment: { weapon: { name: 'Short Sword', rarity: 'common', durability: 8, maxDurability: 10 } },
        inventory: [{ name: 'Bandage' }]
      }
    },
    rooms: {
      hall: { id: 'hall', name: 'Great Hall' }
    },
    connections: {},
    props: {
      banner: { id: 'banner', label: 'Mouse Camp', roomId: 'hall' }
    },
    settlements: {
      camp: {
        id: 'camp',
        type: 'field-camp',
        roomId: 'hall',
        anchorPropId: 'banner',
        state: 'active',
        supplyStatus: 'open',
        supplyEfficiency: 0.75,
        structuralIntegrity: 88,
        population: 4,
        capacity: 6
      }
    },
    factions: {},
    parties: {
      'party-1': {
        id: 'party-1',
        name: 'Lantern Company',
        expeditionState: 'exploring',
        provisions: 4,
        maxProvisions: 8,
        water: 5,
        maxWater: 8,
        endurance: 20,
        maxExpeditionTime: 30,
        expeditionTime: 6,
        baseSettlementId: 'camp'
      }
    },
    cargo: {
      'cargo-1': {
        id: 'cargo-1',
        carrierId: 'hero',
        resourceType: 'scrap',
        amount: 2,
        state: 'carried',
        routeRisk: 0.35,
        escortId: 'ally',
        destinationSettlementId: 'camp'
      }
    },
    structures: {},
    effects: {}
  },
  indexes: { agentsByRoom: { hall: ['hero'] }, propsByRoom: { hall: ['banner'] }, settlementsByFaction: {} },
  events: [],
  metrics: {}
};

const inspector = selectAgentInspector(snapshot, 'hero');
assert.equal(inspector.identity.name, 'Mira');
assert.equal(inspector.intent.roomName, 'Great Hall');
assert.equal(inspector.home.name, 'Mouse Camp');
assert.equal(inspector.home.supplyEfficiency, 0.75);
assert.equal(inspector.cargo.resourceType, 'scrap');
assert.equal(inspector.cargo.escorted, true);
assert.equal(inspector.party.name, 'Lantern Company');
assert.equal(inspector.party.baseName, 'field camp');
assert.equal(inspector.personality.strongestTraits[0].name, 'courage');
assert.equal(inspector.personality.bonds, 1);
assert.equal(inspector.personality.grudges, 1);
assert.equal(inspector.flags.overflowLanding, true);
assert.equal(inspector.equipment[0].slot, 'weapon');
assert.equal(inspector.inventory[0].name, 'Bandage');
assert.equal(selectAgentInspector(snapshot, 'missing'), null);

const screenSource = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
for (const forbidden of ['super.renderInspectPanel()', 'settlementSystem', 'logisticsSystem', 'partySystem']) {
  assert.equal(screenSource.includes(forbidden), false, `Phase 8 screen crossed the presentation boundary via ${forbidden}`);
}
assert.match(screenSource, /getViewModel\(\{ agentId: this\.selectedAgentId \}\)/, 'Phase 8 screen does not consume the facade view model');
assert.match(screenSource, /Explicit migration exception/, 'legacy renderer exception is not documented');

console.log('presentation boundary smoke passed');
