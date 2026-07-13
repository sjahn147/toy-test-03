import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';
import { HeroFormSystem } from '../src/sim/heroes/HeroFormSystem.js';

function makeSim() {
  const rooms = ['D19','D18','J49','E25','E23','E22','F28','F29','L57','L58'].map(id => ({ id }));
  const effects = [];
  const graph = new Map(rooms.map(room => [room.id, []]));
  for (const [a,b] of [['E25','E23'],['E23','E22'],['F28','F29'],['L57','L58']]) { graph.get(a).push(b); graph.get(b).push(a); }
  const sim = {
    time: 0,
    rooms,
    agents: [],
    props: [],
    graph,
    effects,
    combatSystem: {
      initializeAgent(agent) { agent.combat ??= null; },
      startAttack(agent, target) { agent.combat = { phase: 'windup', targetId: target.id, progress: 0 }; return true; }
    },
    equipmentSystem: { initializeAgent() {} },
    occupancy: {
      placeAgent(agent, roomId) { agent.roomId = roomId; agent.roomCell ??= { x: 0, z: 0 }; return true; },
      release(agentId) { const agent = sim.agents.find(item => item.id === agentId); if (agent) agent.roomCell = null; }
    },
    emitEffect(type, payload) { effects.push({ type, ...payload }); },
    applyCombatDamage(source, target, amount) {
      target.hp -= amount;
      if (target.hp <= 0) { target.hp = 0; target.alive = false; }
    },
    beginTravel(agent, roomId) { agent.travel = { toRoomId: roomId }; return true; },
    ecosystem: { corpses: [] },
    logisticsSystem: { cargo: [] },
    constructionSystem: { structures: [] },
    advancedEcologySystem: { traps: [] }
  };
  const heroSystem = new HeroSystem();
  const heroFormSystem = new HeroFormSystem();
  const heroSkillSystem = new HeroSkillSystem();
  sim.heroSystem = heroSystem;
  sim.heroFormSystem = heroFormSystem;
  sim.heroSkillSystem = heroSkillSystem;
  heroSystem.initialize(sim);
  heroFormSystem.initialize(sim);
  heroSkillSystem.initialize(sim);
  return { sim, heroSystem, heroFormSystem, heroSkillSystem };
}

function hero(sim, id) { return sim.agents.find(agent => agent.heroId === id); }
function enemy(id, roomId, overrides = {}) {
  return { id, name: id, role: 'fighter', faction: 'party', roomId, alive: true, departed: false, hidden: false, downed: false, travel: null, combat: null, hp: 80, maxHp: 80, attack: 10, armor: 2, courage: 10, speedMultiplier: 1, roomCell: { x: 2, z: 0 }, heroStatuses: {}, ...overrides };
}
function advance(system, forms, sim, seconds, step = 0.1) {
  let remaining = seconds;
  while (remaining > 0.00001) {
    const dt = Math.min(step, remaining);
    sim.time += dt;
    system.update(dt, sim);
    forms.update(dt, sim);
    remaining -= dt;
  }
}

// Isara: veil is a functional zone, not only a visual effect.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const isara = hero(sim, 'hero.isara');
  const target = enemy('veil-target', 'E25');
  sim.agents.push(target);
  assert.equal(skills.resolve(isara, { type: 'hero-cast', skillId: 'isara-mourning-veil', targetRoomId: 'E25' }, sim), true);
  advance(skills, forms, sim, 2.1);
  assert.ok(skills.hasZone('mourning-veil', 'E25', 'hero.isara'));
  advance(skills, forms, sim, 0.5);
  assert.ok(target.speedMultiplier < 1);
  assert.ok(target.attack < 10);
  assert.ok(isara.heroStatuses.veilConcealment);
  assert.ok(skills.modifyIncomingDamage(target, isara, 10, { melee: true }) < 10);
  assert.ok(skills.modifyIncomingDamage(target, isara, 10, { holy: true, projectileType: 'holy' }) > 10);
}

// Isara: procession moves adjacent wraiths and produces real temporary shade agents.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const isara = hero(sim, 'hero.isara');
  const wraith = { id: 'wraith-ally', role: 'wraith', species: 'wraith', faction: 'dungeon', ecologyFaction: 'undead-host', roomId: 'E23', alive: true, departed: false, hidden: false, travel: null, combat: null, hp: 20, maxHp: 20, attack: 5, armor: 0, courage: 14, roomCell: { x: 0, z: 0 } };
  sim.agents.push(wraith, enemy('procession-target', 'E25'));
  assert.equal(skills.resolve(isara, { type: 'hero-cast', skillId: 'isara-soul-procession', targetRoomId: 'E25' }, sim), true);
  advance(skills, forms, sim, 2.4);
  assert.equal(wraith.roomId, 'E25');
  const shades = sim.agents.filter(agent => agent.heroFormOf === 'hero.isara' && agent.alive !== false);
  assert.equal(shades.length, 2);
  assert.ok(forms.snapshot().groups.some(group => group.type === 'isara-shades'));
}

