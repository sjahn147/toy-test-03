import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..', '..');
async function main() {
const repo = await mkdtemp(join(tmpdir(), 'wp8c-installer-'));

await write(join(repo, 'package.json'), JSON.stringify({
  name: 'the-little-dungeon-that-could', type: 'module',
  scripts: { 'test:wp8a': 'echo wp8a', 'test:wp8b': 'echo wp8b', 'test:production': 'echo production && npm run test:wp8a && npm run test:wp8b' }
}, null, 2));
await write(join(repo, 'src/content/heroes/HeroDefinitions.js'), "export const HERO_DEFINITIONS={'hero.nibble':{},'hero.kirik':{},'hero.karg':{},'hero.isara':{},'hero.orum-bell':{},'hero.glop':{}};\n");
await write(join(repo, 'src/sim/heroes/HeroFormSystem.js'), 'export class HeroFormSystem {}\n');
await write(join(repo, 'src/sim/DungeonSimulation.js'), MOCK_SIMULATION);
await write(join(repo, 'src/sim/ProjectileSystem.js'), MOCK_PROJECTILES);
await write(join(repo, 'src/sim/CombatSystem.js'), MOCK_COMBAT);
await write(join(repo, 'src/sim/DungeonSimPhase3.js'), MOCK_PHASE3);
await write(join(repo, 'src/engine/DungeonRenderer.js'), MOCK_RENDERER);
await write(join(repo, 'src/domain/snapshotContract.js'), MOCK_CONTRACT);
await write(join(repo, 'src/compat/normalizeLegacySnapshot.js'), MOCK_NORMALIZER);

await exec(process.execPath, [join(packageRoot, 'apply-wp8c.mjs'), repo]);
await exec(process.execPath, [join(packageRoot, 'apply-wp8c.mjs'), repo]);

const simulation = await readFile(join(repo, 'src/sim/DungeonSimulation.js'), 'utf8');
const projectiles = await readFile(join(repo, 'src/sim/ProjectileSystem.js'), 'utf8');
const combat = await readFile(join(repo, 'src/sim/CombatSystem.js'), 'utf8');
const phase3 = await readFile(join(repo, 'src/sim/DungeonSimPhase3.js'), 'utf8');
const renderer = await readFile(join(repo, 'src/engine/DungeonRenderer.js'), 'utf8');
const contract = await readFile(join(repo, 'src/domain/snapshotContract.js'), 'utf8');
const normalizer = await readFile(join(repo, 'src/compat/normalizeLegacySnapshot.js'), 'utf8');
const definitions = await readFile(join(repo, 'src/content/heroes/HeroDefinitions.js'), 'utf8');
const pkg = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));

for (const token of [
  'HeroFormSystem', 'HeroPhysicsSystem', 'HeroDeployableSystem', 'HeroEnvironmentSystem',
  'this.heroFormSystem.update(dt, this)', 'this.heroDeployableSystem.update(dt, this)',
  'this.heroEnvironmentSystem.update(dt, this)', 'this.heroPhysicsSystem.update(dt, this)',
  'modifyIncomingDamage?.(source, target, amount, metadata)', 'heroEnvironmentSystem?.onDamageDealt',
  'heroForms: this.heroFormSystem.snapshot(this)', 'heroPhysics: this.heroPhysicsSystem.snapshot()',
  'heroDeployables: this.heroDeployableSystem.snapshot()', 'heroEnvironment: this.heroEnvironmentSystem.snapshot()'
]) assert.ok(simulation.includes(token), `simulation missing ${token}`);
for (const token of [
  "import { HeroPhysicsSystem }", "import { HeroDeployableSystem }", "import { HeroEnvironmentSystem }",
  'this.heroPhysicsSystem = new HeroPhysicsSystem', 'this.heroDeployableSystem = new HeroDeployableSystem', 'this.heroEnvironmentSystem = new HeroEnvironmentSystem'
]) assert.equal(count(simulation, token), 1, `duplicate or absent ${token}`);
assert.ok(projectiles.includes('sourceFactionId: source.ecologyFaction'));
assert.ok(projectiles.includes('const simulationStep = dt * timeScale;'));
assert.equal(count(combat, 'heroEnvironmentSystem?.modifyOutgoingDamage'), 1);
assert.equal(count(renderer, 'new HeroWorldActorRenderer'), 1);
assert.equal(count(renderer, 'target.x + physicsOffset.x'), 1);
assert.equal(count(phase3, 'a.heroPhysicsOffset?.x'), 1);
for (const name of ['heroForms', 'heroDeployables', 'heroProjectiles', 'heroFields']) assert.ok(contract.includes(`'${name}'`), name);
for (const name of ['heroFormsByOwner', 'heroFormsByRoom', 'heroDeployablesByRoom', 'heroProjectilesByRoom', 'heroFieldsByRoom']) {
  assert.ok(contract.includes(`'${name}'`), name);
  assert.ok(normalizer.includes(`${name}:`), name);
}
for (const id of ['hero.jijik', 'hero.tissa', 'hero.murga', 'hero.isara', 'hero.orum-bell', 'hero.glop']) assert.ok(definitions.includes(`'${id}'`));
assert.ok(pkg.scripts['test:wp8b']);
assert.ok(pkg.scripts['test:wp8c']);
assert.equal(count(pkg.scripts['test:production'], 'test:wp8c'), 1);

