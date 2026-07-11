import { group, cylinder, box, beam, sphere, torus, cocoon, spider, SPIDER_COLORS } from './SpiderColonyGeometry.js';

export function buildQueenNest(state) {
  const root=group('queen-nest');
  root.add(cylinder(9.8,.45,'stone','nest-stone-foundation',[0,-.22,0],32));
  for (let i=0;i<5;i+=1) root.add(torus(8.5-i*1.5,.24+i*.025,i%2?'shadow':'silk','concentric-nest-ridge',[0,.12+i*.08,0],[Math.PI/2,0,0]));

  const crown=group('silk-crown-crest');
  for (let i=0;i<10;i+=1) {
    const angle=i*Math.PI*2/10;
    const top=[Math.cos(angle)*5.5,7.4+(i%2)*1.3,Math.sin(angle)*5.5];
    const base=[Math.cos(angle)*8.2,.2,Math.sin(angle)*8.2];
    crown.add(beam(base,top,.15,'silk','crown-silk-rib'),beam(top,[0,8.8,0],.08,'shadow','crown-silk-spoke'));
  }
  root.add(crown);

  const exuvia=group('queen-exuvia');
  exuvia.position.set(-2,.8,-1);
  exuvia.add(sphere(1.45,'burned','queen-hollow-abdomen',[0,.8,1.1],[1.25,.75,1.65]),sphere(.95,'chitin','queen-hollow-thorax',[0,.7,-.7],[1,.75,1]));
  for (const side of [-1,1]) {
    for (let i=0;i<4;i+=1) {
      const z=-.7+i*.6;
      exuvia.add(
        beam([side*.55,.75,z],[side*(1.7+i*.15),1.5,z+(i-1.5)*.35],.12,'chitin2','queen-exuvia-leg'),
        beam([side*(1.7+i*.15),1.5,z+(i-1.5)*.35],[side*(2.8+i*.2),0,z+(i-1.5)*.75],.09,'chitin','queen-exuvia-leg')
      );
    }
  }
  root.add(exuvia);

  const throne=group('egg-throne');
  throne.position.set(0,.3,-4.2);
  for (let i=0;i<18;i+=1) {
    const angle=i*Math.PI*2/18;
    const radius=1.6+(i%3)*.45;
    const egg=sphere(.48+(i%4)*.08,i%2?'egg':'vein','queen-egg',[Math.cos(angle)*radius,(i%5)*.28,Math.sin(angle)*radius],[.8,1.25,.8],{emissive:i%2?0:SPIDER_COLORS.vein,emissiveIntensity:.35});
    if (state==='queen-awakened') egg.userData={animation:'egg-pulse',phase:i*.3};
    throne.add(egg);
  }
  root.add(throne);

  const altar=group('host-ritual-altar');
  altar.position.set(0,0,4.7);
  altar.add(box(4.8,.5,2.8,'stone','host-altar-base',[0,.25,0]),box(3.6,.35,1.8,'blood','host-altar-slab',[0,.68,0]));
  for (const x of [-1.3,1.3]) altar.add(cocoon(x,2.3,0,1.05));
  root.add(altar);

  if (state==='empty') {
    const trail=group('queen-departure-trail');
    for (let i=0;i<8;i+=1) trail.add(sphere(.22+i*.04,'venom','royal-route-venom-drop',[-1.8+i*.52,.12,6.1+i*.28],[1,.25,.8],{emissive:SPIDER_COLORS.venom,emissiveIntensity:.55,opacity:.75,transparent:true}));
    root.add(trail);
  }

  if (state==='queen-awakened') {
    const encounter=group('queen-awakened-encounter');
    const queen=spider(2.2,true);
    queen.name='awakened-spider-queen';
    queen.position.set(.6,2,-.5);
    queen.userData.animation='spider-breathe';
    encounter.add(queen);
    for (let i=0;i<18;i+=1) {
      const angle=i*Math.PI*2/18;
      const mote=sphere(.09,i%2?'venom':'vein','queen-aura-mote',[Math.cos(angle)*(3.2+(i%4)*.4),1.3+(i%6)*.65,Math.sin(angle)*(3.2+(i%4)*.4)],[1,1,1],{emissive:i%2?SPIDER_COLORS.venom:SPIDER_COLORS.vein,emissiveIntensity:.9});
      mote.userData={animation:'spore-orbit',phase:i*.36};
      encounter.add(mote);
    }
    root.add(encounter);
  }

  if (state==='captured') root.add(makeContainment());
  return root;
}

function makeContainment() {
  const node=group('adventurer-containment');
  const radius=5.2;
  for (let i=0;i<18;i+=1) {
    const angle=i*Math.PI*2/18;
    const post=box(.25,2.4+(i%3)*.35,.25,i%2?'wood':'iron','containment-palisade',[Math.cos(angle)*radius,1.2,Math.sin(angle)*radius]);
    post.rotation.y=-angle;
    node.add(post);
  }
  node.add(
    torus(radius,.09,'iron','containment-chain-ring',[0,1.35,0],[Math.PI/2,0,0]),
    torus(radius,.09,'iron','containment-chain-ring',[0,2.1,0],[Math.PI/2,0,0]),
    box(2.8,.18,1.4,'wood','containment-research-table',[6.5,1.1,4.5]),
    box(.8,.06,.55,'parchment','queen-field-notes',[5.95,1.22,4.6])
  );
  return node;
}
