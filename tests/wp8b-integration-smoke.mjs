import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..', '..');

async function main() {
const repo = await mkdtemp(join(tmpdir(), 'wp8b-installer-'));

await write(join(repo, 'package.json'), JSON.stringify({
  name: 'the-little-dungeon-that-could',
  type: 'module',
  scripts: { 'test:wp8a': 'echo wp8a', 'test:production': 'echo production && npm run test:wp8a' }
}, null, 2));
await write(join(repo, 'src/content/heroes/HeroDefinitions.js'), "export const HERO_DEFINITIONS={'hero.nibble':{},'hero.kirik':{},'hero.karg':{}};\n");
for (const file of [
  'src/sim/heroes/HeroSystem.js','src/sim/heroes/HeroSkillSystem.js','src/sim/heroes/HeroLeadershipSystem.js',
  'src/engine/heroes/HeroMiniatureFactory.js','src/engine/heroes/HeroAnimator.js','src/engine/heroes/HeroTelegraphRenderer.js'
]) await write(join(repo, file), 'export const placeholder = true;\n');
await write(join(repo, 'src/sim/DungeonSimulation.js'), MOCK_SIMULATION);
await write(join(repo, 'src/sim/ProjectileSystem.js'), MOCK_PROJECTILES);
await write(join(repo, 'src/domain/snapshotContract.js'), MOCK_CONTRACT);
await write(join(repo, 'src/compat/normalizeLegacySnapshot.js'), MOCK_NORMALIZER);

await exec(process.execPath, [join(packageRoot, 'apply-wp8b.mjs'), repo]);
await exec(process.execPath, [join(packageRoot, 'apply-wp8b.mjs'), repo]);

const simulation = await readFile(join(repo, 'src/sim/DungeonSimulation.js'), 'utf8');
const projectiles = await readFile(join(repo, 'src/sim/ProjectileSystem.js'), 'utf8');
const contract = await readFile(join(repo, 'src/domain/snapshotContract.js'), 'utf8');
const normalizer = await readFile(join(repo, 'src/compat/normalizeLegacySnapshot.js'), 'utf8');
const definitions = await readFile(join(repo, 'src/content/heroes/HeroDefinitions.js'), 'utf8');
const pkg = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));

for (const token of [
  'HeroFormSystem',
  'this.heroFormSystem.update(dt, this)',
  'heroFormAction',
  'modifyIncomingDamage?.(source, target, amount, metadata)',
  'this.heroFormSystem.onAgentDeath(target, this)',
  'heroForms: this.heroFormSystem.snapshot(this)',
  '...this.heroFormSystem.metrics()'
]) assert.ok(simulation.includes(token), `simulation missing ${token}`);
assert.equal(count(simulation, "import { HeroFormSystem }"), 1);
assert.equal(count(simulation, 'this.heroFormSystem = new HeroFormSystem'), 1);
assert.ok(projectiles.includes('sourceFactionId: source.ecologyFaction'));
assert.ok(projectiles.includes('const simulationStep = dt * timeScale;'));
assert.equal(count(projectiles, 'const simulationStep = dt * timeScale;'), 1);
assert.ok(contract.includes("'heroForms'"));
assert.ok(contract.includes("'heroFormsByOwner'"));
assert.ok(contract.includes("'heroFormsByRoom'"));
assert.ok(normalizer.includes("const heroForms = tableOf(raw.heroForms?.forms, 'hero-form');"));
assert.ok(normalizer.includes('heroFormsByOwner'));
assert.ok(normalizer.includes('heroFormsByRoom'));
assert.ok(definitions.includes("'hero.isara'"));
assert.ok(definitions.includes("'hero.orum-bell'"));
assert.ok(definitions.includes("'hero.glop'"));
assert.ok(pkg.scripts['test:wp8b']);
assert.ok(pkg.scripts['test:production'].includes('test:wp8b'));
assert.equal(count(pkg.scripts['test:production'], 'test:wp8b'), 1);

