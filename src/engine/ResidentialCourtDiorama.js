import { group, box, cylinder, sphere, beam, plane, wornTileFloor, balconyModule, barricade, lantern } from './ResidentialQuarterGeometry.js';

export function buildTenementCourt(state) {
  const root = group('tenement-court');
  root.add(wornTileFloor(17.8, 13.8, state === 'barricaded' ? 'damagedStone' : 'stone'));

  const balconies = group('tenement-balcony');
  const sides = [[0,-6.2,0],[0,6.2,Math.PI],[-8.1,0,Math.PI/2],[8.1,0,-Math.PI/2]];
  for(const [x,z,r] of sides) balconies.add(balconyModule(x,z,r));
  root.add(balconies);

  const tree = group('dead-courtyard-tree');
  tree.position.set(-3.4,0,-1.6);
  tree.add(cylinder(0.42,3.8,'woodDark','dead-tree-trunk',[0,1.9,0],10));
  for(const [sx,sy,sz,ex,ey,ez] of [[0,3.4,0,-1.5,5.0,0.4],[0,3.0,0,1.4,4.7,-0.6],[0,2.5,0,-1.0,3.8,-1.0]]) tree.add(beam([sx,sy,sz],[ex,ey,ez],0.16,'woodDark','dead-tree-branch'));
  root.add(tree);

  const well = group('common-well');
  well.position.set(4.1,0,-2.3);
  well.add(cylinder(1.35,0.8,'stoneLight','well-ring',[0,0.4,0],18));
  well.add(cylinder(1.0,0.25,'water','well-water',[0,0.62,0],18,null,{emissive:0x3e7180,emissiveIntensity:0.15}));
  well.add(beam([-1.2,0.7,0],[-1.2,3.0,0],0.1,'wood','well-post'));
  well.add(beam([1.2,0.7,0],[1.2,3.0,0],0.1,'wood','well-post'));
  well.add(beam([-1.2,2.8,0],[1.2,2.8,0],0.1,'wood','well-crossbar'));
  root.add(well);

  const bays=group('market-bays');
  for(const [x,z,r] of [[-6,4.5,0],[0,5.2,0],[6,4.5,0]]){
    const bay=group('market-bay'); bay.position.set(x,0,z); bay.rotation.y=r;
    bay.add(box(3.0,0.22,1.4,'wood','bay-counter',[0,0.9,0]));
    bay.add(beam([-1.3,0,0],[ -1.3,2.8,0],0.08,'woodDark','bay-post'));
    bay.add(beam([1.3,0,0],[1.3,2.8,0],0.08,'woodDark','bay-post'));
    bays.add(bay);
  }
  root.add(bays);

  const mosaic=group('tenant-key-mosaic');
  mosaic.position.set(0,0.03,2.2);
  for(let i=0;i<12;i++){ const a=i*Math.PI/6; mosaic.add(box(0.18,0.04,0.7,i%3?'brassDark':'brass','mosaic-key',[Math.cos(a)*1.1,0,Math.sin(a)*1.1])); mosaic.children.at(-1).rotation.y=-a; }
  root.add(mosaic);

  const lanes=group('cross-traversal-lane');
  lanes.add(plane(17.0,2.8,'lane','east-west-clear-lane',[0,0.025,0],{opacity:0.02,transparent:true}));
  lanes.add(plane(2.8,13.0,'lane','north-south-clear-lane',[0,0.026,0],{opacity:0.02,transparent:true}));
  root.add(lanes);

  if(state==='occupied'){
    const occupied=group('occupied-court');
    for(const [x,z] of [[-5,-4.5],[5,-4.2],[-5.5,2.0],[5.5,1.8]]) occupied.add(lantern(x,2.4,z,true));
    occupied.add(box(4.0,0.3,2.0,'canvas','communal-awning',[0,2.2,4.4]));
    root.add(occupied);
  }
  if(state==='barricaded'){
    const defenses=group('defense-barricade');
    for(const [x,z,r] of [[0,-6.2,0],[0,6.2,0],[-8.1,0,Math.PI/2],[8.1,0,Math.PI/2]]) defenses.add(barricade(x,z,r,4.0));
    root.add(defenses);
  }
  return root;
}
