import assert from 'node:assert/strict';
import { RoomOccupancySystem } from '../src/sim/RoomOccupancySystem.js';
import { DungeonSim as Phase3DungeonSim } from '../src/sim/DungeonSimPhase3.js';
import { DungeonSim as Phase8DungeonSim } from '../src/sim/DungeonSimPhase8.js';
import { decideAction } from '../src/sim/AgentAI.js';
import { SCENARIOS } from '../src/data/scenarios.js';
import { expandScenario } from '../src/data/generateDungeon.js';
import { applyPhase2Facilities } from '../src/data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../src/data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../src/data/applyPhase6Ecology.js';
import { applyPhase7Territories } from '../src/data/applyPhase7Territories.js';
import { graphDistance } from '../src/sim/Pathfinding.js';

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
  const agent = {
    id: 'looper',
    name: 'Looper',
    role: 'goblin',
    faction: 'dungeon',
    roomId: 'b',
    previousRoomId: 'a',
    recentRooms: ['a', 'b', 'a', 'b'],
    alive: true,
    departed: false,
    travel: null,
    queued: false,
    downed: false,
    hidden: false,
    blockedMoveRoomId: null,
    blockedMoveUntilTurn: -1
  };
  const action = decideAction(agent, {
    turn: 12,
    rooms: [{ id: 'a' }, { id: 'b' }],
    graph: new Map([['a', ['b']], ['b', ['a']]]),
    agents: [agent],
    props: [],
    visited: new Set(['a', 'b'])
  });
  assert.equal(action.type, 'idle', 'oscillating agent should hold position instead of endless ping-pong');
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

{
  const scenario = {
    name: 'disengage-pressure',
    rooms: [
      { id: 'hall', name: 'Hall', kind: 'hall', x: 0, z: 0, w: 8, d: 8 },
      { id: 'retreat', name: 'Retreat', kind: 'hall', x: 10, z: 0, w: 8, d: 8 }
    ],
    links: [{ a: 'hall', b: 'retreat' }],
    props: [],
    agents: [
      { id: 'hero', name: 'Mira', role: 'fighter', faction: 'party', roomId: 'hall', level: 1 },
      { id: 'orc', name: 'Ruk', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'hall', level: 1 }
    ]
  };

  const sim = new Phase3DungeonSim(scenario);
  placeInRoom(sim, sim.agents.find(agent => agent.id === 'hero'), 'hall');
  placeInRoom(sim, sim.agents.find(agent => agent.id === 'orc'), 'hall');
  const hero = sim.agents.find(agent => agent.id === 'hero');
  const orc = sim.agents.find(agent => agent.id === 'orc');
  hero.roomCell = { ...hero.roomCell, x: -0.39, z: 0 };
  orc.roomCell = { ...orc.roomCell, x: 0.39, z: 0 };

  assert.equal(sim.beginTravel(hero, 'retreat'), false, 'adjacent hostile should pin normal movement in-room');
  assert.equal(hero.roomId, 'hall');
  assert.equal(Boolean(hero.travel), false);
  assert.ok(hero.combat || orc.combat, 'blocked disengage should create combat pressure');

  const hpBefore = hero.hp;
  hero.combat = null;
  orc.combat = null;
  assert.equal(sim.beginTravel(hero, 'retreat', { forceDisengage: true }), true, 'forced disengage should still be possible with a penalty');
  assert.ok(hero.travel, 'forced disengage should start travel');
  assert.equal(hero.travel.disengaging, true);
  assert.ok(hero.travel.duration > 1, 'forced disengage should incur a travel tax');
  assert.ok(hero.hp < hpBefore, 'forced disengage should pay an immediate melee penalty');
}

{
  const base = SCENARIOS.find(scenario => scenario.id === 'sprawling-warren') ?? SCENARIOS[0];
  const expanded = base.useGeneratedMap ? expandScenario(base) : base;
  const scenario = applyPhase7Territories(applyPhase6Ecology(applyPhase5Ecology(applyPhase2Facilities(expanded))));
  const sim = new Phase8DungeonSim(scenario);
  const safeHub = sim.settlementSystem.settlements.get(sim.settlementSystem.safeSettlementId);
  const party = [...sim.partySystem.parties.values()][0];
  const members = party.memberIds.map(id => sim.agents.find(agent => agent.id === id)).filter(Boolean);
  const leader = members[0];
  const campRoom = sim.rooms
    .filter(room => room.w * room.d >= 30 && !room.tags?.includes('safe_zone') && !room.tags?.includes('entrance_threshold'))
    .sort((a, b) => graphDistance(sim.graph, safeHub.roomId, b.id) - graphDistance(sim.graph, safeHub.roomId, a.id))[0];
  assert.ok(campRoom, 'no room available for doorway siege validation');

  for (const monster of sim.agents.filter(agent => agent.faction === 'dungeon' && agent.roomId === campRoom.id)) monster.hidden = true;
  for (const member of members) placeInRoom(sim, member, campRoom.id);
  party.endurance = 100;
  party.expeditionTime = 70;
  party.provisions = 12;
  party.water = 10;
  party.medicine = 4;
  party.materials = 6;
  party.baseSettlementId = safeHub.id;
  party.campCooldown = 0;
  const territory = sim.territorySystem.roomStates.get(campRoom.id);
  territory.owner = null;
  territory.control = 0;
  territory.contested = false;
  assert.equal(sim.expeditionSystem.canEstablishCamp(party, members, campRoom.id, sim), true);
  sim.expeditionSystem.establishCamp(leader, campRoom.id, sim);
  const campProp = sim.props.find(prop => prop.type === 'adventurer_field_camp' && prop.roomId === campRoom.id);
  assert.ok(campProp, 'field camp prop missing for doorway siege validation');
  for (const prop of [...sim.props]) {
    if (prop.roomId !== campRoom.id || prop.id === campProp.id) continue;
    if (!sim.constructionSystem.isAttackableStructure(prop)) continue;
    const index = sim.props.findIndex(candidate => candidate.id === prop.id);
    if (index >= 0) sim.props.splice(index, 1);
  }

  const attacker = sim.agents.find(agent =>
    agent.alive && agent.faction === 'dungeon' && agent.ecologyFaction && !agent.hidden && (sim.graph.get(campRoom.id) ?? []).includes(agent.roomId)
  );
  assert.ok(attacker, 'no adjacent attacker available for doorway siege validation');
  const integrityBefore = campProp.integrity;
  const struck = sim.constructionSystem.attackAdjacentRoomFromDoor(attacker, campRoom.id, sim);
  assert.equal(struck, true, 'adjacent attacker should be able to siege a blocked field camp from the doorway');
  assert.ok(campProp.integrity < integrityBefore, 'doorway siege did not damage the field camp');
}

console.log('ai behavior metrics smoke passed');

function placeInRoom(sim, agent, roomId) {
  sim.occupancy.release(agent.id);
  sim.occupancy.cancelReservation(agent.id);
  agent.roomId = roomId;
  agent.travel = null;
  agent.combat = null;
  agent.hidden = false;
  agent.departed = false;
  agent.queued = false;
  sim.occupancy.placeAgent(agent, roomId);
}
