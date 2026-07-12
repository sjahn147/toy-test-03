import { group, box, cylinder, sphere, cone, torus, beam, frustum, ossuaryFloor, boneColumn, skullNiche, bonePile, soulMist, traversalLane, candle } from './OssuaryCathedralGeometry.js';

export function buildOssuaryShelves(state) {
  const root = group('ossuary-shelves');
  root.add(ossuaryFloor(17.8, 12.8));
  root.add(traversalLane('bone-cart-lane', 3.0, 11.8, [0, 0.026, 0]));

  const racks = group('bone-racks');
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 3; tier += 1) {
      const shelf = box(6.0, 0.1, 0.6, 'oldBone', 'rack-shelf', [side * 6.4, 0.8 + tier * 1.4, -3.6]);
      racks.add(shelf);
      for (let i = 0; i < 5; i += 1) {
        const niche = skullNiche(side * 6.4 - 2.4 + i * 1.2, 1.1 + tier * 1.4, -3.6, side > 0 ? Math.PI : 0);
        racks.add(niche);
        if (i % 2 === 0) racks.add(cylinder(0.05, 0.18, 'marrow', 'rack-urn', [side * 6.4 - 2.4 + i * 1.2, 0.86 + tier * 1.4, -3.35], 6));
      }
    }
    for (const dx of [-3.0, 3.0]) racks.add(cylinder(0.09, 4.6, 'iron', 'rack-upright', [side * 6.4 + dx, 2.3, -3.6], 8));
    const pilaster = boneColumn(side * 6.4, -3.9, 4.8);
    pilaster.name = 'rack-bone-pilaster';
    racks.add(pilaster);
  }
  root.add(racks);

  const assembly = group('assembly-tables');
  assembly.position.set(0, 0, -0.4);
  for (const dx of [-2.6, 2.6]) {
    const table = box(2.4, 0.9, 1.4, 'oldBone', 'assembly-table', [dx, 0.45, 0]);
    assembly.add(table);
    assembly.add(bonePile('table-sorted-bones', dx, 1.0, 8));
  }
  root.add(assembly);

  const bins = group('skull-bins');
  bins.position.set(0, 0, 3.6);
  for (let i = 0; i < 4; i += 1) {
    const bin = box(1.5, 0.7, 1.2, 'stoneDark', 'skull-storage-bin', [-2.7 + i * 1.8, 0.35, 0]);
    bins.add(bin);
    for (let j = 0; j < 6; j += 1) bins.add(sphere(0.16, 'bone', 'binned-skull', [-2.7 + i * 1.8 + (j % 3 - 1) * 0.4, 0.72, (Math.floor(j / 3) - 0.5) * 0.35]));
  }
  root.add(bins);

  const cauldron = group('marrow-cauldron');
  cauldron.position.set(6.7, 0, 4.6);
  cauldron.add(cylinder(0.9, 0.9, 'iron', 'cauldron-body', [0, 0.45, 0], 16));
  cauldron.add(cylinder(0.86, 0.15, 'marrow', 'marrow-broth', [0, 0.85, 0], 16, null, { emissive: 0x6b3c43, emissiveIntensity: 0.4 }));
  cauldron.add(beam([-0.9, 1.6, 0], [0.9, 1.6, 0], 0.05, 'iron', 'cauldron-tripod-bar'));
  cauldron.add(beam([-0.9, 1.6, 0], [0, 0.4, 0], 0.06, 'iron', 'cauldron-tripod-leg'));
  cauldron.add(beam([0.9, 1.6, 0], [0, 0.4, 0], 0.06, 'iron', 'cauldron-tripod-leg'));
  root.add(cauldron);

  const gate = group('skeleton-muster-gate');
  gate.position.set(-6.9, 0, 4.6);
  gate.add(boneColumn(-1.0, 0, 4.4));
  gate.add(boneColumn(1.0, 0, 4.4));
  gate.add(beam([-1.0, 4.4, 0], [1.0, 4.4, 0], 0.12, 'oldBone', 'muster-lintel'));
  root.add(gate);

  const wrongLegs = group('wrong-legs-skeleton');
  wrongLegs.position.set(4.6, 0, -3.6);
  wrongLegs.add(beam([0, 1.0, 0], [0, 1.7, 0], 0.13, 'oldBone', 'mismatched-spine'));
  wrongLegs.add(sphere(0.2, 'bone', 'mismatched-skull', [0, 1.95, 0]));
  wrongLegs.add(beam([0, 1.0, 0], [-0.22, 0.15, 0.08], 0.11, 'bone', 'oversized-leg-bone'));
  wrongLegs.add(beam([-0.22, 0.15, 0.08], [-0.24, 0, 0.3], 0.09, 'bone', 'oversized-leg-lower'));
  wrongLegs.add(beam([0, 1.0, 0], [0.16, 0.2, -0.06], 0.05, 'bone', 'undersized-leg-bone'));
  wrongLegs.add(beam([0.16, 0.2, -0.06], [0.17, 0.02, -0.2], 0.04, 'bone', 'undersized-leg-lower'));
  root.add(wrongLegs);

  const ladder = group('bone-ladder');
  ladder.position.set(5.6, 0, -0.6);
  for (const x of [-0.32, 0.32]) ladder.add(cylinder(0.05, 3.6, 'iron', 'ladder-rail', [x, 1.8, 0], 6));
  for (let i = 0; i < 7; i += 1) ladder.add(box(0.62, 0.05, 0.16, 'oldBone', 'ladder-rung', [0, 0.4 + i * 0.5, 0]));
  ladder.add(torus(0.22, 0.04, 'iron', 'ladder-hook', [0, 3.6, 0.2], [Math.PI / 2, 0, 0]));
  root.add(ladder);

  const desk = group('bone-catalog-desk');
  desk.position.set(6.6, 0, -0.6);
  desk.add(box(2.0, 0.9, 1.0, 'stoneDark', 'desk-body', [0, 0.45, 0]));
  desk.add(box(1.3, 0.06, 0.7, 'parchment', 'catalog-ledger', [-0.2, 0.95, 0]));
  for (let i = 0; i < 5; i += 1) desk.add(box(0.24, 0.04, 0.12, i % 2 ? 'blood' : 'parchment', 'catalog-tag', [0.4 + i * 0.18, 0.94, -0.3 + i * 0.12]));
  root.add(desk);

  const cart = group('bone-cart');
  cart.position.set(0, 0, 6.4);
  cart.add(box(1.7, 0.5, 1.0, 'iron', 'cart-bed', [0, 0.5, 0]));
  for (const x of [-0.68, 0.68]) cart.add(torus(0.32, 0.06, 'iron', 'cart-wheel', [x, 0.28, 0], [0, Math.PI / 2, 0]));
  for (let i = 0; i < 8; i += 1) {
    const angle = i * 1.9;
    cart.add(cylinder(0.05, 0.6 + (i % 3) * 0.15, 'bone', 'cart-bone-load', [Math.cos(angle) * 0.5, 0.85 + (i % 2) * 0.08, Math.sin(angle) * 0.35], 6, [Math.PI / 2, angle, 0]));
  }
  cart.add(box(1.3, 0.06, 0.14, 'iron', 'cart-handle', [0, 0.85, 0.62]));
  root.add(cart);

  // A dedicated articulation bench, distinct from the general assembly-tables sorting surface: a vice,
  // wire spools, and a bone rig mid-assembly clamped in place.
  const skeletonAssemblyTable = group('skeleton-assembly-table');
  skeletonAssemblyTable.position.set(-4.6, 0, -3.9);
  skeletonAssemblyTable.add(box(0.08, 0.85, 0.08, 'iron', 'skeleton-assembly-table-leg', [-0.9, 0.42, -0.35]));
  skeletonAssemblyTable.add(box(0.08, 0.85, 0.08, 'iron', 'skeleton-assembly-table-leg', [0.9, 0.42, -0.35]));
  skeletonAssemblyTable.add(box(0.08, 0.85, 0.08, 'iron', 'skeleton-assembly-table-leg', [-0.9, 0.42, 0.35]));
  skeletonAssemblyTable.add(box(0.08, 0.85, 0.08, 'iron', 'skeleton-assembly-table-leg', [0.9, 0.42, 0.35]));
  skeletonAssemblyTable.add(box(2.0, 0.08, 0.9, 'oldBone', 'skeleton-assembly-table-top', [0, 0.87, 0]));
  const vice = group('assembly-vice-clamp');
  vice.position.set(-0.7, 0.91, 0.2);
  vice.add(box(0.3, 0.12, 0.16, 'iron', 'vice-base', [0, 0, 0]));
  vice.add(box(0.06, 0.16, 0.16, 'iron', 'vice-jaw', [-0.14, 0.1, 0]));
  vice.add(box(0.06, 0.16, 0.16, 'iron', 'vice-jaw', [0.14, 0.1, 0]));
  vice.add(cylinder(0.02, 0.22, 'brass', 'vice-screw', [0.14, 0.1, 0], 6, [0, 0, Math.PI / 2]));
  skeletonAssemblyTable.add(vice);
  skeletonAssemblyTable.add(cylinder(0.14, 0.08, 'brass', 'assembly-wire-spool', [0.55, 0.95, -0.25], 12, [Math.PI / 2, 0, 0]));
  skeletonAssemblyTable.add(cylinder(0.14, 0.08, 'iron', 'assembly-wire-spool', [0.55, 0.95, 0.1], 12, [Math.PI / 2, 0, 0]));
  const rig = group('assembly-rig-in-progress');
  rig.position.set(-0.1, 0.91, -0.3);
  rig.add(beam([0, 0, 0], [0, 0.55, 0], 0.045, 'bone', 'rig-partial-spine'));
  rig.add(sphere(0.1, 'bone', 'rig-clamped-skull', [0, 0.66, 0]));
  rig.add(beam([0, 0.45, 0], [-0.28, 0.2, 0.1], 0.03, 'bone', 'rig-partial-arm'));
  rig.add(cylinder(0.012, 0.5, 'iron', 'rig-armature-wire', [0.12, 0.3, 0], 4, [0, 0, 0.25]));
  skeletonAssemblyTable.add(rig);
  for (let i = 0; i < 3; i += 1) {
    const tool = box(0.22 - i * 0.03, 0.02, 0.05, i === 1 ? 'brass' : 'iron', 'assembly-hand-tool', [-1.5 + i * 0.3, 0.92, -0.15]);
    tool.rotation.y = i * 0.5;
    skeletonAssemblyTable.add(tool);
  }
  skeletonAssemblyTable.add(bonePile('assembly-table-offcuts', -1.4, 0.6, 6));
  root.add(skeletonAssemblyTable);

  // Extra shelf density: a reliquary alcove with a wider variety of stored-remains treatment
  // (ash urns, sealed ossuary boxes, jarred trophies) beyond the plain skull niches.
  const reliquary = group('reliquary-alcove');
  reliquary.position.set(0, 0, -5.9);
  for (let i = 0; i < 7; i += 1) {
    const x = -5.4 + i * 1.8;
    const kind = i % 3;
    if (kind === 0) {
      const urn = cone(0.22, 0.34, 'marrow', 'reliquary-ash-urn', [x, 0.17, 0], 10);
      reliquary.add(urn);
      reliquary.add(torus(0.22, 0.03, 'iron', 'reliquary-urn-lid-band', [x, 0.33, 0], [Math.PI / 2, 0, 0]));
    } else if (kind === 1) {
      const box1 = box(0.4, 0.3, 0.32, 'stoneDark', 'reliquary-sealed-box', [x, 0.15, 0]);
      reliquary.add(box1);
      reliquary.add(box(0.42, 0.03, 0.06, 'iron', 'reliquary-box-band', [x, 0.24, 0.18]));
    } else {
      const jar = frustum(0.16, 0.2, 0.4, 'bone', 'reliquary-trophy-jar', [x, 0.2, 0], 10);
      reliquary.add(jar);
      reliquary.add(sphere(0.11, 'oldBone', 'reliquary-jarred-skull', [x, 0.34, 0]));
    }
  }
  root.add(reliquary);

  // A chain-locked ossuary chest — remains too dangerous or too significant for an open niche.
  const chest = group('locked-ossuary-chest');
  chest.position.set(6.4, 0, -5.9);
  chest.add(box(0.9, 0.55, 0.6, 'oldBone', 'chest-body', [0, 0.28, 0]));
  chest.add(box(0.94, 0.12, 0.64, 'stoneDark', 'chest-lid', [0, 0.58, 0]));
  chest.add(beam([-0.45, 0.1, 0.31], [0.45, 0.1, 0.31], 0.02, 'iron', 'chest-band'));
  chest.add(beam([-0.45, 0.45, 0.31], [0.45, 0.45, 0.31], 0.02, 'iron', 'chest-band'));
  chest.add(cylinder(0.06, 0.1, 'iron', 'chest-lock', [0, 0.35, 0.32], 8));
  for (let i = 0; i < 4; i += 1) chest.add(cylinder(0.015, 0.5, 'iron', 'chest-chain-link', [0.35, 0.55 + i * 0.03, 0.28 - i * 0.08], 5, [0.3, i * 0.5, 0]));
  root.add(chest);

  // A worn catalog plaque marking the wall segment's storage designation.
  const plaque = group('storage-catalog-plaque');
  plaque.position.set(0, 2.6, -5.97);
  plaque.add(box(1.6, 0.5, 0.04, 'iron', 'plaque-plate', [0, 0, 0], { roughness: 0.6, metalness: 0.3 }));
  plaque.add(box(1.4, 0.32, 0.02, 'stoneDark', 'plaque-inset', [0, 0, 0.025]));
  for (let i = 0; i < 4; i += 1) plaque.add(box(0.18, 0.03, 0.01, 'bone', 'plaque-etched-glyph', [-0.5 + i * 0.34, 0.05, 0.04]));
  root.add(plaque);

  // Secondary light source and wear marks near the assembly bench, separate from the cauldron's glow.
  root.add(candle(-5.6, 0, -2.6, true, 0.8));
  root.add(candle(-3.6, 0, -5.0, true, 0.8));
  for (let i = 0; i < 5; i += 1) {
    const scuff = box(0.5 + (i % 2) * 0.2, 0.01, 0.3, 'stoneDark', 'shelf-floor-wear-mark', [-4.6 + (i % 3) * 0.4, 0.011, -3.0 + i * 0.35], { roughness: 0.98 });
    scuff.rotation.y = i * 0.4;
    root.add(scuff);
  }
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 2; tier += 1) {
      const drip = box(0.03, 0.7 - tier * 0.2, 0.03, 'marrow', 'rack-grime-drip', [side * 6.4 + (tier === 0 ? -1.8 : 1.4), 0.5 + tier * 1.4, -3.35], { transparent: true, opacity: 0.5, roughness: 0.9 });
      root.add(drip);
    }
  }

  if (state === 'ordered') {
    for (let i = 0; i < 6; i += 1) root.add(bonePile('shelf-floor-overflow', -1.5 + i * 0.5, -5.8, 4));
    for (let i = 0; i < 3; i += 1) root.add(box(0.7, 0.5, 0.6, 'stoneDark', 'sorted-crate', [4.2 + i * 0.9, 0.25, -5.6]));
    rig.visible = false;
  }
  if (state === 'spawning') {
    root.add(soulMist('shelf-spawn-mist', 0, 0.5, -0.4, 10, 0.85));
    for (const [x, z] of [[-2.0, 1.6], [2.4, 1.2], [0.4, -1.4]]) root.add(bonePile('freshly-assembled-skeleton-parts', x, z, 8));
    for (let i = 0; i < 4; i += 1) {
      const riser = group('rising-conscript');
      riser.position.set(-6.9 + i * 0.6, 0, 3.0 + (i % 2) * 0.6);
      riser.add(beam([0, 0.2, 0], [0, 1.3, 0], 0.09, 'bone', 'conscript-spine'));
      riser.add(sphere(0.16, 'bone', 'conscript-skull', [0, 1.5, 0]));
      riser.add(beam([0, 1.1, 0], [-0.35, 0.7, 0.15], 0.05, 'bone', 'conscript-arm'));
      riser.add(beam([0, 1.1, 0], [0.35, 0.7, 0.15], 0.05, 'bone', 'conscript-arm'));
      root.add(riser);
    }
    // The assembly bench is mid-work: the caged rig glows faintly with fresh death-energy.
    rig.children.forEach(child => { if (child.material) { child.material.emissive.set(0x6b3c43); child.material.emissiveIntensity = 0.3; } });
  }
  if (state === 'collapsed') {
    racks.children.forEach(child => { child.rotation.z += 0.28; });
    for (let i = 0; i < 26; i += 1) root.add(bonePile('collapsed-bone-scatter', -7 + (i % 8) * 1.9, -4 + Math.floor(i / 8) * 3.4, 6));
    for (let i = 0; i < 4; i += 1) {
      const plank = box(2.4, 0.1, 0.5, 'oldBone', 'toppled-rack-plank', [-5 + i * 3.2, 0.3 + (i % 2) * 0.2, -5.6 + (i % 3) * 3.4]);
      plank.rotation.set(i * 0.2, i * 0.5, i % 2 ? 0.6 : -0.55);
      root.add(plank);
    }
    // The assembly bench toppled with the racks; the rig lies broken and the reliquary jars spilled.
    skeletonAssemblyTable.rotation.z = 0.4;
    skeletonAssemblyTable.position.y = 0.15;
    reliquary.children.forEach((child, i) => { if (child.name.startsWith('reliquary-')) child.position.z += (i % 2 ? 0.4 : -0.35); });
    chest.rotation.z = -0.5;
    chest.position.y = 0.2;
  }

  return root;
}
