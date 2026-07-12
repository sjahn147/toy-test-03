import { group, box, cylinder, sphere, cone, beam, ossuaryFloor, candle, boneColumn, skullNiche, bonePile, soulMist, traversalLane } from './OssuaryCathedralGeometry.js';

export function buildBoneCloister(state) {
  const root = group('bone-cloister');
  root.add(ossuaryFloor(16.8, 12.8));
  root.add(traversalLane('processional-lane', 15.6, 2.6));

  const gate = group('bone-gate');
  gate.position.set(0, 0, -5.6);
  gate.add(boneColumn(-2.2, 0, 6.6));
  gate.add(boneColumn(2.2, 0, 6.6));
  for (let i = 0; i < 9; i += 1) gate.add(cylinder(0.09, 0.6, i % 2 ? 'oldBone' : 'bone', 'gate-arch-rib', [Math.sin(i * 0.35 - 1.4) * 2.35, 6.3 + Math.cos(i * 0.35 - 1.4) * 2.35, 0], 6, [0, 0, i * 0.35 - 1.4]));
  gate.userData = { animation: 'gate-creak', phase: 0.2 };
  root.add(gate);

  const arch = group('skull-arch');
  arch.position.set(0, 0, 4.9);
  for (let i = 0; i < 7; i += 1) arch.add(skullNiche(-3.0 + i * 1.0, 1.6, 0, 0));
  root.add(arch);

  const bell = group('rib-bell');
  bell.position.set(-6.2, 0, -3.6);
  bell.add(cylinder(0.09, 4.6, 'iron', 'bell-post', [0, 2.3, 0], 8));
  bell.add(beam([-0.5, 4.4, 0], [0.5, 4.4, 0], 0.08, 'iron', 'bell-crossbeam'));
  const bellBody = cone(0.55, 0.85, 'brass', 'funeral-bell', [0, 3.5, 0]);
  bellBody.userData = { animation: 'bell-tremble', phase: 0.6 };
  bell.add(bellBody);
  bell.add(cylinder(0.05, 0.35, 'iron', 'bell-clapper', [0, 3.05, 0], 6));
  root.add(bell);

  const cart = group('corpse-cart');
  cart.position.set(5.6, 0, 3.8);
  cart.add(box(2.6, 0.5, 1.3, 'oldBone', 'cart-bed', [0, 0.55, 0]));
  for (const dx of [-1.0, 1.0]) for (const dz of [-0.55, 0.55]) cart.add(cylinder(0.22, 0.5, 'iron', 'cart-wheel', [dx, 0.25, dz], 12, [Math.PI / 2, 0, 0]));
  cart.add(bonePile('cart-bone-load', 0, 0.85, 14));
  root.add(cart);

  const guard = group('grave-guard-post');
  guard.position.set(6.4, 0, -3.9);
  const torso = beam([0, 1.1, 0], [0, 1.9, 0], 0.16, 'oldBone', 'guard-spine');
  guard.add(torso);
  guard.add(sphere(0.24, 'bone', 'guard-skull', [0, 2.15, 0], [1, 1.05, 1]));
  guard.add(beam([0, 1.85, 0], [-0.55, 1.55, 0.2], 0.07, 'bone', 'guard-arm-upper'));
  guard.add(beam([-0.55, 1.55, 0.2], [-0.7, 1.05, 0.55], 0.06, 'bone', 'guard-arm-lower'));
  guard.add(beam([0, 1.85, 0], [0.55, 1.55, -0.15], 0.07, 'bone', 'guard-spear-arm'));
  guard.add(cylinder(0.03, 2.2, 'iron', 'guard-spear-haft', [0.9, 1.8, -0.4], 6, [0, 0, 0.18]));
  guard.add(beam([0, 1.1, 0], [-0.28, 0.1, 0.1], 0.09, 'bone', 'guard-leg-upper'));
  guard.add(beam([-0.28, 0.1, 0.1], [-0.3, 0, 0.35], 0.07, 'bone', 'guard-leg-lower'));
  guard.add(beam([0, 1.1, 0], [0.28, 0.1, -0.1], 0.09, 'bone', 'guard-leg-upper'));
  guard.add(beam([0.28, 0.1, -0.1], [0.3, 0, -0.35], 0.07, 'bone', 'guard-leg-lower'));
  guard.userData = { animation: 'skeleton-twitch', phase: 1.1 };
  root.add(guard);

  const sentinel = sphere(0.3, 'bone', 'laughing-skull-sentinel', [-6.4, 3.9, -3.6], [1, 0.9, 1]);
  root.add(sentinel);
  root.add(box(0.13, 0.1, 0.04, 'void', 'sentinel-grin-notch', [-6.4, 3.75, -3.42]));

  for (const [x, z] of [[-3.4, -4.4], [3.4, -4.4], [-3.4, 4.4]]) root.add(candle(x, 0, z, state !== 'silent'));

  if (state === 'silent') {
    root.add(bonePile('cloister-silt', -1.5, -1.0, 10));
  }
  if (state === 'undead-held') {
    root.add(soulMist('cloister-undead-mist', 0, 0.4, -1.0, 9, 0.9));
    guard.rotation.y = 0.3;
    for (const [x, z] of [[-1.5, 0.4], [1.9, -0.6], [-2.4, 2.0]]) root.add(bonePile('freshly-risen-bones', x, z, 8));
  }
  if (state === 'reconsecrated') {
    root.add(box(16.2, 0.05, 0.5, 'holy', 'reconsecration-ward-line', [0, 0.033, 0]));
    for (const [x, z] of [[-4.0, 0], [4.0, 0]]) root.add(candle(x, 0, z, true, 1.3));
  }

  return root;
}
