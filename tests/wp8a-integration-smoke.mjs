import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const packageRoot = join(here, '..', '..');
  const repo = await mkdtemp(join(tmpdir(), 'wp8a-installer-'));

  await write(join(repo, 'package.json'), JSON.stringify({ name: 'the-little-dungeon-that-could', type: 'module', scripts: { 'test:production': 'echo production' } }, null, 2));
  for (const path of [
    'src/sim/SpawnNetworkSystem.js','src/sim/EliteEcologySystem.js','src/sim/EliteAbilitySystem.js','src/miniatures/EliteMiniatureFactory.js','src/miniatures/MiniatureAnimator.js','src/domain/ActiveCampaignGraph.js'
  ]) await write(join(repo, path), 'export const placeholder = true;\n');

  await write(join(repo, 'src/sim/DungeonSimulation.js'), MOCK_SIMULATION);
  await write(join(repo, 'src/engine/MiniatureFactory.js'), MOCK_FACTORY);
  await write(join(repo, 'src/engine/DungeonRenderer.js'), MOCK_RENDERER);
  await write(join(repo, 'src/engine/AssetRegistry.js'), MOCK_ASSET_REGISTRY);
  await write(join(repo, 'src/sim/CombatSystem.js'), MOCK_COMBAT);
  await write(join(repo, 'src/domain/snapshotContract.js'), MOCK_CONTRACT);
  await write(join(repo, 'src/compat/normalizeLegacySnapshot.js'), MOCK_NORMALIZER);

  await exec(process.execPath, [join(packageRoot, 'apply-wp8a.mjs'), repo]);
  await exec(process.execPath, [join(packageRoot, 'apply-wp8a.mjs'), repo]);

  const simulation = await readFile(join(repo, 'src/sim/DungeonSimulation.js'), 'utf8');
  const factory = await readFile(join(repo, 'src/engine/MiniatureFactory.js'), 'utf8');
  const renderer = await readFile(join(repo, 'src/engine/DungeonRenderer.js'), 'utf8');
  const assets = await readFile(join(repo, 'src/engine/AssetRegistry.js'), 'utf8');
  const combat = await readFile(join(repo, 'src/sim/CombatSystem.js'), 'utf8');
  const normalizer = await readFile(join(repo, 'src/compat/normalizeLegacySnapshot.js'), 'utf8');
  const contract = await readFile(join(repo, 'src/domain/snapshotContract.js'), 'utf8');
  const pkg = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));

  for (const token of ['HeroSystem', 'HeroSkillSystem', 'HeroLeadershipSystem', 'heroRouteLocks', 'heroSkills']) assert.ok(simulation.includes(token) || simulation.includes(token.replace('heroRouteLocks', 'isRouteBlocked')));
  assert.equal(count(simulation, "import { HeroSystem }"), 1);
  assert.equal(count(factory, 'createHeroMiniature(agent)'), 1);
  assert.equal(count(renderer, 'animateHeroMiniature(mesh, agent, time)'), 1);
  assert.equal(count(assets, 'createHeroEffect(effect)'), 1);
  assert.equal(count(combat, 'modifyOutgoingDamage'), 1);
  assert.ok(normalizer.includes('heroesByFaction'));
  assert.ok(contract.includes("'heroes'"));
  assert.ok(pkg.scripts['test:wp8a']);
  assert.ok(pkg.scripts['test:production'].includes('test:wp8a'));

  for (const file of [
    'src/sim/DungeonSimulation.js','src/engine/MiniatureFactory.js','src/engine/DungeonRenderer.js','src/engine/AssetRegistry.js','src/sim/CombatSystem.js','src/domain/snapshotContract.js','src/compat/normalizeLegacySnapshot.js',
    'src/sim/heroes/HeroSystem.js','src/sim/heroes/HeroSkillSystem.js','src/sim/heroes/HeroLeadershipSystem.js','src/engine/heroes/HeroMiniatureFactory.js','src/engine/heroes/HeroAnimator.js','src/engine/heroes/HeroTelegraphRenderer.js'
  ]) await exec(process.execPath, ['--check', join(repo, file)]);

  console.log('WP8-A installer and integration smoke passed');

}

async function write(path, content) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
function count(source, token) { return source.split(token).length - 1; }

