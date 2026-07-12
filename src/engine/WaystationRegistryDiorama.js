import {
  group, box, cylinder, cone, sphere, torus, beam, flagstoneFloor,
  brassLantern, WAYSTATION_COLORS
} from './WaystationGeometry.js';

// A02 — Expedition Registry. Document desk, wall map, contract board, roster shelf,
// baggage scale, role recruitment standards.
// Story: old rosters are interleaved with pre-laboratory mining maps.
export function buildExpeditionRegistry(state) {
  const root = group('expedition-registry');
  const lit = state !== 'memorial';
  root.add(flagstoneFloor(12.4, 9.4, 'stoneLight'));

  // back and side low walls to read as an interior office
  root.add(box(12.4, 5.4, 0.4, 'stoneDark', 'office-back-wall', [0, 2.5, -4.5]));
  root.add(box(0.4, 5.4, 9.4, 'stoneDark', 'office-side-wall', [-6.0, 2.5, 0]));

  // --- Wall campaign map (routes, pins, region tiles) ---
  const map = group('wall-campaign-map');
  map.position.set(-1.5, 3.0, -4.28);
  map.add(box(4.6, 3.0, 0.08, 'parchment', 'wall-campaign-map-sheet', [0, 0, 0]));
  map.add(box(4.8, 3.2, 0.06, 'woodDark', 'wall-campaign-map-frame', [0, 0, -0.03]));
  for (let i = 0; i < 5; i += 1) {
    const x = -1.8 + i * 0.9, y = -0.9 + (i % 3) * 0.8;
    map.add(sphere(0.08, i === 4 ? 'blood' : 'iron', 'map-route-pin', [x, y, 0.06]));
    if (i > 0) map.add(beam([-1.8 + (i - 1) * 0.9, -0.9 + ((i - 1) % 3) * 0.8, 0.05], [x, y, 0.05], 0.02, 'blood', 'map-route-thread'));
  }
  root.add(map);

  // --- Registrar desk (ledger, quill, wax stamp) ---
  const desk = group('registrar-desk');
  desk.position.set(2.2, 0, -1.6);
  desk.add(box(3.2, 0.18, 1.5, 'wood', 'registrar-desk-top', [0, 1.0, 0]));
  for (const dx of [-1.4, 1.4]) for (const dz of [-0.6, 0.6]) desk.add(box(0.16, 1.0, 0.16, 'woodDark', 'registrar-desk-leg', [dx, 0.5, dz]));
  desk.add(box(1.1, 0.09, 0.8, 'parchment', 'registrar-ledger', [-0.5, 1.1, 0]));
  desk.add(box(1.0, 0.02, 0.7, 'canvas', 'registrar-ledger-page', [0.5, 1.11, 0.05], { transparent: true, opacity: 0.95 }));
  desk.add(beam([0.9, 1.12, -0.2], [1.25, 1.7, -0.35], 0.02, 'canvasDark', 'registrar-quill'));
  desk.add(cylinder(0.1, 0.16, 'brass', 'registrar-wax-stamp', [0.9, 1.18, 0.3], 10));
  root.add(desk);

  // --- Contract board (pinned open contracts + failed gear tags) ---
  const board = group('contract-board');
  board.position.set(4.9, 2.6, -1.6);
  board.rotation.y = -Math.PI / 2;
  board.add(box(2.6, 2.4, 0.1, 'woodDark', 'contract-board-panel', [0, 0, 0]));
  for (let i = 0; i < 6; i += 1) {
    const x = -0.8 + (i % 3) * 0.8, y = -0.6 + Math.floor(i / 3) * 0.9;
    board.add(box(0.55, 0.7, 0.02, 'parchment', 'contract-slip', [x, y, 0.07], { transparent: true, opacity: 0.96 }));
    board.add(sphere(0.05, 'iron', 'contract-pin', [x, y + 0.28, 0.1]));
  }
  // failed gear tags hanging on strings
  for (const tx of [-0.6, 0.2, 0.9]) {
    board.add(beam([tx, -1.0, 0.1], [tx, -1.45, 0.15], 0.015, 'rope', 'failed-gear-string'));
    board.add(box(0.24, 0.16, 0.03, 'iron', 'failed-gear-tag', [tx, -1.55, 0.15]));
  }
  root.add(board);

  // --- Roster shelf (binders + scrolls) with the story map tucked in ---
  const shelf = group('roster-shelf');
  shelf.position.set(-5.7, 0, 1.4);
  shelf.rotation.y = Math.PI / 2;
  shelf.add(box(2.8, 3.4, 0.5, 'woodDark', 'roster-shelf-frame', [0, 1.7, 0]));
  for (let r = 0; r < 3; r += 1) {
    shelf.add(box(2.6, 0.08, 0.46, 'wood', 'roster-shelf-plank', [0, 0.7 + r * 1.0, 0]));
    for (let b = 0; b < 6; b += 1) {
      const col = b % 2 ? 'blood' : (b % 3 ? 'wood' : 'canvasDark');
      shelf.add(box(0.18, 0.7, 0.36, col, 'roster-binder', [-1.1 + b * 0.42, 1.15 + r * 1.0, 0]));
    }
  }
  // story prop: pre-laboratory mine map scroll
  shelf.add(cylinder(0.1, 0.66, 'parchment', 'old-mine-map-scroll', [0.9, 1.15, 0.12], 10, [Math.PI / 2, 0, 0]));
  shelf.add(box(0.5, 0.02, 0.5, 'gold', 'old-mine-map-seal', [0.9, 1.5, 0.12]));
  root.add(shelf);

  // --- Baggage scale (articulated balance beam with two pans) ---
  const scale = group('baggage-scale');
  scale.position.set(2.4, 0, 2.6);
  scale.add(cylinder(0.14, 1.9, 'iron', 'baggage-scale-post', [0, 0.95, 0], 10));
  const beamNode = beam([-1.1, 1.9, 0], [1.1, 1.85, 0], 0.06, 'iron', 'baggage-scale-beam');
  scale.add(beamNode);
  for (const [px, py] of [[-1.1, 1.9], [1.1, 1.85]]) {
    scale.add(beam([px, py, 0], [px, py - 0.7, 0], 0.02, 'rope', 'baggage-scale-chain'));
    scale.add(cylinder(0.4, 0.12, 'brass', 'baggage-scale-pan', [px, py - 0.78, 0], 14));
  }
  scale.add(box(0.5, 0.4, 0.5, 'canvasDark', 'weighed-baggage', [-1.1, 0.9, 0]));
  root.add(scale);

  // --- Recruitment standards (role banners) ---
  const standards = group('recruitment-standards');
  const roles = [['flag', 'warrior'], ['rune', 'mage'], ['moss', 'rogue'], ['gold', 'cleric']];
  for (let i = 0; i < roles.length; i += 1) {
    const [col] = roles[i];
    const x = -4.5 + i * 1.3;
    standards.add(cylinder(0.06, 3.0, 'woodDark', 'recruitment-standard-pole', [x, 1.5, 3.6], 8));
    const pennant = box(0.7, 1.0, 0.05, col, 'recruitment-pennant', [x, 2.5, 3.6]);
    pennant.userData = { animation: 'banner-wave', phase: i * 0.6 };
    standards.add(pennant);
    standards.add(sphere(0.12, col, 'recruitment-role-sigil', [x, 1.7, 3.6], [1, 1, 1], { emissive: WAYSTATION_COLORS[col], emissiveIntensity: lit ? 0.4 : 0.05 }));
  }
  root.add(standards);

  root.add(brassLantern(-4.0, 3.6, -3.2, 0.9, lit));
  root.add(brassLantern(4.2, 3.6, 2.8, 0.9, lit));

  // --- State overlays ---
  if (state === 'memorial') {
    const memorial = group('memorial-shrine');
    memorial.add(box(3.4, 0.1, 1.6, 'shadow', 'memorial-black-cloth', [2.2, 1.11, -1.6]));
    for (const cx of [-1.0, 0, 1.0]) {
      memorial.add(cylinder(0.07, 0.4, 'canvas', 'memorial-candle', [2.2 + cx, 1.3, -1.6], 8));
      const flame = cone(0.09, 0.24, 'fire', 'memorial-candle-flame', [2.2 + cx, 1.6, -1.6], 6, { emissive: WAYSTATION_COLORS.fire, emissiveIntensity: 1.4 });
      flame.userData = { animation: 'flame-flicker', phase: cx + 1 };
      memorial.add(flame);
    }
    // framed portraits of the lost, wilted offerings
    for (let i = 0; i < 4; i += 1) {
      memorial.add(box(0.7, 0.9, 0.06, 'shadow', 'memorial-portrait', [-1.5 + i * 0.95, 3.4, -4.24]));
      memorial.add(box(0.6, 0.78, 0.02, 'stoneDark', 'memorial-portrait-face', [-1.5 + i * 0.95, 3.4, -4.2]));
    }
    memorial.add(sphere(0.3, 'moss', 'wilted-offering', [2.2, 1.25, -0.9], [1, 0.7, 1]));
    root.add(memorial);
  }

  if (state === 'inn-recruitment-office') {
    const inn = group('inn-recruitment-fitout');
    // hanging inn sign, hearth glow, ale mug on the desk, comfortable stool
    inn.add(beam([4.7, 4.4, -1.6], [4.7, 3.9, -1.6], 0.03, 'iron', 'inn-sign-bracket'));
    inn.add(box(1.1, 0.7, 0.06, 'wood', 'inn-sign-board', [4.7, 3.5, -1.6]));
    inn.add(box(0.9, 0.5, 0.04, 'gold', 'inn-sign-lantern-mark', [4.7, 3.5, -1.55], { emissive: WAYSTATION_COLORS.gold, emissiveIntensity: 0.35 }));
    const hearth = group('inn-hearth');
    hearth.position.set(-5.5, 0, -3.6);
    hearth.add(box(2.0, 1.6, 0.6, 'stoneDark', 'inn-hearth-mantel', [0, 0.8, 0]));
    const glow = box(1.3, 0.9, 0.3, 'ember', 'inn-hearth-glow', [0, 0.7, 0.2], { emissive: WAYSTATION_COLORS.ember, emissiveIntensity: 1.1 });
    glow.userData = { animation: 'water-shimmer', phase: 2.0 };
    hearth.add(glow);
    inn.add(hearth);
    inn.add(cylinder(0.18, 0.32, 'brass', 'inn-ale-mug', [1.6, 1.25, -1.4], 10));
    inn.add(cylinder(0.3, 0.6, 'wood', 'inn-stool', [1.2, 0.3, -0.4], 12));
    root.add(inn);
  }

  if (state === 'operational') {
    // fresh recruitment notice + active applicants ledger stack
    const active = group('operational-activity');
    active.add(box(0.9, 0.4, 0.7, 'parchment', 'applicant-ledger-stack', [1.4, 1.3, -1.9]));
    active.add(box(1.2, 0.9, 0.05, 'canvas', 'open-recruitment-notice', [4.86, 1.4, -1.6]));
    root.add(active);
  }

  return root;
}
