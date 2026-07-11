import assert from 'node:assert/strict';
import { OldLanternInnSystem } from '../src/sim/OldLanternInnSystem.js';

const rooms = ['H36', 'H37', 'H38', 'H39', 'H40'].map((id, index) => ({
  id,
  name: id,
  kind: 'inn-room',
  x: index * 10,
  z: 0,
  w: 18,
  d: 14,
  tags: ['zone_h']
}));

const settlements = new Map();
const settlementSystem = {
  settlements,
  registerSettlement(settlement) {
    settlements.set(settlement.id, settlement);
  }
};

const territorySystem = {
  roomStates: new Map(rooms.map(room => [room.id, {
    owner: 'adventurer-expedition',
    control: 80,
    contested: false
  }])),
  factionSupply: new Map([['adventurer-expedition', 50]])
};

const events = [];
const effects = [];
const sim = {
  time: 0,
  rooms,
  agents: [
    agent('fighter-a', 'fighter', 'H36', 8, 18),
    agent('rogue-a', 'rogue', 'H36', 8, 12),
    agent('cleric-a', 'cleric', 'H37', 8, 14)
  ],
  emitEffect(type, payload) {
    effects.push({ type, payload });
  }
};

const system = new OldLanternInnSystem({
  rooms,
  graph: new Map(),
  settlementSystem,
  territorySystem,
  onEvent: text => events.push(text)
});

system.initialize(sim);
assert.equal(system.enabled, true);
assert.equal(rooms.find(room => room.id === 'H36').visualState, 'ruined');
assert.equal(rooms.find(room => room.id === 'H40').visualState, 'sealed');

const inn = settlements.get('settlement-old-lantern-inn');
assert.ok(inn, 'the inn should register as a settlement/logistics destination');
inn.materials = 48;
inn.food = 12;

for (let step = 0; step < 80; step += 1) {
  sim.time += 0.75;
  system.update(0.75, sim);
}

assert.equal(system.tier, 4, 'friendly labor and supplies should restore the full inn');
assert.equal(rooms.find(room => room.id === 'H36').visualState, 'prosperous');
assert.equal(rooms.find(room => room.id === 'H37').visualState, 'working');
assert.equal(rooms.find(room => room.id === 'H38').visualState, 'guestrooms');
assert.equal(rooms.find(room => room.id === 'H39').visualState, 'stocked');
assert.equal(rooms.find(room => room.id === 'H40').visualState, 'operations-room');
assert.equal(inn.services.trade, true);
assert.equal(inn.services.smuggling, true);
assert.ok(inn.capacity >= 20, 'fortified inn capacity should be visible to settlement systems');
assert.ok(events.some(text => text.includes('advanced to fortified-inn')));
assert.ok(effects.some(effect => effect.type === 'old-lantern-upgrade'));

const fighter = sim.agents[0];
fighter.hp = Math.max(1, fighter.maxHp - 5);
fighter.fatigue = 5;
const hpBefore = fighter.hp;
const fatigueBefore = fighter.fatigue;
sim.time += 0.75;
system.update(0.75, sim);
assert.ok(fighter.hp > hpBefore, 'the restored inn should recover present adventurers');
assert.ok(fighter.fatigue < fatigueBefore, 'guestrooms should reduce fatigue');

sim.agents.push(
  monster('slime-a', 'slime', 'H37', 'slime-bloom'),
  monster('spider-a', 'spider', 'H38', 'pale-brood'),
  monster('myconid-a', 'myconid', 'H39', 'bluecap-colony')
);
territorySystem.roomStates.get('H36').contested = true;
sim.time += 0.75;
system.update(0.75, sim);

assert.equal(system.state, 'besieged');
assert.equal(rooms.find(room => room.id === 'H36').visualState, 'besieged');
assert.equal(rooms.find(room => room.id === 'H37').visualState, 'infested');
assert.equal(rooms.find(room => room.id === 'H38').visualState, 'webbed');
assert.equal(rooms.find(room => room.id === 'H39').visualState, 'fungal-brewery');
assert.equal(inn.services.trade, false, 'trade should stop during siege pressure');

const snapshot = system.snapshot();
assert.equal(snapshot.tier, 4);
assert.equal(snapshot.state, 'besieged');
assert.equal(snapshot.roomStates.H40, 'operations-room');
assert.equal(system.metrics().oldLanternBesieged, true);

console.log('old-lantern-vertical-slice-smoke: ok');

function agent(id, role, roomId, hp, maxHp) {
  return {
    id,
    role,
    roomId,
    faction: 'party',
    ecologyFaction: 'adventurer-expedition',
    alive: true,
    departed: false,
    hidden: false,
    travel: null,
    combat: null,
    downed: false,
    hp,
    maxHp,
    fatigue: 5,
    stress: 4,
    supplies: 1
  };
}

function monster(id, role, roomId, ecologyFaction) {
  return {
    id,
    role,
    roomId,
    faction: 'dungeon',
    ecologyFaction,
    alive: true,
    departed: false,
    hidden: false,
    travel: null,
    combat: null,
    downed: false,
    hp: 10,
    maxHp: 10
  };
}
