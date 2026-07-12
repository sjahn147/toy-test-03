import {
  group, box, cylinder, cone, sphere, torus, beam, flagstoneFloor,
  brassLantern, expeditionBanner, crate, mistBank, WAYSTATION_COLORS
} from './WaystationGeometry.js';

// A01 — Lantern Plaza. Rain-wet flagstones, brass lantern ring, goddess statue,
// resurrection circle, communal fountain, queue ropes, cart baggage.
// Story: the last expedition that sealed the citadel is engraved on a floor brass plate.
export function buildLanternPlaza(state) {
  const root = group('lantern-plaza');
  const lit = state !== 'expedition-suspended';
  root.add(flagstoneFloor(19.4, 15.4, 'stone'));

  // --- Goddess statue (rear altar terrace) ---
  const goddess = group('goddess-statue');
  goddess.position.set(0, 0, -6.1);
  goddess.add(
    cylinder(2.0, 0.7, 'stoneLight', 'goddess-pedestal', [0, 0.35, 0], 24),
    cylinder(1.4, 0.45, 'marble', 'goddess-plinth', [0, 0.8, 0], 20),
    cylinder(0.55, 2.6, 'marble', 'goddess-robe', [0, 2.3, 0], 16),
    sphere(0.42, 'marble', 'goddess-head', [0, 3.9, 0]),
    beam([-0.4, 3.3, 0.1], [-1.1, 4.0, 0.2], 0.12, 'marble', 'goddess-arm'),
    beam([0.4, 3.3, 0.1], [1.05, 3.7, 0.25], 0.12, 'marble', 'goddess-arm'),
    torus(0.7, 0.06, 'gold', 'goddess-halo', [0, 4.1, 0], [Math.PI / 2, 0, 0], { emissive: WAYSTATION_COLORS.gold, emissiveIntensity: lit ? 0.5 : 0.05 })
  );
  root.add(goddess);

  // --- Resurrection circle (glowing runic rings inlaid in the floor, front-left) ---
  const circle = group('resurrection-circle');
  circle.position.set(-5.2, 0.02, 3.4);
  for (let i = 1; i <= 3; i += 1) {
    const ring = torus(0.7 * i, 0.07, 'rune', 'resurrection-ring', [0, 0.02, 0], [Math.PI / 2, 0, 0], {
      emissive: WAYSTATION_COLORS.rune, emissiveIntensity: lit ? 0.7 : 0.06
    });
    if (lit) ring.userData = { animation: 'resurrection-pulse', phase: i * 0.8 };
    circle.add(ring);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    circle.add(box(0.18, 0.04, 0.55, 'rune', 'resurrection-glyph', [Math.cos(a) * 1.5, 0.03, Math.sin(a) * 1.5], {
      emissive: WAYSTATION_COLORS.rune, emissiveIntensity: lit ? 0.6 : 0.05
    }));
  }
  root.add(circle);

  // --- Communal fountain (front-right octagon basin) ---
  const fountain = group('communal-fountain');
  fountain.position.set(5.1, 0, 3.2);
  fountain.add(cylinder(2.1, 0.7, 'stoneLight', 'fountain-basin-wall', [0, 0.35, 0], 8));
  fountain.add(cylinder(1.85, 0.3, 'water', 'fountain-water', [0, 0.55, 0], 8, null, {
    emissive: WAYSTATION_COLORS.water, emissiveIntensity: 0.18, roughness: 0.3, metalness: 0.2
  }));
  fountain.getObjectByName('fountain-water').userData = { animation: 'water-shimmer', phase: 1.1 };
  fountain.add(cylinder(0.35, 1.9, 'stoneLight', 'fountain-column', [0, 1.4, 0], 12));
  fountain.add(sphere(0.5, 'marble', 'fountain-urn', [0, 2.4, 0]));
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3;
    const jet = sphere(0.1, 'waterFoam', 'fountain-jet', [Math.cos(a) * 0.55, 2.1, Math.sin(a) * 0.55], [1, 1.6, 1], { opacity: 0.6, transparent: true });
    jet.userData = { animation: 'water-shimmer', phase: i * 0.6 };
    fountain.add(jet);
  }
  root.add(fountain);

  // --- Queue rope line (posts + slack ropes near entrance) ---
  const queue = group('queue-rope-line');
  const postXs = [-6, -3.4, -0.8, 1.8, 4.4];
  for (let i = 0; i < postXs.length; i += 1) {
    const x = postXs[i];
    queue.add(cylinder(0.11, 1.05, 'brassDark', 'queue-post', [x, 0.52, 6.2], 10));
    queue.add(sphere(0.16, 'brass', 'queue-post-cap', [x, 1.12, 6.2]));
    if (i > 0) {
      const prev = postXs[i - 1];
      queue.add(beam([prev, 0.9, 6.2], [(prev + x) / 2, 0.62, 6.2], 0.04, 'rope', 'queue-rope-swag'));
      queue.add(beam([(prev + x) / 2, 0.62, 6.2], [x, 0.9, 6.2], 0.04, 'rope', 'queue-rope-swag'));
    }
  }
  root.add(queue);

  // --- Cart baggage (unloaded wagon with strapped crates) ---
  const wagon = group('wagon-baggage');
  wagon.position.set(-6.8, 0, -1.5);
  wagon.add(box(2.6, 0.35, 1.4, 'wood', 'wagon-bed', [0, 0.85, 0]));
  wagon.add(box(2.6, 0.5, 0.1, 'woodDark', 'wagon-side', [0, 1.1, 0.65]));
  wagon.add(box(2.6, 0.5, 0.1, 'woodDark', 'wagon-side', [0, 1.1, -0.65]));
  for (const wx of [-0.9, 0.9]) for (const wz of [-0.6, 0.6]) {
    wagon.add(cylinder(0.55, 0.14, 'woodDark', 'wagon-wheel', [wx, 0.55, wz], 14, [Math.PI / 2, 0, 0]));
  }
  wagon.add(crate(-0.5, 1.35, 0, 0.9, 0.8, 0.9, 'wood', 'wagon-crate'));
  wagon.add(crate(0.7, 1.3, 0.1, 0.7, 0.7, 0.7, 'canvasDark', 'wagon-crate'));
  root.add(wagon);

  // --- Brass lantern ring around the plaza ---
  const lanternRing = group('brass-lantern-ring');
  const ringSpots = [[-8, -5], [-8, 0], [-8, 5], [8, -5], [8, 0], [8, 5], [-3, -6.5], [3, -6.5]];
  for (const [x, z] of ringSpots) lanternRing.add(brassLantern(x, 3.4, z, 1, lit));
  root.add(lanternRing);

  // --- Story prop: founders roster brass plate inlaid in floor ---
  const roster = group('founders-roster-plate');
  roster.position.set(0, 0.02, 1.4);
  roster.add(box(3.2, 0.06, 1.6, 'brass', 'founders-roster-plate-face', [0, 0.03, 0], { metalness: 0.5, roughness: 0.4 }));
  roster.add(box(3.35, 0.08, 1.75, 'brassDark', 'founders-roster-frame', [0, 0.01, 0]));
  for (let i = 0; i < 6; i += 1) {
    roster.add(box(2.6, 0.01, 0.06, 'brassDark', 'founders-engraved-name', [0, 0.07, -0.55 + i * 0.22]));
  }
  root.add(roster);

  // --- Misty stairs to the exterior (rear) ---
  const stairs = group('misty-exit-stairs');
  stairs.position.set(0, 0, -7.4);
  for (let i = 0; i < 3; i += 1) stairs.add(box(6 - i * 1.2, 0.3, 0.9, 'stoneDark', 'exit-step', [0, -0.15 - i * 0.3, -i * 0.9]));
  root.add(stairs);
  root.add(mistBank('plaza-fog', 14, 8.5, 0.5));

  // --- State overlays ---
  if (state === 'operational') {
    const banners = group('operational-banners');
    banners.add(expeditionBanner(-7.5, 4.2, -6.2, 3.4, 'flag'));
    banners.add(expeditionBanner(7.5, 4.2, -6.2, 3.4, 'flag'));
    banners.add(expeditionBanner(-2.4, 3.6, 6.6, 3.0, 'flag'));
    root.add(banners);
  }

  if (state === 'refugee-crowded') {
    const camp = group('refugee-encampment');
    // huddled crowd figures (articulated: legs, torso, head)
    const crowdSpots = [[-3.2, 4.6], [-1.8, 5.2], [2.6, 5.4], [3.9, 4.4], [-4.6, 2.0], [4.8, 1.6], [-1.0, 3.0]];
    for (let i = 0; i < crowdSpots.length; i += 1) {
      const [x, z] = crowdSpots[i];
      const figure = group('refugee-figure');
      figure.position.set(x, 0, z);
      figure.add(
        beam([-0.14, 0, 0], [-0.14, 0.62, 0], 0.09, 'canvasDark', 'refugee-leg'),
        beam([0.14, 0, 0], [0.14, 0.62, 0], 0.09, 'canvasDark', 'refugee-leg'),
        cylinder(0.24, 0.8, 'flagWorn', 'refugee-torso', [0, 1.0, 0], 8),
        sphere(0.18, 'canvas', 'refugee-head', [0, 1.5, 0])
      );
      figure.userData = { animation: 'crowd-shuffle', phase: i * 0.5 };
      camp.add(figure);
    }
    // makeshift lean-to tents and bundles
    for (const [x, z] of [[-6.5, 3.5], [6.4, 5.0]]) {
      const tent = group('refugee-tent');
      tent.position.set(x, 0, z);
      tent.add(box(2.0, 0.05, 1.6, 'canvasDark', 'tent-tarp', [0, 1.2, 0]));
      tent.add(beam([-1, 0, 0], [0, 1.25, 0], 0.05, 'wood', 'tent-pole'));
      tent.add(beam([1, 0, 0], [0, 1.25, 0], 0.05, 'wood', 'tent-pole'));
      camp.add(tent);
    }
    for (const [x, z] of [[-2.0, 2.4], [1.4, 4.0], [0.2, 5.8]]) camp.add(box(0.6, 0.35, 1.0, 'canvasDark', 'refugee-bedroll', [x, 0.18, z]));
    root.add(camp);
  }

  if (state === 'expedition-suspended') {
    const closure = group('expedition-suspended-closure');
    // boarded fountain + toppled queue posts + dust, empty plaza
    closure.add(box(4.4, 0.12, 4.4, 'woodDark', 'fountain-boards', [5.1, 0.7, 3.2]));
    const notice = group('closure-notice');
    notice.position.set(0, 0, 5.2);
    notice.add(cylinder(0.08, 2.0, 'woodDark', 'notice-post', [0, 1.0, 0], 8));
    notice.add(box(1.6, 1.0, 0.08, 'parchment', 'notice-board', [0, 1.7, 0]));
    notice.add(box(1.4, 0.04, 0.06, 'blood', 'notice-seal-mark', [0, 1.9, 0.05]));
    closure.add(notice);
    for (let i = 0; i < 10; i += 1) {
      const dust = sphere(0.06, 'sand', 'settling-dust', [-7 + i * 1.4, 1.6 + (i % 3) * 0.5, -3 + (i % 4) * 1.5], [1, 1, 1], { opacity: 0.5, transparent: true });
      dust.userData = { animation: 'dust-fall', phase: i * 0.7 };
      closure.add(dust);
    }
    closure.add(cylinder(0.11, 1.05, 'brassDark', 'toppled-queue-post', [-3.4, 0.15, 6.2], 10, [0, 0, Math.PI / 2.2]));
    root.add(closure);
  }

  return root;
}
