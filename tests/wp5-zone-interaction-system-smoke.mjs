import assert from 'node:assert/strict';
import { ZoneInteractionSystem } from '../src/sim/ZoneInteractionSystem.js';

const roomIds = ['A01', 'C11', 'C13', 'C14', 'C15', 'D16', 'D20', 'E22', 'E25', 'F26', 'F27', 'F28', 'F29', 'F30', 'G32', 'I41', 'I44', 'J49', 'J50', 'K53', 'K54', 'M61', 'M62', 'M63'];
const rooms = roomIds.map(id => ({ id, name: id, w: 18, d: 14, visualState: 'default' }));
const graph = new Map(roomIds.map(id => [id, new Set(roomIds.filter(other => other !== id))]));
const routeMap = new Map([
  ['conn-C15-F26', { id: 'conn-C15-F26', kind: 'conditional', state: 'locked' }],
  ['conn-D20-J48', { id: 'conn-D20-J48', kind: 'conditional', state: 'locked' }],
  ['conn-E25-L56', { id: 'conn-E25-L56', kind: 'conditional', state: 'locked' }],
  ['conn-K55-M61', { id: 'conn-K55-M61', kind: 'conditional', state: 'locked' }],
  ['secret-G34-L56', { id: 'secret-G34-L56', kind: 'secret', state: 'hidden' }],
  ['secret-K55-M61', { id: 'secret-K55-M61', kind: 'secret', state: 'hidden' }]
]);
const settlement = { id: 'settlement-old-lantern-inn', factionId: 'adventurer-expedition', roomId: 'I41', materials: 10, wealth: 4 };
const agents = [
  adventurer('fighter', 'fighter', 10, 10, 20),
  adventurer('rogue', 'rogue', 6, 7, 14),
  adventurer('cleric', 'cleric', 6, 5, 15),
  adventurer('wizard', 'wizard', 7, 5, 12),
  { id: 'captive', name: 'Captive', role: 'fighter', faction: 'party', factionId: 'adventurer-expedition', alive: true, roomId: 'G32', hosted: true, attachedToId: 'spider-web', hp: 0, maxHp: 10 },
  { id: 'orc-champion', name: 'Red Pit Champion', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-orcs', alive: true, roomId: 'J49', hp: 12, maxHp: 12, level: 3 }
];
const events = [];
const sim = {
  time: 0,
  rooms,
  props: [],
  agents,
  graph,
  visited: new Set(),
  settlementSystem: { settlements: new Map([[settlement.id, settlement]]), safeSettlementId: settlement.id },
  routeGraph: { getRoute: id => routeMap.get(id), setRouteState: (id, state) => setRouteState(id, state) },
  setRouteState,
  beginTravel(agent, roomId) { agent.roomId = roomId; agent.travel = null; },
  emitEffect() {},
  event(text, meta = {}) { events.push({ text, ...meta }); }
};
function setRouteState(id, state) {
  const route = routeMap.get(id);
  if (!route) return { ok: false, error: `missing route ${id}` };
  route.state = state;
  return { ok: true, result: { routeId: id, state } };
}
const system = new ZoneInteractionSystem({ rooms, props: [], onEvent: (text, meta) => events.push({ text, ...meta }) });
sim.zoneInteractionSystem = system;

await run('sluice.drain-system', 'C14');
assert.equal(room('C14').mechanismOperational, true);
assert.equal(room('C11').visualState, 'drained');
assert.equal(routeMap.get('conn-C15-F26').state, 'open');

await run('workshop.reactivate', 'D16');
assert.equal(room('D16').workshopOperational, true);
assert.equal(settlement.materials, 8);
await run('workshop.controlled-breach', 'D20');
assert.equal(routeMap.get('conn-D20-J48').state, 'open');
assert.equal(settlement.materials, 7);

await run('ossuary.break-choir', 'E22');
assert.equal(room('E22').choirBroken, true);
await run('ossuary.seal-last-names', 'E25');
assert.equal(room('E25').lastNamesSealed, true);
assert.equal(routeMap.get('conn-E25-L56').state, 'open');

await run('fungal.communion', 'F30');
assert.equal(room('F30').fungalResolution, 'communion');
const incompatible = system.enqueue({ actionId: 'fungal.burn-heart', target: { type: 'room', id: 'F30', roomId: 'F30' } }, sim);
assert.equal(incompatible.ok, false);

await run('spider.rescue-hosts', 'G32');
assert.equal(room('G32').hostsRescued, true);
assert.equal(agents.find(agent => agent.id === 'captive').hosted, false);
assert.equal(agents.find(agent => agent.id === 'captive').hp, 1);

await run('market.negotiate-neutrality', 'I44');
assert.equal(room('I44').marketAccord, true);
assert.equal(settlement.wealth, 3);
assert.ok(room('I41').zoneInteractionSafetyBonus > 0);

await run('arena.challenge-champion', 'J49', 'fighter');
assert.equal(room('J49').arenaLiberated, true);
assert.equal(agents.find(agent => agent.id === 'orc-champion').alive, false);

await run('laboratory.calibrate-observatory', 'K53', 'wizard');
assert.equal(room('K53').observatoryCalibrated, true);
assert.equal(routeMap.get('secret-K55-M61').state, 'discovered');
assert.equal(settlement.materials, 6);
await run('laboratory.stabilize-summoning', 'K54', 'wizard');
assert.equal(room('K54').summoningStabilized, true);

await run('sanctum.open-seal-gate', 'M61', 'wizard');
assert.equal(room('M61').sealGateOpened, true);
assert.equal(routeMap.get('conn-K55-M61').state, 'open');
await run('sanctum.seal-heart', 'M63', 'cleric');
assert.equal(room('M63').campaignResolution, 'seal');
assert.equal(sim.campaignResolution.resolution, 'seal');
assert.equal(system.metrics().campaignResolution, 'seal');
assert.ok(system.snapshot().tasks.filter(task => task.status === 'completed').length >= 12);
assert.ok(events.some(event => event.type === 'zone-interaction-completed'));

console.log('wp5 zone interaction system smoke: ok');

async function run(actionId, roomId, preferredAgentId = null) {
  const response = system.enqueue({ actionId, target: { type: 'room', id: roomId, roomId }, preferredAgentId }, sim);
  assert.equal(response.ok, true, response.error);
  const task = system.tasks.get(response.result.id);
  for (let tick = 0; tick < 200 && !['completed', 'failed'].includes(task.status); tick += 1) {
    for (const agent of sim.agents) {
      const action = system.decide(agent, sim);
      if (action) system.resolve(agent, action, sim);
    }
    sim.time += 0.5;
    system.update(0.5, sim);
  }
  assert.equal(task.status, 'completed', `${actionId} ended as ${task.status}: ${task.lastError}`);
  return task;
}
function room(id) { return rooms.find(value => value.id === id); }
function adventurer(id, role, level, attack, hp) { return { id, name: id, role, faction: 'party', factionId: 'adventurer-expedition', alive: true, roomId: 'A01', hp, maxHp: hp, level, attack, fatigue: 0 }; }
