import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';

function makeSim() {
  const routes = [
    { id: 'route-D19-I41', from: 'D19', to: 'I41', kind: 'ordinary', state: 'open', active: true, width: 3 },
    { id: 'route-D19-B09', from: 'D19', to: 'B09', kind: 'conditional', state: 'locked', active: false, width: 2 },
    { id: 'route-D18-D17', from: 'D18', to: 'D17', kind: 'ordinary', state: 'open', active: true, width: 2.4 },
    { id: 'route-J49-J50', from: 'J49', to: 'J50', kind: 'ordinary', state: 'open', active: true, width: 3 }
  ];
  const routeMap = new Map(routes.map(route => [route.id, route]));
  const effects = [];
  const travels = [];
  const sim = {
    time: 0,
    rooms: [{ id: 'D19' }, { id: 'D18' }, { id: 'J49' }, { id: 'I41' }, { id: 'B09' }, { id: 'D17' }, { id: 'J50' }],
    agents: [],
    graph: new Map([
      ['D19', ['I41']], ['I41', ['D19']], ['D18', ['D17']], ['D17', ['D18']], ['J49', ['J50']], ['J50', ['J49']]
    ]),
    routeGraph: {
      allRoutes() { return [...routeMap.values()].map(route => ({ ...route })); },
      getRoute(id) { const route = routeMap.get(id); return route ? { ...route } : null; }
    },
    setRouteState(id, state) {
      const route = routeMap.get(id);
      if (!route) return { ok: false };
      route.state = state;
      route.active = state === 'open' || state === 'opened';
      return { ok: true, route: { ...route } };
    },
    combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
    equipmentSystem: { initializeAgent() {} },
    occupancy: { placeAgent(agent) { agent.roomCell = { x: 0, z: 0 }; return true; } },
    emitEffect(type, payload) { effects.push({ type, ...payload }); },
    applyCombatDamage(source, target, amount) { target.hp -= amount; },
    beginTravel(agent, roomId) { travels.push([agent.id, roomId]); agent.travel = { toRoomId: roomId }; return true; },
    advancedEcologySystem: { traps: [{ id: 'trap-D18', roomId: 'D18', ownerFaction: 'copper-tail-clutch', charges: 1, cooldown: 2, mode: 'damage' }] },
    constructionSystem: { structures: [{ id: 'structure-D18', roomId: 'D18', factionId: 'copper-tail-clutch', hp: 30, maxHp: 100 }] },
    logisticsSystem: { cargo: [{ id: 'cargo-D19', roomId: 'D19', factionId: 'goblin-clan', lossRisk: 0.5 }] },
    effects,
    travels,
    routes: routeMap
  };
  const heroes = new HeroSystem();
  heroes.initialize(sim);
  return { sim, heroes };
}

// Nibble: route locks distinguish allied and hostile travelers.
{
  const { sim } = makeSim();
  const system = new HeroSkillSystem();
  system.initialize(sim);
  const nibble = sim.agents.find(agent => agent.heroId === 'hero.nibble');
  assert.equal(system.resolve(nibble, { type: 'hero-cast', skillId: 'nibble-lock-the-ways', targetRoomId: 'D19' }, sim), true);
  system.update(2, sim);
  assert.ok(system.snapshot().routeLocks.length >= 1);
  const party = { faction: 'party' };
  const goblin = { faction: 'dungeon', ecologyFaction: 'goblin-clan' };
  assert.equal(system.isRouteBlocked('D19', 'I41', party), true);
  assert.equal(system.isRouteBlocked('D19', 'I41', goblin), false);
  assert.ok(sim.effects.some(effect => effect.type === 'hero-route-lock'));
}

// Nibble: master key changes an authored conditional route state.
{
  const { sim } = makeSim();
  const system = new HeroSkillSystem();
  system.initialize(sim);
  const nibble = sim.agents.find(agent => agent.heroId === 'hero.nibble');
  const target = system.selectUnlockableTarget(nibble, sim);
  assert.equal(target.targetRouteId, 'route-D19-B09');
  system.resolve(nibble, { type: 'hero-cast', skillId: 'nibble-master-key', ...target }, sim);
  system.update(2, sim);
  assert.equal(sim.routes.get('route-D19-B09').state, 'opened');
}

// Kirik: bastion roots the hero and repairs a real structure over time.
{
  const { sim } = makeSim();
  const system = new HeroSkillSystem();
  system.initialize(sim);
  const kirik = sim.agents.find(agent => agent.heroId === 'hero.kirik');
  const structure = sim.constructionSystem.structures[0];
  system.resolve(kirik, { type: 'hero-cast', skillId: 'kirik-triangle-bastion', targetRoomId: 'D18' }, sim);
  system.update(2.5, sim);
  assert.ok(kirik.heroStatuses.bastion);
  assert.equal(system.isMovementBlocked(kirik), true);
  const before = structure.hp;
  system.update(1, sim);
  assert.ok(structure.hp > before);
  assert.ok(kirik.armor > kirik.heroBaseStats.armor);
}

// Kirik: trap reconfiguration is stateful and adds a charge.
{
  const { sim } = makeSim();
  const system = new HeroSkillSystem();
  system.initialize(sim);
  const kirik = sim.agents.find(agent => agent.heroId === 'hero.kirik');
  const trap = sim.advancedEcologySystem.traps[0];
  system.resolve(kirik, { type: 'hero-cast', skillId: 'kirik-reconfigure-trap', targetTrapId: trap.id, targetRoomId: 'D18' }, sim);
  system.update(2, sim);
  assert.equal(trap.mode, 'slow');
  assert.equal(trap.charges, 2);
  assert.equal(trap.cooldown, 0);
}

// Karg: duel modifies real outgoing damage, then second defeat changes runtime stats and visual state.
{
  const { sim } = makeSim();
  const system = new HeroSkillSystem();
  system.initialize(sim);
  const karg = sim.agents.find(agent => agent.heroId === 'hero.karg');
  const target = { id: 'fighter', name: 'Fighter', faction: 'party', roomId: 'J49', alive: true, hp: 80, maxHp: 80, attack: 10, armor: 2, heroStatuses: {} };
  const bystander = { id: 'cleric', name: 'Cleric', faction: 'party', roomId: 'J49', alive: true, hp: 50, maxHp: 50, attack: 5, armor: 0, heroStatuses: {} };
  sim.agents.push(target, bystander);
  system.resolve(karg, { type: 'hero-cast', skillId: 'karg-declare-duel', targetId: target.id, targetRoomId: 'J49' }, sim);
  system.update(2, sim);
  assert.ok(system.duelForHero('hero.karg'));
  assert.ok(system.modifyOutgoingDamage(karg, target, 10) > 10);
  assert.ok(system.modifyOutgoingDamage(karg, bystander, 10) < 10);

  const second = new HeroSkillSystem();
  second.initialize(sim);
  karg.heroCast = null;
  karg.heroCooldowns = {};
  const baseAttack = karg.attack;
  second.resolve(karg, { type: 'hero-cast', skillId: 'karg-remember-second-defeat', targetRoomId: 'J49' }, sim);
  second.update(2.2, sim);
  assert.ok(karg.heroStatuses.secondDefeat);
  assert.equal(karg.heroVariant, 'second-defeat');
  assert.ok(karg.attack > baseAttack);
  assert.ok(karg.speedMultiplier > 1);
}

console.log('WP8-A hero skill smoke passed');
