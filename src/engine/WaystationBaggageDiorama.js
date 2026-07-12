import {
  group, box, cylinder, cone, sphere, beam, flagstoneFloor,
  crate, sack, brassLantern, WAYSTATION_COLORS
} from './WaystationGeometry.js';

// A04 — Baggage Vault. Numbered crates, weapon rack, ration sacks, repair bench,
// lost-and-found shelf, bedroll row. Story: an unopenable royal-crest suitcase.
export function buildBaggageVault(state) {
  const root = group('baggage-vault');
  const lit = true;
  root.add(flagstoneFloor(13.4, 10.4, 'stoneLight'));
  root.add(box(13.4, 4.6, 0.4, 'stoneDark', 'vault-back-wall', [0, 2.1, -5.0]));

  // --- Numbered crate stacks ---
  const stacks = group('numbered-crate-stacks');
  const overfilled = state === 'overfilled';
  const raided = state === 'raided';
  const columns = [[-5.4, -3.4], [-3.2, -3.4], [-5.4, -1.0], [4.8, -3.6], [4.8, -1.2]];
  for (let c = 0; c < columns.length; c += 1) {
    const [x, z] = columns[c];
    const height = overfilled ? 4 : (raided && c % 2 ? 1 : 3);
    for (let h = 0; h < height; h += 1) {
      const tilt = overfilled ? (Math.sin(c * 1.7 + h) * 0.06) : 0;
      const cr = crate(x, 0.55 + h * 1.0, z, 1.1, 0.9, 1.1, h % 2 ? 'wood' : 'canvasDark', 'numbered-crate');
      cr.rotation.z = tilt;
      // stencilled crate number plate
      cr.add(box(0.5, 0.3, 0.02, 'parchment', 'crate-number-plate', [0, 0.15, 0.56]));
      stacks.add(cr);
    }
  }
  if (raided) {
    // toppled crates on the floor
    const fallen = crate(-2.0, 0.45, 1.6, 1.1, 0.9, 1.1, 'woodDark', 'toppled-crate');
    fallen.rotation.z = Math.PI / 2.3;
    stacks.add(fallen);
  }
  root.add(stacks);

  // --- Weapon rack ---
  const rack = group('weapon-rack');
  rack.position.set(-5.9, 0, 2.6);
  rack.rotation.y = Math.PI / 2;
  rack.add(box(3.2, 2.4, 0.4, 'woodDark', 'weapon-rack-frame', [0, 1.2, 0]));
  rack.add(box(3.2, 0.12, 0.5, 'wood', 'weapon-rack-shelf', [0, 0.4, 0]));
  const weaponCount = raided ? 2 : 6;
  for (let i = 0; i < weaponCount; i += 1) {
    const x = -1.3 + i * 0.5;
    if (i % 2) rack.add(cylinder(0.05, 2.0, 'iron', 'racked-spear', [x, 1.4, 0.1], 6));
    else rack.add(box(0.12, 1.6, 0.04, 'iron', 'racked-sword', [x, 1.3, 0.1]));
  }
  for (const sx of [-1.0, 0.6]) if (!raided) rack.add(cylinder(0.5, 0.14, 'iron', 'racked-shield', [sx, 0.55, 0.35], 8, [Math.PI / 2, 0, 0]));
  root.add(rack);

  // --- Ration sacks ---
  const sacks = group('ration-sacks');
  sacks.position.set(3.8, 0, 3.0);
  const sackSpots = raided
    ? [[-0.6, 0, 1.0, 'canvas'], [0.5, 0, 0.9, 'canvasDark']]
    : [[-0.7, 0, 1.0, 'canvas'], [0.2, 0, 1.05, 'canvasDark'], [0.9, 0, 0.95, 'canvas'], [-0.2, 0.7, 0.9, 'canvasDark'], [0.5, 0.7, 0.85, 'canvas']];
  for (const [sx, sy, ss, col] of sackSpots) {
    const s = sack(sx, 0.42 + sy, 0, ss, col);
    s.name = 'ration-sack';
    sacks.add(s);
  }
  if (raided) {
    // spilled grain + gnaw-torn sack
    for (let i = 0; i < 14; i += 1) sacks.add(sphere(0.05, 'sand', 'spilled-grain', [-1.2 + i * 0.18, 0.06, 0.9 + (i % 3) * 0.2], [1, 0.5, 1]));
    sacks.add(sphere(0.42, 'canvasDark', 'gnawed-sack', [1.2, 0.4, 0.6], [0.9, 0.7, 0.9]));
  }
  root.add(sacks);

  // --- Repair bench (workbench, vise, anvil, tools) ---
  const bench = group('repair-bench');
  bench.position.set(0, 0, -3.4);
  bench.add(box(3.0, 0.2, 1.2, 'wood', 'repair-bench-top', [0, 1.0, 0]));
  for (const dx of [-1.3, 1.3]) for (const dz of [-0.45, 0.45]) bench.add(box(0.16, 1.0, 0.16, 'woodDark', 'repair-bench-leg', [dx, 0.5, dz]));
  bench.add(box(0.5, 0.4, 0.5, 'ironDark', 'bench-vise', [-1.1, 1.3, 0]));
  bench.add(box(0.7, 0.35, 0.4, 'iron', 'bench-anvil', [1.0, 1.28, 0]));
  bench.add(cone(0.2, 0.5, 'iron', 'bench-anvil-horn', [1.45, 1.28, 0], 8));
  for (let i = 0; i < 4; i += 1) bench.add(box(0.06, 0.5, 0.06, 'iron', 'bench-tool', [-0.3 + i * 0.25, 1.45, -0.4]));
  root.add(bench);

  // --- Lost-and-found shelf (with the story suitcase) ---
  const lost = group('lost-found-shelf');
  lost.position.set(5.9, 0, -1.5);
  lost.rotation.y = -Math.PI / 2;
  lost.add(box(3.0, 3.2, 0.5, 'woodDark', 'lost-found-frame', [0, 1.6, 0]));
  for (let r = 0; r < 3; r += 1) {
    lost.add(box(2.8, 0.08, 0.46, 'wood', 'lost-found-plank', [0, 0.7 + r * 1.0, 0]));
    for (let it = 0; it < 3; it += 1) {
      const col = ['brass', 'canvasDark', 'wood'][(r + it) % 3];
      lost.add(box(0.4, 0.4, 0.3, col, 'lost-found-item', [-0.9 + it * 0.9, 1.05 + r * 1.0, 0]));
    }
  }
  // story prop: unopenable royal-crest suitcase on the top shelf
  const suitcase = group('royal-crest-suitcase');
  suitcase.position.set(0.8, 2.9, 0.05);
  suitcase.add(box(0.9, 0.55, 0.4, 'royal', 'royal-crest-suitcase-body', [0, 0, 0]));
  suitcase.add(box(0.95, 0.1, 0.42, 'gold', 'royal-crest-suitcase-strap', [0, 0.05, 0]));
  suitcase.add(sphere(0.12, 'gold', 'royal-crest-emblem', [0, 0, 0.22], [1, 1, 0.4], { emissive: WAYSTATION_COLORS.gold, emissiveIntensity: 0.35 }));
  lost.add(suitcase);
  root.add(lost);

  // --- Bedroll row (returning parties bunk here) ---
  const bedrolls = group('bedroll-row');
  bedrolls.position.set(-4.0, 0, 4.2);
  const bedCount = overfilled ? 5 : 3;
  for (let i = 0; i < bedCount; i += 1) {
    const roll = group('bedroll');
    roll.position.set(i * 1.4, 0, overfilled ? (i % 2) * 0.6 : 0);
    roll.add(box(0.7, 0.22, 1.7, i % 2 ? 'flagWorn' : 'canvasDark', 'bedroll-mat', [0, 0.13, 0]));
    roll.add(cylinder(0.18, 0.65, 'canvas', 'bedroll-pillow', [0, 0.28, -0.7], 8, [0, 0, Math.PI / 2]));
    bedrolls.add(roll);
  }
  root.add(bedrolls);

  root.add(brassLantern(-5.6, 3.4, -4.2, 0.85, lit));
  root.add(brassLantern(5.6, 3.4, -4.2, 0.85, lit));

  // --- State overlays ---
  if (state === 'ordered') {
    // tidy inventory manifest board + swept aisle marker
    const order = group('vault-inventory-order');
    order.add(box(1.4, 1.0, 0.06, 'parchment', 'inventory-manifest', [0, 2.4, -4.75]));
    order.add(box(9.0, 0.03, 0.15, 'gold', 'aisle-guide-line', [0, 0.03, 0.5]));
    root.add(order);
  }

  if (state === 'overfilled') {
    const overflow = group('vault-overflow');
    // overflow bundles spilling into the aisle + a leaning tally of extra sacks
    for (const [x, z] of [[-1.0, 2.0], [1.2, 1.4], [0.0, 3.2], [2.0, 2.6]]) {
      const bundle = sack(0, 0.42, 0, 1.1, 'canvasDark');
      bundle.name = 'overflow-bundle';
      bundle.position.set(x, 0.42, z);
      overflow.add(bundle);
    }
    overflow.add(box(1.0, 0.9, 0.06, 'parchment', 'over-capacity-notice', [0, 2.3, -4.75]));
    root.add(overflow);
  }

  if (state === 'raided') {
    const raid = group('vault-rat-raid');
    // scurrying rats (articulated: body, head, tail) + gnaw holes in the wall
    const ratSpots = [[-1.5, 1.2], [2.4, 0.6], [-3.0, 2.4], [0.8, 2.8]];
    for (let i = 0; i < ratSpots.length; i += 1) {
      const [x, z] = ratSpots[i];
      const rat = group('vault-rat');
      rat.position.set(x, 0.12, z);
      rat.add(
        sphere(0.16, 'shadow', 'rat-body', [0, 0, 0], [1.6, 0.9, 1]),
        sphere(0.1, 'shadow', 'rat-head', [0, 0.02, 0.22], [1, 0.9, 1.1]),
        beam([0, 0, -0.2], [0, 0.05, -0.6], 0.02, 'shadow', 'rat-tail')
      );
      rat.userData = { animation: 'crowd-shuffle', phase: i * 0.7 };
      raid.add(rat);
    }
    for (const [x, y] of [[-3.5, 0.5], [2.8, 0.4]]) raid.add(sphere(0.3, 'stoneDark', 'gnaw-hole', [x, y, -4.78], [1.3, 1, 0.4]));
    raid.add(box(1.0, 0.7, 0.06, 'blood', 'theft-report-notice', [0, 2.2, -4.75]));
    root.add(raid);
  }

  return root;
}
