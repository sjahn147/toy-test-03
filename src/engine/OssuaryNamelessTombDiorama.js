import { group, box, cylinder, sphere, cone, torus, beam, ossuaryFloor, candle, soulMist, traversalLane } from './OssuaryCathedralGeometry.js';

export function buildNamelessTomb(state) {
  const root = group('nameless-tomb');
  root.add(ossuaryFloor(13.8, 11.8, 'stoneDark'));
  root.add(traversalLane('tomb-escape-lane', 3.0, 10.6, [0, 0.026, 0]));

  const sarcophagus = group('black-knight-sarcophagus');
  sarcophagus.position.set(0, 0, -3.4);
  sarcophagus.add(box(3.6, 1.0, 1.6, 'void', 'sarcophagus-basin', [0, 0.5, 0]));
  const lid = box(3.7, 0.22, 1.7, 'stoneDark', 'sarcophagus-lid', [0, 1.11, 0]);
  sarcophagus.add(lid);
  sarcophagus.add(cylinder(0.22, 1.0, 'iron', 'knight-effigy-torso', [0, 1.6, -0.1], 8, [Math.PI / 2, 0, 0]));
  sarcophagus.add(sphere(0.2, 'bone', 'knight-effigy-helm', [0, 1.6, 0.55]));
  sarcophagus.add(beam([-0.9, 1.6, -0.1], [0.9, 1.6, -0.1], 0.06, 'iron', 'knight-effigy-greatsword'));
  root.add(sarcophagus);

  for (let ring = 0; ring < 5; ring += 1) {
    const rune = torus(0.9 + ring * 0.55, 0.03, 'graveBlue', 'floor-circle-glyph', [0, 0.02, -3.4], [Math.PI / 2, 0, 0], { emissive: 0x536f86, emissiveIntensity: 0.35 });
    root.add(rune);
  }

  const chain = group('wraith-chain');
  chain.position.set(0, 0, -0.9);
  for (let i = 0; i < 10; i += 1) {
    const link = torus(0.2, 0.045, 'iron', 'seal-chain-link', [-1.5 + i * 0.34, 3.0, 0], [0, i % 2 ? Math.PI / 2 : 0, 0]);
    link.userData = { animation: 'chain-sway', phase: i * 0.4 };
    chain.add(link);
  }
  root.add(chain);

  const treasure = group('cursed-treasure');
  treasure.position.set(4.6, 0, 3.6);
  treasure.add(box(1.5, 0.9, 1.1, 'oldBone', 'treasure-chest-body', [0, 0.45, 0]));
  const lidT = box(1.55, 0.4, 1.15, 'oldBone', 'treasure-chest-lid', [0, 1.05, -0.4]);
  lidT.rotation.x = -0.6;
  treasure.add(lidT);
  for (let i = 0; i < 10; i += 1) treasure.add(sphere(0.09, i % 2 ? 'brass' : 'blood', 'cursed-coin', [-0.5 + (i % 5) * 0.25, 0.95, 0.15 + Math.floor(i / 5) * 0.2]));
  root.add(treasure);

  const gargoyles = group('guardian-gargoyles');
  for (const [x, z] of [[-5.4, -3.4], [5.4, -3.4]]) {
    const g = group('gargoyle');
    g.position.set(x, 0, z);
    g.add(cone(0.55, 1.6, 'stoneDark', 'gargoyle-body', [0, 0.8, 0], 6));
    g.add(sphere(0.24, 'stoneDark', 'gargoyle-head', [0, 1.75, 0.2]));
    g.add(beam([0, 1.5, 0.2], [-0.7, 1.9, 0.5], 0.05, 'stoneDark', 'gargoyle-wing'));
    g.add(beam([0, 1.5, 0.2], [0.7, 1.9, 0.5], 0.05, 'stoneDark', 'gargoyle-wing'));
    gargoyles.add(g);
  }
  root.add(gargoyles);

  const statues = group('mourning-statues');
  for (const [x, z] of [[-4.6, 3.4], [4.6, -0.4]]) {
    const s = group('mourning-statue');
    s.position.set(x, 0, z);
    s.add(cylinder(0.32, 1.5, 'stone', 'mourning-statue-robe', [0, 0.75, 0], 10));
    s.add(sphere(0.2, 'stone', 'mourning-statue-head', [0, 1.65, 0]));
    statues.add(s);
  }
  root.add(statues);

  const knight = group('knight-who-forgot-his-name');
  knight.position.set(-4.6, 0, 3.4);
  knight.add(beam([0, 0.9, 0], [0, 1.6, 0], 0.12, 'iron', 'faceless-knight-spine'));
  knight.add(sphere(0.19, 'iron', 'blank-helm', [0, 1.85, 0]));
  knight.add(beam([0, 1.55, 0], [-0.45, 1.1, 0.2], 0.06, 'iron', 'faceless-knight-arm'));
  knight.add(beam([0, 1.55, 0], [0.45, 1.1, 0.2], 0.06, 'iron', 'faceless-knight-arm'));
  knight.add(box(0.7, 0.06, 0.1, 'parchment', 'name-scraped-plaque', [0, 0.55, 0.32]));
  root.add(knight);

  if (state === 'sealed') {
    root.add(box(3.9, 0.06, 1.8, 'holy', 'seal-ward-plate', [0, 1.14, 0]));
  }
  if (state === 'opened') {
    lid.rotation.z = 0.3;
    lid.position.x = 1.3;
    root.add(soulMist('tomb-opened-mist', 0, 1.2, -3.4, 8, 0.9));
  }
  if (state === 'haunted') {
    lid.rotation.z = 0.55;
    root.add(soulMist('tomb-haunted-mist', 0, 1.6, -0.9, 14, 1.2));
    for (const [x, z] of [[-2.0, 2.0], [2.0, 2.0]]) root.add(candle(x, 0, z, true));
  }

  return root;
}
