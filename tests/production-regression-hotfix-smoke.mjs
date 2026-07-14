import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ZoneInteractionSystem } from '../src/sim/ZoneInteractionSystem.js';
import { selectZoneInteractions } from '../src/presentation/selectors/selectZoneInteractions.js';

const roomIds = ['A01', 'C11', 'C13', 'C14', 'C15', 'D16', 'D20', 'E22', 'E25', 'F26', 'K53', 'K54', 'K55', 'M61', 'M62', 'M63'];
const rooms = roomIds.map(id => ({ id, name: id, w: 18, d: 14, visualState: 'default' }));
const graph = new Map(roomIds.map(id => [id, new Set(roomIds.filter(other => other !== id))]));
const routeMap = new Map([
  ['conn-C15-F26', route('conn-C15-F26', 'conditional', 'locked')],
  ['conn-D20-J48', route('conn-D20-J48', 'conditional', 'locked')],
  ['route-L56-E25', route('route-L56-E25', 'ordinary', 'open')],
  ['conn-K55-M61', route('conn-K55-M61', 'conditional', 'locked')],
  ['secret-G34-L56', route('secret-G34-L56', 'secret', 'hidden')],
  ['secret-K55-M61', route('secret-K55-M61', 'secret', 'hidden')]
]);
const routeCalls = [];
const settlement = { id: 'settlement-old-lantern-inn', factionId: 'adventurer-expedition', roomId: 'A01', materials: 10, wealth: 4 };
const agents = [
  adventurer('fighter', 'fighter'),
  adventurer('rogue', 'rogue'),
  adventurer('cleric', 'cleric'),
  adventurer('wizard', 'wizard')
];
const sim = {
  time: 0,
  rooms,
  props: [],
  agents,
  graph,
  settlementSystem: { settlements: new Map([[settlement.id, settlement]]), safeSettlementId: settlement.id },
  routeGraph: { getRoute: id => routeMap.get(id), setRouteState },
  setRouteState,
  beginTravel(agent, roomId) { agent.roomId = roomId; agent.travel = null; },
  emitEffect() {}
};
const system = new ZoneInteractionSystem({ rooms, props: [] });
sim.zoneInteractionSystem = system;

await complete('sluice.drain-system', 'C14');
assert.equal(routeMap.get('conn-C15-F26').state, 'opened');
assert.equal(routeMap.get('conn-C15-F26').active, true);

await complete('workshop.reactivate', 'D16');
await complete('workshop.controlled-breach', 'D20');
assert.equal(routeMap.get('conn-D20-J48').state, 'opened');
assert.equal(routeMap.get('conn-D20-J48').active, true);

await complete('ossuary.break-choir', 'E22');
await complete('ossuary.seal-last-names', 'E25');
assert.equal(room('E25').lastNamesSealed, true);
assert.equal(routeMap.get('route-L56-E25').state, 'open');
assert.equal(routeCalls.some(call => call.id === 'conn-E25-L56'), false);

await complete('laboratory.calibrate-observatory', 'K53', 'wizard');
await complete('laboratory.stabilize-summoning', 'K54', 'wizard');
await complete('sanctum.open-seal-gate', 'M61', 'wizard');
assert.equal(routeMap.get('conn-K55-M61').state, 'opened');
assert.equal(routeMap.get('conn-K55-M61').active, true);

const selectorState = {
  entities: {
    rooms: Object.fromEntries(rooms.map(value => [value.id, value])),
    zoneInteractions: {}, settlements: {}, connections: {}, environmentTasks: {}, settlementOrders: {}, props: {}, structures: {}, agents: {}, cargo: {}, factions: {}, parties: {}, effects: {}
  }
};
assert.equal(selectZoneInteractions(selectorState, { type: 'room', id: 'C15', roomId: 'C15' }).actions.length, 0);
assert.equal(selectZoneInteractions(selectorState, { type: 'room', id: 'M62', roomId: 'M62' }).actions.length, 0);

const cameraSource = await source('../src/screens/ObserveScreenCameraPhase10.js');
assert.match(cameraSource, /syncOverlayPresentation\(\)/);
assert.match(cameraSource, /selectOverlayByIndex/);
assert.match(cameraSource, /cycleOverlay/);
assert.match(cameraSource, /ResizeObserver/);

const factorySource = await source('../src/engine/PolishedMiniatureFactory.js');
assert.match(factorySource, /createHeroMiniature\(agent\)/);
assert.match(factorySource, /createEliteMiniature\(agent\)/);
assert.ok(factorySource.indexOf('createHeroMiniature(agent)') < factorySource.indexOf('getMiniatureRecipe(agent.role)'));

const routeRendererSource = await source('../src/engine/AuthoredRouteRenderer.js');
assert.match(routeRendererSource, /worldInteractionHidden/);
// The height-stability fix supplies progress/floor-interpolated route height via
// AuthoredRouteRenderer.prototype.routeY(connection, progress), superseding the
// standalone projectPointToRoute/routeY(renderer, connection, sample) helpers this
// package would otherwise have installed.
assert.match(routeRendererSource, /this\.routeY\(connection/);
assert.doesNotMatch(routeRendererSource, /marker\.position\.set\(point\.x, connection\.elevation \+ 0\.1/);

const pickerSource = await source('../src/engine/WorldInteractionPicker.js');
assert.match(pickerSource, /routeKind === 'secret' && routeState === 'hidden'/);

console.log('Production regression hotfix smoke passed');

async function complete(actionId, roomId, preferredAgentId = null) {
  const response = system.enqueue({ actionId, target: { type: 'room', id: roomId, roomId }, preferredAgentId }, sim);
  assert.equal(response.ok, true, response.error);
  const task = system.tasks.get(response.result.id);
  for (let tick = 0; tick < 240 && !['completed', 'failed'].includes(task.status); tick += 1) {
    for (const agent of agents) {
      const action = system.decide(agent, sim);
      if (action) system.resolve(agent, action, sim);
    }
    sim.time += 0.5;
    system.update(0.5, sim);
  }
  assert.equal(task.status, 'completed', `${actionId}: ${task.lastError}`);
}

function setRouteState(id, state) {
  routeCalls.push({ id, state });
  const value = routeMap.get(id);
  if (!value) return { ok: false, error: `missing route ${id}` };
  const allowed = value.kind === 'ordinary'
    ? new Set(['open', 'collapsed'])
    : value.kind === 'conditional'
      ? new Set(['locked', 'opening', 'opened', 'collapsed'])
      : new Set(['hidden', 'suspected', 'discovered', 'opened', 'collapsed']);
  if (!allowed.has(state)) return { ok: false, error: `invalid ${value.kind} route state ${state}` };
  value.state = state;
  value.active = value.kind === 'ordinary' ? state === 'open' : state === 'opened';
  return { ok: true, result: { routeId: id, state } };
}

function route(id, kind, state) { return { id, kind, state, active: kind === 'ordinary' && state === 'open' }; }
function room(id) { return rooms.find(value => value.id === id); }
function adventurer(id, role) { return { id, name: id, role, faction: 'party', factionId: 'adventurer-expedition', alive: true, roomId: 'A01', hp: 20, maxHp: 20, level: 8, attack: 8, fatigue: 0 }; }
async function source(relative) { return readFile(new URL(relative, import.meta.url), 'utf8'); }
