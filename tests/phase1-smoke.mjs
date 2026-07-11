import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { DungeonSim } from '../src/sim/DungeonSimPhase1.js';

const originalRandom = Math.random;
Math.random = seededRandom(147);

try {
  for (const baseScenario of SCENARIOS) {
    const scenario = baseScenario.useGeneratedMap ? expandScenario(baseScenario) : baseScenario;
    const sim = new DungeonSim(scenario);

    for (let frame = 0; frame < 1800; frame += 1) sim.update(1 / 30);

    const snapshot = sim.snapshot();
    assert.equal(snapshot.parties.length > 0, true, `${scenario.id}: expected at least one party`);

    const partyAgents = snapshot.agents.filter(agent => agent.faction === 'party');
    assert.equal(partyAgents.every(agent => agent.partyId), true, `${scenario.id}: every adventurer must belong to a party`);

    const footprintOwners = new Map();
    for (const occupied of snapshot.occupancy.occupied) {
      for (const cellId of occupied.footprint ?? []) {
        assert.equal(footprintOwners.has(cellId), false, `${scenario.id}: cell ${cellId} occupied twice`);
        footprintOwners.set(cellId, occupied.agentId);
      }
    }

    for (const agent of snapshot.agents) {
      if (!agent.alive || agent.departed || agent.hidden) continue;
      if (agent.travel) {
        assert.equal(Boolean(agent.travel.connectionId), true, `${scenario.id}: travelling ${agent.id} has no connection`);
        assert.equal(Boolean(agent.travel.destinationCell), true, `${scenario.id}: travelling ${agent.id} has no destination cell`);
        assert.equal(['corridor', 'entering'].includes(agent.travel.phase), true, `${scenario.id}: invalid travel phase`);
      } else {
        assert.equal(Boolean(agent.roomCell), true, `${scenario.id}: active ${agent.id} has no room cell`);
      }
    }

    console.log(`PASS ${scenario.id}: ${snapshot.agents.length} agents, ${snapshot.occupancy.occupied.length} occupied placements`);
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
