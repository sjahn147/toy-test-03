import { THREE } from './ThreeScene.js';

export const OLD_LANTERN_ASSET_PACK_ID = 'campaign.old-lantern';

const RECIPES = Object.freeze({
  'inn.old-lantern.common-room': room('inn.old-lantern.common-room', 'H36', 'ruined', ['ruined', 'bivouac', 'repaired', 'prosperous', 'besieged', 'burned'], 15.2, 11.8, 6.8, ['hearth', 'service-bar', 'job-board', 'defense-shutters']),
  'inn.old-lantern.kitchen': room('inn.old-lantern.kitchen', 'H37', 'blackened', ['blackened', 'camp-kitchen', 'working', 'infested'], 13.2, 10.2, 5.8, ['kitchen-range', 'prep-table', 'pantry', 'wash-basin']),
  'inn.old-lantern.guest-wing': room('inn.old-lantern.guest-wing', 'H38', 'collapsed', ['collapsed', 'partitioned-camp', 'guestrooms', 'webbed'], 14.4, 10.8, 6.2, ['bed-module', 'linen-chest', 'hall-lantern', 'barricade']),
  'inn.old-lantern.cellar': room('inn.old-lantern.cellar', 'H39', 'flooded', ['flooded', 'stocked', 'fungal-brewery', 'raided'], 13.6, 10.4, 5.8, ['barrel-rack', 'brew-vat', 'drain', 'smuggler-cache']),
  'inn.old-lantern.secret-office': room('inn.old-lantern.secret-office', 'H40', 'sealed', ['sealed', 'discovered', 'operations-room'], 9.6, 8.4, 5.2, ['ledger-desk', 'map-wall', 'signal-lantern', 'secret-door'])
});

export const OLD_LANTERN_BUNDLE_IDS = Object.freeze(Object.keys(RECIPES));
export const getOldLanternRecipe = id => RECIPES[id] ?? null;
export const listOldLanternRecipes = () => Object.values(RECIPES);

export function createOldLanternAssetPack() {
  const ids = new Set(OLD_LANTERN_BUNDLE_IDS);
  return Object.freeze({
    id: OLD_LANTERN_ASSET_PACK_ID,
    bundleIds: OLD_LANTERN_BUNDLE_IDS,
    canCreate: id => ids.has(id),
    create(id, context = {}) {
      const recipe = RECIPES[id];
      if (!recipe) return null;
      return build(recipe, context.state ?? recipe.defaultState);
    },
    getRecipe: getOldLanternRecipe,
    listRecipes: listOldLanternRecipes,
    animate(root, elapsedSeconds) {
      animate(root, elapsedSeconds);
    }
  });
}

function room(id, roomId, defaultState, states, width, depth, height, sockets) {
  return Object.freeze({
    id,
    roomId,
    defaultState,
    states: Object.freeze(states),
    placement: Object.freeze({ ox: 0, oz: 0, rotation: 0, scale: 0.82 }),
    footprint: Object.freeze({ width, depth, height }),
    sockets: Object.freeze(sockets),
    detailBudget: 'hero',
    triangleBudget: roomId === 'H36' ? 52000 : roomId === 'H38' ? 46000 : 34000
  });
}

function build(recipe, state) {
  const root = new THREE.Group();
  root.name = `old-lantern:${recipe.id}`;
  root.userData = { assetId: recipe.id, state, oldLantern: true };
  buildShell(root, recipe, state);
  if (recipe.roomId === 'H36') buildCommonRoom(root, state);
  else if (recipe.roomId === 'H37') buildKitchen(root, state);
  else if (recipe.roomId === 'H38') buildGuestWing(root, state);
  else if (recipe.roomId === 'H39') buildCellar(root, state);
  else buildSecretOffice(root, state);
  return root;
}

function buildShell(root, recipe, state) {
  const dims = shellDimensions(recipe.roomId);
  const damaged = ['ruined', 'burned', 'blackened', 'collapsed', 'raided', 'sealed'].includes(state);
  namedBox(root, dims.w, 0.24, dims.d, M.floor, 'inn-floor', 0, 0.12, 0);
  plankField(root, dims, damaged);
  wallField(root, dims, damaged);
  ceilingBeams(root, dims, damaged);
}

function buildCommonRoom(root, state) {
  const active = ['bivouac', 'repaired', 'prosperous', 'besieged'].includes(state);
  const prosperous = state === 'prosperous';
  const ruined = state === 'ruined' || state === 'burned';

  buildHeroHearth(root, -5.6, -3.25, active, state === 'besieged');
  buildServiceBar(root, 4.35, -3.2, prosperous ? 14 : active ? 8 : 3);
  buildRaisedStage(root, 4.8, 4.05, prosperous);
  buildGalleryAndStairs(root);
  buildCommonRoomTables(root, ruined);
  buildJobBoard(root, 0.25, -5.12, prosperous ? 9 : 4);
  buildInnSign(root, -0.2, -5.35);
  buildReservationLedger(root, 3.15, -2.58);
  chandelierCluster(root, [
    [-3.8, 3.65, -1.5],
    [0.4, 3.55, 0.15],
    [4.2, 3.55, 2.4]
  ], prosperous ? 6 : active ? 4 : 2);

  if (state === 'bivouac') {
    buildBedrollCamp(root, 6, -4.9, 3.1, 2.05, 2.1);
    buildCampCrates(root, 5, -1.2, 3.65, 1.35);
  }
  if (state === 'repaired' || state === 'prosperous') {
    buildServiceLayer(root, prosperous ? 12 : 7);
  }
  if (state === 'besieged') {
    buildDefenseShutters(root);
    buildBarricadeLine(root, 4.85);
    buildArrowBundles(root, 5);
  }
  if (ruined) {
    scatterDebris(root, 22, state === 'burned' ? M.charred : M.soot);
    buildBrokenBenches(root, 4);
  }
}