// Isara: the domain changes projectile simulation speed.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const isara = hero(sim, 'hero.isara');
  sim.agents.push(enemy('domain-a', 'E25'), enemy('domain-b', 'E25', { roomCell: { x: -2, z: 0 } }), enemy('domain-c', 'E25', { roomCell: { x: 0, z: 2 } }));
  assert.equal(skills.resolve(isara, { type: 'hero-cast', skillId: 'isara-unburied-queen', targetRoomId: 'E25' }, sim), true);
  advance(skills, forms, sim, 2.8);
  assert.ok(skills.hasZone('ethereal-domain', 'E25', 'hero.isara'));
  assert.equal(skills.projectileSpeedMultiplier({ roomId: 'E25', sourceFactionId: 'party' }), 0.62);
  assert.equal(skills.projectileSpeedMultiplier({ roomId: 'E25', sourceFactionId: 'undead-host' }), 1);
  assert.equal(sim.agents.filter(agent => agent.heroFormOf === 'hero.isara' && agent.alive !== false).length, 3);
}

// Orum-Bell: growing lance deals real damage and roots a line of targets.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const orum = hero(sim, 'hero.orum-bell');
  orum.roomCell = { x: 0, z: 0 };
  const targets = [
    enemy('lance-1', 'F28', { roomCell: { x: 1.1, z: 0 }, hp: 60, maxHp: 60 }),
    enemy('lance-2', 'F28', { roomCell: { x: 2.2, z: 0 }, hp: 60, maxHp: 60 }),
    enemy('lance-3', 'F28', { roomCell: { x: 3.3, z: 0 }, hp: 60, maxHp: 60 })
  ];
  sim.agents.push(...targets);
  assert.equal(skills.resolve(orum, { type: 'hero-cast', skillId: 'orum-mycelial-lance', targetId: 'lance-1', targetRoomId: 'F28' }, sim), true);
  advance(skills, forms, sim, 1.8);
  assert.ok(targets.every(target => target.hp < 60));
  assert.ok(targets.every(target => target.heroStatuses.rooted?.remaining > 0));
  assert.ok(orum.heroStatuses.lanceGrown);
}

// Orum-Bell: memory bloom cleans allies and disorients hostiles.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const orum = hero(sim, 'hero.orum-bell');
  const ally = { id: 'myconid-ally', role: 'myconid', faction: 'dungeon', ecologyFaction: 'bluecap-colony', roomId: 'F28', alive: true, hp: 20, maxHp: 20, attack: 3, courage: 8, heroStatuses: { fear: { remaining: 5 }, confusion: { remaining: 5 } }, sporeSleep: 4 };
  const target = enemy('memory-target', 'F28');
  target.combat = { targetId: orum.id };
  sim.agents.push(ally, target);
  skills.resolve(orum, { type: 'hero-cast', skillId: 'orum-memory-bloom', targetRoomId: 'F28' }, sim);
  advance(skills, forms, sim, 2.2);
  assert.equal(ally.heroStatuses.fear, undefined);
  assert.equal(ally.heroStatuses.confusion, undefined);
  assert.equal(ally.sporeSleep, 0);
  advance(skills, forms, sim, 0.5);
  assert.ok(target.attack < 10);
  assert.equal(target.combat, null);
}

// Orum-Bell: solitary bloom is a timed transformation with an ending health cost.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const orum = hero(sim, 'hero.orum-bell');
  const baseAttack = orum.attack;
  skills.resolve(orum, { type: 'hero-cast', skillId: 'orum-solitary-bloom', targetRoomId: 'F28' }, sim);
  advance(skills, forms, sim, 2.6);
  assert.ok(orum.heroStatuses.solitaryBloom);
  assert.ok(orum.attack > baseAttack);
  assert.equal(orum.communionEnabled, false);
  const beforeCost = orum.hp;
  advance(skills, forms, sim, 14.5, 0.25);
  assert.equal(orum.heroStatuses.solitaryBloom, undefined);
  assert.equal(orum.communionEnabled, true);
  assert.ok(orum.hp < beforeCost);
}

// Glop: royal command applies real crowd control and can pull targets.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const glop = hero(sim, 'hero.glop');
  glop.roomCell = { x: 0, z: 0 };
  const target = enemy('subject', 'L57', { roomCell: { x: 4, z: 0 } });
  sim.agents.push(target);
  skills.resolve(glop, { type: 'hero-cast', skillId: 'glop-royal-command', targetRoomId: 'L57', commandMode: 'kneel' }, sim);
  advance(skills, forms, sim, 1.9);
  assert.ok(target.speedMultiplier < 1);
  assert.ok(target.heroStatuses.stagger);

  glop.heroCooldowns['glop-royal-command'] = 0;
  glop.heroCast = null;
  target.heroStatuses = {};
  target.speedMultiplier = 1;
  target.roomCell = { x: 4, z: 0 };
  skills.resolve(glop, { type: 'hero-cast', skillId: 'glop-royal-command', targetRoomId: 'L57', commandMode: 'approach' }, sim);
  advance(skills, forms, sim, 1.9);
  assert.ok(target.roomCell.x < 4);
}

// Glop: digesting a real corpse heals and changes visible regalia stance state.
{
  const { sim, heroSkillSystem: skills, heroFormSystem: forms } = makeSim();
  const glop = hero(sim, 'hero.glop');
  glop.hp = 80;
  sim.ecosystem.corpses.push({ id: 'corpse-royal', roomId: 'L57', food: 3, biomass: 2 });
  skills.resolve(glop, { type: 'hero-cast', skillId: 'glop-digest-evidence', targetRoomId: 'L57', targetCorpseId: 'corpse-royal' }, sim);
  advance(skills, forms, sim, 2.4);
  assert.ok(glop.hp > 80);
  assert.equal(sim.ecosystem.corpses.length, 0);
  assert.equal(glop.heroStance, 'crown');
  assert.ok(glop.heroFlags.includes('digested-corpse'));
}

console.log('WP8-B irregular hero functional skill lifecycle smoke passed');