for (const file of [
  'src/sim/DungeonSimulation.js', 'src/sim/ProjectileSystem.js', 'src/sim/CombatSystem.js', 'src/sim/DungeonSimPhase3.js',
  'src/engine/DungeonRenderer.js', 'src/domain/snapshotContract.js', 'src/compat/normalizeLegacySnapshot.js',
  'src/sim/heroes/HeroSystem.js', 'src/sim/heroes/HeroSkillSystem.js', 'src/sim/heroes/HeroLeadershipSystem.js',
  'src/sim/heroes/HeroFormSystem.js', 'src/sim/heroes/HeroPhysicsSystem.js', 'src/sim/heroes/HeroDeployableSystem.js',
  'src/sim/heroes/HeroEnvironmentSystem.js', 'src/engine/heroes/HeroMiniatureFactory.js', 'src/engine/heroes/HeroAnimator.js',
  'src/engine/heroes/HeroSecondaryMotion.js', 'src/engine/heroes/HeroTelegraphRenderer.js', 'src/engine/heroes/HeroWorldActorRenderer.js',
  'src/content/heroes/HeroDefinitions.js', 'src/content/heroes/HeroAnimationClips.js'
]) await exec(process.execPath, ['--check', join(repo, file)]);

console.log('WP8-C cumulative installer and integration smoke passed');
}

async function write(path, content) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
function count(source, token) { return source.split(token).length - 1; }

const MOCK_SIMULATION = `
import { HeroSystem } from './heroes/HeroSystem.js';
import { HeroSkillSystem } from './heroes/HeroSkillSystem.js';
import { HeroLeadershipSystem } from './heroes/HeroLeadershipSystem.js';
import { HeroFormSystem } from './heroes/HeroFormSystem.js';
export class DungeonSimulation extends Object {
  constructor() {
    super();
    this.agents=[]; this.rooms=[];
    this.heroSystem = new HeroSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroSkillSystem = new HeroSkillSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroLeadershipSystem = new HeroLeadershipSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroFormSystem = new HeroFormSystem({ onEvent: (text, meta = {}) => this.event(text, meta) });
    this.heroSystem.initialize(this);
    this.heroSkillSystem.initialize(this);
    this.heroFormSystem.initialize(this);
  }
  update(dt) {
    this.heroSystem.update(dt, this);
    this.heroSkillSystem.update(dt, this);
    this.heroFormSystem.update(dt, this);
    this.heroLeadershipSystem.update(dt, this);
  }
  isActive(){return true;}
  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat) {
      const heroFormAction = this.heroFormSystem.decide(agent, this);
      if (heroFormAction && this.heroFormSystem.resolve(agent, heroFormAction, this)) return;
      const heroAction = this.heroSkillSystem.decide(agent, this);
      if (heroAction && this.heroSkillSystem.resolve(agent, heroAction, this)) return;
    }
  }
  applyCombatDamage(source, target, amount, metadata = {}) {
    const resolvedAmount = this.heroSkillSystem?.modifyIncomingDamage?.(source, target, amount, metadata) ?? amount;
    return super.applyCombatDamage(source, target, resolvedAmount, metadata);
  }
  beginTravel(agent, toRoomId) {
    if (this.heroSkillSystem?.isMovementBlocked(agent)) return false;
    if (this.heroSkillSystem?.isRouteBlocked(agent.roomId, toRoomId, agent)) return false;
    return super.beginTravel(agent, toRoomId);
  }
  finalizeDeath(source, target) {
    this.heroFormSystem.onAgentDeath(target, this);
    this.heroSystem.onAgentDeath(target, this);
  }
  snapshot() {
    return {
      heroes: this.heroSystem.snapshot(),
      heroSkills: this.heroSkillSystem.snapshot(),
      heroLeadership: this.heroLeadershipSystem.snapshot(),
      heroForms: this.heroFormSystem.snapshot(this)
    };
  }
  metrics() {
    return {
      ...this.heroSystem.metrics(),
      ...this.heroSkillSystem.metrics(),
      ...this.heroLeadershipSystem.metrics(),
      ...this.heroFormSystem.metrics()
    };
  }
  event(){}
}
`;