function buildKitchen(root, state) {
  const working = state === 'working';
  const campKitchen = state === 'camp-kitchen';
  const lit = working || campKitchen;
  buildKitchenRange(root, -4.2, -3.25, lit);
  buildPrepTable(root, -0.2, -0.3);
  buildButcherBlock(root, 1.95, -1.35);
  buildWashBasins(root, 4.45, -2.8);
  buildPantryShelves(root, 4.6, 2.8, working ? 18 : campKitchen ? 12 : 6);
  buildColdPrep(root, 0.9, 2.9);
  hangingUtensils(root, 8, -3.8, -1.3);

  if (state === 'camp-kitchen') {
    buildBedrollCamp(root, 3, -4.9, 3.35, 2.2, 1.8);
    buildCampCrates(root, 4, -0.8, 3.4, 1.5);
  }
  if (state === 'working') {
    buildServiceLayer(root, 8);
    kettleSteam(root, 6, -4.3, -2.3);
  }
  if (state === 'infested') {
    fungalMotes(root, 12, -4.8, -1.4, 1.7, 3.1);
    oozeTrail(root, 9, 3.9, 1.6, 0.75);
  }
  if (state === 'blackened') {
    scatterDebris(root, 14, M.soot);
    sootStains(root, 7);
  }
}

function buildGuestWing(root, state) {
  const restored = state === 'guestrooms';
  const camp = state === 'partitioned-camp';

  corridorArches(root);
  guestRooms(root, restored, state === 'collapsed');
  buildLinenChest(root, 4.65, -3.65);
  buildLinenCart(root, 4.8, 2.45);
  buildKeyRack(root, 4.95, -0.15);
  buildResidentDesk(root, -5.05, 0.4);
  hallLanterns(root, restored ? 7 : 3);

  if (camp) {
    buildBedrollCamp(root, 8, -4.6, -3.1, 2.05, 2);
    partitionScreens(root, 4);
  }
  if (state === 'webbed') {
    webCanopy(root, 10);
    cocoonHooks(root, 4);
  }
  if (state === 'collapsed') {
    scatterDebris(root, 24, M.charred);
    collapsedDoorFrames(root, 3);
  }
}

function buildCellar(root, state) {
  const stocked = state === 'stocked' || state === 'fungal-brewery';
  buildBarrelRack(root, -4.6, -2.8, stocked ? 10 : 4);
  buildBarrelRack(root, 1.4, -2.8, stocked ? 10 : 4);
  buildBrewVat(root, 0.15, 0.25, state === 'fungal-brewery');
  buildDrain(root, -0.8, 3.15);
  buildSmugglerCache(root, 4.55, 3.25, state !== 'flooded');
  slingShelves(root, stocked ? 8 : 3);

  if (state === 'flooded') {
    namedPlane(root, 12.6, 9.2, M.water, 'old-lantern-water', 0, 0.28, 0, -Math.PI / 2);
    floatingCrates(root, 4);
  }
  if (state === 'fungal-brewery') {
    fungalMotes(root, 14, -5.1, -2.8, 1.65, 5.2);
    fungusShelves(root, 7);
  }
  if (state === 'raided') {
    scatterDebris(root, 18, M.oak);
    brokenBarrels(root, 5);
  }
}

function buildSecretOffice(root, state) {
  const open = state !== 'sealed';
  buildSecretDoor(root, open);
  if (!open) return;
  buildLedgerDesk(root, 0.3, -0.25);
  buildMapWall(root, 0, -4.08, state === 'operations-room');
  buildSignalLantern(root, 3.15, 3.05);
  buildCoinCabinet(root, -3.1, 2.8);
  buildRumorTable(root, -2.2, -0.25);
  operationsMarkers(root, state === 'operations-room' ? 18 : 7);
}

function shellDimensions(roomId) {
  if (roomId === 'H40') return { w: 9, d: 7.8 };
  if (roomId === 'H36') return { w: 14.8, d: 10.8 };
  if (roomId === 'H38') return { w: 14.6, d: 10.4 };
  return { w: 13.2, d: 10.2 };
}

function plankField(root, dims, damaged) {
  for (let i = 0; i < 9; i += 1) {
    const board = namedBox(root, dims.w - 1.1, 0.035, 0.72, damaged && i % 4 === 0 ? M.charred : i % 2 === 0 ? M.oak : M.darkWood, `floorboard-${i}`, 0, 0.16, -dims.d / 2 + 0.95 + i * 1.03);
    board.rotation.z = (i % 3 === 0 ? 1 : -1) * 0.01;
  }
}

