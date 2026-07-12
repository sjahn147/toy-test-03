import { group, box, cylinder, beam, industrialFloor, gear, hoistChain, traversalLane } from './IndustrialCorridorGeometry.js';

export function buildIronScrapRoom(state) {
  const root = group('iron-scrap-room');
  root.add(industrialFloor(13.8, 10.8));
  root.add(traversalLane('cargo-lane', 2.3, 10.0));

  const crane = group('scrap-crane');
  crane.position.set(-4.6, 0, -2.8);
  crane.add(beam([0, 0, 0], [0, 6.0, 0], 0.22, 'ironDark', 'crane-mast'));
  crane.add(beam([0, 5.7, 0], [5.4, 5.7, 0], 0.18, 'iron', 'crane-jib'));
  crane.add(hoistChain([3.8, 5.6, 0], [3.8, 2.2, 0]));
  crane.add(cylinder(0.65, 0.24, 'rust', 'magnet-head', [3.8, 1.95, 0], 16));
  crane.userData = { animation: 'crane-sway', phase: 0.4 };
  root.add(crane);

  const bins = group('sorting-bins');
  bins.position.set(4.8, 0, -3.7);
  for (let i = 0; i < 4; i += 1) {
    bins.add(box(2.0, 1.5, 1.7, i % 2 ? 'ironDark' : 'rust', 'sorting-bin', [-3 + i * 2.0, 0.75, 0]));
    for (let j = 0; j < 6; j += 1) {
      bins.add(box(0.2 + (j % 2) * 0.16, 0.12, 0.55, j % 3 ? 'iron' : 'brass', 'sorted-scrap', [-3.6 + i * 2.0 + (j % 3) * 0.45, 1.58 + Math.floor(j / 3) * 0.12, 0]));
    }
  }
  root.add(bins);

  const scale = group('weighbridge');
  scale.position.set(0, 0, 2.7);
  scale.add(box(5.8, 0.25, 2.2, 'iron', 'weighbridge-platform', [0, 0.18, 0]));
  scale.add(beam([-2.5, 1.0, -0.8], [2.5, 1.0, -0.8], 0.1, 'brass', 'scale-balance-beam'));
  scale.add(cylinder(0.75, 0.12, 'white', 'scale-dial', [2.8, 2.0, -0.8], 18, [Math.PI / 2, 0, 0]));
  root.add(scale);

  const nest = group('kobold-nest');
  nest.position.set(-5.3, 0, 3.8);
  for (let i = 0; i < 11; i += 1) nest.add(box(0.6, 0.16, 1.2, i % 2 ? 'canvas' : 'wood', 'nest-slat', [-1.2 + (i % 4) * 0.7, 0.18 + Math.floor(i / 4) * 0.18, -0.7 + (i % 3) * 0.6]));
  root.add(nest);

  const ledger = group('salvage-ledger');
  ledger.position.set(5.7, 1.8, 4.9);
  ledger.add(box(3.0, 2.2, 0.08, 'wood', 'ledger-board'));
  for (let i = 0; i < 12; i += 1) ledger.add(box(0.08 + (i % 4) * 0.07, 0.04, 1.6, i % 3 ? 'white' : 'brass', 'ledger-mark', [-1.2 + (i % 6) * 0.45, 0.75 - Math.floor(i / 6) * 1.2, 0.06]));
  root.add(ledger);

  const bell = group('bell-made-from-helmets');
  bell.position.set(0, 4.4, -4.6);
  for (let i = 0; i < 5; i += 1) bell.add(cylinder(0.32 + i * 0.08, 0.42, i % 2 ? 'rust' : 'iron', 'helmet-bell', [-1.4 + i * 0.7, 0, 0], 12));
  bell.userData = { animation: 'bell-tremble', phase: 1.1 };
  root.add(bell);

  if (state === 'stripped') bins.scale.set(0.3, 0.3, 0.3);
  if (state === 'weaponized') {
    for (const x of [-5.7, 5.7]) root.add(beam([x, 0.2, -4.5], [x, 3.6, -4.5], 0.08, 'iron', 'scrap-spear'));
    root.add(gear(1.2, 0.18, 'rust', 'rolling-scrap-trap', [0, 1.2, -4.2]));
  }
  return root;
}
