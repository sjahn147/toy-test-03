import { group, box, cylinder, sphere, cone, torus, beam, frustum, ossuaryFloor, boneColumn, soulMist, candle } from './OssuaryCathedralGeometry.js';

export function buildWellOfLastNames(state) {
  const root = group('well-of-last-names');
  root.add(ossuaryFloor(14.8, 14.8, 'void'));

  const platformTiers = group('well-platform-tiers');
  const tierSpecs = [[5.6, 0.1, 'stoneDark'], [4.6, 0.12, 'stone'], [3.6, 0.14, 'stoneDark']];
  let tierY = 0;
  for (const [radius, height, colorName] of tierSpecs) {
    platformTiers.add(cylinder(radius, height, colorName, 'well-platform-tier', [0, tierY + height / 2, 0], 24));
    tierY += height;
  }
  root.add(platformTiers);

  const well = group('soul-well');
  well.add(cylinder(2.6, 0.5, 'stoneDark', 'well-rim', [0, 0.25, 0], 24));
  const shaft = cylinder(2.1, 0.06, 'void', 'well-shaft', [0, 0.48, 0], 24);
  well.add(shaft);
  const wellLight = sphere(0.6, 'ghost', 'soul-well-glow', [0, 0.2, 0], [1, 0.3, 1], { emissive: 0xa7c8bf, emissiveIntensity: 1.1, transparent: true, opacity: 0.55 });
  wellLight.userData = { animation: 'well-surge', phase: 0.3 };
  well.add(wellLight);
  root.add(well);

  const bridge = group('abyssal-bridge');
  bridge.add(box(1.8, 0.14, 6.0, 'oldBone', 'bridge-span', [0, 0.5, 0]));
  for (let i = -1; i <= 1; i += 2) for (let z = -2.6; z <= 2.6; z += 1.3) bridge.add(box(0.08, 0.5, 0.08, 'iron', 'bridge-rail-post', [i * 0.85, 0.75, z]));
  root.add(bridge);

  const obelisks = group('demon-obelisks');
  for (const [x, z] of [[-5.4, -5.4], [5.4, -5.4], [-5.4, 5.4], [5.4, 5.4]]) {
    const obelisk = cone(0.6, 4.4, 'stoneDark', 'demon-obelisk-body', [x, 2.2, z], 4);
    obelisks.add(obelisk);
    obelisks.add(sphere(0.16, 'blood', 'obelisk-sigil-eye', [x, 3.6, z + 0.42], [1, 1, 0.4], { emissive: 0x6d1f28, emissiveIntensity: 0.9 }));
    obelisks.add(cylinder(0.75, 0.16, 'stoneDark', 'obelisk-plinth', [x, 0.08, z], 6));
  }
  root.add(obelisks);

  // The old factory ringed the well with 8 death crystals; restore that ring density here, distinct from
  // the four corner demon-obelisks and the outer wraith-ring wisps.
  const deathCrystals = group('death-crystal-ring');
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const cx = Math.cos(angle) * 3.35;
    const cz = Math.sin(angle) * 3.35;
    const crystal = group('death-crystal');
    crystal.position.set(cx, 0.62, cz);
    crystal.rotation.y = angle;
    crystal.add(frustum(0.0, 0.14, 0.62, 'crystal', 'death-crystal-shard-main', [0, 0, 0], 6, null, { emissive: 0x7b3fae, emissiveIntensity: 0.75, transparent: true, opacity: 0.85 }));
    crystal.add(frustum(0.0, 0.07, 0.34, 'crystal', 'death-crystal-shard-minor', [0.1, -0.1, 0.05], 6, [0, 0, 0.35], { emissive: 0x7b3fae, emissiveIntensity: 0.6, transparent: true, opacity: 0.75 }));
    crystal.add(frustum(0.0, 0.07, 0.3, 'crystal', 'death-crystal-shard-minor', [-0.09, -0.12, -0.04], 6, [0, 0, -0.4], { emissive: 0x7b3fae, emissiveIntensity: 0.6, transparent: true, opacity: 0.75 }));
    crystal.add(cylinder(0.17, 0.1, 'stoneDark', 'death-crystal-socket', [0, -0.36, 0], 8));
    crystal.userData = { animation: 'crystal-pulse', phase: i * 0.4 };
    deathCrystals.add(crystal);
  }
  root.add(deathCrystals);

  const ring = group('wraith-ring');
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const wisp = sphere(0.22, 'ghost', 'wraith-wisp', [Math.cos(angle) * 4.0, 1.4, Math.sin(angle) * 4.0], [0.7, 1.6, 0.7], { emissive: 0xa7c8bf, emissiveIntensity: 0.7, transparent: true, opacity: 0.5 });
    wisp.userData = { animation: 'soul-rise', phase: i * 0.6 };
    ring.add(wisp);
  }
  root.add(ring);

  const nameStones = group('chained-name-stones');
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    const stone = box(0.5, 0.7, 0.14, 'parchment', 'name-stone-tablet', [Math.cos(angle) * 3.1, 0.9, Math.sin(angle) * 3.1]);
    stone.rotation.y = -angle;
    nameStones.add(stone);
    const chainLink = torus(0.14, 0.03, 'iron', 'name-stone-chain-link', [Math.cos(angle) * 3.1, 1.4, Math.sin(angle) * 3.1], [0, 0, 0]);
    chainLink.userData = { animation: 'chain-sway', phase: i * 0.5 };
    nameStones.add(chainLink);
  }
  root.add(nameStones);

  const gate = group('deep-route-gate');
  gate.position.set(0, 0, 6.6);
  gate.add(box(3.2, 3.4, 0.3, 'stoneDark', 'deep-route-portcullis-frame', [0, 1.7, 0]));
  for (let i = 0; i < 6; i += 1) gate.add(box(0.09, 3.0, 0.09, 'iron', 'portcullis-bar', [-1.35 + i * 0.54, 1.55, 0]));
  root.add(gate);

  const herald = group('crooked-herald-of-the-well');
  herald.position.set(-3.4, 0, 5.2);
  herald.add(beam([0, 0.9, 0], [0, 1.55, 0], 0.11, 'oldBone', 'herald-spine'));
  herald.add(sphere(0.2, 'bone', 'herald-skull', [0.08, 1.8, 0]));
  herald.add(beam([0, 1.5, 0], [-0.5, 1.2, 0.2], 0.06, 'oldBone', 'herald-arm'));
  herald.add(beam([-0.5, 1.2, 0.2], [-0.85, 0.75, 0.3], 0.05, 'oldBone', 'herald-hand-bone'));
  herald.add(box(0.5, 0.7, 0.03, 'parchment', 'herald-name-scroll', [-0.85, 0.9, 0.32]));
  root.add(herald);

  // A real records desk near the well, distinct from the chained-name-stones tablets — where names were
  // once formally logged before the well swallowed them. Water-damaged and marked by the death-energy.
  const archive = group('last-names-archive');
  archive.position.set(3.4, 0, 5.2);
  archive.add(box(1.5, 0.85, 0.8, 'stoneDark', 'archive-desk-body', [0, 0.42, 0], { roughness: 0.9 }));
  archive.add(box(1.5, 0.06, 0.8, 'oldBone', 'archive-desk-top', [0, 0.86, 0]));
  archive.add(box(0.5, 0.35, 0.02, 'iron', 'archive-name-drawer', [-0.4, 0.6, 0.4]));
  archive.add(cylinder(0.02, 0.08, 'brass', 'archive-drawer-pull', [-0.4, 0.6, 0.42], 6, [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 6; i += 1) {
    const ledger = box(0.34, 0.03 + (i % 2) * 0.01, 0.24, i % 3 === 0 ? 'blood' : 'parchment', 'archive-ledger-stack', [-0.4 + (i % 3) * 0.32, 0.9 + Math.floor(i / 3) * 0.05, -0.15 + (i % 2) * 0.1]);
    ledger.rotation.y = i * 0.15;
    archive.add(ledger);
  }
  archive.add(cylinder(0.045, 0.1, 'stoneDark', 'archive-inkwell', [0.55, 0.92, 0.25], 8));
  archive.add(beam([0.55, 0.94, 0.25], [0.7, 1.05, 0.32], 0.008, 'oldBone', 'archive-quill'));
  archive.add(beam([-0.5, 0.03, -0.1], [0.45, 0.9, 0.3], 0.012, 'ghost', 'archive-death-scorch', { emissive: 0xa7c8bf, emissiveIntensity: 0.35, transparent: true, opacity: 0.55 }));
  const archiveChair = group('archive-chair');
  archiveChair.position.set(0, 0, 0.85);
  archiveChair.add(box(0.4, 0.05, 0.4, 'oldBone', 'archive-chair-seat', [0, 0.45, 0]));
  archiveChair.add(box(0.4, 0.45, 0.05, 'oldBone', 'archive-chair-back', [0, 0.68, 0.18]));
  for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) archiveChair.add(cylinder(0.02, 0.45, 'iron', 'archive-chair-leg', [dx, 0.22, dz], 6));
  archiveChair.rotation.x = -0.12;
  archive.add(archiveChair);
  const archiveShelf = group('archive-record-shelf');
  archiveShelf.position.set(0, 0, -0.55);
  archiveShelf.add(box(1.5, 0.05, 0.25, 'oldBone', 'archive-shelf-board', [0, 1.3, 0]));
  for (const dx of [-0.68, 0.68]) archiveShelf.add(cylinder(0.03, 1.3, 'iron', 'archive-shelf-bracket', [dx, 0.65, 0], 6));
  for (let i = 0; i < 5; i += 1) archiveShelf.add(cylinder(0.05, 0.24, 'parchment', 'archive-record-scroll', [-0.55 + i * 0.28, 1.44, 0], 8, [0, 0, Math.PI / 2]));
  archive.add(archiveShelf);
  root.add(archive);

  const pulley = group('wraith-pulley');
  pulley.position.set(0, 0, 1.8);
  pulley.add(boneColumn(-2.6, 0, 4.6));
  pulley.add(boneColumn(2.6, 0, 4.6));
  pulley.add(beam([-2.6, 4.6, 0], [2.6, 4.6, 0], 0.14, 'iron', 'pulley-beam'));
  pulley.add(torus(0.5, 0.07, 'brass', 'pulley-wheel', [0, 4.4, 0], [0, Math.PI / 2, 0]));
  for (let i = 0; i < 6; i += 1) pulley.add(cylinder(0.04, 0.35, 'iron', 'pulley-chain-link', [0, 4.2 - i * 0.35, 0], 6));
  const cage = group('soul-cage');
  cage.position.set(0, 2.0, 0);
  for (let r = 0; r < 3; r += 1) cage.add(torus(0.42 - r * 0.08, 0.03, 'iron', 'cage-hoop', [0, r * 0.32, 0], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 6; i += 1) cage.add(cylinder(0.02, 0.66, 'iron', 'cage-bar', [Math.cos(i * Math.PI / 3) * 0.36, 0.32, Math.sin(i * Math.PI / 3) * 0.36], 6));
  const cagedSoul = sphere(0.22, 'ghost', 'caged-soul-mote', [0, 0.32, 0], [1, 1, 1], { emissive: 0xa7c8bf, emissiveIntensity: state === 'sealed' ? 0.2 : 0.8, transparent: true, opacity: 0.7 });
  cagedSoul.userData = { animation: 'soul-rise', phase: 0.5 };
  cage.add(cagedSoul);
  pulley.add(cage);
  root.add(pulley);

  const conduit = group('marrow-conduit');
  conduit.position.set(0, 0, -5.6);
  conduit.add(box(3.0, 0.3, 1.8, 'stoneDark', 'conduit-trench', [0, 0.15, 0]));
  for (let i = 0; i < 5; i += 1) conduit.add(cylinder(0.1 + i * 0.015, 3.6, i % 2 ? 'brass' : 'iron', 'conduit-pipe', [-1.0 + i * 0.5, 0.3, -0.5], 8, [Math.PI / 2, 0, 0]));
  if (state !== 'sealed') conduit.add(cylinder(0.1, 3.2, 'marrow', 'conduit-flow', [0, 0.32, -0.3], 8, [Math.PI / 2, 0, 0], { emissive: 0x6b3c43, emissiveIntensity: 0.5 }));
  // This trench was clearly built by royal engineers, now scavenged and corroded — a stamped crest
  // plate, a rusted valve wheel, and a pressure gauge remain from before the marrow took the pipes over.
  const royalConduit = group('royal-conduit');
  royalConduit.position.set(0, 0, 0.35);
  const crestPlate = box(0.5, 0.35, 0.04, 'brass', 'conduit-royal-crest-plate', [-1.1, 0.55, 0], { roughness: 0.65, metalness: 0.4 });
  royalConduit.add(crestPlate);
  royalConduit.add(beam([-1.28, 0.42, 0.03], [-0.94, 0.7, 0.03], 0.012, 'verdigris', 'conduit-royal-crest-plate'));
  royalConduit.add(frustum(0.16, 0.02, 0.3, 'brass', 'conduit-valve-wheel-hub', [0.4, 0.6, 0], 6, [0, 0, Math.PI / 2], { roughness: 0.7, metalness: 0.3 }));
  const valveWheel = torus(0.24, 0.03, 'iron', 'conduit-valve-wheel', [0.55, 0.6, 0], [0, Math.PI / 2, 0]);
  royalConduit.add(valveWheel);
  for (let i = 0; i < 4; i += 1) royalConduit.add(beam([0.55, 0.6, 0], [0.55 + Math.cos(i * Math.PI / 2) * 0.22, 0.6 + Math.sin(i * Math.PI / 2) * 0.22, 0], 0.012, 'iron', 'conduit-valve-spoke'));
  royalConduit.add(cylinder(0.07, 0.03, 'stoneDark', 'conduit-pressure-gauge', [1.15, 0.55, 0.14], 10, [Math.PI / 2, 0, 0]));
  royalConduit.add(beam([1.15, 0.55, 0.14], [1.15 + 0.05, 0.58, 0.14], 0.006, 'blood', 'conduit-pressure-gauge-needle'));
  for (let i = 0; i < 3; i += 1) royalConduit.add(box(0.3, 0.02, 0.9, 'verdigris', 'conduit-corrosion-patch', [-0.4 + i * 0.5, 0.31, -0.6 + i * 0.3], { transparent: true, opacity: 0.55, roughness: 0.95 }));
  conduit.add(royalConduit);
  root.add(conduit);

  // Wet floor stains radiating from the platform edge — the well's overflow leaves its mark even when quiet.
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.3;
    const stain = cylinder(0.5 + (i % 3) * 0.15, 0.01, 'void', 'well-floor-water-stain', [Math.cos(angle) * 5.8, 0.006, Math.sin(angle) * 5.8], 12, null, { transparent: true, opacity: 0.3 });
    root.add(stain);
  }

  // A secondary light source near the archive desk, and rust streaks down the pulley's bone towers.
  root.add(candle(3.9, 0, 4.4, true, 0.9));
  for (const px of [-2.6, 2.6]) {
    const rust = beam([px, 4.5, 4.5], [px, 0.3, 4.5], 0.03, 'verdigris', 'pulley-tower-rust-streak', { transparent: true, opacity: 0.45 });
    root.add(rust);
  }
  root.add(bonePile('well-approach-bone-litter', -1.6, 4.0, 5));

  const ascension = group('soul-ascension-rings');
  for (let i = 0; i < 4; i += 1) {
    const ascendRing = torus(1.1 + i * 0.5, 0.05 + i * 0.006, i % 2 ? 'graveBlue' : 'ghost', 'ascension-ring', [0, 1.6 + i * 0.55, 0], [Math.PI / 2, 0, 0], { emissive: 0xa7c8bf, emissiveIntensity: state === 'sealed' ? 0.1 : 0.55, transparent: true, opacity: state === 'sealed' ? 0.25 : 0.55 });
    ascendRing.userData = { animation: 'ring-drift', phase: i * 0.4 };
    ascension.add(ascendRing);
  }
  root.add(ascension);

  if (state === 'quiet') {
    wellLight.scale.set(0.6, 0.15, 0.6);
    // Death crystals sit dim; the archive is undisturbed, dust settling on the closed ledgers.
    deathCrystals.children.forEach(child => { child.children.forEach(part => { if (part.material) part.material.emissiveIntensity *= 0.4; }); });
    root.add(candle(3.1, 0, 4.6, false));
  }
  if (state === 'overflowing') {
    root.add(soulMist('well-overflow-mist', 0, 0.6, 0, 16, 1.3));
    wellLight.scale.set(1.4, 0.6, 1.4);
    if (wellLight.material) wellLight.material.emissiveIntensity = 1.8;
    for (let i = 0; i < 4; i += 1) {
      const wraith = group('risen-wraith');
      const angle = i * (Math.PI / 2) + 0.4;
      wraith.position.set(Math.cos(angle) * 5.2, 0, Math.sin(angle) * 5.2);
      wraith.add(cone(0.4, 1.3, 'graveBlue', 'wraith-shroud', [0, 0.65, 0], 8, { transparent: true, opacity: 0.4 }));
      wraith.add(sphere(0.18, 'ghost', 'wraith-head', [0, 1.4, 0], [1, 1, 1], { transparent: true, opacity: 0.55, emissive: 0xa7c8bf, emissiveIntensity: 0.6 }));
      root.add(wraith);
    }
    // The death crystals surge, and the archive's ledgers are scattered by the overflow.
    deathCrystals.children.forEach(child => { child.children.forEach(part => { if (part.material) part.material.emissiveIntensity *= 1.6; }); });
    archive.children.forEach(child => { if (child.name === 'archive-ledger-stack') child.position.y += 0.15; });
    valveWheel.rotation.z += 0.6;
  }
  if (state === 'sealed') {
    root.add(cylinder(2.65, 0.12, 'iron', 'well-seal-cap', [0, 0.56, 0], 24));
    for (let i = 0; i < 8; i += 1) {
      const strap = box(0.06, 0.06, 2.6, 'iron', 'well-seal-strap', [Math.cos(i * Math.PI / 4) * 1.3, 0.62, Math.sin(i * Math.PI / 4) * 1.3]);
      strap.rotation.y = i * Math.PI / 4;
      root.add(strap);
    }
    root.add(torus(1.4, 0.05, 'iron', 'seal-ward-rune', [0, 0.63, 0], [Math.PI / 2, 0, 0], { emissive: 0x494b50, emissiveIntensity: 0.25 }));
    // The royal valve was cranked shut to seal the well; the archive desk holds the sealing order.
    valveWheel.rotation.z = 1.1;
    archive.add(box(0.3, 0.02, 0.2, 'holy', 'archive-sealing-order', [0.2, 0.9, 0.3], { emissive: 0x9fc8d4, emissiveIntensity: 0.2 }));
  }

  return root;
}