for (const file of [
  'src/sim/DungeonSimulation.js','src/sim/ProjectileSystem.js','src/domain/snapshotContract.js','src/compat/normalizeLegacySnapshot.js',
  'src/sim/heroes/HeroSystem.js','src/sim/heroes/HeroSkillSystem.js','src/sim/heroes/HeroLeadershipSystem.js','src/sim/heroes/HeroFormSystem.js',
  'src/engine/heroes/HeroMiniatureFactory.js','src/engine/heroes/HeroAnimator.js','src/engine/heroes/HeroSecondaryMotion.js','src/engine/heroes/HeroTelegraphRenderer.js',
  'src/content/heroes/HeroDefinitions.js','src/content/heroes/HeroAnimationClips.js'
]) await exec(process.execPath, ['--check', join(repo, file)]);

// The patched projectile system must use real simulation-time scaling rather than
// only changing the visual effect or declared speed.
{
  const { ProjectileSystem } = await import(`${pathToFileURL(join(repo, 'src/sim/ProjectileSystem.js')).href}?v=${Date.now()}`);
  const system = new ProjectileSystem();
  const source = { id: 'source', faction: 'party', roomId: 'E25', roomCell: { x: 0, z: 0 } };
  const target = { id: 'target', faction: 'dungeon', ecologyFaction: 'undead-host', roomId: 'E25', roomCell: { x: 10, z: 0 }, alive: true };
  const sim = {
    agents: [source, target],
    heroSkillSystem: { projectileSpeedMultiplier() { return 0.5; } },
    applyCombatDamage() {}, applyHealing() {}, applyWeb() {}
  };
  const projectile = system.spawn({ type: 'arrow', source, target, amount: 5, roomId: 'E25' });
  system.update(0.5, sim);
  assert.ok(projectile.x > 1.8 && projectile.x < 2.4, `expected half-speed arrow displacement, got ${projectile.x}`);
  assert.equal(projectile.sourceFactionId, 'party');
}

// The patched normalizer exposes the new forms as an ordinary serializable entity table.
{
  const { normalizeLegacySnapshot } = await import(`${pathToFileURL(join(repo, 'src/compat/normalizeLegacySnapshot.js')).href}?v=${Date.now()}`);
  const snapshot = normalizeLegacySnapshot({
    heroes: { heroes: [{ id: 'hero.glop', factionId: 'slime-bloom', roomId: 'L57' }] },
    heroForms: { forms: [
      { id: 'form-king', ownerHeroId: 'hero.glop', roomId: 'L57' },
      { id: 'form-guard', ownerHeroId: 'hero.glop', roomId: 'L57' }
    ] }
  });
  assert.equal(Object.keys(snapshot.entities.heroForms).length, 2);
  assert.deepEqual(snapshot.indexes.heroFormsByOwner['hero.glop'], ['form-king','form-guard']);
  assert.deepEqual(snapshot.indexes.heroFormsByRoom.L57, ['form-king','form-guard']);
}

console.log('WP8-B installer, projectile physics, snapshot, and integration smoke passed');
}

async function write(path, content) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
function count(source, token) { return source.split(token).length - 1; }

