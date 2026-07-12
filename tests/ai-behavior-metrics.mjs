import assert from 'node:assert/strict';
import { RoomOccupancySystem } from '../src/sim/RoomOccupancySystem.js';
import { DungeonSim as Phase3DungeonSim } from '../src/sim/DungeonSimPhase3.js';

{
  const rooms = [{ id: 'hall', name: 'Hall', x: 0, z: 0, w: 8, d: 8 }];
  const occupancy = new RoomOccupancySystem(rooms, { roomById: new Map(), roomPorts: new Map(), connections: [], connectionByPair: new Map() });
  const agents = [
    { id: 'fighter', index: 0, role: 'fighter', faction: 'party', roomId: 'hall', alive: true },
    { id: 'rogue', index: 1, role: 'rogue', faction: 'party', roomId: 'hall', alive: true },
    { id: 'cleric', index: 2, role: 'cleric', faction: 'party', roomId: 'hall', alive: true },
    { id: 'wizard', index: 3, role: 'wizard', faction: 'party', roomId: 'hall', alive: true },
    { id: 'orc', index: 4, role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'hall', alive: true }
  ];
  occupancy.initializeAgents(agents);

  const cells = agents.map(agent => occupancy.getAgentCell(agent.id));
  const pairDistances = [];
  for (let i = 0; i < cells.length; i += 1) {
    for (let j = i + 1; j < cells.length; j += 1) {
      pairDistances.push(Math.hypot(cells[i].x - cells[j].x, cells[i].z - cells[j].z));
    }
  }
  const averageDistance = pairDistances.reduce((sum, value) => sum + value, 0) / pairDistances.length;
  assert.ok(averageDistance >= 1.55, `room occupancy still clusters too tightly (avg pair distance ${averageDistance.toFixed(2)})`);
}

{
  const scenario = {
    name: 'corridor-encounter',
    rooms: [
      { id: 'west', name: 'West Hall', kind: 'hall', x: -6, z: 0, w: 6, d: 6 },
      { id: 'east', name: 'East Hall', kind: 'hall', x: 6, z: 0, w: 6, d: 6 }
    ],
    links: [{ a: 'west', b: 'east' }],
    props: [],
    agents: [
      { id: 'hero', name: 'Mira', role: 'fighter', faction: 'party', roomId: 'west', level: 1 },
      { id: 'orc', name: 'Ruk', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'east', level: 1 }
    ]
  };

  const sim = new Phase3DungeonSim(scenario);
  assert.equal(sim.beginTravel(sim.agents[0], 'east'), true);
  assert.equal(sim.beginTravel(sim.agents[1], 'west'), true);

  for (let i = 0; i < 18; i += 1) sim.update(0.16);

  const hero = sim.agents.find(agent => agent.id === 'hero');
  const orc = sim.agents.find(agent => agent.id === 'orc');
  assert.equal(Boolean(hero.travel), false, 'corridor encounter should stop the party agent instead of letting it pass through');
  assert.equal(Boolean(orc.travel), false, 'corridor encounter should stop the hostile npc instead of letting it pass through');
  assert.equal(hero.roomId, orc.roomId, 'corridor encounter should resolve into a shared combat room');
  assert.ok(hero.combat || orc.combat || hero.hp < hero.maxHp || orc.hp < orc.maxHp, 'corridor encounter did not become combat pressure');
}

console.log('ai behavior metrics smoke passed');
