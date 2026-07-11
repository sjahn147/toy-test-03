import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../src/data/applyPhase8SpatialScale.js';
import { applyPhase8PropLayout } from '../src/data/applyPhase8PropLayout.js';
import { LegacyPhaseRuntimeAdapter } from '../src/compat/LegacyPhaseRuntimeAdapter.js';
import { GameRuntimeFacade } from '../src/application/GameRuntimeFacade.js';
import { WorldEventBus } from '../src/application/WorldEventBus.js';
import { assertWorldSnapshot } from '../src/domain/snapshotContract.js';
import { EVENT_SEVERITIES } from '../src/domain/eventContract.js';
import {
  selectGlobalBar,
  selectAgentInspector,
  selectRoomInspector,
  selectSettlementInspector,
  selectTimelineEvents
} from '../src/presentation/selectors/index.js';

const originalRandom = Math.random;
let randomState = 864209753;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

try {
  const bus = new WorldEventBus({ limit: 2 });
  const receivedIds = [];
  const stop = bus.subscribe(event => receivedIds.push(event.id));
  bus.publish({ id: 'event-1' });
  bus.publish({ id: 'event-2' });
  bus.publish({ id: 'event-3' });
  assert.deepEqual(bus.history().map(event => event.id), ['event-2', 'event-3']);
  assert.deepEqual(receivedIds, ['event-1', 'event-2', 'event-3']);
  assert.equal(stop(), true);
  assert.equal(stop(), false);
  bus.destroy();
  assert.equal(bus.publish({ id: 'event-4' }), false);

  const base = SCENARIOS.find(scenario => scenario.id === 'cellar');
  assert.ok(base, 'cellar scenario is missing');
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase8PropLayout(applyPhase7Territories(applyPhase8SpatialScale(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded))))));
  assert.equal(scenario.phase8PropLayoutApplied, true);

  const adapter = new LegacyPhaseRuntimeAdapter({ scenario });
  const received = [];
  const unsubscribe = adapter.subscribe(event => received.push(event));
  for (let i = 0; i < 50; i += 1) adapter.update(0.12);

  const snapshot = adapter.getSnapshot();
  assertWorldSnapshot(snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  assert.ok(Object.keys(snapshot.entities.agents).length > 0);
  assert.ok(Object.keys(snapshot.entities.rooms).length > 0);
  for (const [roomId, agentIds] of Object.entries(snapshot.indexes.agentsByRoom)) {
    for (const agentId of agentIds) assert.equal(snapshot.entities.agents[agentId]?.roomId, roomId);
  }

  const agentId = Object.keys(snapshot.entities.agents)[0];
  const roomId = Object.keys(snapshot.entities.rooms)[0];
  const settlementId = Object.keys(snapshot.entities.settlements)[0];
  assert.ok(settlementId);
  assert.ok(isPlainObject(selectGlobalBar(snapshot)));
  assert.ok(isPlainObject(selectAgentInspector(snapshot, agentId)));
  assert.ok(isPlainObject(selectRoomInspector(snapshot, roomId)));
  assert.ok(isPlainObject(selectSettlementInspector(snapshot, settlementId)));
  assert.ok(selectTimelineEvents(snapshot).every(isPlainObject));
  assert.equal(selectAgentInspector(snapshot, 'missing'), null);

  assert.ok(received.length > 0);
  for (const event of received) {
    assert.equal(typeof event.type, 'string');
    assert.ok(event.type.includes('.'));
    assert.ok(EVENT_SEVERITIES.includes(event.severity));
    assert.equal(typeof event.fallbackText, 'string');
  }
  unsubscribe();
  const deliveredBefore = received.length;
  for (let i = 0; i < 10; i += 1) adapter.update(0.12);
  assert.equal(received.length, deliveredBefore);

  assert.equal(adapter.dispatch({ type: 'sim.make-noise', roomId }).ok, true);
  const beforePause = adapter.sim.time;
  assert.equal(adapter.dispatch({ type: 'clock.pause' }).ok, true);
  adapter.update(1);
  assert.equal(adapter.sim.time, beforePause);
  assert.equal(adapter.dispatch({ type: 'clock.resume' }).ok, true);
  assert.equal(adapter.dispatch({ type: 'clock.set-speed', speed: 2 }).ok, true);
  adapter.update(0.2);
  assert.ok(adapter.sim.time > beforePause);
  assert.equal(adapter.dispatch({ type: 'totally.unknown-command' }).ok, false);

  const facade = new GameRuntimeFacade({ runtime: adapter });
  const viewModel = facade.getViewModel({ agentId, timelineFilter: 'all', timelineLimit: 20 });
  for (const key of ['topBar', 'observerFaction', 'navigator', 'followRoster', 'selection', 'timeline', 'alerts']) {
    assert.ok(Object.hasOwn(viewModel, key), `view model is missing ${key}`);
  }
  assert.ok(isPlainObject(viewModel.topBar));
  assert.ok(isPlainObject(viewModel.navigator));
  assert.ok(Array.isArray(viewModel.navigator.factions));
  assert.ok(Array.isArray(viewModel.navigator.parties));
  assert.ok(Array.isArray(viewModel.navigator.settlements));
  assert.ok(Array.isArray(viewModel.navigator.rooms));
  assert.ok(Array.isArray(viewModel.followRoster));
  assert.equal(viewModel.selection?.type, 'agent');
  assert.ok(Array.isArray(viewModel.alerts));

  facade.destroy();
  facade.destroy();
  assert.equal(adapter.destroyed, true);
  assert.equal(facade.dispatch({ type: 'clock.resume' }).ok, false);
  assert.throws(() => facade.getSnapshot(), /destroyed/);

  const previousOnEvent = () => {};
  const fakeSim = { onEvent: previousOnEvent, update() {}, snapshot() { return {}; }, metrics() { return {}; }, makeNoise() {}, dropCoin() {} };
  const attached = LegacyPhaseRuntimeAdapter.fromSim(fakeSim);
  assert.notEqual(fakeSim.onEvent, previousOnEvent);
  attached.destroy();
  assert.equal(fakeSim.onEvent, previousOnEvent);

  console.log(`runtime facade smoke passed with ${Object.keys(snapshot.entities.agents).length} agents and ${received.length} events`);
} finally {
  Math.random = originalRandom;
}
