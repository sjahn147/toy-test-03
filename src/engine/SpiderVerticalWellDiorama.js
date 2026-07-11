import { group, cylinder, box, beam, sphere, torus, spider, SPIDER_COLORS } from './SpiderColonyGeometry.js';

export function buildVerticalWell(state) {
  const root = group('vertical-well');
  const shaft = group('vertical-shaft');
  shaft.add(cylinder(6.6,.55,'stone','well-foundation',[0,-.28,0],32),cylinder(4.65,.5,'void','well-mouth',[0,.02,0],32));
  for (let i=0;i<18;i+=1) {
    const angle=i*Math.PI*2/18;
    const block=box(1.65,3.35,.72,i%3?'stone':'edge','well-wall-block',[Math.cos(angle)*5.95,2.15,Math.sin(angle)*5.95]);
    block.rotation.y=-angle; shaft.add(block);
  }
  for (const y of [.25,4.35,8.45]) {
    for (let i=0;i<24;i+=1) {
      if (state==='collapsed' && y>4 && i%6<2) continue;
      const angle=i*Math.PI*2/24;
      const block=box(1.45,.42,1.25,i%2?'stone':'edge','well-ring-masonry',[Math.cos(angle)*5.6,y,Math.sin(angle)*5.6]);
      block.rotation.y=-angle; shaft.add(block);
    }
  }
  root.add(shaft);

  const network=group('silk-bridge-network');
  if (state!=='collapsed') network.add(makeBridge(.6,.15),makeBridge(4.7,Math.PI/3),makeBridge(8.8,-Math.PI/3));
  else network.add(beam([-4.7,1,0],[-.8,-.1,.2],.09,'burned','broken-bridge-cable'),beam([4.7,5.2,0],[1.2,3.4,-.2],.09,'burned','broken-bridge-cable'));
  root.add(network);

  const exit=group('royal-secret-exit');
  exit.position.set(0,.7,-6);
  exit.add(box(4.4,3.6,.65,'edge','secret-exit-frame',[0,1.8,0]),box(3.2,2.8,.75,'void','secret-exit-opening',[0,1.45,-.05]),box(2.2,.28,.18,'royal','royal-lintel',[0,3.15,.38]));
  root.add(exit);

  const hazard=group('fall-hazard');
  for (let i=0;i<(state==='collapsed'?34:18);i+=1) {
    const angle=i*2.399;
    const dust=sphere(.04,i%5?'shadow':'edge','falling-dust',[Math.cos(angle)*(.6+(i%7)*.48),1+(i%10)*.92,Math.sin(angle)*(.6+(i%7)*.48)],[1,1,1],{opacity:.58,transparent:true});
    dust.userData={animation:'falling-dust',phase:i*.31}; hazard.add(dust);
  }
  root.add(hazard);

  if (state==='web-bridge') {
    for (const [angle,y,scale] of [[.2,2.4,.78],[2.4,6.1,.9],[4.6,9,.72]]) {
      const enemy=spider(scale,false); enemy.position.set(Math.cos(angle)*5.3,y,Math.sin(angle)*5.3); root.add(enemy);
    }
  }
  if (state==='cleared') root.add(makeElevator());
  if (state==='collapsed') {
    const rubble=group('well-collapse-overlay');
    for (let i=0;i<28;i+=1) {
      const angle=i*2.18;
      const chunk=box(.45+(i%3)*.25,.28+(i%4)*.16,.55,i%2?'stone':'edge','collapsed-well-masonry',[Math.cos(angle)*(3.8+(i%6)*.42),.3+(i%5)*.18,Math.sin(angle)*(3.8+(i%6)*.42)]);
      chunk.rotation.set(i*.17,angle,i*.11); rubble.add(chunk);
    }
    root.add(rubble);
  }
  return root;
}

function makeBridge(y,rotation) {
  const node=group('silk-bridge'); node.position.y=y; node.rotation.y=rotation;
  for (const z of [-.78,0,.78]) node.add(beam([-4.7,0,z],[4.7,0,z],z?.07:.1,'silk','bridge-longitudinal-thread'));
  for (let i=-8;i<=8;i+=1) node.add(beam([i*.55,.02,-.82],[i*.55,.02,.82],.04,'shadow','bridge-cross-thread'));
  return node;
}

function makeElevator() {
  const node=group('rope-elevator');
  node.add(cylinder(1.6,.24,'wood','elevator-platform',[0,3.3,0],12));
  for (const x of [-1.1,1.1]) node.add(beam([x,3.4,0],[x,11.8,0],.065,'rope','elevator-rope'));
  node.add(cylinder(.72,1.5,'wood','elevator-winch-drum',[4.7,9.8,0],12,[Math.PI/2,0,0]),box(.8,1.5,.8,'edge','elevator-counterweight',[-4.6,5.3,0]));
  return node;
}
