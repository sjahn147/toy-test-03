import { group, box, cylinder, sphere, beam, plane, wornTileFloor, waterBasin, bedroll, fungusCluster } from './ResidentialQuarterGeometry.js';

export function buildLaundryCistern(state) {
  const root = group('laundry-cistern');
  root.add(wornTileFloor(14.6, 10.8, state === 'fungal-contaminated' ? 'moss' : 'wetStone'));

  const basin = group('wash-basin');
  basin.position.set(3.6, 0, 0.7);
  basin.add(waterBasin(5.2, 3.6, 0.62, state === 'fungal-contaminated' ? 'taintedWater' : 'water', 'wash-basin-water'));
  root.add(basin);

  const cistern = group('hot-water-cistern');
  cistern.position.set(-4.7, 0, -3.1);
  cistern.add(cylinder(1.35, 2.7, 'copper', 'cistern-tank', [0, 1.35, 0], 18));
  cistern.add(cylinder(0.3, 4.6, 'iron', 'cistern-flue', [0.8, 2.3, 0], 10));
  cistern.add(box(1.4, 0.75, 1.1, 'stoneDark', 'cistern-firebox', [0, 0.42, 1.0]));
  root.add(cistern);

  const walkway = group('raised-dry-walkway');
  walkway.add(box(2.6, 0.18, 10.2, 'wood', 'dry-walkway-deck', [-2.2, 0.42, 0]));
  for (const z of [-4.2,-2.1,0,2.1,4.2]) walkway.add(box(2.8,0.12,0.14,'woodDark','walkway-brace',[-2.2,0.28,z]));
  root.add(walkway);

  const valve = group('sluice-valve');
  valve.position.set(6.0, 1.25, -3.3);
  valve.add(cylinder(0.1, 1.8, 'iron', 'valve-axle', [0,0,0], 10, [Math.PI/2,0,0]));
  valve.add(cylinder(0.9, 0.12, 'rust', 'valve-wheel', [0,0,0], 18, [Math.PI/2,0,0]));
  for (let i=0;i<6;i++){ const a=i*Math.PI/3; valve.add(beam([0,0,0],[Math.cos(a)*0.78,Math.sin(a)*0.78,0],0.045,'iron','valve-spoke')); }
  root.add(valve);

  const lines = group('laundry-lines');
  for (const z of [-3.7,3.7]) {
    lines.add(beam([-6.0,3.4,z],[5.8,3.4,z],0.025,'rope','laundry-rope'));
    for (let i=0;i<5;i++) lines.add(box(1.0,0.9,0.035,i%2?'linen':'clothBlue','hanging-laundry',[-4.7+i*2.3,2.85,z]));
  }
  root.add(lines);

  const drain = group('smuggler-drain');
  drain.position.set(0,0,-4.75);
  drain.add(box(3.2,0.18,1.0,'iron','drain-grate',[0,0.12,0]));
  for(let i=-4;i<=4;i++) drain.add(box(0.08,0.12,0.92,'ironDark','drain-bar',[i*0.33,0.2,0]));
  root.add(drain);

  const scratch = group('smuggler-route-scratch');
  scratch.position.set(0,0.42,-5.25);
  for(let i=0;i<5;i++){ const mark=box(0.08,0.02,0.65,'chalk','route-scratch',[(-2+i)*0.28,0,0]); mark.rotation.y=i%2?0.55:-0.55; scratch.add(mark); }
  root.add(scratch);

  const lane = group('cistern-traversal-lane');
  lane.add(plane(2.6,10.2,'lane','north-south-clear-lane',[-0.2,0.025,0],{opacity:0.025,transparent:true}));
  root.add(lane);

  if(state==='camped'){
    const camp=group('laundry-camp');
    for(const [x,z] of [[-5,2.8],[-3.7,3.7],[-5.4,4.0]]) camp.add(bedroll(x,0.22,z,0.9));
    camp.add(box(2.4,0.18,1.1,'wood','camp-wash-table',[-4.2,0.9,1.2]));
    root.add(camp);
  }
  if(state==='fungal-contaminated'){
    const infection=group('fungal-contamination');
    for(const [x,z,s] of [[5.3,3.7,1.0],[3.8,-2.8,0.8],[-1.4,-4.1,0.7],[5.8,-1.0,0.6]]) infection.add(fungusCluster(x,z,s));
    for(let i=0;i<16;i++){ const mote=sphere(0.06,'spore','cistern-spore',[-6+(i%8)*1.6,1.0+(i%4)*0.5,-3.5+Math.floor(i/8)*6.8],[1,1,1],{emissive:0x7dc987,emissiveIntensity:0.7}); mote.userData={animation:'spore-float',phase:i*0.37}; infection.add(mote); }
    root.add(infection);
  }
  return root;
}