function wallField(root, dims, damaged) {
  const wallMaterial = damaged ? M.soot : M.wall;
  const timber = damaged ? M.charred : M.darkWood;
  namedBox(root, dims.w, 3.9, 0.28, wallMaterial, 'rear-wall', 0, 1.95, -dims.d / 2);
  for (const side of [-1, 1]) namedBox(root, 0.3, 4.25, dims.d, timber, `side-wall-${side < 0 ? 'west' : 'east'}`, side * (dims.w / 2 - 0.15), 2.12, 0);
  for (let i = 0; i < 7; i += 1) namedBox(root, 0.22, 3.9, 0.18, timber, `wall-post-${i}`, -dims.w / 2 + 0.85 + i * ((dims.w - 1.7) / 6), 1.95, -dims.d / 2 + 0.04);
}

function ceilingBeams(root, dims, damaged) {
  for (let i = 0; i < 6; i += 1) namedBox(root, 0.24, 0.24, dims.d - 0.2, damaged && i === 4 ? M.charred : M.darkWood, `beam-${i}`, -dims.w / 2 + 1.05 + i * ((dims.w - 2.1) / 5), 4.02, 0);
}

function buildHeroHearth(root, x, z, active, besieged) {
  const hearth = namedGroup(root, 'hearth');
  namedBox(hearth, 3.35, 0.42, 1.82, M.stone, 'hearth-plinth', x, 0.22, z);
  namedBox(hearth, 0.62, 2.65, 1.08, M.stone, 'hearth-left-pier', x - 1.28, 1.55, z);
  namedBox(hearth, 0.62, 2.65, 1.08, M.stone, 'hearth-right-pier', x + 1.28, 1.55, z);
  const arch = namedMesh(hearth, new THREE.TorusGeometry(1.28, 0.28, 8, 26, Math.PI), M.stoneLight, 'hearth-arch');
  arch.rotation.z = Math.PI;
  arch.position.set(x, 2.48, z + 0.02);
  namedBox(hearth, 1.25, 2.1, 0.72, M.stoneLight, 'hearth-stack', x, 2.2, z - 0.55);
  if (active) flames(hearth, x - 0.42, 0.78, z - 0.12, besieged ? 5 : 3);
}

function buildServiceBar(root, x, z, bottleCount) {
  const bar = namedGroup(root, 'service-bar');
  namedBox(bar, 4.95, 1.18, 0.84, M.oak, 'bar-counter', x, 0.64, z);
  namedBox(bar, 4.55, 0.18, 1.15, M.brass, 'bar-top', x, 1.26, z);
  namedBox(bar, 4.2, 0.68, 0.34, M.darkWood, 'back-shelf-low', x - 0.1, 1.7, z - 0.56);
  namedBox(bar, 3.6, 0.18, 0.32, M.darkWood, 'back-shelf-high', x - 0.3, 2.42, z - 0.58);
  for (let i = 0; i < bottleCount; i += 1) {
    const bottle = namedCylinder(bar, 0.09 + (i % 3) * 0.01, 0.42 + (i % 2) * 0.08, i % 2 ? M.greenGlass : M.amberGlass, `bar-bottle-${i}`, x - 1.5 + (i % 7) * 0.52, 1.55 + Math.floor(i / 7) * 0.72, z - 0.05);
    bottle.rotation.z = (i % 2 ? 1 : -1) * 0.04;
  }
}

function buildRaisedStage(root, x, z, prosperous) {
  namedBox(root, 3.2, 0.42, 2.1, M.oak, 'music-stage', x, 0.3, z);
  namedBox(root, 2.75, 0.16, 1.7, M.darkWood, 'music-stage-top', x, 0.56, z);
  namedBox(root, 0.3, 1.4, 0.3, M.darkWood, 'stage-post-left', x - 1.35, 1.2, z - 0.85);
  namedBox(root, 0.3, 1.4, 0.3, M.darkWood, 'stage-post-right', x + 1.35, 1.2, z - 0.85);
  if (prosperous) {
    namedPlane(root, 2.6, 0.9, M.red, 'stage-backdrop', x, 1.6, z - 0.92);
    for (let i = 0; i < 3; i += 1) namedCylinder(root, 0.1, 1.05, M.brass, `mic-candle-${i}`, x - 0.9 + i * 0.9, 1.08, z + 0.45);
  }
}

function buildGalleryAndStairs(root) {
  namedBox(root, 5.4, 0.18, 1.25, M.darkWood, 'gallery-walk', -3.15, 2.65, 4.4);
  namedBox(root, 0.18, 1.6, 1.25, M.darkWood, 'gallery-post-west', -5.8, 1.82, 4.4);
  namedBox(root, 0.18, 1.6, 1.25, M.darkWood, 'gallery-post-east', -0.5, 1.82, 4.4);
  for (let i = 0; i < 6; i += 1) namedBox(root, 1.4, 0.12, 0.52, M.oak, `stair-step-${i}`, -6.2 + i * 0.48, 0.14 + i * 0.26, 3.25 - i * 0.14);
}

function buildCommonRoomTables(root, ruined) {
  const compositions = [
    { x: -1.9, z: -0.1, w: 2.1, d: 1.02, rotation: 0.04 },
    { x: 1.8, z: -0.55, w: 1.75, d: 0.95, rotation: -0.08 },
    { x: -2.6, z: 3.15, w: 2.25, d: 1.18, rotation: ruined ? 0.26 : 0.03 },
    { x: 1.95, z: 2.9, w: 1.95, d: 0.92, rotation: -0.02 }
  ];
  for (let i = 0; i < compositions.length; i += 1) {
    const { x, z, w, d, rotation } = compositions[i];
    namedBox(root, w, 0.18, d, M.oak, `table-${i}`, x, 0.92, z, rotation);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) namedBox(root, 0.16, 0.78, 0.16, M.darkWood, `table-${i}-leg-${sx}-${sz}`, x + sx * (w * 0.34), 0.45, z + sz * (d * 0.3), rotation);
    namedBox(root, 0.42, 0.08, 0.22, M.paper, `table-${i}-plate`, x - 0.32, 1.08, z - 0.05, rotation);
    namedCylinder(root, 0.08, 0.28, M.amberGlass, `table-${i}-cup`, x + 0.42, 1.08, z + 0.1);
  }
}

