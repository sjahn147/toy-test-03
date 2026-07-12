import { group, box, cylinder, sphere, beam, industrialFloor, industrialFlame, gear, hoistChain, traversalLane } from './IndustrialCorridorGeometry.js';

export function buildAbandonedWorkshop(state) {
  const root = group('abandoned-workshop');
  root.add(industrialFloor(15.8, 11.8));
  root.add(traversalLane('cart-lane', 14.8, 2.4));

  const lathe = group('master-lathe');
  lathe.position.set(-3.8, 0, -3.4);
  lathe.add(box(6.4, 1.0, 1.8, 'ironDark', 'lathe-bed', [0, 0.5, 0]));
  lathe.add(cylinder(0.62, 1.2, 'iron', 'lathe-headstock', [-2.2, 1.55, 0], 16, [0, 0, Math.PI / 2]));
  lathe.add(cylinder(0.18, 4.2, 'brass', 'lathe-spindle', [0, 1.55, 0], 12, [0, 0, Math.PI / 2]));
  lathe.add(gear(0.8, 0.18, 'brass', 'lathe-drive-gear', [-2.8, 2.2, 0]));
  root.add(lathe);

  const bench = group('repair-bench');
  bench.position.set(4.8, 0, 3.8);
  bench.add(box(5.0, 0.28, 1.6, 'wood', 'repair-bench-top', [0, 1.05, 0]));
  for (const x of [-2.1, 2.1]) bench.add(box(0.24, 1.0, 1.2, 'ironDark', 'repair-bench-leg', [x, 0.5, 0]));
  for (let i = 0; i < 8; i += 1) bench.add(box(0.18 + (i % 3) * 0.1, 0.08, 0.7, i % 2 ? 'brass' : 'iron', 'precision-tool', [-2.0 + i * 0.55, 1.24, 0]));
  root.add(bench);

  const hoist = group('overhead-hoist');
  hoist.add(beam([-6.8, 5.8, -2.2], [6.8, 5.8, -2.2], 0.18, 'iron', 'hoist-rail'));
  hoist.add(hoistChain([1.8, 5.7, -2.2], [1.8, 2.0, -2.2]));
  hoist.add(cylinder(0.34, 0.18, 'brass', 'hoist-hook', [1.8, 1.75, -2.2], 12, [Math.PI / 2, 0, 0]));
  root.add(hoist);

  const cage = group('tool-cage');
  cage.position.set(6.7, 0, -3.4);
  for (const x of [-1.1, 1.1]) for (const z of [-0.7, 0.7]) cage.add(box(0.1, 3.1, 0.1, 'iron', 'tool-cage-post', [x, 1.55, z]));
  for (let y = 0.4; y < 3.0; y += 0.55) cage.add(box(2.4, 0.06, 1.5, 'iron', 'tool-cage-grid', [0, y, 0]));
  root.add(cage);

  const orders = group('work-order-wall');
  orders.position.set(-5.2, 2.2, 5.72);
  for (let i = 0; i < 7; i += 1) orders.add(box(0.9, 1.15, 0.04, i === 6 ? 'warning' : 'canvas', 'work-order-sheet', [-2.8 + i * 0.9, (i % 2) * 0.18, 0]));
  root.add(orders);

  const bird = group('unfinished-clockwork-bird');
  bird.position.set(4.8, 1.55, 3.8);
  bird.add(sphere(0.35, 'brass', 'clockwork-bird-body'));
  bird.add(sphere(0.2, 'copper', 'clockwork-bird-head', [0.35, 0.18, 0]));
  bird.add(beam([-0.15, 0, 0], [-0.8, 0.2, 0.45], 0.06, 'brass', 'clockwork-wing'));
  bird.add(beam([-0.15, 0, 0], [-0.8, 0.2, -0.45], 0.06, 'brass', 'clockwork-wing'));
  root.add(bird);

  if (state === 'reactivated') {
    root.add(industrialFlame(-6.2, 0.1, 3.8, 0.75));
    lathe.userData = { animation: 'machine-thrum', phase: 0.2 };
    hoist.userData = { animation: 'machine-thrum', phase: 0.6 };
  }
  if (state === 'ruined') root.add(box(5.5, 0.35, 1.1, 'rust', 'fallen-drive-shaft', [1.2, 0.3, -4.5]));
  if (state === 'exploded') for (let i = 0; i < 22; i += 1) root.add(box(0.25 + (i % 4) * 0.14, 0.18, 0.32, i % 2 ? 'ironDark' : 'rust', 'blast-fragment', [-5 + (i % 8) * 1.4, 0.18 + (i % 3) * 0.12, -4 + Math.floor(i / 8) * 3.4]));
  return root;
}
