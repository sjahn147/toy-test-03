import {
  group, box, cylinder, sphere, torus, wornTileFloor,
  chapelBench, candle, rubblePile
} from './ResidentialQuarterGeometry.js';

export function buildHouseholdChapel(state) {
  const root = group('household-chapel');
  root.add(wornTileFloor(11.8, 9.8, state === 'defiled' ? 'stoneDark' : 'stone'));

  const altar = group('household-altar');
  altar.position.set(0, 0, -3.7);
  altar.add(box(3.8, 1.0, 1.2, state === 'defiled' ? 'charred' : 'stoneLight', 'family-altar', [0, 0.5, 0]));
  altar.add(cylinder(0.55, 2.2, 'plasterPale', 'household-goddess', [0, 2.0, 0], 14));
  altar.add(sphere(0.36, 'plasterPale', 'goddess-head', [0, 3.25, 0]));
  if (state === 'reconsecrated') {
    const halo = torus(0.68, 0.06, 'sacred', 'altar-halo', [0, 3.35, 0], [Math.PI / 2, 0, 0], { emissive: 0x9ed7ff, emissiveIntensity: 1.1 });
    halo.userData = { animation: 'sacred-pulse', phase: 0.5 };
    altar.add(halo);
  }
  root.add(altar);

  const benches = group('prayer-benches');
  for (const z of [-1.8, 0.1, 2.0]) {
    benches.add(chapelBench(-2.4, z, 0));
    benches.add(chapelBench(2.4, z, 0));
  }
  root.add(benches);

  const font = group('holy-water-font');
  font.position.set(-4.5, 0, -2.6);
  font.add(cylinder(0.65, 1.1, 'stoneLight', 'font-base', [0, 0.55, 0], 12));
  const bowl = cylinder(0.92, 0.25, state === 'defiled' ? 'profane' : 'water', 'font-bowl', [0, 1.15, 0], 14, null, {
    emissive: state === 'reconsecrated' ? 0x7fc8ff : 0,
    emissiveIntensity: state === 'reconsecrated' ? 0.7 : 0
  });
  if (state === 'reconsecrated') bowl.userData = { animation: 'water-ripple', phase: 0.9 };
  font.add(bowl);
  root.add(font);

  const icons = group('family-icon-wall');
  icons.position.set(0, 2.4, -4.55);
  for (let i = 0; i < 5; i += 1) icons.add(box(1.15, 1.5, 0.12, i === 2 ? 'copper' : 'timberDark', 'family-icon', [-3 + i * 1.5, 0, 0]));
  root.add(icons);

  // The south threshold visually warns that the next route enters the ossuary frontier.
  const threshold = group('ossuary-threshold');
  threshold.position.set(0, 0, 4.45);
  threshold.add(box(4.2, 0.18, 0.9, 'stoneDark', 'ossuary-threshold-stone', [0, 0.1, 0]));
  for (let i = -3; i <= 3; i += 1) threshold.add(box(0.08, 0.04, 0.65, 'bone', 'threshold-bone-inlay', [i * 0.45, 0.21, 0]));
  root.add(threshold);

  const scroll = group('hidden-prayer-scroll');
  scroll.position.set(4.7, 1.5, -3.9);
  scroll.add(cylinder(0.12, 1.5, 'parchment', 'prayer-scroll', [0, 0, 0], 12, [0, 0, Math.PI / 2]));
  scroll.add(box(0.9, 0.04, 0.05, 'shadow', 'forbidden-prayer-lines', [0, 0.12, 0.12]));
  root.add(scroll);

  const aisle = group('chapel-central-aisle');
  aisle.add(box(2.2, 0.035, 8.8, 'plasterPale', 'chapel-clear-lane', [0, 0.025, 0.25], { opacity: 0.08, transparent: true }));
  root.add(aisle);

  if (state === 'reconsecrated') {
    const light = group('reconsecrated');
    for (const x of [-3, -1.5, 0, 1.5, 3]) light.add(candle(x, 1.2, -2.9, true));
    root.add(light);
  }

  if (state === 'defiled') {
    const desecration = group('defiled');
    desecration.add(rubblePile('defiled-altar-rubble', 0, -3.0, 10, 'charred'));
    for (let i = 0; i < 7; i += 1) desecration.add(box(0.16, 0.04, 1.2, 'profane', 'defilement-mark', [-3 + i, 0.06, -1 + i % 3]));
    root.add(desecration);
  }
  return root;
}
