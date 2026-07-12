import { group, box, cylinder, sphere, cone, torus, beam, frustum, ossuaryFloor, candle, boneColumn, skullNiche, bonePile, soulMist, traversalLane, heraldicBanner, royalCrest } from './OssuaryCathedralGeometry.js';

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

  // The chapel's second focal point: a once-grand noble bier, distinct from the demon-altar's active
  // ritual site. This is where a body lay in state before the ossuary's corruption took root.
  const catafalque = group('royal-catafalque');
  catafalque.position.set(-3.5, 0, 1.0);
  catafalque.add(box(2.8, 0.5, 1.5, 'stoneDark', 'catafalque-base', [0, 0.25, 0]));
  for (const [dx, dz] of [[-1.25, -0.6], [1.25, -0.6], [-1.25, 0.6], [1.25, 0.6]]) {
    catafalque.add(cylinder(0.07, 0.5, 'silverTarnish', 'catafalque-post', [dx, 0.75, dz], 8));
  }
  const catafalqueLid = box(2.6, 0.16, 1.3, 'stone', 'catafalque-bier-lid', [0, 1.06, 0]);
  catafalqueLid.rotation.z = 0.05;
  catafalque.add(catafalqueLid);
  catafalque.add(beam([-1.2, 1.14, -0.5], [0.6, 0.98, 0.4], 0.02, 'void', 'catafalque-lid-crack'));
  catafalque.add(box(1.5, 0.05, 0.6, 'royalCloth', 'catafalque-pall-cloth', [-0.1, 1.17, 0], { roughness: 0.95 }));
  for (const [dx, dz] of [[-1.25, -0.6], [1.25, -0.6], [-1.25, 0.6], [1.25, 0.6]]) {
    catafalque.add(beam([dx, 1.0, dz], [dx * 0.55, 1.0, dz * 0.4], 0.012, 'oldBone', 'catafalque-cobweb-strand'));
  }
  const occupant = group('occupant-royal-skeleton');
  occupant.position.set(0, 1.14, 0);
  occupant.add(beam([0, 0, 0], [0, 0.18, 0], 0.05, 'oldBone', 'royal-skeleton-spine'));
  occupant.add(sphere(0.13, 'bone', 'royal-skeleton-skull', [0, 0.3, 0]));
  occupant.add(torus(0.15, 0.02, 'silverTarnish', 'royal-skeleton-circlet', [0, 0.34, 0], [Math.PI / 2, 0, 0]));
  occupant.add(beam([0, 0.14, 0], [-0.28, 0.08, 0.1], 0.025, 'oldBone', 'royal-skeleton-arm'));
  occupant.add(beam([0, 0.14, 0], [0.28, 0.08, 0.1], 0.025, 'oldBone', 'royal-skeleton-arm'));
  catafalque.add(occupant);
  for (let i = 0; i < 5; i += 1) {
    const shard = box(0.18, 0.02, 0.14, 'stone', 'catafalque-looted-debris', [-1.6 + i * 0.7, 0.02, 1.9 + (i % 2) * 0.3]);
    shard.rotation.y = i * 0.7;
    catafalque.add(shard);
  }
  root.add(catafalque);

  // Once holy water, now dry, cracked, or fouled by the death-energy seeping through the chapel.
  const font = group('holy-water-font');
  font.position.set(3.6, 0, 1.0);
  font.add(cylinder(0.34, 0.85, 'stone', 'font-pedestal', [0, 0.42, 0], 12));
  font.add(cylinder(0.62, 0.1, 'stoneDark', 'font-lip', [0, 0.87, 0], 16));
  const fontBasin = cylinder(0.5, 0.22, 'stoneDark', 'font-basin', [0, 0.72, 0], 16);
  font.add(fontBasin);
  font.add(torus(0.62, 0.035, 'silverTarnish', 'font-silver-rim', [0, 0.87, 0], [Math.PI / 2, 0, 0]));
  font.add(beam([-0.4, 0.9, 0.1], [0.28, 0.86, -0.2], 0.014, 'void', 'font-crack'));
  const fontContents = cylinder(0.42, 0.05, 'void', 'font-contents', [0, 0.83, 0], 16, null, { emissive: 0x2c1a33, emissiveIntensity: 0.3 });
  font.add(fontContents);
  root.add(font);

  // Hanging silent above the arcade, tarnished and cracked — its toll once called the chapel to service.
  const bell = group('funeral-bell');
  bell.position.set(-6.9, 0, -3.6);
  bell.add(beam([0, 5.1, 0], [0, 4.55, 0], 0.05, 'iron', 'bell-yoke-chain'));
  bell.add(box(1.0, 0.16, 0.16, 'iron', 'bell-mount-beam', [0, 5.15, 0]));
  const bellBody = frustum(0.32, 0.5, 0.62, 'brass', 'bell-body', [0, 4.15, 0], 14, null, { roughness: 0.7, metalness: 0.35 });
  bell.add(bellBody);
  bell.add(torus(0.5, 0.05, 'brass', 'bell-lip-ring', [0, 3.85, 0], [Math.PI / 2, 0, 0]));
  bell.add(beam([0, 3.85, 0], [0.05, 3.5, 0], 0.02, 'iron', 'bell-clapper'));
  bell.add(beam([-0.28, 4.3, 0.1], [0.1, 3.9, -0.15], 0.012, 'void', 'bell-crack'));
  root.add(bell);

  // Decayed royal heraldry — tarnished silver rather than the room's brass/iron, a noble sigil distinct
  // from any faction banner elsewhere in the campaign.
  const heraldry = group('chapel-royal-heraldry');
  heraldry.add(heraldicBanner(-7.55, 5.2, -1.2, Math.PI / 2, 2));
  heraldry.add(heraldicBanner(7.55, 5.4, 2.4, -Math.PI / 2, 1));
  heraldry.add(royalCrest(-2.9, 5.4, -5.72, 0));
  heraldry.add(royalCrest(2.9, 5.4, -5.72, 0));
  root.add(heraldry);

  if (state === 'dormant') {
    root.add(bonePile('cold-hearth-ash', 0, -4.0, 6));
    for (let i = 0; i < 6; i += 1) {
      const shard = box(0.22, 0.02, 0.14, 'void', 'oculus-shard-debris', [-3 + i * 1.1, 0.02, -5.2], { transparent: true, opacity: 0.6 });
      shard.rotation.y = i * 0.6;
      root.add(shard);
    }
    // Font stands dry and dust-choked; catafalque pall is undisturbed and gray with grime.
    fontContents.material.color.set(0x27262a);
    fontContents.scale.y = 0.4;
    catafalqueLid.material.color.set(0x3a3838);
    root.add(bonePile('font-dust-drift', 3.6, 0.4, 5));
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
    // The font bubbles with fouled dark ichor, and the banners sway with the death-energy in the air.
    fontContents.material.color.set(0x2c1a33);
    fontContents.material.emissiveIntensity = 0.6;
    fontContents.userData = { animation: 'font-bubble', phase: 0.2 };
    for (const child of heraldry.children) if (child.name === 'royal-heraldry-banner') child.userData = { animation: 'banner-sway', phase: child.position.x };
    bell.rotation.z = 0.03;
  }
  if (state === 'purified') {
    root.add(box(4.0, 0.04, 4.0, 'holy', 'purification-sigil', [0, 0.031, -4.0]));
    for (const child of braziers.children) if (child.material) child.material.color.set(0x9fc8d4);
    root.add(torus(2.1, 0.07, 'holy', 'sanctified-halo', [0, 1.6, -4.0], [Math.PI / 2, 0, 0], { emissive: 0x9fc8d4, emissiveIntensity: 0.5 }));
    // Holy water restored to something closer to its former glory; the catafalque is tended once more.
    fontContents.material.color.set(0x9fc8d4);
    fontContents.material.emissive.set(0x9fc8d4);
    fontContents.material.emissiveIntensity = 0.55;
    fontContents.scale.y = 1;
    catafalqueLid.material.color.set(0xc4c2bb);
    catafalque.add(box(1.3, 0.02, 0.5, 'holy', 'catafalque-restored-cloth-overlay', [-0.1, 1.2, 0], { transparent: true, opacity: 0.5, emissive: 0x9fc8d4, emissiveIntensity: 0.25 }));
    bellBody.material.color.set(0xb08a3f);
    bellBody.material.emissive.set(0x5a3f1a);
    bellBody.material.emissiveIntensity = 0.12;
  }

  return root;
}
