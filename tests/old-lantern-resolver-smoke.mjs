import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OldLanternInnSystem, OLD_LANTERN_ROOM_IDS } from '../src/sim/OldLanternInnSystem.js';

const pack = await source('../src/engine/OldLanternAssetPack.js');
const resolver = await source('../src/engine/Phase8AssetResolver.js');
const bridge = await source('../src/sim/OldLanternRuntimeBridge.js');

for (const id of ['common-room', 'kitchen', 'guest-wing', 'cellar', 'secret-office']) {
  assert.ok(pack.includes(`inn.old-lantern.${id}`), `missing ${id} recipe`);
}
for (const semanticNode of [
  'music-stage',
  'gallery-walk',
  'old-lantern-sign',
  'reservation-ledger',
  'linen-cart',
  'key-rack',
  'smuggler-cache',
  'signal-lantern'
]) {
  assert.ok(pack.includes(semanticNode), `restored pack should contain ${semanticNode}`);
}
assert.ok(pack.includes('let roomIndex = 0;'), 'guest wing should build a full indexed room sequence');
assert.ok(pack.includes('for (const row of [-2.65, 2.65])') && pack.includes('for (let col = 0; col < 4; col += 1)'), 'guest wing should restore the full eight-room corridor instead of a reduced bed strip');
assert.ok(pack.includes('defense-shutters'), 'common room should restore besieged shutter geometry');
assert.ok(resolver.includes('createOldLanternAssetPack'), 'resolver must register Old Lantern pack');
assert.ok(resolver.includes('installOldLanternRuntimeBridge'), 'resolver boundary must install the runtime bridge');
assert.ok(bridge.includes('ensureOldLanternInnSystem'), 'bridge must initialize the facility lazily');

const rooms = OLD_LANTERN_ROOM_IDS.map(id => ({ id }));
const settlements = new Map();
const settlementSystem = { settlements, registerSettlement(value) { settlements.set(value.id, value); } };
const territorySystem = { roomStates: new Map(), factionSupply: new Map([['adventurer-expedition', 20]]) };
const sim = { time: 0, agents: [], emitEffect() {} };
const system = new OldLanternInnSystem({ rooms, settlementSystem, territorySystem });
system.initialize(sim);
assert.equal(system.enabled, true);
assert.equal(rooms.find(room => room.id === 'H36').visualState, 'ruined');
assert.equal(rooms.find(room => room.id === 'H40').visualState, 'sealed');
assert.ok(settlements.has('settlement-old-lantern-inn'));

const worker = { id: 'worker', role: 'fighter', faction: 'party', alive: true, roomId: 'H36', maxHp: 10, hp: 5 };
sim.agents.push(worker);
settlements.get(system.settlementId).materials = 20;
for (let i = 0; i < 80; i += 1) {
  sim.time += 0.75;
  system.update(0.75, sim);
}
assert.ok(system.tier >= 1, 'labor and supplies should restore the inn');
assert.notEqual(rooms.find(room => room.id === 'H36').visualState, 'ruined');
assert.ok(system.snapshot().roomStates.H36);

console.log('old lantern resolver smoke: ok');

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
