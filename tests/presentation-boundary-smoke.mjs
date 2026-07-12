import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { StrategyObserverShell } from '../src/ui/StrategyObserverShell.js';
import { renderStrategyInspector } from '../src/ui/renderStrategyInspector.js';
import { normalizeLegacySnapshot } from '../src/compat/normalizeLegacySnapshot.js';
import {
  selectAgentInspector,
  selectPartyInspector,
  selectFactionList,
  selectPartyList,
  selectSettlementList,
  selectRoomList,
  selectFollowRoster,
  selectTimelineEvents
} from '../src/presentation/selectors/index.js';

assert.equal(typeof StrategyObserverShell, 'function');
assert.equal(typeof renderStrategyInspector, 'function');

const snapshot = {
  clock: { time: 12, turn: 4, ended: false },
  entities: {
    agents: {
      hero: {
        id: 'hero', name: 'Mira', role: 'fighter', faction: 'party', roomId: 'hall', hp: 8, maxHp: 10,
        attack: 3, defense: 2, fatigue: 17, gold: 9, homeSettlementId: 'camp', cargoId: 'cargo-1', partyId: 'party-1',
        partyLeaderId: 'hero', personalityState: 'watchful', personality: { courage: 0.8, greed: 0.2, loyalty: 0.6 },
        relationships: { ally: 0.7, rival: -0.5 }, roomCell: { overflow: true }, blockedMoveCount: 2,
        memories: [{ type: 'rescued-ally', intensity: 0.7 }],
        equipment: { weapon: { name: 'Short Sword', rarity: 'common', durability: 8, maxDurability: 10 } },
        inventory: [{ name: 'Bandage' }]
      }
    },
    rooms: { hall: { id: 'hall', name: 'Great Hall', kind: 'hall', visited: true } },
    connections: {},
    props: { banner: { id: 'banner', label: 'Mouse Camp', roomId: 'hall' } },
    settlements: {
      camp: {
        id: 'camp', type: 'field-camp', roomId: 'hall', anchorPropId: 'banner', factionId: 'adventurer-expedition',
        state: 'active', supplyStatus: 'open', supplyEfficiency: 0.75, structuralIntegrity: 88, population: 4, capacity: 6
      }
    },
    factions: { 'adventurer-expedition': { id: 'adventurer-expedition', name: 'Adventurers' } },
    parties: {
      'party-1': {
        id: 'party-1', name: 'Lantern Company', leaderId: 'hero', memberIds: ['hero'], expeditionState: 'exploring',
        provisions: 4, maxProvisions: 8, water: 5, maxWater: 8, endurance: 20, maxExpeditionTime: 30,
        expeditionTime: 6, baseSettlementId: 'camp', targetRoomId: 'hall', cohesion: 1
      }
    },
    cargo: {
      'cargo-1': {
        id: 'cargo-1', carrierId: 'hero', resourceType: 'scrap', amount: 2, state: 'carried', routeRisk: 0.35,
        escortId: 'ally', destinationSettlementId: 'camp', factionId: 'adventurer-expedition'
      }
    },
    structures: {}, effects: {}
  },
  indexes: { agentsByRoom: { hall: ['hero'] }, propsByRoom: { hall: ['banner'] }, settlementsByFaction: { 'adventurer-expedition': ['camp'] } },
  events: [
    { id: 'ambient-1', time: 10, type: 'ecology.growth', severity: 'ambient', roomId: 'hall', text: 'Moss spreads.' },
    { id: 'critical-1', time: 11, type: 'combat.death', severity: 'critical', locationRoomId: 'hall', sourceId: 'hero', targetId: 'rival', text: 'A fatal blow lands.' },
    { id: 'historic-1', time: 12, type: 'settlement.founded', severity: 'historic', roomId: 'hall', factionId: 'adventurer-expedition', text: 'A new settlement rises.' }
  ],
  metrics: {}
};

const inspector = selectAgentInspector(snapshot, 'hero');
assert.equal(inspector.identity.name, 'Mira');
assert.equal(inspector.intent.roomName, 'Great Hall');
assert.equal(inspector.home.name, 'Mouse Camp');
assert.equal(inspector.cargo.resourceType, 'scrap');
assert.equal(inspector.party.name, 'Lantern Company');
assert.equal(inspector.personality.strongestTraits[0].name, 'courage');
assert.equal(inspector.equipment[0].slot, 'weapon');
assert.equal(selectAgentInspector(snapshot, 'missing'), null);

const party = selectPartyInspector(snapshot, 'party-1');
assert.equal(party.identity.leaderName, 'Mira');
assert.equal(party.roster.length, 1);
assert.equal(party.target.roomName, 'Great Hall');
assert.equal(selectFactionList(snapshot)[0].id, 'adventurer-expedition');
assert.equal(selectPartyList(snapshot)[0].name, 'Lantern Company');
assert.equal(selectSettlementList(snapshot)[0].name, 'Mouse Camp');
assert.equal(selectRoomList(snapshot)[0].occupantCount, 1);
assert.equal(selectFollowRoster(snapshot)[0].id, 'hero');