const MOCK_PROJECTILES = `
const PROJECTILE_PROFILES={arrow:{speed:8.4,lifetime:2.8,homing:false}};
export class ProjectileSystem {
 constructor(){this.projectiles=[];this.sequence=0;}
 spawn({type,source,target,amount,roomId}) { const profile=PROJECTILE_PROFILES[type]; const projectile={id:'p'+this.sequence++,type,sourceId:source.id,sourceFactionId: source.ecologyFaction ?? source.factionId ?? source.faction ?? null,targetId:target.id,roomId,speed:profile.speed,age:0,lifetime:profile.lifetime,x:0,y:0,z:0,vx:profile.speed,vy:0,vz:0,homing:false};this.projectiles.push(projectile);return projectile; }
 update(dt,sim){for(const projectile of this.projectiles){projectile.age += dt; const timeScale=Math.max(0.1,Math.min(2,sim.heroSkillSystem?.projectileSpeedMultiplier?.(projectile)??1)); const simulationStep = dt * timeScale; projectile.x += projectile.vx * simulationStep;}}
 snapshot(){return this.projectiles.map(item=>({...item}));}
}
`;

const MOCK_COMBAT = `
export class CombatSystem {
 startAttack(agent,target,sim){
    const rolledAmount = rollDamage(agent);
    const amount = sim.heroSkillSystem?.modifyOutgoingDamage?.(agent, target, rolledAmount) ?? rolledAmount;
    return amount;
 }
}
function rollDamage(){return 5;}
`;

const MOCK_PHASE3 = `
export class DungeonSim {
  engagementDistance(a, b) {
    if (a.roomCell && b.roomCell) return Math.hypot((a.roomCell.x ?? 0) - (b.roomCell.x ?? 0), (a.roomCell.z ?? 0) - (b.roomCell.z ?? 0));
    return 0;
  }
}
`;

const MOCK_RENDERER = `
import { THREE } from './ThreeScene.js';
import { animateHeroEffect } from './heroes/HeroTelegraphRenderer.js';
export class DungeonRenderer {
  constructor(three) {
    this.three = three;
    this.agentMeshes = new Map();
    this.group = new THREE.Group();
    three.scene.add(this.group);
    this.buildRooms();
  }
  buildRooms() {}
  renderState(snapshot) {
    this.renderProps(snapshot.props, snapshot.rooms);
    this.renderAgents(snapshot.agents, snapshot.rooms, snapshot.time);
    this.renderEffects(snapshot.effects ?? [], snapshot.rooms, snapshot.time);
  }
  renderProps() {}
  renderAgents(agents, rooms, time) {
    for (const agent of agents) {
      const target = { x: 0, y: 0, z: 0 };
      const bob = agent.role === 'slime' ? Math.sin(time * 5 + agent.index) * 0.05 : Math.sin(time * 4 + agent.index) * 0.025;
      const targetPosition = new THREE.Vector3(target.x, target.y + bob, target.z);
      void targetPosition;
    }
  }
  renderEffects() {}
  destroy() {
    this.three.scene.remove(this.group);
  }
}
`;

const MOCK_CONTRACT = `
export const ENTITY_TABLES = [
  'agents',
  'rooms',
  'heroes',
  'heroForms',
  'effects'
];
export const INDEX_NAMES = [
  'agentsByRoom',
  'propsByRoom',
  'settlementsByFaction',
  'heroesByFaction',
  'heroesByRoom',
  'heroFormsByOwner',
  'heroFormsByRoom'
];
export function assertWorldSnapshot(value){return value;}
`;

const MOCK_NORMALIZER = `
function tableOf(){return {};}
function groupIndex(){return {};}
export function normalizeLegacySnapshot(raw={}) {
  const agents = tableOf(raw.agents, 'agent');
  const rooms = tableOf(raw.rooms, 'room');
  const heroes = tableOf(raw.heroes?.heroes ?? raw.heroes, 'hero');
  const heroForms = tableOf(raw.heroForms?.forms, 'hero-form');
  const effects = {};
  return {
    entities: { agents, rooms, heroes, heroForms, effects },
    indexes: {
      agentsByRoom: {},
      propsByRoom: {},
      settlementsByFaction: {},
      heroesByFaction: groupIndex(heroes, hero => hero.factionId),
      heroesByRoom: groupIndex(heroes, hero => hero.roomId),
      heroFormsByOwner: groupIndex(heroForms, form => form.ownerHeroId),
      heroFormsByRoom: groupIndex(heroForms, form => form.roomId)
    },
    events: []
  };
}
`;

await main();
