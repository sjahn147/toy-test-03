import { group, box, cylinder, sphere, torus, plane, wornTileFloor, candle, rubblePile } from './ResidentialQuarterGeometry.js';

export function buildHouseholdChapel(state) {
  const root=group('household-chapel');
  root.add(wornTileFloor(11.8,9.8,state==='defiled'?'damagedStone':'stone'));
  const altar=group('household-altar'); altar.position.set(0,0,-3.7);
  altar.add(box(3.8,1.0,1.2,state==='defiled'?'charred':'stoneLight','family-altar',[0,0.5,0]));
  altar.add(cylinder(0.55,2.2,'marble','household-goddess',[0,2.0,0],14));
  altar.add(sphere(0.36,'marble','goddess-head',[0,3.25,0]));
  if(state==='reconsecrated') altar.add(torus(0.68,0.06,'holy','altar-halo',[0,3.35,0],[Math.PI/2,0,0],{emissive:0x9ed7ff,emissiveIntensity:1.1}));
  root.add(altar);
  const benches=group('prayer-benches');
  for(const z of [-1.8,0.1,2.0]) for(const x of [-2.4,2.4]) benches.add(box(3.6,0.35,0.8,'wood','prayer-bench',[x,0.55,z]));
  root.add(benches);
  const font=group('holy-water-font'); font.position.set(-4.5,0,-2.6);
  font.add(cylinder(0.65,1.1,'stoneLight','font-base',[0,0.55,0],12));
  font.add(cylinder(0.92,0.25,state==='defiled'?'blood':'water','font-bowl',[0,1.15,0],14,null,{emissive:state==='reconsecrated'?0x7fc8ff:0,emissiveIntensity:0.7})); root.add(font);
  const icons=group('family-icon-wall'); icons.position.set(0,2.4,-4.55);
  for(let i=0;i<5;i++) icons.add(box(1.15,1.5,0.12,i===2?'brass':'woodDark','family-icon',[-3+i*1.5,0,0])); root.add(icons);
  const threshold=group('ossuary-threshold'); threshold.position.set(0,0,4.45);
  threshold.add(box(4.2,0.18,0.9,'stoneDark','ossuary-threshold-stone',[0,0.1,0])); root.add(threshold);
  const scroll=group('hidden-prayer-scroll'); scroll.position.set(4.7,1.5,-3.9);
  scroll.add(cylinder(0.12,1.5,'parchment','prayer-scroll',[0,0,0],12,[0,0,Math.PI/2])); scroll.add(box(0.9,0.04,0.05,'ink','forbidden-prayer-lines',[0,0.12,0.12])); root.add(scroll);
  root.add(plane(2.2,8.8,'lane','chapel-central-aisle',[0,0.025,0.25],{opacity:0.02,transparent:true}));
  if(state==='reconsecrated'){ const light=group('reconsecrated-light'); for(const x of [-3,-1.5,0,1.5,3]) light.add(candle(x,1.2,-2.9,true)); root.add(light); }
  if(state==='defiled'){ const desecration=group('defilement'); desecration.add(rubblePile(0,-3.0,10,'charred')); for(let i=0;i<7;i++) desecration.add(box(0.16,0.04,1.2,'blood','defilement-mark',[-3+i,0.06,-1+i%3])); root.add(desecration); }
  return root;
}
