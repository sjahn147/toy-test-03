import {
  group, box, cylinder, sphere, beam, wornTileFloor,
  balconySection, flame
} from './ResidentialQuarterGeometry.js';

export function buildTenementCourt(state) {
  const root = group('tenement-court');
  root.add(wornTileFloor(17.8, 13.8, state === 'barricaded' ? 'stoneDark' : 'stone'));

  const balconies = group('tenement-balcony');
  for (const [x, z, rotation, width] of [
    [0, -6.2, 0, 6.0], [0, 6.2, Math.PI, 6.0],
    [-8.1, 0, Math.PI / 2, 4.8], [8.1, 0, -Math.PI / 2, 4.8]
  ]) balconies.add(balconySection(x, z, rotation, width));
  root.add(balconies);

  const tree = group('dead-courtyard-tree');
  tree.position.set(-3.4, 0, -1.6);
  tree.add(cylinder(0.42, 3.8, 'timberDark', 'dead-tree-trunk', [0, 1.9, 0], 10));
  for (const [start, end] of [
    [[0, 3.4, 0], [-1.5, 5.0, 0.4]],
    [[0, 3.0, 0], [1.4, 4.7, -0.6]],
    [[0, 2.5, 0], [-1.0, 3.8, -1.0]]
  ]) tree.add(beam(start, end, 0.16, 'timberDark', 'dead-tree-branch'));
  root.add(tree);

  const well = group('common-well');
  well.position.set(4.1, 0, -2.3);
  well.add(cylinder(1.35, 0.8, 'stoneLight', 'well-ring', [0, 0.4, 0], 18));
  const water = cylinder(1.0, 0.25, 'water', 'well-water', [0, 0.62, 0], 18, null, { emissive: 0x3e7180, emissiveIntensity: 0.15 });
  water.userData = { animation: 'water-ripple', phase: 1.2 };
  well.add(water);
  well.add(beam([-1.2, 0.7, 0], [-1.2, 3.0, 0], 0.1, 'timber', 'well-post'));
  well.add(beam([1.2, 0.7, 0], [1.2, 3.0, 0], 0.1, 'timber', 'well-post'));
  well.add(beam([-1.2, 2.8, 0], [1.2, 2.8, 0], 0.1, 'timber', 'well-crossbar'));
  root.add(well);

  const bays = group('market-bays');
  for (const [x, z] of [[-6, 4.5], [0, 5.2], [6, 4.5]]) {
    const bay = group('market-bay');
    bay.position.set(x, 0, z);
    bay.add(box(3.0, 0.22, 1.4, 'timber', 'bay-counter', [0, 0.9, 0]));
    bay.add(beam([-1.3, 0, 0], [-1.3, 2.8, 0], 0.08, 'timberDark', 'bay-post'));
    bay.add(beam([1.3, 0, 0], [1.3, 2.8, 0], 0.08, 'timberDark', 'bay-post'));
    bays.add(bay);
  }
  root.add(bays);

  const mosaic = group('tenant-key-mosaic');
  mosaic.position.set(0, 0.03, 2.2);
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    const key = box(0.18, 0.04, 0.7, i % 3 ? 'copper' : 'copperGreen', 'mosaic-key', [Math.cos(angle) * 1.1, 0, Math.sin(angle) * 1.1]);
    key.rotation.y = -angle;
    mosaic.add(key);
  }
  root.add(mosaic);

  // The court remains a true circulation hub; props sit outside this cross.
  const lanes = group('cross-traversal-lane');
  lanes.add(box(17.0, 0.035, 2.8, 'plasterPale', 'east-west-clear-lane', [0, 0.025, 0], { opacity: 0.08, transparent: true }));
  lanes.add(box(2.8, 0.035, 13.0, 'plasterPale', 'north-south-clear-lane', [0, 0.026, 0], { opacity: 0.08, transparent: true }));
  root.add(lanes);

  if (state === 'occupied') {
    const occupied = group('occupied');
    for (const [x, z] of [[-5, -4.5], [5, -4.2], [-5.5, 2.0], [5.5, 1.8]]) {
      const post = group('court-lantern');
      post.position.set(x, 0, z);
      post.add(cylinder(0.08, 2.5, 'iron', 'lantern-post', [0, 1.25, 0], 8));
      post.add(flame(0, 2.35, 0, 0.35));
      occupied.add(post);
    }
    occupied.add(box(4.0, 0.3, 2.0, 'blueCloth', 'communal-awning', [0, 2.2, 4.4]));
    root.add(occupied);
  }

  if (state === 'barricaded') {
    const defenses = group('defense-barricade');
    for (const [x, z, rotation] of [[0, -6.2, 0], [0, 6.2, 0], [-8.1, 0, Math.PI / 2], [8.1, 0, Math.PI / 2]]) {
      const barrier = group('court-barricade');
      barrier.position.set(x, 0, z);
      barrier.rotation.y = rotation;
      for (let i = -2; i <= 2; i += 1) {
        const plank = box(4.3, 0.22, 0.28, i % 2 ? 'timber' : 'timberDark', 'barricade-plank', [0, 0.65 + (i + 2) * 0.35, i * 0.12]);
        plank.rotation.z = i * 0.04;
        barrier.add(plank);
      }
      defenses.add(barrier);
    }
    root.add(defenses);
  }
  return root;
}