function buildJobBoard(root, x, z, notes) {
  const board = namedGroup(root, 'job-board');
  namedBox(board, 2.55, 1.68, 0.14, M.darkWood, 'job-board-frame', x, 2.2, z);
  for (let i = 0; i < notes; i += 1) namedPlane(board, 0.34, 0.42, M.paper, `job-note-${i}`, x - 0.84 + (i % 4) * 0.54, 1.78 + Math.floor(i / 4) * 0.46, z + 0.08);
}

function buildInnSign(root, x, z) {
  namedBox(root, 2.15, 0.84, 0.12, M.oak, 'old-lantern-sign', x, 3.28, z);
  namedPlane(root, 1.8, 0.52, M.paper, 'old-lantern-sign-paint', x, 3.28, z + 0.08);
}

function buildReservationLedger(root, x, z) {
  const ledger = namedGroup(root, 'reservation-ledger');
  namedBox(ledger, 0.62, 0.08, 0.88, M.leather, 'ledger-book', x, 1.35, z);
  namedPlane(ledger, 0.36, 0.58, M.paper, 'ledger-open-pages', x + 0.06, 1.41, z + 0.02);
  namedCylinder(ledger, 0.04, 0.42, M.brass, 'ledger-quill', x - 0.2, 1.45, z - 0.1);
}

function buildServiceLayer(root, count) {
  for (let i = 0; i < count; i += 1) {
    const baseX = -5 + (i % 5) * 2.35;
    const baseZ = 4.1 - Math.floor(i / 5) * 1.3;
    namedBox(root, 0.42, 0.18, 0.42, i % 2 ? M.paper : M.leather, `service-clutter-${i}`, baseX, 0.24, baseZ, i * 0.17);
  }
}

function buildDefenseShutters(root) {
  const shutters = namedGroup(root, 'defense-shutters');
  for (let i = 0; i < 5; i += 1) namedBox(shutters, 2.45, 0.24, 0.18, M.darkWood, `shutter-${i}`, -5 + i * 2.45, 2.55, -5.18, (i % 2 ? 1 : -1) * 0.06);
}

function buildBarricadeLine(root, z) {
  for (let i = 0; i < 6; i += 1) namedBox(root, 5.3, 0.28, 0.34, i % 2 ? M.oak : M.darkWood, `barricade-plank-${i}`, 0, 0.72 + i * 0.35, z, (i % 2 ? 1 : -1) * 0.12);
}

function buildArrowBundles(root, count) {
  for (let i = 0; i < count; i += 1) namedCylinder(root, 0.05, 0.68, M.darkWood, `arrow-bundle-${i}`, 4.8 - i * 0.25, 0.6, 4.3 + (i % 2) * 0.25);
}

function buildBrokenBenches(root, count) {
  for (let i = 0; i < count; i += 1) namedBox(root, 1.4, 0.16, 0.42, M.charred, `broken-bench-${i}`, -3.8 + i * 2.45, 0.3, 1.5 - (i % 2) * 2.1, i * 0.18);
}

function buildKitchenRange(root, x, z, lit) {
  const range = namedGroup(root, 'kitchen-range');
  namedBox(range, 4.8, 1.25, 1.95, M.stone, 'range-body', x, 0.66, z);
  for (let i = 0; i < 3; i += 1) {
    const mouth = namedMesh(range, new THREE.TorusGeometry(0.48, 0.15, 7, 20, Math.PI), M.iron, `range-mouth-${i}`);
    mouth.rotation.z = Math.PI;
    mouth.position.set(x - 1.4 + i * 1.42, 1.02, z + 0.88);
    if (lit) flames(range, x - 1.55 + i * 1.42, 0.72, z + 0.65, 2);
  }
}

function buildPrepTable(root, x, z) {
  const prep = namedGroup(root, 'prep-table');
  namedBox(prep, 4.2, 0.22, 1.85, M.oak, 'prep-surface', x, 1.02, z);
  for (let i = 0; i < 4; i += 1) namedBox(prep, 0.14, 0.82, 0.14, M.darkWood, `prep-leg-${i}`, x + (i < 2 ? -1.55 : 1.55), 0.46, z + (i % 2 ? 0.65 : -0.65));
}

function buildButcherBlock(root, x, z) {
  namedBox(root, 1.4, 0.8, 1.15, M.oak, 'butcher-block', x, 0.58, z);
  namedBox(root, 1.05, 0.08, 0.3, M.iron, 'butcher-cleaver', x + 0.2, 1.05, z + 0.1, -0.4);
}

