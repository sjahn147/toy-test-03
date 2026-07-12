import {
  group, box, beam, cylinder, sphere, wornTileFloor,
  cookRange, workTable, flame, fungusCluster, rubblePile, RESIDENTIAL_COLORS
} from './ResidentialQuarterGeometry.js';

export function buildCommunalKitchen(state) {
  const root = group('communal-kitchen');
  root.add(wornTileFloor(13.8, 10.8, state === 'infested' ? 'stoneDark' : 'stone'));

  // Range and work zones hug the perimeter, keeping the east-west service lane open.
  root.add(cookRange(0, -4.45, 0, state === 'working'));

  const prep = workTable('prep-island', -2.5, 0.2, 3.8, 1.6, 0);
  prep.add(box(1.25, 0.06, 0.82, 'stoneLight', 'prep-cutting-stone', [-0.65, 1.16, 0]));
  prep.add(cylinder(0.22, 0.16, 'copper', 'prep-pot', [0.95, 1.22, 0], 12));
  root.add(prep);

  const lane = group('kitchen-service-lane');
  lane.add(box(13.2, 0.035, 2.4, 'plasterPale', 'kitchen-east-west-lane', [0, 0.025, 0], { transparent: true, opacity: 0.13 }));
  lane.add(box(2.2, 0.035, 9.9, 'plasterPale', 'kitchen-chapel-lane', [2.8, 0.03, 0], { transparent: true, opacity: 0.1 }));
  root.add(lane);

  const lockers = group('food-locker');
  lockers.position.set(5.8, 0, -2.2);
  for (let shelf = 0; shelf < 3; shelf += 1) lockers.add(box(2.6, 0.16, 0.72, 'timber', 'food-locker-shelf', [0, 0.55 + shelf * 0.86, 0]));
  for (let i = 0; i < 12; i += 1) lockers.add(cylinder(0.12 + (i % 3) * 0.03, 0.38 + (i % 2) * 0.16, i % 2 ? 'copper' : 'linenDirty', 'food-storage-jar', [-0.95 + (i % 4) * 0.62, 0.8 + Math.floor(i / 4) * 0.86, 0], 10));
  root.add(lockers);

  const drying = group('drying-rack');
  drying.position.set(-5.4, 0, 2.8);
  drying.add(beam([-1.1, 0.2, 0], [-1.1, 3.7, 0], 0.08, 'timberDark', 'drying-rack-post'));
  drying.add(beam([1.1, 0.2, 0], [1.1, 3.7, 0], 0.08, 'timberDark', 'drying-rack-post'));
  drying.add(beam([-1.1, 3.5, 0], [1.1, 3.5, 0], 0.07, 'timber', 'drying-rack-beam'));
  for (let i = 0; i < 6; i += 1) {
    const herb = group('hanging-herb-bundle');
    herb.position.set(-0.8 + i * 0.32, 2.55 - (i % 2) * 0.2, 0);
    herb.add(beam([0, 0.8, 0], [0, 0.18, 0], 0.025, 'rope', 'herb-tie'));
    for (let j = 0; j < 4; j += 1) herb.add(sphere(0.09, 'fungus', 'dried-herb', [-0.12 + j * 0.08, 0.1 - j * 0.08, 0], [0.7, 1.3, 0.7]));
    herb.userData = { animation: 'laundry-sway', phase: i * 0.7 };
    drying.add(herb);
  }
  root.add(drying);

  const hatch = group('service-hatch');
  hatch.position.set(5.7, 1.6, 4.95);
  hatch.add(box(3.0, 2.4, 0.22, 'timberDark', 'service-hatch-frame', [0, 0, 0]));
  hatch.add(box(2.5, 1.45, 0.16, 'shadow', 'service-hatch-opening', [0, 0.2, -0.02]));
  hatch.add(box(2.9, 0.28, 0.72, 'timber', 'service-hatch-counter', [0, -0.88, 0.3]));
  root.add(hatch);

  const flue = group('smoke-flue');
  flue.position.set(0, 0, -4.55);
  flue.add(box(5.8, 0.55, 1.2, 'brick', 'range-hood', [0, 2.35, 0]));
  flue.add(box(1.25, 3.7, 1.0, 'brickDark', 'flue-stack', [0, 4.0, 0]));
  root.add(flue);

  const lastMeal = group('last-supper-place-setting');
  lastMeal.position.set(-2.5, 0, 0.2);
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI * 2 / 6;
    lastMeal.add(cylinder(0.18, 0.05, 'plasterPale', 'abandoned-plate', [Math.cos(angle) * 1.15, 1.16, Math.sin(angle) * 0.48], 12));
    lastMeal.add(box(0.34, 0.05, 0.06, 'iron', 'abandoned-utensil', [Math.cos(angle) * 1.42, 1.18, Math.sin(angle) * 0.62]));
  }
  lastMeal.add(sphere(0.2, 'charred', 'unfinished-loaf', [0, 1.2, 0], [1.6, 0.7, 1.0]));
  root.add(lastMeal);

  if (state === 'cold') addColdState(root);
  if (state === 'working') addWorkingState(root);
  if (state === 'infested') addInfestedState(root);
  return root;
}

function addColdState(root) {
  const cold = group('cold');
  cold.add(rubblePile('cold-ash-heap', 0, -3.9, 10, 'soot'));
  for (const [x, z, r] of [[-5.7, -0.5, 0.2], [4.6, 3.4, -0.25], [0.7, 3.7, 0.4]]) cold.add(cylinder(0.38, 0.35, 'iron', 'overturned-pot', [x, 0.25, z], 12, [Math.PI / 2, r, 0]));
  root.add(cold);
}

function addWorkingState(root) {
  const working = group('working');
  working.add(cylinder(0.62, 0.52, 'copper', 'working-stockpot', [0, 1.82, -3.6], 14));
  for (let i = 0; i < 8; i += 1) {
    const steam = sphere(0.14 + (i % 3) * 0.05, 'steam', 'kitchen-steam', [-0.25 + (i % 4) * 0.18, 2.2 + Math.floor(i / 4) * 0.35, -3.6], [1, 1.4, 1], { transparent: true, opacity: 0.28 });
    steam.userData = { animation: 'steam-drift', phase: i * 0.53 };
    working.add(steam);
  }
  for (const [x, z] of [[4.7, 1.8], [5.5, 0.8], [-4.5, 4.0]]) working.add(box(0.9, 0.7, 0.75, 'timber', 'ration-crate', [x, 0.36, z]));
  working.add(flame(-5.4, 0.12, 3.9, 0.55));
  root.add(working);
}

function addInfestedState(root) {
  const infestation = group('infested');
  for (const [x, z, count] of [[-5.6, -3.8, 8], [4.8, -3.5, 7], [-5.0, 4.1, 9], [4.8, 4.0, 6]]) infestation.add(fungusCluster(x, z, count, 0.85));
  for (let i = 0; i < 10; i += 1) {
    const blob = sphere(0.28 + (i % 3) * 0.08, 'slime', 'slime-infestation', [-4.8 + (i % 5) * 2.25, 0.18, 3.2 + Math.floor(i / 5) * 0.8], [1.3, 0.45, 1.0], { transparent: true, opacity: 0.72, emissive: RESIDENTIAL_COLORS.slime, emissiveIntensity: 0.12 });
    blob.userData = { animation: 'fungus-pulse', phase: i * 0.61 };
    infestation.add(blob);
  }
  infestation.add(box(1.4, 1.0, 1.15, 'fungus', 'blocked-smoke-flue', [0, 4.0, -4.4]));
  root.add(infestation);
}
