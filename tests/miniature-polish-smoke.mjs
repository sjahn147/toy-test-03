import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MINIATURE_RECIPES } from '../src/miniatures/recipes.js';
import { MINIATURE_PARTS } from '../src/miniatures/partCatalog.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [
  factory,
  profiles,
  humanoid,
  skeleton,
  creatures,
  exotic,
  weapons,
  phase3Equipment,
  orc,
  presentation,
  animator,
  advanced,
  bridge,
  registry,
  renderer,
  observer
] = await Promise.all([
  read('../src/engine/PolishedMiniatureFactory.js'),
  read('../src/engine/MiniatureBodyProfiles.js'),
  read('../src/engine/HumanoidMiniatureRig.js'),
  read('../src/engine/SkeletonMiniatureRig.js'),
  read('../src/engine/CreatureMiniatureBuilders.js'),
  read('../src/engine/ExoticMiniatureBuilders.js'),
  read('../src/engine/MiniatureWeaponBuilders.js'),
  read('../src/engine/MiniaturePhase3Equipment.js'),
  read('../src/engine/OrcMiniaturePolish.js'),
  read('../src/engine/MiniaturePresentationPolish.js'),
  read('../src/engine/MiniatureAnimator.js'),
  read('../src/engine/AdvancedMiniatureAnimator.js'),
  read('../src/engine/CombatPresentationBridge.js'),
  read('../src/engine/AssetRegistryPhase8.js'),
  read('../src/engine/DungeonRendererPhase8.js'),
  read('../src/ui/StrategyObserverShell.js')
]);

for (const role of ['fighter', 'rogue', 'cleric', 'wizard', 'archer']) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, 'humanoid');
  assert.ok(['masculine', 'feminine', 'neutral'].includes(MINIATURE_RECIPES[role].bodyType));
  assert.ok(MINIATURE_RECIPES[role].weaponStyle);
}

assert.match(profiles, /resolveBodyType/);
assert.match(humanoid, /buildHumanoidRig/);
assert.match(skeleton, /buildSkeletonRig/);
assert.match(creatures, /buildSlime/);
assert.match(creatures, /buildMimic/);

for (const [role, family, builder] of [
  ['spider', 'arachnid', 'buildSpider'],
  ['wraith', 'spectral', 'buildWraith'],
  ['myconid', 'fungal', 'buildMyconid'],
  ['stirge', 'flying', 'buildStirge']
]) {
  assert.equal(MINIATURE_RECIPES[role].skeleton, family);
  assert.ok(exotic.includes(`function ${builder}`));
  assert.ok(factory.includes(builder));
}

assert.equal(MINIATURE_RECIPES.archer.weaponStyle, 'bow');
assert.equal(MINIATURE_PARTS.off_bow_long.builder, 'bowLong');
assert.equal(MINIATURE_PARTS.wpn_arrow_nocked.builder, 'arrowNocked');
assert.match(weapons, /buildLongbow/);
assert.match(weapons, /buildArrow/);

assert.equal(MINIATURE_RECIPES.orc.skeleton, 'orc');
assert.equal(MINIATURE_RECIPES.orc.weaponStyle, 'axe-shield');
assert.equal(MINIATURE_PARTS.wpn_axe_heavy.builder, 'axeHeavy');
assert.equal(MINIATURE_PARTS.off_shield_kite.builder, 'shieldKite');
assert.match(orc, /decorateOrc/);
assert.match(orc, /orc_topknot/);
assert.match(phase3Equipment, /buildHeavyAxe/);
assert.match(phase3Equipment, /buildKiteShield/);
assert.match(presentation, /applyMiniaturePresentationPolish/);
assert.match(presentation, /miniature_contact_shadow/);

assert.match(animator, /attackTimeline/);
assert.match(advanced, /animateWeaponStyle/);
assert.match(advanced, /animatePresentation/);
assert.match(advanced, /sourceAgentId/);
assert.match(advanced, /corpseProgress/);
assert.match(advanced, /presentation\.arrow\.visible/);
assert.match(advanced, /style === 'axe-shield'/);

assert.match(bridge, /installCombatPresentationBridge/);
assert.match(bridge, /DungeonSim\.prototype\.resolve/);
assert.match(bridge, /DungeonSim\.prototype\.emitEffect/);
assert.match(bridge, /DungeonSim\.prototype\.onDeath/);
assert.match(bridge, /sourceAgentId/);
assert.match(bridge, /deathAt/);
assert.match(bridge, /corpseLinger/);
assert.match(bridge, /CORPSE_LINGER_SECONDS = 2\.4/);

assert.match(factory, /installCombatPresentationBridge/);
assert.match(factory, /applyMiniaturePresentationPolish/);
assert.match(factory, /decorateOrc/);
assert.match(registry, /new PolishedMiniatureFactory/);
assert.match(renderer, /prepareVisualAgents/);
assert.match(renderer, /corpse: true/);
assert.match(renderer, /corpseLinger/);
assert.match(renderer, /miniatureAnimator\.update/);

assert.ok(!observer.includes('?.dataset.mobileSurface ='));
assert.ok(observer.includes('if (this.screenEl) this.screenEl.dataset.mobileSurface = surface;'));

console.log('miniature polish smoke: ok');
