import { group, box, cylinder, sphere, beam, industrialFloor, powderBarrel, traversalLane, INDUSTRIAL_COLORS } from './IndustrialCorridorGeometry.js';

export function buildPowderMagazine(state) {
  const root = group('powder-magazine');
  root.add(industrialFloor(12.8, 10.8));
  root.add(traversalLane('evacuation-lane', 2.4, 10.0));

  const vault = group('powder-vault');
  for (const x of [-4.6, 4.6]) for (const z of [-3.7, -1.85, 0, 1.85, 3.7]) vault.add(powderBarrel(x, z));
  root.add(vault);

  const baffle = group('blast-baffle');
  baffle.position.set(0, 0, -4.8);
  for (let i = 0; i < 5; i += 1) baffle.add(box(2.2, 4.2, 0.45, i % 2 ? 'stoneDark' : 'ironDark', 'baffle-slab', [-4.4 + i * 2.2, 2.1, (i % 2) * 0.55]));
  root.add(baffle);

  const gauge = group('humidity-gauge');
  gauge.position.set(-5.2, 2.5, 4.8);
  gauge.add(cylinder(0.75, 0.16, 'white', 'humidity-dial', [0, 0, 0], 18, [Math.PI / 2, 0, 0]));
  gauge.add(beam([0, 0, 0.1], [0.38, 0.48, 0.1], 0.04, state === 'sealed' ? 'green' : 'warning', 'humidity-needle'));
  root.add(gauge);

  const fuseLocker = group('fuse-locker');
  fuseLocker.position.set(5.4, 0, -3.8);
  fuseLocker.add(box(2.3, 3.6, 1.0, 'ironDark', 'fuse-locker-body', [0, 1.8, 0]));
  for (let i = 0; i < 8; i += 1) fuseLocker.add(cylinder(0.05, 1.4, i % 2 ? 'warning' : 'canvas', 'coiled-fuse', [-0.8 + (i % 4) * 0.55, 0.8 + Math.floor(i / 4) * 1.5, 0.55], 8, [Math.PI / 2, 0, 0]));
  root.add(fuseLocker);

  const wall = group('breach-wall');
  wall.position.set(0, 0, 5.0);
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 8; col += 1) wall.add(box(1.45, 1.15, 0.5, row % 2 ? 'stone' : 'stoneDark', 'breach-wall-block', [-5.0 + col * 1.42, row * 0.98 + 0.55, 0]));
  root.add(wall);

  const names = group('names-on-the-blast-door');
  names.position.set(0, 2.4, -4.55);
  for (let i = 0; i < 13; i += 1) names.add(box(0.08 + (i % 3) * 0.05, 0.04, 1.3, i === 12 ? 'warning' : 'white', 'scratched-name', [-4.5 + (i % 7) * 1.45, 1.0 - Math.floor(i / 7) * 1.6, 0.28]));
  root.add(names);

  const beetles = group('powder-beetle-cage');
  beetles.position.set(4.8, 1.3, 3.8);
  beetles.add(box(1.7, 1.8, 1.3, 'iron', 'beetle-cage', [0, 0, 0], { transparent: true, opacity: 0.5 }));
  for (let i = 0; i < 4; i += 1) beetles.add(sphere(0.18, 'powder', 'powder-beetle', [-0.45 + i * 0.3, -0.45 + (i % 2) * 0.25, 0], [1.5, 0.65, 1]));
  root.add(beetles);

  if (state === 'sealed') root.add(box(4.8, 4.6, 0.3, 'ironDark', 'sealed-blast-door', [0, 2.3, -4.7]));
  if (state === 'looted') {
    vault.children.filter((_, index) => index % 2 === 0).forEach(node => { node.visible = false; });
    root.add(box(5.8, 0.08, 0.9, 'powder', 'spilled-powder-trail', [0, 0.06, -1.9], { transparent: true, opacity: 0.82 }));
  }
  if (state === 'detonated') {
    wall.rotation.x = -0.72;
    for (let i = 0; i < 36; i += 1) root.add(box(0.28 + (i % 4) * 0.16, 0.2, 0.34, i % 2 ? 'rust' : 'stoneDark', 'blast-rubble', [-5.6 + (i % 10) * 1.25, 0.16 + (i % 3) * 0.12, 1.4 + Math.floor(i / 10) * 1.1]));
    const glow = sphere(1.7, 'ember', 'detonation-afterglow', [0, 1.8, 3.4], [1.6, 1.0, 1.35], { transparent: true, opacity: 0.44, emissive: INDUSTRIAL_COLORS.ember, emissiveIntensity: 1.6 });
    glow.userData = { animation: 'afterglow-pulse', phase: 0.2 };
    root.add(glow);
  }
  return root;
}
