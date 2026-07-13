import assert from 'node:assert/strict';
import { HeroSystem } from '../src/sim/heroes/HeroSystem.js';
import { HeroSkillSystem } from '../src/sim/heroes/HeroSkillSystem.js';
import { HeroFormSystem } from '../src/sim/heroes/HeroFormSystem.js';
import { HeroLeadershipSystem } from '../src/sim/heroes/HeroLeadershipSystem.js';

const rooms = ['D19','D18','J49','E25','F28','L57'].map(id => ({ id }));
const sim = {
  time: 0,
  rooms,
  agents: [],
  graph: new Map(rooms.map(room => [room.id, []])),
  props: [],
  combatSystem: { initializeAgent(agent) { agent.combat ??= null; } },
  equipmentSystem: { initializeAgent() {} },
  occupancy: { placeAgent(agent, roomId) { agent.roomId = roomId; agent.roomCell = { x: 0, z: 0 }; return true; }, release() {} },
  emitEffect() {},
  constructionSystem: { structures: [] },
  advancedEcologySystem: { traps: [] },
  logisticsSystem: { cargo: [] },
  ecosystem: { corpses: [] }
};

const heroes = new HeroSystem();
const skills = new HeroSkillSystem();
const forms = new HeroFormSystem();
const leadership = new HeroLeadershipSystem();
sim.heroSystem = heroes;
sim.heroSkillSystem = skills;
sim.heroFormSystem = forms;
heroes.initialize(sim);
skills.initialize(sim);
forms.initialize(sim);

const glop = sim.agents.find(agent => agent.heroId === 'hero.glop');
forms.splitCourt(glop, { duration: 10 }, sim);
const isara = sim.agents.find(agent => agent.heroId === 'hero.isara');
forms.raiseShades(isara, { maximum: 2, duration: 8 }, sim);
leadership.update(0.5, sim);

const raw = {
  heroes: heroes.snapshot(),
  heroSkills: skills.snapshot(),
  heroLeadership: leadership.snapshot(),
  heroForms: forms.snapshot(sim)
};
assert.doesNotThrow(() => JSON.stringify(raw));
assertPlain(raw);
assert.equal(raw.heroes.heroes.length, 9);
assert.equal(raw.heroForms.forms.length, 5);
assert.equal(raw.heroForms.groups.length, 2);
for (const form of raw.heroForms.forms) {
  assert.ok(typeof form.formKind === 'string' && form.formKind.length > 0);
  assert.ok(typeof form.role === 'string' && form.role.length > 0);
  assert.ok(Number.isFinite(form.hp) && form.hp > 0);
  assert.ok(Number.isFinite(form.maxHp) && form.maxHp >= form.hp);
  assert.equal(form.alive, true);
}

const heroForms = Object.fromEntries(raw.heroForms.forms.map(form => [form.id, form]));
const heroFormsByOwner = groupIndex(heroForms, form => form.ownerHeroId);
const heroFormsByRoom = groupIndex(heroForms, form => form.roomId);
assert.equal(heroFormsByOwner['hero.glop'].length, 3);
assert.equal(heroFormsByOwner['hero.isara'].length, 2);
assert.equal(heroFormsByRoom.L57.length, 3);
assert.equal(heroFormsByRoom.E25.length, 2);

console.log('WP8-C hero and temporary-form serializable snapshot smoke passed');

function groupIndex(records, keyOf) {
  const result = {};
  for (const record of Object.values(records)) {
    const key = keyOf(record);
    if (!key) continue;
    (result[key] ??= []).push(record.id);
  }
  return result;
}

function assertPlain(value, path = 'root') {
  if (value === null || ['string','number','boolean','undefined'].includes(typeof value)) return;
  assert.notEqual(value instanceof Map, true, `${path} leaked Map`);
  assert.notEqual(value instanceof Set, true, `${path} leaked Set`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPlain(item, `${path}[${index}]`));
    return;
  }
  assert.equal(Object.getPrototypeOf(value), Object.prototype, `${path} must be a plain object`);
  for (const [key, item] of Object.entries(value)) assertPlain(item, `${path}.${key}`);
}
