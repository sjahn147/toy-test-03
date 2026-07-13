import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroFormSystem } from '../src/sim/heroes/HeroFormSystem.js';

function makeSim() {
  const rooms = ['D19','D18','J49','E25','F28','L57'].map(id => ({ id }));
  const effects = [];
  const sim = {
    time: 0,
    rooms,
    agents: [],
    effects,
    combatSystem: {
      initializeAgent(agent) { agent.combat ??= null; },
      startAttack(agent, target) { agent.combat = { phase: 'windup', targetId: target.id, progress: 0, duration: 0.4 }; return true; }
    },
    equipmentSystem: { initializeAgent() {} },
    occupancy: {
      placeAgent(agent, roomId) { agent.roomId = roomId; agent.roomCell = { x: 0, z: 0 }; return true; },
      release(agentId) { const agent = sim.agents.find(item => item.id === agentId); if (agent) agent.roomCell = null; },
      cancelReservation() {}
    },
    emitEffect(type, payload) { effects.push({ type, ...payload }); }
  };
  const heroSystem = new HeroSystem();
  heroSystem.initialize(sim);
  const forms = new HeroFormSystem();
  forms.initialize(sim);
  sim.heroFormSystem = forms;
  return { sim, heroSystem, forms };
}

// Glop physically splits into three combat-capable forms and merges back.
{
  const { sim, forms } = makeSim();
  const glop = sim.agents.find(agent => agent.heroId === 'hero.glop');
  const startingHp = glop.hp;
  assert.equal(forms.splitCourt(glop, { duration: 2, aspects: ['king','guard','scribe'] }, sim), true);
  assert.equal(forms.splitCourt(glop, { duration: 2 }, sim), false, 'duplicate court split must be rejected');
  assert.equal(glop.hidden, true);
  assert.equal(glop.roomCell, null);
  const court = sim.agents.filter(agent => agent.heroFormOf === 'hero.glop' && agent.alive !== false);
  assert.deepEqual(court.map(agent => agent.heroFormKind).sort(), ['guard','king','scribe']);
  assert.ok(court.every(agent => agent.temporary && agent.heroFormGroupId));
  assert.ok(court.every(agent => agent.roomCell));
  assert.equal(forms.snapshot().groups.length, 1);

  const hostile = { id: 'court-hostile', name: 'Court Hostile', role: 'fighter', faction: 'party', roomId: 'L57', alive: true, departed: false, hidden: false, travel: null, combat: null, downed: false, hp: 80, maxHp: 80, attack: 10, armor: 2, roomCell: { x: 2, z: 0 }, heroStatuses: {} };
  sim.agents.push(hostile);
  const scribe = court.find(agent => agent.heroFormKind === 'scribe');
  const action = forms.decide(scribe, sim);
  assert.equal(action.type, 'hero-form-debuff');
  assert.equal(forms.resolve(scribe, action, sim), true);
  assert.ok(hostile.attack < 10);
  assert.equal(hostile.combat, null);

  const guard = court.find(agent => agent.heroFormKind === 'guard');
  guard.alive = false;
  guard.hp = 0;
  forms.onAgentDeath(guard, sim);
  forms.update(2.2, sim);
  assert.equal(glop.hidden, false);
  assert.equal(glop.roomId, 'L57');
  assert.ok(glop.hp > 0 && glop.hp < startingHp);
  assert.ok(glop.heroStatuses.courtLosses.includes('guard'));
  assert.equal(glop.heroVariant, 'court-diminished');
  assert.equal(forms.snapshot().groups.length, 0);
  assert.ok(sim.effects.some(effect => effect.type === 'hero-form-merge'));
  assert.ok(court.every(agent => agent.departed && agent.hidden));
}

// Isara's shades are temporary agents, are not unique heroes, and expire cleanly.
{
  const { sim, forms } = makeSim();
  const isara = sim.agents.find(agent => agent.heroId === 'hero.isara');
  const count = forms.raiseShades(isara, { maximum: 3, duration: 1.2 }, sim);
  assert.equal(count, 3);
  const shades = sim.agents.filter(agent => agent.heroFormOf === 'hero.isara');
  assert.equal(shades.length, 3);
  assert.ok(shades.every(agent => !agent.isHero && agent.temporary));
  forms.update(0.2, sim);
  assert.ok(shades.every(agent => agent.heroStatuses.incorporeal));
  forms.update(1.2, sim);
  assert.ok(shades.every(agent => agent.departed && agent.hidden && agent.alive === false));
  assert.equal(forms.snapshot().groups.length, 0);
}

const { sim, forms } = makeSim();
const glop = sim.agents.find(agent => agent.heroId === 'hero.glop');
forms.splitCourt(glop, { duration: 4 }, sim);
const snapshot = forms.snapshot();
assert.doesNotThrow(() => JSON.stringify(snapshot));
assert.equal(snapshot.forms.length, 3);
assert.ok(snapshot.forms.every(form => form.ownerHeroId === 'hero.glop' && form.roomId === 'L57'));
assert.ok(forms.metrics().heroFormsSpawned >= 3);

console.log('WP8-B temporary shade and split/merge hero-form smoke passed');