function buildWashBasins(root, x, z) {
  const basin = namedGroup(root, 'wash-basin');
  namedCylinder(basin, 0.55, 0.42, M.copper, 'wash-basin-left', x, 0.45, z);
  namedCylinder(basin, 0.55, 0.42, M.copper, 'wash-basin-right', x + 1.25, 0.45, z);
  namedBox(basin, 2.2, 0.14, 0.42, M.darkWood, 'wash-shelf', x + 0.62, 1.02, z);
}

function buildPantryShelves(root, x, z, count) {
  const pantry = namedGroup(root, 'pantry');
  for (let shelf = 0; shelf < 3; shelf += 1) namedBox(pantry, 3.35, 0.18, 0.75, M.oak, `pantry-shelf-${shelf}`, x, 0.65 + shelf * 0.85, z);
  for (let i = 0; i < count; i += 1) namedCylinder(pantry, 0.14, 0.38, i % 2 ? M.ceramic : M.amberGlass, `pantry-jar-${i}`, x - 1.2 + (i % 6) * 0.48, 0.9 + Math.floor(i / 6) * 0.85, z - 0.02);
}

function buildColdPrep(root, x, z) {
  namedBox(root, 1.85, 0.84, 0.9, M.stone, 'cold-prep-table', x, 0.52, z);
  namedPlane(root, 0.55, 0.36, M.paper, 'salted-fish-sheet', x + 0.18, 0.98, z + 0.05);
}

function hangingUtensils(root, count, x, z) {
  for (let i = 0; i < count; i += 1) namedCylinder(root, 0.03, 0.56, M.iron, `hanging-pot-${i}`, x + (i % 4) * 0.56, 2.2 + Math.floor(i / 4) * 0.22, z);
}

function kettleSteam(root, count, x, z) {
  for (let i = 0; i < count; i += 1) pulseSphere(root, x + (i % 3) * 1.45, 1.35 + (i % 2) * 0.24, z + Math.floor(i / 3) * 0.52, M.fog, 0.11, `steam-puff-${i}`);
}

function oozeTrail(root, count, x, z, spacing) {
  for (let i = 0; i < count; i += 1) pulseSphere(root, x - i * spacing, 0.22, z + (i % 3) * 0.18, M.slime, 0.18 + (i % 2) * 0.05, `ooze-patch-${i}`);
}

function sootStains(root, count) {
  for (let i = 0; i < count; i += 1) {
    const stain = namedPlane(root, 0.85 + (i % 3) * 0.26, 0.55 + (i % 2) * 0.18, M.sootPlane, `soot-stain-${i}`, -4.85 + (i % 3) * 2.15, 2.1 + Math.floor(i / 3) * 0.72, -4.92);
    stain.rotation.x = 0.06;
  }
}

function corridorArches(root) {
  for (let i = 0; i < 4; i += 1) {
    namedBox(root, 0.18, 3.25, 9.3, M.darkWood, `corridor-post-${i}`, -5.4 + i * 3.6, 1.62, 0);
    const arch = namedMesh(root, new THREE.TorusGeometry(0.78, 0.08, 6, 20, Math.PI), M.darkWood, `corridor-arch-${i}`);
    arch.rotation.z = Math.PI;
    arch.position.set(-5.4 + i * 3.6 + 1.8, 3.08, 0);
  }
}

function guestRooms(root, restored, collapsed) {
  let roomIndex = 0;
  for (const row of [-2.65, 2.65]) {
    for (let col = 0; col < 4; col += 1) {
      const x = -5.2 + col * 3.45;
      const room = namedGroup(root, `guest-room-${roomIndex}`);
      namedBox(room, 2.3, 0.42, 1.2, restored ? M.oak : M.darkWood, 'bed-base', x, 0.42, row);
      namedBox(room, 2.05, 0.16, 1.02, restored ? M.linen : M.dirtyLinen, 'mattress', x, 0.72, row);
      namedBox(room, 0.62, 0.22, 0.86, M.linen, 'pillow-stack', x - 0.72, 0.88, row);
      namedBox(room, 0.55, 0.44, 0.72, M.oak, 'travel-chest', x + 0.92, 0.24, row + 0.45);
      namedPlane(room, 1.45, 0.82, roomIndex % 2 ? M.red : M.paper, 'travel-rug', x, 0.13, row + (row < 0 ? 1.05 : -1.05), -Math.PI / 2);
      namedBox(room, 0.18, 2.1, 1.05, collapsed && roomIndex % 3 === 0 ? M.charred : M.darkWood, 'guest-door', x + 1.45, 1.05, row + (row < 0 ? 0.95 : -0.95), collapsed && roomIndex % 3 === 0 ? 0.2 : 0);
      roomIndex += 1;
    }
  }
}

function buildLinenChest(root, x, z) {
  const chest = namedGroup(root, 'linen-chest');
  namedBox(chest, 1.25, 0.8, 0.92, M.oak, 'linen-chest-body', x, 0.42, z);
  namedBox(chest, 1.32, 0.12, 0.98, M.brass, 'linen-chest-lid', x, 0.88, z);
}

function buildLinenCart(root, x, z) {
  namedBox(root, 1.4, 0.24, 0.95, M.oak, 'linen-cart', x, 0.55, z);
  namedBox(root, 1.1, 0.62, 0.8, M.dirtyLinen, 'linen-cart-load', x, 0.98, z);
}

function buildKeyRack(root, x, z) {
  namedBox(root, 0.9, 1.25, 0.12, M.darkWood, 'key-rack', x, 1.9, z);
  for (let i = 0; i < 8; i += 1) namedCylinder(root, 0.03, 0.18, M.brass, `key-ring-${i}`, x - 0.28 + (i % 4) * 0.18, 1.56 + Math.floor(i / 4) * 0.34, z + 0.08);
}

