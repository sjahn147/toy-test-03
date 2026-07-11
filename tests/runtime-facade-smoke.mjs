import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../src/data/applyPhase8SpatialScale.js';
import { LegacyPhaseRuntimeAdapter } from '../src/compat/LegacyPhaseRuntimeAdapter.js';
import { GameRuntimeFacade } from '../src/application/GameRuntimeFacade.js';
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

try {
  // --- 어댑터: cellar 시나리오를 라이브 apply 체인으로 준비 ---
  const base = SCENARIOS.find(scenario => scenario.id === 'cellar');
  assert.ok(base, 'cellar scenario is missing');
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(
    applyPhase8SpatialScale(
      applyPhase6Ecology(
        applyPhase5Ecology(
          applyPhase2Facilities(expanded)
        )
      )
    )
  );

  const adapter = new LegacyPhaseRuntimeAdapter({ scenario });
  const received = [];
  const unsubscribe = adapter.subscribe(event => received.push(event));
  for (let i = 0; i < 50; i += 1) adapter.update(0.12);
  console.log('adapter 50 updates ok');

  // --- 정규화 snapshot 계약 + JSON 왕복 ---
  const snapshot = adapter.getSnapshot();
  assertWorldSnapshot(snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot, 'snapshot does not survive a JSON round trip');
  assert.ok(Object.keys(snapshot.entities.agents).length > 0, 'snapshot has no agents');
  assert.ok(Object.keys(snapshot.entities.rooms).length > 0, 'snapshot has no rooms');
  for (const [roomId, agentIds] of Object.entries(snapshot.indexes.agentsByRoom)) {
    for (const agentId of agentIds) {
      assert.equal(snapshot.entities.agents[agentId]?.roomId, roomId, `agentsByRoom lists "${agentId}" in "${roomId}" but the agent record disagrees`);
    }
  }
  console.log('snapshot contract and JSON round trip ok');

  // --- 셀렉터 5종: plain object + bogus id 방어 ---
  const agentId = Object.keys(snapshot.entities.agents)[0];
  const roomId = Object.keys(snapshot.entities.rooms)[0];
  const settlementId = Object.keys(snapshot.entities.settlements)[0];
  assert.ok(settlementId, 'snapshot has no settlements to inspect');
  assert.ok(isPlainObject(selectGlobalBar(snapshot)), 'selectGlobalBar did not return a plain object');
  assert.ok(isPlainObject(selectAgentInspector(snapshot, agentId)), 'selectAgentInspector did not return a plain object');
  assert.ok(isPlainObject(selectRoomInspector(snapshot, roomId)), 'selectRoomInspector did not return a plain object');
  assert.ok(isPlainObject(selectSettlementInspector(snapshot, settlementId)), 'selectSettlementInspector did not return a plain object');
  const timeline = selectTimelineEvents(snapshot, {});
  assert.ok(Array.isArray(timeline), 'selectTimelineEvents did not return an array');
  assert.ok(timeline.every(isPlainObject), 'selectTimelineEvents entries are not plain objects');
  assert.deepEqual(selectTimelineEvents(snapshot, { filter: 'no-such-namespace' }), [], 'bogus timeline filter did not yield []');
  assert.equal(selectAgentInspector(snapshot, 'no-such-agent'), null, 'bogus agent id did not yield null');
  assert.equal(selectRoomInspector(snapshot, 'no-such-room'), null, 'bogus room id did not yield null');
  assert.equal(selectSettlementInspector(snapshot, 'no-such-settlement'), null, 'bogus settlement id did not yield null');
  console.log('selectors ok');

  // --- subscribe: eventContract shape + unsubscribe로 전달 중단 ---
  assert.ok(received.length > 0, 'subscriber received no events after 50 updates');
  for (const event of received) {
    assert.equal(typeof event.type, 'string', 'event.type is not a string');
    assert.ok(event.type.includes('.'), `event.type "${event.type}" is not namespaced`);
    assert.ok(EVENT_SEVERITIES.includes(event.severity), `event.severity "${event.severity}" is not a contract severity`);
    assert.equal(typeof event.fallbackText, 'string', 'event.fallbackText is not a string');
  }
  unsubscribe();
  const deliveredBefore = received.length;
  for (let i = 0; i < 10; i += 1) adapter.update(0.12);
  assert.equal(received.length, deliveredBefore, 'unsubscribe did not stop event delivery');
  console.log('subscribe/unsubscribe ok');

  // --- dispatch: 알려진 커맨드 성공, 미지 커맨드는 throw 없이 {ok:false} ---
  const noiseResult = adapter.dispatch({ type: 'sim.make-noise', roomId });
  assert.equal(noiseResult.ok, true, `sim.make-noise dispatch failed: ${noiseResult.error ?? ''}`);
  const unknownResult = adapter.dispatch({ type: 'totally.unknown-command' });
  assert.equal(unknownResult.ok, false, 'unknown command did not return {ok:false}');
  console.log('dispatch ok');

  // --- 파사드 뷰모델 ---
  const facade = new GameRuntimeFacade({ runtime: adapter });
  const viewModel = facade.getViewModel({ agentId, timelineFilter: 'all', timelineLimit: 20 });
  assert.deepEqual(Object.keys(viewModel).sort(), ['alerts', 'selection', 'timeline', 'topBar'], 'view model shape mismatch');
  assert.ok(isPlainObject(viewModel.topBar), 'viewModel.topBar is not a plain object');
  assert.equal(viewModel.selection?.type, 'agent', 'viewModel selection did not prioritize agentId');
  assert.ok(Array.isArray(viewModel.alerts), 'viewModel.alerts is not an array');
  console.log('facade view model ok');

  console.log(`runtime facade smoke passed with ${Object.keys(snapshot.entities.agents).length} agents, ${received.length} events and ${Object.keys(snapshot.entities.settlements).length} settlements`);
} finally {
  Math.random = originalRandom;
}
