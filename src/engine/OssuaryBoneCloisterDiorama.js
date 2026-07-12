import {
  group, box, cylinder, sphere, cone, beam, torus, ossuaryFloor, candle,
  boneColumn, skullNiche, bonePile, soulMist, traversalLane, OSSUARY_COLORS
} from './OssuaryCathedralGeometry.js';

export function buildBoneCloister(state) {
  const root = group('bone-cloister');
  root.add(ossuaryFloor(16.8, 12.8));
  root.add(traversalLane('processional-lane', 15.8, 2.5));

  for (const x of [-7.1, -4.7, 4.7, 7.1]) for (const z of [-4.9, 4.9]) root.add(boneColumn(x, z, 5.8));
  for (let i = 0; i < 7; i += 1) {
    root.add(skullNiche(-7.9 + i * 2.6, 2.4, -6.1, 0));
    root.add(skullNiche(-7.9 + i * 2.6, 2.4, 6.1, Math.PI));
  }

  const gate = group('bone-gate');
  gate.position.set(-7.6, 0, 0);
  gate.add(beam([0, 0, -2.4], [0, 6.3, -2.4], 0.22, 'oldBone', 'gate-spine'));
  gate.add(beam([0, 0, 2.4], [0, 6.3, 2.4], 0.22, 'oldBone', 'gate-spine'));
  for (let i = 0; i < 7; i += 1) gate.add(beam([0, 5.9 - i * 0.35, -2.4], [0, 5.9 - i * 0.35, 2.4], 0.1, i % 2 ? 'bone' : 'marrow', 'rib-gate-bar'));
  root.add(gate);

  const bell = group('rib-bell');
  bell.position.set(0, 5.9, -4.7);
  bell.add(torus(1.25, 0.18, 'oldBone', 'rib-bell-cage', [0, 0, 0], [Math.PI / 2, 0, 0]));
  bell.add(cone(0.78, 1.55, 'brass', 'funeral-bell', [0, -0.8, 0], 14));
  bell.add(cylinder(0.08, 2.2, 'blood', 'bell-rope', [0, -2.25, 0], 8));
  bell.userData = { animation: 'bell-sway', phase: 0.4 };
  root.add(bell);

  const posts = group('grave-guard-post');
  for (const z of [-4.2, 4.2]) {
    const post = group('skeletal-guard-post');
    post.position.set(6.4, 0, z);
    post.add(box(1.8, 1.1, 1.4, 'stoneDark', 'guard-plinth', [0, 0.55, 0]));
    post.add(sphere(0.34, 'bone', 'guard-skull', [0, 2.7, 0]));
    post.add(cylinder(0.18, 2.5, 'oldBone', 'guard-spine', [0, 1.6, 0], 10));
    post.add(beam([0, 2.2, 0], [-0.9, 1.2, 0], 0.09, 'bone', 'guard-arm'));
    post.add(beam([0, 2.2, 0], [0.9, 1.2, 0], 0.09, 'bone', 'guard-arm'));
    post.add(beam([0.9, 1.2, 0], [0.9, 4.2, 0], 0.08, 'iron', 'grave-halberd'));
    posts.add(post);
  }
  root.add(posts);

  const cart = group('corpse-cart');
  cart.position.set(-2.8, 0, 4.2);
  cart.add(box(3.5, 0.75, 1.8, 'iron', 'corpse-cart-bed', [0, 0.85, 0]));
  for (const x of [-1.25, 1.25]) for (const z of [-0.85, 0.85]) cart.add(torus(0.48, 0.11, 'oldBone', 'bone-wheel', [x, 0.45, z], [Math.PI / 2, 0, 0]));
  cart.add(sphere(0.45, 'oldBone', 'shrouded-corpse-head', [-0.9, 1.45, 0], [1, 0.8, 0.9]));
  cart.add(box(2.3, 0.35, 1.25, 'choirRed', 'corpse-shroud', [0.25, 1.35, 0], { transparent: true, opacity: 0.85 }));
  root.add(cart);

  const arch = group('skull-arch');
  arch.position.set(7.6, 0, 0);
  for (let i = 0; i < 11; i += 1) {
    const angle = Math.PI * i / 10;
    arch.add(sphere(0.31, 'bone', 'arch-skull', [0, 3.8 + Math.sin(angle) * 2.2, -2.7 + i * 0.54]));
  }
  root.add(arch);

  const sentinel = group('laughing-skull-sentinel');
  sentinel.position.set(2.8, 0, -4.4);
  sentinel.add(box(1.5, 0.7, 1.3, 'stoneDark', 'sentinel-plinth', [0, 0.35, 0]));
  sentinel.add(sphere(0.48, 'bone', 'laughing-skull', [0, 1.55, 0], [1, 0.9, 0.95]));
  sentinel.add(cone(0.72, 0.75, 'iron', 'oversized-guard-helm', [0, 2.15, 0], 8));
  sentinel.add(box(0.52, 0.14, 0.08, 'void', 'grinning-mouth', [0, 1.4, 0.44]));
  root.add(sentinel);

  if (state === 'silent') {
    root.add(bonePile('old-battle-remains', -5.1, -3.9, 16));
  } else if (state === 'undead-held') {
    for (const x of [-5.5, 0, 5.5]) root.add(candle(x, 0.35, -5.5, true, 1.4));
    root.add(soulMist('patrol-soul-mist', 0, 0.5, 0, 12, 1.1));
    for (const x of [-3.5, 3.5]) root.add(beam([x, 0.2, -5.4], [x, 3.8, -5.4], 0.09, 'bone', 'bone-spear-rack'));
  } else if (state === 'reconsecrated') {
    const seal = torus(2.4, 0.13, 'holy', 'reconsecration-ring', [0, 0.12, 0], [Math.PI / 2, 0, 0], {
      emissive: OSSUARY_COLORS.holy, emissiveIntensity: 1.2
    });
    seal.userData = { animation: 'holy-pulse', phase: 0.3 };
    root.add(seal);
    bell.rotation.z = 0.28;
  }
  return root;
}