function buildResidentDesk(root, x, z) {
  namedBox(root, 1.65, 0.22, 0.84, M.oak, 'resident-desk', x, 0.98, z);
  namedBox(root, 0.45, 0.08, 0.62, M.paper, 'resident-ledger', x - 0.22, 1.12, z);
}

function hallLanterns(root, count) {
  for (let i = 0; i < count; i += 1) {
    const lantern = namedGroup(root, i === 0 ? 'hall-lantern' : `hall-lantern-${i}`);
    lantern.name = i === 0 ? 'hall-lantern' : `hall-lantern-${i}`;
    namedCylinder(lantern, 0.18, 0.42, M.iron, 'lantern-cage', -4.9 + (i % 4) * 3.2, 3.12, -2.6 + Math.floor(i / 4) * 4.95);
    pulseSphere(lantern, -4.9 + (i % 4) * 3.2, 3.12, -2.6 + Math.floor(i / 4) * 4.95, M.flame, 0.12, 'old-lantern-flame');
    lantern.userData.swing = true;
    root.add(lantern);
  }
}

function partitionScreens(root, count) {
  for (let i = 0; i < count; i += 1) namedPlane(root, 1.5, 1.2, M.dirtyLinen, `partition-screen-${i}`, -4.4 + i * 3.1, 0.8, -0.2 + (i % 2) * 2.25);
}

function webCanopy(root, count) {
  for (let i = 0; i < count; i += 1) {
    const web = namedMesh(root, new THREE.TorusGeometry(0.82 + (i % 3) * 0.24, 0.018, 5, 24), M.web, `web-cluster-${i}`);
    web.rotation.set(Math.PI / 2, i * 0.31, 0);
    web.position.set(-5.1 + (i % 5) * 2.5, 1.2 + (i % 3) * 0.8, -3.7 + Math.floor(i / 5) * 6.2);
  }
}

function cocoonHooks(root, count) {
  for (let i = 0; i < count; i += 1) {
    namedCylinder(root, 0.02, 1.1, M.web, `cocoon-line-${i}`, -4.6 + i * 3.1, 2.35, 0.4 + (i % 2) * 2.3);
    namedCylinder(root, 0.18, 0.55, M.dirtyLinen, `cocoon-${i}`, -4.6 + i * 3.1, 1.45, 0.4 + (i % 2) * 2.3);
  }
}

function collapsedDoorFrames(root, count) {
  for (let i = 0; i < count; i += 1) namedBox(root, 1.15, 0.18, 0.22, M.charred, `collapsed-frame-${i}`, -3.9 + i * 3.8, 0.35, -0.5 + (i % 2) * 3.7, i * 0.24);
}

function buildBarrelRack(root, x, z, count) {
  const rack = namedGroup(root, 'barrel-rack');
  for (let i = 0; i < count; i += 1) {
    const barrel = namedMesh(rack, new THREE.CylinderGeometry(0.38, 0.38, 1.25, 12), M.oak, `barrel-${x}-${i}`);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(x + (i % 5) * 0.92, 0.82 + Math.floor(i / 5) * 1.4, z + Math.floor(i / 5) * 0.35);
  }
}

function buildBrewVat(root, x, z, fungal) {
  const vat = namedGroup(root, 'brew-vat');
  namedCylinder(vat, 1.48, 2.02, fungal ? M.fungal : M.copper, 'brew-vat-body', x, 1.05, z);
  namedBox(vat, 2.65, 0.18, 0.24, M.darkWood, 'brew-vat-yoke', x, 2.15, z);
}

function buildDrain(root, x, z) {
  const drain = namedGroup(root, 'drain');
  const grate = namedMesh(drain, new THREE.TorusGeometry(0.55, 0.09, 6, 18), M.iron, 'drain-ring');
  grate.rotation.x = Math.PI / 2;
  grate.position.set(x, 0.16, z);
  for (let i = 0; i < 4; i += 1) namedBox(drain, 1.02, 0.04, 0.06, M.iron, `drain-slat-${i}`, x, 0.17, z - 0.18 + i * 0.12);
}

function buildSmugglerCache(root, x, z, visible) {
  const cache = namedGroup(root, 'smuggler-cache');
  cache.visible = visible;
  namedBox(cache, 1.25, 0.72, 0.9, M.darkWood, 'cache-crate', x, 0.42, z);
  namedBox(cache, 0.72, 0.08, 0.52, M.leather, 'cache-ledger', x + 0.12, 0.85, z + 0.05);
}

function slingShelves(root, count) {
  for (let i = 0; i < count; i += 1) namedBox(root, 0.55, 0.24, 0.55, i % 2 ? M.oak : M.paper, `cellar-supply-${i}`, -4.7 + (i % 4) * 3.05, 2.35, -4.1 + Math.floor(i / 4) * 8.2);
}

function floatingCrates(root, count) {
  for (let i = 0; i < count; i += 1) namedBox(root, 0.95, 0.45, 0.72, M.oak, `floating-crate-${i}`, -4 + i * 2.8, 0.38, -1.9 + (i % 2) * 3.2, i * 0.14);
}

