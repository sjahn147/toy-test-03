import { group, box, cylinder, sphere, beam, industrialFloor, industrialFlame, gear, traversalLane } from './IndustrialCorridorGeometry.js';

export function buildCopperTailTrapworks(state) {
  const root = group('copper-tail-trapworks');
  root.add(industrialFloor(16.8, 12.8));
  root.add(traversalLane('safe-passage-lane', 15.8, 2.6));
  root.add(traversalLane('magazine-access-lane', 2.2, 11.8, [0, 0.026, -3.2]));

  const carousel = group('trap-carousel');
  carousel.position.set(0, 0, 0.4);
  carousel.add(cylinder(1.0, 0.8, 'ironDark', 'carousel-hub', [0, 0.4, 0], 16));
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    carousel.add(beam([0, 0.8, 0], [Math.cos(angle) * 4.0, 0.8, Math.sin(angle) * 4.0], 0.11, i % 2 ? 'copper' : 'iron', 'carousel-arm'));
    carousel.add(box(0.75, 0.35, 1.4, i % 2 ? 'warning' : 'ironDark', 'demonstration-trap', [Math.cos(angle) * 4.0, 0.85, Math.sin(angle) * 4.0]));
  }
  carousel.userData = { animation: 'gear-turn', phase: 0.15 };
  root.add(carousel);

  const corridor = group('test-corridor');
  corridor.position.set(0, 0, -4.4);
  for (let i = -3; i <= 3; i += 1) {
    const plate = box(1.35, 0.1, 1.6, i % 3 === 0 ? 'warning' : 'iron', 'pressure-plate', [i * 1.55, 0.08, 0]);
    plate.userData = { animation: 'pressure-test', phase: i * 0.45 };
    corridor.add(plate);
  }
  root.add(corridor);

  const springRack = group('spring-rack');
  springRack.position.set(-6.4, 0, 3.8);
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
    springRack.add(gear(0.35 + row * 0.08, 0.12, col % 2 ? 'brass' : 'iron', 'trap-spring', [-1.4 + col * 0.95, 0.8 + row * 1.1, 0]));
  }
  root.add(springRack);

  const signals = group('signal-board');
  signals.position.set(5.7, 2.2, 5.9);
  signals.add(box(4.4, 3.0, 0.12, 'wood', 'signal-board-panel'));
  for (let i = 0; i < 12; i += 1) signals.add(sphere(0.12, i % 3 === 0 ? 'warning' : i % 3 === 1 ? 'blue' : 'green', 'route-signal-lamp', [-1.6 + (i % 4) * 1.05, 0.9 - Math.floor(i / 4) * 0.85, 0.08]));
  root.add(signals);

  const shrine = group('clutch-shrine');
  shrine.position.set(-5.8, 0, -3.5);
  shrine.add(box(3.2, 0.8, 2.2, 'stoneDark', 'shrine-plinth', [0, 0.4, 0]));
  shrine.add(cylinder(0.42, 1.8, 'copper', 'copper-tail-idol', [0, 1.55, 0], 14));
  shrine.add(beam([0, 2.2, 0], [-1.2, 3.2, 0.4], 0.07, 'copper', 'idol-tail'));
  root.add(shrine);

  const firstTrap = group('first-safe-trap');
  firstTrap.position.set(4.6, 1.2, 3.8);
  firstTrap.add(box(2.0, 0.65, 1.2, 'wood', 'training-chest'));
  firstTrap.add(cylinder(0.12, 1.3, 'brass', 'blunted-spear', [0.55, 0.7, 0], 8, [Math.PI / 2, 0, 0]));
  firstTrap.add(box(1.5, 0.08, 0.8, 'canvas', 'childs-success-cloth', [0, 0.75, 0]));
  root.add(firstTrap);

  if (state === 'active') root.add(industrialFlame(-5.8, 0.9, -3.5, 0.55));
  if (state === 'allied') {
    const charter = group('allied-safe-passage');
    charter.position.set(0, 2.0, 5.7);
    charter.add(box(6.4, 1.7, 0.08, 'canvas', 'safe-passage-charter'));
    for (let i = 0; i < 7; i += 1) charter.add(box(0.08, 0.04, 1.1, i % 2 ? 'brass' : 'blue', 'clan-signature-mark', [-2.5 + i * 0.85, 0, 0.06]));
    root.add(charter);
  }
  if (state === 'destroyed') {
    carousel.rotation.z = 0.22;
    springRack.rotation.x = -0.35;
    for (let i = 0; i < 28; i += 1) root.add(box(0.25 + (i % 4) * 0.12, 0.16, 0.3, i % 2 ? 'rust' : 'ironDark', 'shattered-trap-fragment', [-6 + (i % 9) * 1.45, 0.14 + (i % 3) * 0.1, -3.8 + Math.floor(i / 9) * 3.3]));
  }
  return root;
}
