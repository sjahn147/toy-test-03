import { group, box, cylinder, sphere, beam, ossuaryFloor, boneColumn, skullNiche, bonePile, soulMist, traversalLane } from './OssuaryCathedralGeometry.js';

export function buildOssuaryShelves(state) {
  const root = group('ossuary-shelves');
  root.add(ossuaryFloor(17.8, 12.8));
  root.add(traversalLane('bone-cart-lane', 3.0, 11.8, [0, 0.026, 0]));

  const racks = group('bone-racks');
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 3; tier += 1) {
      const shelf = box(6.0, 0.1, 0.6, 'oldBone', 'rack-shelf', [side * 6.4, 0.8 + tier * 1.4, -3.6]);
      racks.add(shelf);
      for (let i = 0; i < 5; i += 1) racks.add(skullNiche(side * 6.4 - 2.4 + i * 1.2, 1.1 + tier * 1.4, -3.6, side > 0 ? Math.PI : 0));
    }
    for (const dx of [-3.0, 3.0]) racks.add(cylinder(0.09, 4.6, 'iron', 'rack-upright', [side * 6.4 + dx, 2.3, -3.6], 8));
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

  if (state === 'ordered') {
    for (let i = 0; i < 6; i += 1) root.add(bonePile('shelf-floor-overflow', -1.5 + i * 0.5, -5.8, 4));
  }
  if (state === 'spawning') {
    root.add(soulMist('shelf-spawn-mist', 0, 0.5, -0.4, 10, 0.85));
    for (const [x, z] of [[-2.0, 1.6], [2.4, 1.2], [0.4, -1.4]]) root.add(bonePile('freshly-assembled-skeleton-parts', x, z, 8));
  }
  if (state === 'collapsed') {
    racks.children.forEach(child => { child.rotation.z += 0.28; });
    for (let i = 0; i < 26; i += 1) root.add(bonePile('collapsed-bone-scatter', -7 + (i % 8) * 1.9, -4 + Math.floor(i / 8) * 3.4, 6));
  }

  return root;
}
