import { group, box, cylinder, sphere, cone, torus, beam, ossuaryFloor, candle, boneColumn, skullNiche, bonePile, soulMist, traversalLane } from './OssuaryCathedralGeometry.js';

export function buildFuneralChapel(state) {
  const root = group('funeral-chapel');
  root.add(ossuaryFloor(15.8, 11.8, 'stoneDark'));
  root.add(traversalLane('chapel-aisle', 3.0, 10.6, [0, 0.026, 0]));

  const arcade = group('chapel-arcade');
  for (const side of [-1, 1]) {
    for (let bay = 0; bay < 3; bay += 1) {
      const z = -3.6 + bay * 3.6;
      const column = boneColumn(side * 6.6, z, 6.4);
      column.name = 'arcade-bone-column';
      arcade.add(column);
      const niche = skullNiche(side * 7.0, 2.4, z, side > 0 ? Math.PI : 0);
      arcade.add(niche);
    }
  }
  root.add(arcade);

  const oculus = group('demon-oculus');
  oculus.position.set(0, 4.6, -5.6);
  oculus.add(torus(1.9, 0.16, 'iron', 'oculus-ring', [0, 0, 0], [0, 0, 0]));
  const paneColors = ['choirRed', 'blood', 'void'];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i * Math.PI) / 5;
    if (state === 'dormant' && i % 3 === 0) continue;
    const pane = box(0.62, 0.62, 0.04, paneColors[i % 3], 'oculus-pane', [Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, 0], { transparent: true, opacity: 0.72 });
    pane.rotation.z = angle;
    if (state === 'purified') pane.material.color.set(0x9fc8d4);
    if (state === 'choir-active') { pane.material.emissive.set(0x6f2636); pane.material.emissiveIntensity = 0.5; }
    oculus.add(pane);
    const spoke = box(0.06, 1.5, 0.06, 'iron', 'oculus-spoke', [Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0]);
    spoke.rotation.z = angle;
    oculus.add(spoke);
  }
  root.add(oculus);

  const dais = group('sacrifice-dais');
  dais.position.set(0, 0, -4.0);
  dais.add(cylinder(3.4, 0.32, 'stone', 'dais-plinth', [0, 0.16, 0], 20));
  dais.add(cylinder(2.6, 0.1, 'blood', 'dais-stain-ring', [0, 0.335, 0], 20));
  dais.add(cylinder(1.9, 0.3, 'stoneDark', 'dais-tier-upper', [0, 0.53, 0], 20));
  dais.add(cylinder(1.3, 0.08, 'choirRed', 'dais-sigil-ring', [0, 0.69, 0], 16));
  root.add(dais);

  const altar = group('demon-altar');
  altar.position.set(0, 0.73, -4.0);
  altar.add(box(2.6, 1.0, 1.0, 'stoneDark', 'altar-slab', [0, 0.5, 0]));
  for (const [x, z] of [[-1.1, -0.35], [1.1, -0.35], [-1.1, 0.35], [1.1, 0.35]]) altar.add(cylinder(0.09, 1.15, 'oldBone', 'altar-leg-bone', [x, 0.57, z], 8));
  altar.add(cone(0.5, 0.9, 'marrow', 'altar-horn-idol', [0, 1.4, 0], 5));
  for (const dx of [-0.3, 0.3]) altar.add(beam([dx, 1.75, 0], [dx * 1.8, 2.2, 0], 0.045, 'oldBone', 'altar-idol-horn'));
  root.add(altar);

  const braziers = group('black-braziers');
  for (const [x, z] of [[-5.8, -3.6], [5.8, -3.6], [-5.8, 3.6], [5.8, 3.6]]) {
    const post = cylinder(0.11, 1.1, 'iron', 'brazier-post', [x, 0.55, z], 8);
    braziers.add(post);
    const bowl = cone(0.4, 0.35, 'stoneDark', 'brazier-bowl', [x, 1.15, z], 10);
    braziers.add(bowl);
    const flame = sphere(0.22, 'blood', 'corpse-flame', [x, 1.4, z], [0.7, 1.5, 0.7], { emissive: 0x6d1f28, emissiveIntensity: 1.4 });
    flame.userData = { animation: 'corpse-flame', phase: x + z };
    braziers.add(flame);
    const chain = beam([x, 4.8, z], [x, 1.6, z], 0.03, 'iron', 'brazier-chain');
    braziers.add(chain);
  }
  root.add(braziers);

  const stalls = group('corpse-choir-stalls');
  for (let row = 0; row < 2; row += 1) {
    const side = row === 0 ? -1 : 1;
    for (let i = 0; i < 5; i += 1) {
      const stall = group('choir-stall');
      stall.position.set(side * 5.4, 0, -2.6 + i * 1.6);
      stall.add(box(1.2, 1.5, 0.3, 'oldBone', 'stall-partition', [0, 0.75, side * -0.15]));
      const choristerSkull = sphere(0.19, 'bone', 'chorister-skull', [0, 1.35, 0]);
      stall.add(choristerSkull);
      stall.add(beam([0, 1.1, 0], [0, 0.4, 0], 0.07, 'oldBone', 'chorister-spine'));
      stall.add(sphere(0.08, 'oldBone', 'stall-skull-crest', [0, 1.62, side * -0.15]));
      stalls.add(stall);
    }
    stalls.add(beam([side * 5.4, 1.12, -3.2], [side * 5.4, 1.12, 5.0], 0.05, 'iron', 'choir-rail'));
  }
  root.add(stalls);

  const organ = group('soul-organ');
  organ.position.set(0, 0, 5.5);
  organ.add(box(5.0, 3.0, 0.7, 'oldBone', 'organ-bone-frame', [0, 1.5, 0]));
  for (let i = 0; i < 13; i += 1) {
    const pipe = cylinder(0.09, 1.4 + (i % 4) * 0.4, 'bone', 'organ-rib-pipe', [-2.4 + i * 0.4, 1.9 + (i % 4) * 0.2, -0.42], 8);
    pipe.userData = { animation: 'organ-pulse', phase: i * 0.4 };
    pipe.material.emissive.set(0x9fc8d4);
    pipe.material.emissiveIntensity = 0.35;
    organ.add(pipe);
  }
  organ.add(beam([-2.6, 3.4, -0.42], [2.6, 3.4, -0.42], 0.06, 'brass', 'organ-crown-bar'));
  root.add(organ);

  const choirmaster = group('jawless-choirmaster');
  choirmaster.position.set(0, 0, 4.4);
  choirmaster.add(cylinder(0.14, 1.6, 'oldBone', 'choirmaster-spine', [0, 0.9, 0], 8));
  const skull = sphere(0.24, 'bone', 'choirmaster-skull', [0, 1.85, 0]);
  choirmaster.add(skull);
  choirmaster.add(box(0.32, 0.03, 0.05, 'void', 'missing-jaw-gap', [0, 1.68, 0.2]));
  choirmaster.add(beam([0, 1.6, 0], [-0.5, 1.1, 0.3], 0.06, 'oldBone', 'choirmaster-arm'));
  choirmaster.add(beam([0, 1.6, 0], [0.5, 1.1, 0.3], 0.06, 'oldBone', 'choirmaster-arm'));
  choirmaster.add(cylinder(0.02, 1.9, 'void', 'choirmaster-baton', [0.55, 1.4, 0.4], 4));
  root.add(choirmaster);

  for (const [x, z] of [[-2.6, 5.2], [2.6, 5.2]]) root.add(candle(x, 0, z, state !== 'dormant'));

  if (state === 'dormant') {
    root.add(bonePile('cold-hearth-ash', 0, -4.0, 6));
    for (let i = 0; i < 6; i += 1) {
      const shard = box(0.22, 0.02, 0.14, 'void', 'oculus-shard-debris', [-3 + i * 1.1, 0.02, -5.2], { transparent: true, opacity: 0.6 });
      shard.rotation.y = i * 0.6;
      root.add(shard);
    }
  }
  if (state === 'choir-active') {
    root.add(soulMist('chapel-choir-mist', 0, 1.6, -1.5, 10, 1.0));
    stalls.children.forEach((stall, i) => { if (stall.name === 'choir-stall') stall.rotation.y = Math.sin(i) * 0.05; });
    for (let i = 0; i < 4; i += 1) {
      const wraith = group('possessed-choir-wraith');
      const side = i < 2 ? -1 : 1;
      wraith.position.set(side * 4.6, 0, -1.5 + (i % 2) * 2.4);
      wraith.add(cone(0.42, 1.5, 'graveBlue', 'wraith-robe', [0, 0.75, 0], 8, { transparent: true, opacity: 0.4 }));
      wraith.add(sphere(0.2, 'ghost', 'wraith-choir-head', [0, 1.6, 0], [1, 1, 1], { transparent: true, opacity: 0.55, emissive: 0xa7c8bf, emissiveIntensity: 0.6 }));
      root.add(wraith);
    }
  }
  if (state === 'purified') {
    root.add(box(4.0, 0.04, 4.0, 'holy', 'purification-sigil', [0, 0.031, -4.0]));
    for (const child of braziers.children) if (child.material) child.material.color.set(0x9fc8d4);
    root.add(torus(2.1, 0.07, 'holy', 'sanctified-halo', [0, 1.6, -4.0], [Math.PI / 2, 0, 0], { emissive: 0x9fc8d4, emissiveIntensity: 0.5 }));
  }

  return root;
}