const MOCK_SIMULATION = `
import { HeroSystem } from './heroes/HeroSystem.js';
import { HeroSkillSystem } from './heroes/HeroSkillSystem.js';
import { HeroLeadershipSystem } from './heroes/HeroLeadershipSystem.js';
export class DungeonSimulation extends Object {
  constructor() {
    super();
    this.agents=[]; this.rooms=[];
    this.eliteAbilitySystem={decide(){},resolve(){}};
    this.eliteEcologySystem={update(){},onAgentDeath(){},snapshot(){return{}},metrics(){return{}}};
    this.eliteBehaviorSystem={update(){},decide(){},resolve(){},snapshot(){return{}},metrics(){return{}}};
    this.heroSystem = new HeroSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroSkillSystem = new HeroSkillSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroLeadershipSystem = new HeroLeadershipSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroSystem.initialize(this);
    this.heroSkillSystem.initialize(this);
  }
  update(dt) {
    this.heroSystem.update(dt, this);
    this.heroSkillSystem.update(dt, this);
    this.heroLeadershipSystem.update(dt, this);
    this.eliteEcologySystem.update(dt, this);
  }
  isActive(){return true;}
  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat) {
      const heroAction = this.heroSkillSystem.decide(agent, this);
      if (heroAction && this.heroSkillSystem.resolve(agent, heroAction, this)) return;
      const eliteAbility = this.eliteAbilitySystem.decide(agent, this);
      if (eliteAbility && this.eliteAbilitySystem.resolve(agent, eliteAbility, this)) return;
    }
  }
  beginTravel(agent, toRoomId) {
    if (this.heroSkillSystem?.isMovementBlocked(agent)) return false;
    if (this.heroSkillSystem?.isRouteBlocked(agent.roomId, toRoomId, agent)) return false;
    return super.beginTravel(agent, toRoomId);
  }
  finalizeDeath(source, target) {
    this.heroSystem.onAgentDeath(target, this);
    this.eliteEcologySystem.onAgentDeath(target, this);
  }
  snapshot() {
    return {
      eliteBehavior: this.eliteBehaviorSystem.snapshot(),
      heroes: this.heroSystem.snapshot(),
      heroSkills: this.heroSkillSystem.snapshot(),
      heroLeadership: this.heroLeadershipSystem.snapshot()
    };
  }
  metrics() {
    return {
      ...this.eliteBehaviorSystem.metrics(),
      ...this.heroSystem.metrics(),
      ...this.heroSkillSystem.metrics(),
      ...this.heroLeadershipSystem.metrics()
    };
  }
  event(){}
}
`;