const MOCK_SIMULATION = `
import { EliteBehaviorSystem } from './EliteBehaviorSystem.js';
export class DungeonSimulation extends Object {
  constructor() {
    super();
    this.agents=[]; this.rooms=[];
    this.eliteAbilitySystem={initialize(){},decide(){},resolve(){},update(){},snapshot(){return{}},metrics(){return{}}};
    this.eliteEcologySystem={initialize(){},update(){},onAgentDeath(){},snapshot(){return{}},metrics(){return{}}};
    this.eliteBehaviorSystem={update(){},decide(){},resolve(){},snapshot(){return{}},metrics(){return{}}};
    this.eliteAbilitySystem.initialize(this);
  }
  update(dt) {
    this.eliteEcologySystem.update(dt, this);
  }
  isActive(){return true;}
  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat) {
      const eliteAbility = this.eliteAbilitySystem.decide(agent, this);
      if (eliteAbility && this.eliteAbilitySystem.resolve(agent, eliteAbility, this)) return;
    }
  }
  finalizeDeath(source, target) {
    if (target?.eliteStatuses?.deathless?.remaining > 0) {
      target.hp = 1;
      target.downed = false;
      target.bleedout = 0;
      delete target.eliteStatuses.deathless;
      this.event('deathless ward');
      return;
    }
    this.eliteEcologySystem.onAgentDeath(target, this);
  }
  snapshot() {
    return {
      eliteBehavior: this.eliteBehaviorSystem.snapshot()
    };
  }
  metrics() {
    return {
      ...this.eliteBehaviorSystem.metrics()
    };
  }
  event(){}
}
`;

const MOCK_FACTORY = `
import { createEliteMiniature } from '../miniatures/EliteMiniatureFactory.js';
export class MiniatureFactory {
  create(agent) {
    const elite = createEliteMiniature(agent);
    if (elite) return elite;
    return null;
  }
}
`;

const MOCK_RENDERER = `
import { animateEliteMiniature } from '../miniatures/MiniatureAnimator.js';
export class DungeonRenderer {
  renderAgent(mesh, agent, time) {
      animateEliteMiniature(mesh, agent, time);
      mesh.visible = true;
  }
  renderEffects(effects, time) {
    for (const effect of effects) {
      const mesh = effect.mesh;
      const age = Math.max(0, time - effect.createdAt);
      const progress = Math.min(1, age / effect.duration);
      mesh.position.y += progress;
    }
  }
}
`;

const MOCK_ASSET_REGISTRY = `
import { MiniatureFactory } from './MiniatureFactory.js';
const THREE={Group:class{}};
export class AssetRegistry {
  makeEffect(effect) {
    const group = new THREE.Group();
    return group;
  }
}
`;

const MOCK_COMBAT = `
function rollDamage(){return 5;}
export class CombatSystem {
  startAttack(agent, target, sim) {
    const amount = rollDamage(agent);
    return amount;
  }
}
`;

const MOCK_CONTRACT = `
export const ENTITY_TABLES = [
  'agents',
  'rooms',
  'environmentTasks',
  'settlementOrders',
  'zoneInteractions',
  'effects'
];
export const INDEX_NAMES = [
  'agentsByRoom',
  'propsByRoom',
  'settlementsByFaction',
  'environmentTasksByRoom',
  'environmentTasksByTarget',
  'settlementOrdersByRoom',
  'settlementOrdersBySettlement',
  'zoneInteractionsByRoom',
  'zoneInteractionsByAction'
];
`;

const MOCK_NORMALIZER = `
function tableOf(){return {};}
function factionTable(){return {};}
function groupIndex(){return {};}
export function normalizeLegacySnapshot(raw={}) {
  const agents = tableOf(raw.agents, 'agent');
  const rooms = tableOf(raw.rooms, 'room');
  const connections = {};
  const props = {};
  const settlements = {};
  const parties = {};
  const cargo = {};
  const structures = tableOf(raw.construction?.structures, 'structure');
  const environmentTasks = tableOf(raw.environmentTasks?.tasks, 'environment-task');
  const settlementOrders = tableOf(raw.settlementOperations?.orders, 'settlement-order');
  const zoneInteractions = tableOf(raw.zoneInteractions?.tasks, 'zone-interaction');
  const factions = factionTable(agents, settlements);
  const effects = {};
  return {
    entities: { agents, rooms, connections, props, settlements, factions, parties, cargo, structures, environmentTasks, settlementOrders, zoneInteractions, effects },
    indexes: {
      agentsByRoom: {},
      propsByRoom: groupIndex(props, prop => prop.roomId),
      settlementsByFaction: groupIndex(settlements, settlement => settlement.factionId),
      environmentTasksByRoom: groupIndex(environmentTasks, task => task.targetRoomId),
      environmentTasksByTarget: groupIndex(environmentTasks, task => task.targetKey),
      settlementOrdersByRoom: groupIndex(settlementOrders, order => order.targetRoomId),
      settlementOrdersBySettlement: groupIndex(settlementOrders, order => order.settlementId),
      zoneInteractionsByRoom: groupIndex(zoneInteractions, task => task.targetRoomId),
      zoneInteractionsByAction: groupIndex(zoneInteractions, task => task.actionId)
    },
    events: []
  };
}
`;

await main();