function fungusShelves(root, count) {
  for (let i = 0; i < count; i += 1) pulseSphere(root, -3.8 + (i % 4) * 2.1, 1.45 + Math.floor(i / 4) * 0.8, 3.55, M.fungal, 0.16 + (i % 2) * 0.04, `fungal-cask-${i}`);
}

function brokenBarrels(root, count) {
  for (let i = 0; i < count; i += 1) namedBox(root, 0.95, 0.18, 0.42, M.oak, `broken-barrel-${i}`, -4.6 + i * 2.35, 0.22, 1.3 - (i % 2) * 2.3, i * 0.28);
}

function buildSecretDoor(root, open) {
  namedBox(root, 2.3, 3.2, 0.28, open ? M.darkWood : M.stone, 'secret-door', 0, 1.65, -3.95, open ? -0.5 : 0);
}

function buildLedgerDesk(root, x, z) {
  const desk = namedGroup(root, 'ledger-desk');
  namedBox(desk, 3.8, 0.22, 1.9, M.oak, 'desk-surface', x, 1.02, z);
  namedBox(desk, 0.82, 0.08, 1.08, M.paper, 'ledger-stack', x - 0.78, 1.14, z - 0.1);
  namedCylinder(desk, 0.04, 0.52, M.brass, 'ledger-quill-stand', x + 0.85, 1.23, z + 0.12);
}

function buildMapWall(root, x, z, operations) {
  const wall = namedGroup(root, 'map-wall');
  namedPlane(wall, 5.6, 2.8, M.map, 'campaign-map', x, 2.35, z);
  if (operations) {
    for (let i = 0; i < 6; i += 1) namedCylinder(wall, 0.03, 0.24, M.red, `route-pin-${i}`, x - 1.9 + i * 0.68, 2.1 + (i % 2) * 0.42, z + 0.06);
  }
}

function buildSignalLantern(root, x, z) {
  const signal = namedGroup(root, 'signal-lantern');
  namedCylinder(signal, 0.24, 0.56, M.iron, 'signal-cage', x, 1.25, z);
  pulseSphere(signal, x, 1.25, z, M.flame, 0.14, 'old-lantern-flame');
}

function buildCoinCabinet(root, x, z) {
  namedBox(root, 1.2, 2.1, 0.58, M.darkWood, 'coin-cabinet', x, 1.05, z);
  for (let i = 0; i < 4; i += 1) namedBox(root, 1.05, 0.12, 0.48, M.brass, `cabinet-drawer-${i}`, x, 0.55 + i * 0.42, z + 0.08);
}

function buildRumorTable(root, x, z) {
  namedBox(root, 1.35, 0.18, 0.84, M.oak, 'rumor-table', x, 0.92, z);
  namedPlane(root, 0.62, 0.42, M.paper, 'rumor-sheet', x, 1.05, z - 0.05);
}

function operationsMarkers(root, count) {
  for (let i = 0; i < count; i += 1) pulseSphere(root, -2.35 + (i % 7) * 0.75, 1.45 + Math.floor(i / 7) * 0.65, -4.03, i % 3 ? M.brassGlow : M.redGlow, 0.06, `ops-marker-${i}`);
}

function chandelierCluster(root, positions, candleCount) {
  for (let i = 0; i < positions.length; i += 1) {
    const [x, y, z] = positions[i];
    const chandelier = namedGroup(root, `chandelier-${i}`);
    chandelier.userData.swing = true;
    const ring = namedMesh(chandelier, new THREE.TorusGeometry(0.62, 0.06, 6, 20), M.brass, 'chandelier-ring');
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, z);
    for (let candle = 0; candle < candleCount; candle += 1) {
      const angle = candle * Math.PI * 2 / candleCount;
      namedCylinder(chandelier, 0.03, 0.22, M.linen, `chandelier-candle-${i}-${candle}`, x + Math.cos(angle) * 0.55, y + 0.12, z + Math.sin(angle) * 0.55);
      pulseSphere(chandelier, x + Math.cos(angle) * 0.55, y + 0.28, z + Math.sin(angle) * 0.55, M.flame, 0.07, 'old-lantern-flame');
    }
    root.add(chandelier);
  }
}

function fungalMotes(root, count, startX, startZ, stepX, stepZ) {
  for (let i = 0; i < count; i += 1) pulseSphere(root, startX + (i % 7) * stepX, 0.42 + (i % 3) * 0.32, startZ + Math.floor(i / 7) * stepZ, M.fungal, 0.18 + (i % 2) * 0.05, `old-lantern-pulse-${i}`);
}

function buildBedrollCamp(root, count, startX, startZ, stepX, stepZ) {
  for (let i = 0; i < count; i += 1) {
    const roll = namedMesh(root, new THREE.CylinderGeometry(0.3, 0.3, 1.55, 10), i % 3 ? M.linen : M.red, `bedroll-${i}`);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(startX + (i % 4) * stepX, 0.35, startZ + Math.floor(i / 4) * stepZ);
  }
}

function buildCampCrates(root, count, startX, startZ, step) {
  for (let i = 0; i < count; i += 1) namedBox(root, 0.72, 0.48, 0.72, M.oak, `camp-crate-${i}`, startX + (i % 3) * step, 0.26, startZ + Math.floor(i / 3) * 0.92);
}

