import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroLeadershipSystem } from '../src/sim/heroes/HeroLeadershipSystem.js';

function makeSim() {
  const rooms = ['D19','D18','J49','E25','E23','F28','L57'].map(id => ({ id }));
  const graph = new Map(rooms.map(room => [room.id, []]));
  graph.get('E25').push('E23'); graph.get('E23').push('E25');
  const sim = {
    rooms,
    graph,
    agents: [],
    combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
    equipmentSystem: { initializeAgent() {} },
    occupancy: { placeAgent(agent, roomId) { agent.roomId = roomId; agent.roomCell = { x: 0, z: 0 }; return true; } },
    constructionSystem: { structures: [] },
    advancedEcologySystem: { traps: [] },
    heroSkillSystem: { duelForHero() { return null; } }
  };
  new HeroSystem().initialize(sim);
  return sim;
}

// Isara affects wraiths and shades in her room and one adjacent room, without stacking on repeated updates.
{
  const sim = makeSim();
  const system = new HeroLeadershipSystem();
  const wraith = { id: 'wraith', role: 'wraith', faction: 'dungeon', ecologyFaction: 'undead-host', roomId: 'E23', alive: true, attack: 5, courage: 10, armor: 0, speedMultiplier: 1, heroStatuses: {} };
  const shade = { id: 'shade', role: 'hero-form-isara-shade', heroFormKind: 'shade-1', faction: 'dungeon', ecologyFaction: 'undead-host', roomId: 'E25', alive: true, attack: 5, courage: 12, armor: 0, speedMultiplier: 1, heroStatuses: {} };
  const skeleton = { id: 'skeleton', role: 'skeleton', faction: 'dungeon', ecologyFaction: 'undead-host', roomId: 'E25', alive: true, attack: 4, courage: 8, armor: 1, speedMultiplier: 1 };
  sim.agents.push(wraith, shade, skeleton);
  system.update(1, sim);
  assert.equal(wraith.courage, 13);
  assert.equal(wraith.speedMultiplier, 1.16);
  assert.equal(shade.courage, 15);
  assert.equal(skeleton.courage, 8, 'Isara should lead spectral units rather than every undead body');
  system.update(1, sim);
  assert.equal(wraith.courage, 13, 'leadership must reset before re-applying');
  assert.equal(wraith.speedMultiplier, 1.16);
  assert.ok(system.snapshot().activeEffects.some(effect => effect.type === 'black-veil-procession'));
}

// Orum-Bell grants communal regeneration and compresses fear duration, but not while blooming alone.
{
  const sim = makeSim();
  const system = new HeroLeadershipSystem();
  const orum = sim.agents.find(agent => agent.heroId === 'hero.orum-bell');
  const ally = { id: 'myconid', role: 'myconid', faction: 'dungeon', ecologyFaction: 'bluecap-colony', roomId: 'F28', alive: true, hp: 10, maxHp: 20, attack: 3, courage: 8, armor: 0, speedMultiplier: 1, heroStatuses: { fear: { remaining: 10 } } };
  sim.agents.push(ally);
  system.update(1, sim);
  assert.ok(ally.hp > 10);
  assert.equal(ally.courage, 10);
  assert.ok(ally.heroStatuses.fear.remaining < 10);
  const afterCommunion = ally.hp;
  orum.communionEnabled = false;
  orum.heroStatuses.solitaryBloom = { remaining: 5 };
  system.update(1, sim);
  assert.equal(ally.courage, 8);
  assert.equal(ally.hp, afterCommunion);
}

// Glop's actual internal regalia stance changes the faction bonus and remains non-stacking.
{
  const sim = makeSim();
  const system = new HeroLeadershipSystem();
  const glop = sim.agents.find(agent => agent.heroId === 'hero.glop');
  const ally = { id: 'slime', role: 'slime', faction: 'dungeon', ecologyFaction: 'slime-bloom', roomId: 'L57', alive: true, hp: 10, maxHp: 20, attack: 4, courage: 5, armor: 1, speedMultiplier: 1, heroStatuses: {} };
  sim.agents.push(ally);

  glop.heroStance = 'crown';
  system.update(1, sim);
  assert.equal(ally.attack, 6);
  system.update(1, sim);
  assert.equal(ally.attack, 6);

  glop.heroStance = 'key';
  system.update(1, sim);
  assert.equal(ally.attack, 4);
  assert.equal(ally.speedMultiplier, 1.16);

  glop.heroStance = 'throne';
  system.update(1, sim);
  assert.equal(ally.speedMultiplier, 1);
  assert.equal(ally.armor, 3);

  glop.heroStance = 'chalice';
  const before = ally.hp;
  system.update(1, sim);
  assert.equal(ally.armor, 1);
  assert.ok(ally.hp > before);
  assert.equal(ally.heroStatuses.royalRegalia.stance, 'chalice');
}

console.log('WP8-C irregular hero leadership smoke passed');
