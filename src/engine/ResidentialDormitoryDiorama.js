import {
  group, box, beam, cylinder, sphere, plane, wornTileFloor,
  bunkBed, lockerBank, flame, rubblePile, RESIDENTIAL_COLORS
} from './ResidentialQuarterGeometry.js';

export function buildBrokenDormitory(state) {
  const root = group('broken-dormitory');
  root.add(wornTileFloor(15.8, 11.6, state === 'burned' ? 'charred' : 'stone'));

  // Perimeter bunks preserve a broad central cross-aisle for A05 -> B07/B09 traversal.
  const bunks = group('double-bunk-row');
  const spots = [
    [-5.9, -3.7, 0], [-2.7, -3.7, 0], [2.7, -3.7, 0], [5.9, -3.7, 0],
    [-5.9, 3.7, Math.PI], [-2.7, 3.7, Math.PI], [2.7, 3.7, Math.PI], [5.9, 3.7, Math.PI]
  ];
  spots.forEach(([x, z, rotation], index) => {
    const damaged = state === 'burned' || (state === 'abandoned' && [1, 6].includes(index));
    bunks.add(bunkBed(x, z, rotation, damaged));
  });
  root.add(bunks);

  root.add(lockerBank(-7.2, 0.2, 5, Math.PI / 2));
  root.add(lockerBank(7.2, -0.2, 5, -Math.PI / 2));

  const aisle = group('central-traversal-aisle');
  aisle.add(box(2.4, 0.035, 10.9, 'plasterPale', 'dormitory-longitudinal-lane', [0, 0.025, 0], { opacity: 0.18, transparent: true }));
  aisle.add(box(14.9, 0.035, 2.2, 'plasterPale', 'dormitory-cross-lane', [0, 0.03, 0.4], { opacity: 0.13, transparent: true }));
  root.add(aisle);

  const collapse = group('ceiling-collapse');
  collapse.position.set(5.7, 0, -3.3);
  collapse.add(
    beam([-1.1, 4.8, -0.2], [0.8, 1.2, 0.5], 0.16, state === 'burned' ? 'charred' : 'timberDark', 'collapsed-roof-beam'),
    beam([0.9, 5.2, 0.4], [-0.5, 1.0, -0.5], 0.13, state === 'burned' ? 'charred' : 'timber', 'collapsed-roof-beam'),
    rubblePile('ceiling-rubble', 0, 0, state === 'burned' ? 20 : 14, state === 'burned' ? 'charred' : 'stoneDark')
  );
  for (let i = 0; i < 8; i += 1) {
    const dust = sphere(0.06, 'plasterPale', 'falling-plaster-dust', [-0.8 + (i % 4) * 0.5, 3.8 + (i % 3) * 0.6, -0.4 + Math.floor(i / 4) * 0.7], [1, 1, 1], { transparent: true, opacity: 0.45 });
    dust.userData = { animation: 'dust-fall', phase: i * 0.77 };
    collapse.add(dust);
  }
  root.add(collapse);

  // Story prop: refugee children mapped the citadel from memory on the plaster.
  const mural = group('child-map-mural');
  mural.position.set(-5.0, 1.8, -5.72);
  mural.add(plane(5.1, 2.45, 'plasterPale', 'child-map-wall-patch', [0, 0, 0], [0, 0, 0], { roughness: 0.96 }));
  const lines = [
    [-1.8, 0.6, 1.3, 0.6], [-1.2, 0.1, 0.2, -0.2], [0.1, -0.2, 1.4, 0.4],
    [-1.4, -0.7, -0.4, -0.1], [0.7, 0.8, 1.6, 0.2], [-0.3, 0.4, 0.5, 0.9]
  ];
  for (const [x1, y1, x2, y2] of lines) mural.add(beam([x1, y1, 0.02], [x2, y2, 0.02], 0.025, 'chalk', 'child-map-line'));
  for (const [x, y] of [[-1.8, 0.6], [-1.2, 0.1], [0.2, -0.2], [1.4, 0.4], [-0.4, -0.1], [0.7, 0.8]]) {
    mural.add(sphere(0.09, 'redCloth', 'child-map-room-mark', [x, y, 0.04], [1, 1, 0.4]));
  }
  root.add(mural);

  if (state === 'abandoned') addAbandonedState(root);
  if (state === 'field-camp') addFieldCampState(root);
  if (state === 'burned') addBurnedState(root);
  return root;
}

function addAbandonedState(root) {
  const neglect = group('abandoned');
  for (const [x, z, r] of [[-4.3, 1.8, -0.2], [4.5, -1.5, 0.3], [1.9, 4.7, 0.5]]) {
    const cloth = plane(1.8, 1.0, 'linenDirty', 'discarded-blanket', [x, 0.11, z], [-Math.PI / 2, 0, r]);
    neglect.add(cloth);
  }
  for (const [x, z] of [[-7.5, -2.8], [7.5, 2.7], [-6.9, 4.8]]) {
    neglect.add(box(0.5, 0.35, 0.16, 'shadow', 'rat-hole', [x, 0.18, z]));
  }
  root.add(neglect);
}

function addFieldCampState(root) {
  const camp = group('field-camp');
  const hearth = group('camp-hearth');
  hearth.position.set(3.9, 0, 1.9);
  for (let i = 0; i < 10; i += 1) {
    const a = i * Math.PI * 2 / 10;
    hearth.add(cylinder(0.17, 0.4, 'stoneLight', 'hearth-stone', [Math.cos(a) * 0.75, 0.2, Math.sin(a) * 0.75], 8, [Math.PI / 2, 0, 0]));
  }
  hearth.add(flame(0, 0.05, 0, 0.9));
  camp.add(hearth);

  for (const [x, z, color] of [[-4.6, 1.9, 'blueCloth'], [-2.5, 2.0, 'redCloth'], [-4.4, -1.7, 'linen'], [2.5, -2.0, 'linenDirty']]) {
    camp.add(box(1.7, 0.16, 0.75, color, 'camp-bedroll', [x, 0.1, z]));
    camp.add(box(0.45, 0.16, 0.58, 'linen', 'camp-pillow', [x - 0.52, 0.23, z]));
  }
  camp.add(box(2.6, 1.5, 0.12, 'blueCloth', 'camp-privacy-screen', [-6.0, 1.6, 0.7]));
  camp.add(box(1.1, 0.8, 0.9, 'timber', 'camp-supply-crate', [5.5, 0.42, 3.7]));
  camp.add(box(0.8, 0.55, 0.7, 'timberDark', 'camp-supply-crate', [4.5, 0.3, 4.0]));
  root.add(camp);
}

function addBurnedState(root) {
  const burned = group('burned');
  for (const [x, z] of [[-5.8, -3.6], [-2.7, 3.8], [3.1, -3.7], [6.1, 3.4]]) {
    burned.add(rubblePile('charred-bunk-debris', x, z, 9, 'charred'));
  }
  for (let i = 0; i < 18; i += 1) {
    const ember = sphere(0.055, 'ember', 'dormitory-ember', [-6.5 + (i % 6) * 2.4, 0.2 + (i % 3) * 0.12, -4.2 + Math.floor(i / 6) * 3.8], [1, 1, 1], {
      emissive: RESIDENTIAL_COLORS.ember, emissiveIntensity: 1.1
    });
    ember.userData = { animation: 'ember-rise', phase: i * 0.41 };
    burned.add(ember);
  }
  root.add(burned);
}