const MOCK_PROJECTILES = `
const PROJECTILE_PROFILES = {
  arrow: { speed: 8.4, lifetime: 2.8, homing: false },
  magic: { speed: 6.2, lifetime: 3.2, homing: true },
  heal: { speed: 5.8, lifetime: 3.2, homing: true },
  web: { speed: 4.7, lifetime: 3.4, homing: true }
};

export class ProjectileSystem {
  constructor() {
    this.projectiles = [];
    this.sequence = 0;
  }

  spawn({ type, source, target, amount, roomId }) {
    const profile = PROJECTILE_PROFILES[type];
    if (!profile || !source || !target) return null;
    const start = agentPoint(source, 0.85);
    const end = agentPoint(target, 0.72);
    const direction = normalize(end.x - start.x, end.y - start.y, end.z - start.z);
    const projectile = {
      id: \`projectile-\${this.sequence++}\`,
      type,
      sourceId: source.id,
      targetId: target.id,
      roomId: roomId ?? source.roomId,
      amount,
      x: start.x,
      y: start.y,
      z: start.z,
      vx: direction.x * profile.speed,
      vy: direction.y * profile.speed,
      vz: direction.z * profile.speed,
      speed: profile.speed,
      homing: profile.homing,
      age: 0,
      lifetime: profile.lifetime,
      rotation: Math.atan2(direction.x, direction.z)
    };
    this.projectiles.push(projectile);
    return projectile;
  }

  update(dt, sim) {
    const survivors = [];
    for (const projectile of this.projectiles) {
      projectile.age += dt;
      const source = sim.agents.find(agent => agent.id === projectile.sourceId);
      const target = sim.agents.find(agent => agent.id === projectile.targetId);
      if (!target || projectile.age >= projectile.lifetime || target.roomId !== projectile.roomId || target.travel) continue;

      const targetPoint = agentPoint(target, 0.72);
      const dx = targetPoint.x - projectile.x;
      const dy = targetPoint.y - projectile.y;
      const dz = targetPoint.z - projectile.z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance <= Math.max(0.24, projectile.speed * dt * 1.25)) {
        this.impact(projectile, source, target, sim);
        continue;
      }

      if (projectile.homing) {
        const direction = normalize(dx, dy, dz);
        const steering = Math.min(1, dt * 5.5);
        projectile.vx = lerp(projectile.vx, direction.x * projectile.speed, steering);
        projectile.vy = lerp(projectile.vy, direction.y * projectile.speed, steering);
        projectile.vz = lerp(projectile.vz, direction.z * projectile.speed, steering);
      }

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.z += projectile.vz * dt;
      projectile.rotation = Math.atan2(projectile.vx, projectile.vz);
      survivors.push(projectile);
    }
    this.projectiles = survivors;
  }

  impact(projectile, source, target, sim) {
    if (projectile.type === 'heal') return sim.applyHealing(source, target, projectile.amount);
    if (projectile.type === 'web') return sim.applyWeb(source, target, projectile.amount);
    sim.applyCombatDamage(source, target, projectile.amount, { projectileType: projectile.type });
  }

  snapshot() { return this.projectiles.map(projectile => ({ ...projectile })); }
}

function agentPoint(agent, height) {
  const cell = agent.roomCell ?? agent.travel?.destinationCell;
  return { x: cell?.x ?? 0, y: height, z: cell?.z ?? 0 };
}
function normalize(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}
function lerp(a, b, t) { return a + (b - a) * t; }
`;
const MOCK_CONTRACT = `
export const ENTITY_TABLES = [
  'agents',
  'rooms',
  'connections',
  'props',
  'settlements',
  'factions',
  'parties',
  'cargo',
  'structures',
  'heroes',
  'effects'
];
export const INDEX_NAMES = [
  'agentsByRoom',
  'propsByRoom',
  'settlementsByFaction',
  'heroesByFaction',
  'heroesByRoom'
];
export function assertWorldSnapshot(snapshot){return snapshot;}
`;

const MOCK_NORMALIZER = `
function tableOf(source, prefix) {
  const table = {};
  const push = (record, fallbackKey) => {
    const item = { ...record, id: String(record?.id ?? fallbackKey) };
    table[item.id] = item;
  };
  if (Array.isArray(source)) source.forEach((record, index) => push(record, \`\${prefix}-\${index}\`));
  else if (source && typeof source === 'object') for (const [key, record] of Object.entries(source)) push(record, key);
  return table;
}
function groupIndex(records, keyOf) {
  const result = {};
  for (const record of Object.values(records)) {
    const key = keyOf(record);
    if (!key) continue;
    (result[key] ??= []).push(record.id);
  }
  return result;
}
export function normalizeLegacySnapshot(rawSnapshot = {}) {
  const raw = rawSnapshot && typeof rawSnapshot === 'object' ? rawSnapshot : {};
  const agents = tableOf(raw.agents, 'agent');
  const rooms = tableOf(raw.rooms, 'room');
  const props = tableOf(raw.props, 'prop');
  const effects = tableOf(raw.effects, 'effect');
  const connections = {};
  const settlements = {};
  const parties = {};
  const cargo = {};
  const structures = {};
  const heroes = tableOf(raw.heroes?.heroes ?? raw.heroes, 'hero');
  const factions = {};

  const snapshot = {
    clock: { time: 0, turn: 0, ended: false },
    entities: { agents, rooms, connections, props, settlements, factions, parties, cargo, structures, heroes, effects },
    indexes: {
      agentsByRoom: {},
      propsByRoom: {},
      settlementsByFaction: {},
      heroesByFaction: groupIndex(heroes, hero => hero.factionId),
      heroesByRoom: groupIndex(heroes, hero => hero.roomId)
    },
    events: []
  };
  return snapshot;
}
`;


await main();
