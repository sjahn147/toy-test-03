import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase2.js';

const FACILITY_TYPES = new Set([
  'dungeon_entrance',
  'water_fountain',
  'rest_site',
  'camp_site',
  'merchant_stall',
  'goddess_statue'
]);

const originalRandom = Math.random;
Math.random = seededRandom(2147);

try {
  for (const baseScenario of SCENARIOS) {
    const expanded = baseScenario.useGeneratedMap ? expandScenario(baseScenario) : baseScenario;
    const scenario = applyPhase2Facilities(expanded);
    const sim = new DungeonSim(scenario);

    const waystation = scenario.rooms.find(room => room.id === 'expedition-waystation');
    assert.ok(waystation, `${scenario.id}: missing waystation`);
    assert.ok(waystation.tags?.includes('safe_zone'), `${scenario.id}: waystation is not safe`);

    const facilities = scenario.props.filter(prop => FACILITY_TYPES.has(prop.type));
    assert.equal(facilities.length, 6, `${scenario.id}: expected six facilities`);
    assert.equal(new Set(facilities.map(prop => prop.type)).size, 6, `${scenario.id}: facility types must be unique`);

    const initialQueue = sim.snapshot().entranceQueue;
    assert.ok(initialQueue.length > 0, `${scenario.id}: expected an entrance queue`);
    assert.ok(initialQueue.every(record => record.memberIds.length >= 4 && record.memberIds.length <= 5), `${scenario.id}: queued parties must contain four or five members`);

    for (let frame = 0; frame < 2700; frame += 1) sim.update(1 / 30);

    const snapshot = sim.snapshot();
    const safeIds = new Set(snapshot.recovery.safeRoomIds);
    assert.ok(safeIds.has('expedition-waystation'), `${scenario.id}: recovery system lost safe room`);

    const activeDungeon = snapshot.agents.filter(agent => agent.alive && !agent.departed && agent.faction === 'dungeon');
    assert.equal(activeDungeon.some(agent => safeIds.has(agent.roomId)), false, `${scenario.id}: monster entered safe room`);

    const fountain = snapshot.props.find(prop => prop.type === 'water_fountain');
    const merchant = snapshot.props.find(prop => prop.type === 'merchant_stall');
    const statue = snapshot.props.find(prop => prop.type === 'goddess_statue');
    assert.ok(Number.isFinite(fountain?.charges), `${scenario.id}: fountain charges not initialized`);
    assert.ok(Number.isFinite(merchant?.stock), `${scenario.id}: merchant stock not initialized`);
    assert.ok(Number.isFinite(statue?.resurrectionCharges), `${scenario.id}: statue charges not initialized`);

    for (const agent of snapshot.agents.filter(candidate => candidate.faction === 'party')) {
      assert.ok(agent.partyId, `${scenario.id}: adventurer ${agent.id} missing party`);
      assert.ok(Number.isFinite(agent.fatigue), `${scenario.id}: adventurer ${agent.id} missing fatigue`);
      if (agent.queued) assert.equal(agent.departed, true, `${scenario.id}: queued adventurer must remain outside`);
    }

    console.log(`PASS ${scenario.id}: ${facilities.length} facilities, ${snapshot.agents.length} agents, ${snapshot.entranceQueue.length} queued parties`);
  }
} finally {
  Math.random = originalRandom;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
