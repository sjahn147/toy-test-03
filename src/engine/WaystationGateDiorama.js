import {
  group, box, cylinder, cone, sphere, torus, beam, flagstoneFloor,
  voussoirArch, brazierFlame, brassLantern, WAYSTATION_COLORS
} from './WaystationGeometry.js';

// A03 — The Sealed Gate. Three nested stone arches, iron crossbar, rune seal,
// guard post, repair winch, customs ramp. Story: escape claw-marks on the inner face.
export function buildSealedGate(state) {
  const root = group('sealed-gate');
  const open = state === 'supply-gateway';
  const strained = state === 'pressured';
  root.add(flagstoneFloor(17.2, 10.4, 'stone'));

  // wheel ruts worn into the flagstones showing centuries of traffic
  const ruts = group('gate-wheel-ruts');
  for (const rx of [-1.3, 1.3]) ruts.add(box(0.5, 0.04, 9.5, 'stoneDark', 'wheel-rut', [rx, 0.02, 0]));
  root.add(ruts);

  // --- Triple stone arch (three receding voussoir rings) ---
  const arches = group('triple-stone-arch');
  const depths = [-0.4, -2.3, -4.2];
  const spans = [9.6, 8.8, 8.0];
  for (let i = 0; i < 3; i += 1) {
    const arch = voussoirArch(spans[i], 5.6 - i * 0.3, 'stone', 'arch-ring', 1.3);
    arch.position.set(0, 0, depths[i]);
    arches.add(arch);
    // jambs (piers) either side
    for (const s of [-1, 1]) arches.add(box(1.5, 5.4, 1.3, i % 2 ? 'stoneLight' : 'stone', 'arch-pier', [s * (spans[i] / 2), 2.7, depths[i]]));
  }
  root.add(arches);

  // --- Great door leaves (inside the front arch) ---
  const doors = group('great-door-leaves');
  const doorZ = -0.4;
  for (const s of [-1, 1]) {
    const leaf = group('door-leaf');
    // hinge pivot at the jamb; door swings open toward -z when supply-gateway
    leaf.position.set(s * 3.9, 0, doorZ);
    const panel = box(3.7, 5.0, 0.5, 'woodDark', 'door-leaf-panel', [s * -1.85, 2.6, 0]);
    leaf.add(panel);
    // iron banding + boss studs
    for (let b = 0; b < 3; b += 1) leaf.add(box(3.7, 0.2, 0.55, 'iron', 'door-iron-band', [s * -1.85, 1.2 + b * 1.6, 0]));
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) leaf.add(sphere(0.11, 'ironDark', 'door-boss-stud', [s * -1.85 - 1.2 + c * 1.2, 1.2 + r * 1.6, 0.28]));
    if (open) leaf.rotation.y = s * -1.05;
    if (strained) leaf.rotation.y = s * 0.05; // bulging inward
    doors.add(leaf);
  }
  root.add(doors);

  // --- Iron crossbar (drops across both leaves) ---
  const crossbar = group('iron-crossbar');
  if (open) {
    // lifted and stowed vertically against the pier
    crossbar.add(cylinder(0.28, 5.0, 'iron', 'iron-crossbar-beam', [-4.6, 2.8, doorZ + 0.5], 12));
  } else {
    const bar = cylinder(0.28, 7.4, strained ? 'rust' : 'iron', 'iron-crossbar-beam', [0, 2.7, doorZ + 0.4], 12, [0, 0, Math.PI / 2]);
    if (strained) bar.rotation.z = Math.PI / 2 + 0.04; // bowed under pressure
    crossbar.add(bar);
    for (const s of [-1, 1]) crossbar.add(box(0.6, 0.7, 0.7, 'ironDark', 'crossbar-bracket', [s * 3.4, 2.7, doorZ + 0.4]));
  }
  root.add(crossbar);

  // --- Rune seal ring (glyph circle on the doors) ---
  const seal = group('rune-seal-ring');
  seal.position.set(0, 2.7, doorZ + 0.32);
  const sealCol = strained ? 'blood' : 'rune';
  const sealEmit = strained ? WAYSTATION_COLORS.blood : WAYSTATION_COLORS.rune;
  for (let i = 1; i <= 2; i += 1) {
    const ring = torus(0.7 * i, 0.09, sealCol, 'rune-seal-band', [0, 0, 0], [0, 0, 0], { emissive: sealEmit, emissiveIntensity: open ? 0.1 : (strained ? 1.0 : 0.6) });
    if (!open) ring.userData = { animation: 'rune-pulse', phase: i * 0.9 };
    seal.add(ring);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    seal.add(box(0.16, 0.5, 0.05, sealCol, 'rune-seal-glyph', [Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0], { emissive: sealEmit, emissiveIntensity: open ? 0.08 : 0.5 }));
  }
  root.add(seal);

  // --- Story prop: escape claw-marks gouged on the inner door face ---
  const claw = group('escape-claw-marks');
  claw.position.set(2.0, 1.8, doorZ - 0.28);
  for (let i = 0; i < 4; i += 1) claw.add(box(0.04, 1.4, 0.03, 'shadow', 'escape-claw-gouge', [i * 0.14, 0, 0], { }));
  root.add(claw);

  // --- Guard post (booth + brazier) ---
  const guard = group('guard-post');
  guard.position.set(-6.6, 0, 3.4);
  guard.add(box(1.8, 2.6, 1.8, 'stoneLight', 'guard-post-booth', [0, 1.3, 0]));
  guard.add(box(1.4, 0.9, 0.15, 'shadow', 'guard-post-window', [0, 1.7, 0.9]));
  guard.add(cone(1.3, 0.8, 'stoneDark', 'guard-post-roof', [0, 3.0, 0], 4));
  const brazier = group('guard-brazier');
  brazier.position.set(1.6, 0, -0.6);
  brazier.add(cylinder(0.4, 0.9, 'ironDark', 'guard-brazier-bowl', [0, 0.8, 0], 10));
  if (state !== 'pressured') brazier.add(brazierFlame(0, 1.2, 0, 0.9));
  guard.add(brazier);
  root.add(guard);

  // --- Repair winch (drum + ratchet + hauling chain) ---
  const winch = group('repair-winch');
  winch.position.set(6.6, 0, 3.2);
  winch.add(box(0.4, 1.6, 0.4, 'woodDark', 'winch-frame-post', [-0.9, 0.8, 0]));
  winch.add(box(0.4, 1.6, 0.4, 'woodDark', 'winch-frame-post', [0.9, 0.8, 0]));
  winch.add(cylinder(0.45, 1.9, 'wood', 'winch-drum', [0, 1.3, 0], 14, [0, 0, Math.PI / 2]));
  winch.add(torus(0.55, 0.06, 'iron', 'winch-ratchet', [0.95, 1.3, 0], [0, Math.PI / 2, 0]));
  winch.add(beam([1.15, 1.3, 0], [1.6, 0.8, 0], 0.05, 'iron', 'winch-handle'));
  // chain running toward the crossbar bracket (taut when open)
  winch.add(beam([0, 1.3, 0], open ? [-4.6, 5.2, -3.4] : [-2.0, 1.5, -1.5], 0.04, 'iron', 'winch-haul-chain'));
  root.add(winch);

  // --- Customs ramp (inspection ramp + lamp) ---
  const ramp = group('customs-ramp');
  ramp.position.set(0, 0, 4.0);
  ramp.add(box(4.0, 0.2, 2.4, 'wood', 'customs-ramp-deck', [0, 0.35, 0]));
  ramp.getObjectByName('customs-ramp-deck').rotation.x = 0.12;
  ramp.add(box(4.2, 0.3, 0.15, 'woodDark', 'customs-ramp-curb', [0, 0.3, 1.2]));
  ramp.add(brassLantern(-2.4, 2.6, 0, 0.8, state !== 'pressured'));
  ramp.add(brassLantern(2.4, 2.6, 0, 0.8, state !== 'pressured'));
  root.add(ramp);

  // --- State overlays ---
  if (state === 'managed') {
    // a single sentry standing guard, tidy toll ledger
    const sentry = group('gate-sentry');
    sentry.position.set(-5.4, 0, 2.0);
    sentry.add(
      beam([-0.14, 0, 0], [-0.14, 0.7, 0], 0.1, 'ironDark', 'sentry-leg'),
      beam([0.14, 0, 0], [0.14, 0.7, 0], 0.1, 'ironDark', 'sentry-leg'),
      cylinder(0.26, 0.9, 'iron', 'sentry-torso', [0, 1.15, 0], 8),
      sphere(0.2, 'stoneLight', 'sentry-head', [0, 1.7, 0]),
      cone(0.24, 0.35, 'iron', 'sentry-helm', [0, 1.85, 0], 8),
      beam([0.2, 1.4, 0], [0.4, 0.1, 0], 0.05, 'woodDark', 'sentry-spear')
    );
    root.add(sentry);
  }

  if (state === 'pressured') {
    const siege = group('gate-under-pressure');
    // interior bracing timbers shoring the doors
    for (const s of [-1, 1]) siege.add(beam([s * 1.6, 4.6, -1.0], [s * 3.4, 0.2, 3.2], 0.28, 'wood', 'shoring-timber'));
    siege.add(beam([0, 4.6, -1.0], [0, 0.4, 3.0], 0.3, 'wood', 'shoring-timber'));
    // impact cracks + falling dust from the strained lintel
    for (let i = 0; i < 12; i += 1) {
      const dust = sphere(0.06, 'sand', 'lintel-dust', [-3 + i * 0.55, 5.0 - (i % 3) * 0.4, -0.4], [1, 1, 1], { opacity: 0.55, transparent: true });
      dust.userData = { animation: 'dust-fall', phase: i * 0.6 };
      siege.add(dust);
    }
    for (let i = 0; i < 5; i += 1) siege.add(box(0.05, 0.9 + (i % 3) * 0.3, 0.05, 'stoneDark', 'gate-stress-crack', [-2.5 + i * 1.2, 3.8, doorZ + 0.5], { }));
    root.add(siege);
  }

  if (state === 'supply-gateway') {
    const convoy = group('supply-convoy');
    // a laden supply cart rolling through the opened gate
    const cart = group('supply-cart');
    cart.position.set(0, 0, 1.6);
    cart.add(box(2.4, 0.3, 1.3, 'wood', 'supply-cart-bed', [0, 0.8, 0]));
    for (const wx of [-0.8, 0.8]) for (const wz of [-0.55, 0.55]) cart.add(cylinder(0.5, 0.13, 'woodDark', 'supply-cart-wheel', [wx, 0.5, wz], 12, [Math.PI / 2, 0, 0]));
    cart.add(box(0.8, 0.7, 0.8, 'canvasDark', 'supply-cart-crate', [-0.5, 1.25, 0]));
    cart.add(cylinder(0.35, 0.8, 'wood', 'supply-cart-barrel', [0.6, 1.2, 0], 12));
    convoy.add(cart);
    // festive gateway banners marking the open supply route
    for (const s of [-1, 1]) {
      const banner = box(0.8, 1.6, 0.05, 'flag', 'gateway-banner', [s * 4.5, 4.0, doorZ]);
      banner.userData = { animation: 'banner-wave', phase: s };
      convoy.add(banner);
    }
    root.add(convoy);
  }

  return root;
}
