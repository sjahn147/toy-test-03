import {
  group, box, cylinder, cone, sphere, torus, beam, brazierFlame, mistBank, WAYSTATION_COLORS
} from './WaystationGeometry.js';

// A05 — Descent of Forty Lamps. Wide stair descending into darkness, forty wall
// lamps from different eras, railings, fall-guard chains, first warning stele.
// Story: the fortieth lamp is always dark, marked with a laboratory escape sigil.
export function buildDescentOfLamps(state) {
  const root = group('descent-of-forty-lamps');
  const dark = state === 'darkened';
  const fortified = state === 'fortified';
  const litLamps = !dark;

  // stair geometry: top (safe zone) at z=-7.5 y=0, descending toward z=+7.5 y=-6
  const STEPS = 15;
  const zTop = -7.5, zBottom = 7.5, yTop = 0, yBottom = -6.0;

  // --- Descending stairway ---
  const stairway = group('descending-stairway');
  for (let i = 0; i < STEPS; i += 1) {
    const t = i / (STEPS - 1);
    const z = zTop + (zBottom - zTop) * t;
    const y = yTop + (yBottom - yTop) * t;
    stairway.add(box(9.6, 0.32, (zBottom - zTop) / STEPS + 0.15, 'stone', 'stair-tread', [0, y, z]));
    stairway.add(box(9.6, 0.5, 0.14, 'stoneDark', 'stair-riser', [0, y - 0.3, z - 0.28]));
  }
  // flanking stair walls
  for (const s of [-1, 1]) stairway.add(box(0.5, 6.5, 16.0, 'stoneDark', 'stair-flank-wall', [s * 5.1, -1.2, 0]));
  root.add(stairway);

  // --- Landing platform (mid-descent rally point) ---
  const landing = group('landing-platform');
  const landZ = 0.5, landY = -2.6;
  landing.add(box(9.4, 0.4, 2.6, 'stoneLight', 'landing-deck', [0, landY, landZ]));
  landing.add(box(9.4, 0.2, 0.2, 'stoneDark', 'landing-edge', [0, landY + 0.25, landZ + 1.3]));
  root.add(landing);

  // --- Forty lamp array (20 per wall, differing eras) + the dark fortieth ---
  const lamps = group('forty-lamp-array');
  const eras = ['brass', 'iron', 'gold', 'rune']; // four eras of make
  let lampIndex = 0;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 20; i += 1) {
      lampIndex += 1;
      const t = i / 19;
      const z = zTop + (zBottom - zTop) * t;
      const y = (yTop + (yBottom - yTop) * t) + 2.3 + (i % 2) * 0.25;
      const era = eras[(i + (s > 0 ? 2 : 0)) % 4];
      const isFortieth = lampIndex === 40;
      const bracket = group(isFortieth ? 'fortieth-dark-lamp' : 'era-wall-lamp');
      bracket.position.set(s * 4.7, y, z);
      bracket.add(beam([0, 0, 0], [s * -0.6, 0.15, 0], 0.04, era, 'lamp-bracket-arm'));
      const on = litLamps && !isFortieth;
      const glass = isFortieth ? 'lampDead' : (on ? 'lamp' : 'lampDead');
      const orb = sphere(0.2, glass, isFortieth ? 'fortieth-lamp-glass' : 'era-lamp-glass', [s * -0.6, 0.15, 0], [1, 1.25, 1], {
        emissive: on ? WAYSTATION_COLORS.lamp : (isFortieth ? WAYSTATION_COLORS.rune : 0),
        emissiveIntensity: on ? 1.0 : (isFortieth ? 0.12 : 0)
      });
      if (on) orb.userData = { animation: 'lantern-flicker', phase: lampIndex * 0.31 };
      bracket.add(orb);
      bracket.add(cone(0.28, 0.24, era, 'era-lamp-hood', [s * -0.6, 0.4, 0], 8));
      if (isFortieth) {
        // laboratory emergency-route sigil beneath the perpetually dark lamp
        bracket.add(box(0.5, 0.5, 0.04, 'rune', 'lab-escape-sigil', [s * -0.6, -0.55, 0.02], { emissive: WAYSTATION_COLORS.rune, emissiveIntensity: 0.35 }));
        const sig = bracket.getObjectByName('lab-escape-sigil');
        sig.userData = { animation: 'rune-pulse', phase: 3.0 };
      }
      lamps.add(bracket);
    }
  }
  root.add(lamps);

  // --- Safety railing (posts + top rail down both sides of the stair) ---
  const railing = group('safety-railing');
  for (const s of [-1, 1]) {
    for (let i = 0; i < STEPS; i += 2) {
      const t = i / (STEPS - 1);
      const z = zTop + (zBottom - zTop) * t;
      const y = yTop + (yBottom - yTop) * t;
      railing.add(cylinder(0.07, 1.0, 'iron', 'railing-post', [s * 4.4, y + 0.5, z], 8));
    }
    railing.add(beam([s * 4.4, yTop + 1.0, zTop], [s * 4.4, yBottom + 1.0, zBottom], 0.06, 'iron', 'railing-top-rail'));
  }
  root.add(railing);

  // --- Fall-guard chains (draped between posts across the drop) ---
  const chains = group('fall-guard-chain');
  for (let i = 0; i < 4; i += 1) {
    const t = (i + 0.5) / 4;
    const z = zTop + (zBottom - zTop) * t;
    const y = (yTop + (yBottom - yTop) * t) + 0.7;
    const chain = beam([-4.4, y, z], [4.4, y - 0.2, z], 0.04, 'iron', 'fall-guard-chain-span');
    chain.userData = { animation: 'chain-sway', phase: i * 0.8 };
    chains.add(chain);
  }
  root.add(chains);

  // --- Warning stele (first stone marker at the top of the descent) ---
  const stele = group('warning-stele');
  stele.position.set(-3.6, 0, -6.6);
  stele.add(box(1.2, 2.6, 0.5, 'stoneLight', 'warning-stele-slab', [0, 1.3, 0]));
  stele.add(cone(0.85, 0.7, 'stoneDark', 'warning-stele-cap', [0, 2.9, 0], 4));
  stele.add(box(0.9, 1.8, 0.06, 'shadow', 'warning-stele-face', [0, 1.4, 0.28]));
  for (let i = 0; i < 5; i += 1) stele.add(box(0.55, 0.06, 0.04, 'rune', 'warning-glyph-line', [0, 0.8 + i * 0.32, 0.31], { emissive: WAYSTATION_COLORS.rune, emissiveIntensity: dark ? 0.5 : 0.25 }));
  root.add(stele);

  // darkness + mist welling up from the bottom
  root.add(mistBank('descent-abyss-mist', 12, 4.5, -5.2));
  root.add(box(9.0, 3.0, 2.0, 'shadow', 'abyss-shadow', [0, yBottom - 1.0, zBottom + 0.5], { opacity: 0.9, transparent: true }));

  // --- State overlays ---
  if (state === 'lit') {
    // wardens' lit brazier pair flanking the top landing
    const wardens = group('descent-wardens-lit');
    for (const s of [-1, 1]) {
      const b = group('warden-brazier');
      b.position.set(s * 3.4, 0, -7.0);
      b.add(cylinder(0.4, 1.0, 'ironDark', 'warden-brazier-bowl', [0, 0.9, 0], 10));
      b.add(brazierFlame(0, 1.35, 0, 0.95));
      wardens.add(b);
    }
    root.add(wardens);
  }

  if (state === 'darkened') {
    const occupation = group('descent-monster-occupation');
    // cobweb sheets, claw marks, and glowing predator eyes rising from the dark
    for (const [x, z, y] of [[-3.5, 2.5, -1.6], [3.2, 4.0, -3.0], [0.0, 5.5, -4.2]]) {
      occupation.add(box(2.2, 2.2, 0.03, 'mist', 'descent-cobweb', [x, y, z], { opacity: 0.22, transparent: true }));
    }
    for (let i = 0; i < 6; i += 1) occupation.add(box(0.04, 0.7, 0.03, 'shadow', 'descent-claw-mark', [-3 + i, -1.5, 2.0]));
    for (let i = 0; i < 5; i += 1) {
      const eye = sphere(0.09, 'moss', 'predator-eye-glow', [-3 + i * 1.5, yBottom + 0.6, zBottom - 0.5], [1, 1, 1], { emissive: 0x77dca2, emissiveIntensity: 1.2 });
      eye.userData = { animation: 'water-shimmer', phase: i * 0.9 };
      occupation.add(eye);
    }
    root.add(occupation);
  }

  if (state === 'fortified') {
    const defense = group('descent-defense-line');
    // barricade of sandbags + crates across the landing, guard braziers, shield wall
    for (let i = 0; i < 7; i += 1) {
      const sy = i < 4 ? 0.4 : 1.0;
      defense.add(sphere(0.42, 'canvasDark', 'defense-sandbag', [-3.0 + (i % 4) * 2.0, landY + 0.4 + sy, landZ - 0.9], [1.3, 0.7, 1]));
    }
    for (const x of [-2.5, 2.5]) {
      defense.add(box(1.0, 1.0, 1.0, 'wood', 'defense-crate-barricade', [x, landY + 0.9, landZ - 0.9]));
      defense.add(cylinder(0.45, 0.14, 'iron', 'defense-shield', [x, landY + 1.5, landZ - 0.5], 8, [Math.PI / 2.4, 0, 0]));
    }
    const b = group('defense-brazier');
    b.position.set(0, landY, landZ - 0.6);
    b.add(cylinder(0.4, 1.0, 'ironDark', 'defense-brazier-bowl', [0, 0.7, 0], 10));
    b.add(brazierFlame(0, 1.1, 0, 0.9));
    defense.add(b);
    // planted picket standard
    defense.add(cylinder(0.05, 2.4, 'woodDark', 'defense-picket-pole', [-3.8, landY + 1.2, landZ], 8));
    const flag = box(0.7, 1.0, 0.05, 'flag', 'defense-picket-flag', [-3.45, landY + 2.0, landZ]);
    flag.userData = { animation: 'banner-wave', phase: 1.5 };
    defense.add(flag);
    root.add(defense);
  }

  return root;
}