const majorEvents = selectTimelineEvents(snapshot, { filter: 'major' });
assert.deepEqual(majorEvents.map(event => event.id), ['critical-1', 'historic-1']);
assert.equal(majorEvents[0].roomId, 'hall');
assert.equal(majorEvents[0].actorId, 'hero');
assert.equal(majorEvents[0].targetId, 'rival');
assert.equal(selectTimelineEvents(snapshot, { filter: 'ecology' }).length, 1);

const normalized = normalizeLegacySnapshot({
  time: 3,
  agents: [
    { id: 'hero', name: 'Mira', faction: 'party', partyId: 'party-1', partyLeaderId: 'hero', partyState: 'stretched', roomId: 'hall', alive: true },
    { id: 'ally', name: 'Ivo', faction: 'party', partyId: 'party-1', partyLeaderId: 'hero', roomId: 'gate', travel: { toRoomId: 'hall' }, alive: true }
  ],
  rooms: [{ id: 'hall' }, { id: 'gate' }],
  expedition: { parties: [{ id: 'party-1', name: 'Lantern Company', provisions: 4, expeditionState: 'exploring' }] }
});
assert.ok(normalized.entities.factions['adventurer-expedition']);
assert.deepEqual(normalized.entities.parties['party-1'].memberIds.sort(), ['ally', 'hero']);
assert.equal(normalized.entities.parties['party-1'].leaderId, 'hero');
assert.equal(normalized.entities.parties['party-1'].state, 'exploring');
assert.equal(normalized.entities.parties['party-1'].targetRoomId, 'hall');
assert.equal(normalized.entities.parties['party-1'].cohesion, null);

const screenSource = await readFile(new URL('../src/screens/ObserveScreenPhase8.js', import.meta.url), 'utf8');
for (const forbidden of ['super.renderInspectPanel()', 'settlementSystem', 'logisticsSystem', 'partySystem', 'this.sim.agents']) {
  assert.equal(screenSource.includes(forbidden), false, `Phase 8 screen crossed the presentation boundary via ${forbidden}`);
}
assert.match(screenSource, /StrategyObserverShell/, 'production strategy shell is not mounted');
assert.match(screenSource, /getViewModel/, 'Phase 8 screen does not consume the facade view model');
assert.match(screenSource, /this\.selection = \{ type: 'agent', id: this\.selectedAgentId \}/, 'canvas picks are not synchronized to shell selection');
assert.match(screenSource, /renderer\.renderState\(this\.sim\.snapshot\(\)\)/, 'legacy renderer migration exception disappeared unexpectedly');
assert.match(screenSource, /setCameraTarget\(this\.mapCamera\.x, this\.mapCamera\.y, this\.mapCamera\.z, null, false\)/, 'overview camera still overwrites user zoom each frame');
assert.match(screenSource, /cycleFollowTarget/, 'follow roster cycling is not wired');
assert.match(screenSource, /focusTimelineEvent/, 'chronicle events cannot focus the world');
assert.match(screenSource, /togglePinnedEvent/, 'chronicle pins are not wired');
assert.match(screenSource, /focusNavigatorSearch/, 'world-index search shortcut is not wired');

const shellSource = await readFile(new URL('../src/ui/StrategyObserverShell.js', import.meta.url), 'utf8');
assert.equal(shellSource.includes('sim.'), false, 'strategy shell accesses simulation internals');
assert.match(shellSource, /strategy-topbar/);
assert.match(shellSource, /strategy-navigator/);
assert.match(shellSource, /strategy-inspector/);
assert.match(shellSource, /strategy-timeline/);
assert.match(shellSource, /strategy-mobile-nav/, 'mobile surface navigation is missing');
assert.match(shellSource, /data-shell-camera-action="focus"/, 'selection focus control is missing');
assert.match(shellSource, /data-camera-strip/, 'legacy camera controls are not removed during shell mount');
assert.match(shellSource, /data-shell-nav-search/, 'navigator search is missing');
assert.match(shellSource, /data-event-pin/, 'chronicle pin control is missing');
assert.match(shellSource, /setTimelineFilter\('major'\)/, 'alert button does not open major events');
assert.match(shellSource, /aria-current/, 'navigator selection is not exposed accessibly');

// strategy-observer-polish.css was superseded by the Route A production theme
// (strategy-observer.css), which is a strict superset of its styling contracts.
const themeSource = await readFile(new URL('../src/strategy-observer.css', import.meta.url), 'utf8');
assert.match(themeSource, /strategy-nav-row\.is-selected/, 'selected navigator row is not styled');
assert.match(themeSource, /strategy-pinned-events/, 'pinned chronicle strip is not styled');
assert.match(themeSource, /min-height: 44px/, 'mobile controls do not meet the touch target contract');

const expeditionSource = await readFile(new URL('../src/sim/ExpeditionSystem.js', import.meta.url), 'utf8');
for (const uiField of ['memberIds: [...(party.memberIds', 'leaderId: party.leaderId', 'cohesion: round(party.cohesion']) {
  assert.equal(expeditionSource.includes(uiField), false, `ExpeditionSystem still contains UI projection field: ${uiField}`);
}

console.log('presentation boundary, chronicle and navigator UX smoke passed');