function animate(root, elapsed) {
  root.traverse(node => {
    if (node.name === 'old-lantern-flame') node.scale.y = 0.9 + Math.sin(elapsed * 8 + node.id) * 0.14;
    if (node.name.startsWith('old-lantern-pulse') || node.name.startsWith('ops-marker') || node.name.startsWith('steam-puff')) {
      const pulse = 1 + Math.sin(elapsed * 2.2 + node.id) * 0.06;
      node.scale.x = pulse;
      node.scale.z = pulse;
    }
    if (node.name === 'old-lantern-water') node.material.opacity = 0.42 + Math.sin(elapsed * 1.7) * 0.05;
    if (node.userData?.swing) node.rotation.z = Math.sin(elapsed * 1.3 + node.id) * 0.035;
  });
}

function namedGroup(root, name) {
  const group = new THREE.Group();
  group.name = name;
  root.add(group);
  return group;
}

function namedMesh(root, geometry, material, name) {
  const node = new THREE.Mesh(geometry, material);
  node.name = name;
  root.add(node);
  return node;
}

function namedBox(root, w, h, d, material, name, x, y, z, rz = 0) {
  const node = namedMesh(root, new THREE.BoxGeometry(w, h, d), material, name);
  node.position.set(x, y, z);
  node.rotation.z = rz;
  return node;
}

function namedCylinder(root, r, h, material, name, x, y, z) {
  const node = namedMesh(root, new THREE.CylinderGeometry(r, r, h, 12), material, name);
  node.position.set(x, y, z);
  return node;
}

function namedPlane(root, w, h, material, name, x, y, z, rx = 0) {
  const node = namedMesh(root, new THREE.PlaneGeometry(w, h), material, name);
  node.position.set(x, y, z);
  node.rotation.x = rx;
  return node;
}

function pulseSphere(root, x, y, z, material, r = 0.25, name = 'old-lantern-pulse') {
  const node = namedMesh(root, new THREE.SphereGeometry(r, 10, 7), material, name);
  node.position.set(x, y, z);
  return node;
}

function flames(root, x, y, z, count) {
  for (let i = 0; i < count; i += 1) {
    const flame = namedMesh(root, new THREE.ConeGeometry(0.18 + (i % 2) * 0.05, 0.65 + (i % 3) * 0.12, 7), i % 2 ? M.ember : M.flame, 'old-lantern-flame');
    flame.position.set(x + i * 0.24, y, z);
  }
}

function scatterDebris(root, count, material) {
  for (let i = 0; i < count; i += 1) {
    const shard = namedMesh(root, i % 3 ? new THREE.BoxGeometry(0.3, 0.14, 0.9) : new THREE.DodecahedronGeometry(0.28, 0), material, `debris-${i}`);
    shard.position.set((hash(`x${i}`) - 0.5) * 11, 0.22, (hash(`z${i}`) - 0.5) * 8);
    shard.rotation.set(i * 0.23, i * 0.51, i * 0.17);
  }
}

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return ((result >>> 0) % 10000) / 10000;
}

function mat(color, roughness = 0.8, metalness = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

const M = Object.freeze({
  floor: mat(0x5f3f2a, 0.92),
  darkWood: mat(0x2e211a, 0.96),
  oak: mat(0x755037, 0.86),
  charred: mat(0x1d1817, 1),
  wall: mat(0x6d6862, 0.94),
  stone: mat(0x77736f, 0.9),
  stoneLight: mat(0x9b9387, 0.86),
  soot: mat(0x29272b, 1),
  iron: mat(0x444950, 0.62, 0.65),
  brass: mat(0xb78a43, 0.46, 0.62),
  copper: mat(0xa7643d, 0.5, 0.55),
  linen: mat(0xd1c5aa, 0.96),
  dirtyLinen: mat(0x7e7364, 0.98),
  red: mat(0x7a3540, 0.96),
  paper: mat(0xd6bf87, 0.92),
  leather: mat(0x68432e, 0.94),
  ceramic: mat(0xc8bfae, 0.72),
  greenGlass: mat(0x315d49, 0.35, 0.05, { transparent: true, opacity: 0.76 }),
  amberGlass: mat(0x925a2e, 0.38, 0.05, { transparent: true, opacity: 0.78 }),
  flame: mat(0xffc15e, 0.22, 0.02, { emissive: 0xff8b2b, emissiveIntensity: 1.4 }),
  ember: mat(0xd95d2c, 0.3, 0.02, { emissive: 0xa92c18, emissiveIntensity: 1.1 }),
  slime: mat(0x63956a, 0.58, 0.02, { emissive: 0x35683d, emissiveIntensity: 0.35 }),
  web: mat(0xd9d6cc, 0.4, 0, { transparent: true, opacity: 0.55 }),
  water: mat(0x4f8997, 0.22, 0.03, { transparent: true, opacity: 0.45 }),
  fungal: mat(0x557e67, 0.72, 0, { emissive: 0x294d42, emissiveIntensity: 0.35 }),
  map: mat(0xb8a678, 0.9),
  fog: mat(0xe4d8bf, 0.18, 0, { transparent: true, opacity: 0.38 }),
  brassGlow: mat(0xe0c36d, 0.24, 0.02, { emissive: 0xaa7f2d, emissiveIntensity: 0.8 }),
  redGlow: mat(0xb34d34, 0.3, 0.02, { emissive: 0x6d2016, emissiveIntensity: 0.8 }),
  sootPlane: mat(0x201d21, 1, 0, { transparent: true, opacity: 0.78 })
});
