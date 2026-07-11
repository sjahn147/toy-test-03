import { group, stoneFloor, box, beam, webDisk, cocoon, spider, flame, sphere, torus, lerp, SPIDER_COLORS } from './SpiderColonyGeometry.js';

export function buildSilkRamp(state) {
  const root = group('silk-ramp');
  root.add(stoneFloor(12.8, 18.4));

  const structure = group('silk-ramp-structure');
  const levels = [[-8,-3.2,.55,2.2,8.8],[-3,1.7,2.2,4.15,8],[1.9,6.9,4.15,6.3,7.2],[6.7,8.3,6.3,7.15,6.4]];
  for (const [z0,z1,y0,y1,w] of levels) {
    const length = Math.hypot(z1-z0, y1-y0);
    const deck = box(w, .16, length, state === 'burning' ? 'burned' : 'silk', 'layered-silk-deck', [0,(y0+y1)/2,(z0+z1)/2]);
    deck.rotation.x = -Math.atan2(y1-y0, z1-z0);
    structure.add(deck);
    for (const x of [-w/2,0,w/2]) structure.add(beam([x,y0+.1,z0],[x,y1+.1,z1],x ? .13 : .09,'shadow','load-bearing-silk-cable'));
    for (let i=1;i<8;i+=1) {
      const t=i/8, y=lerp(y0,y1,t)+.12, z=lerp(z0,z1,t);
      structure.add(beam([-w/2,y,z],[w/2,y,z],.045,'shadow','silk-cross-thread'));
    }
  }
  for (const z of [-7.4,-2.5,2.5,7.4]) {
    const h = 3.1 + (z+7.4)*.32;
    structure.add(
      box(.65,h,.85,'stone','ramp-anchor-left',[-5.5,h/2,z]),
      box(.65,h,.85,'stone','ramp-anchor-right',[5.5,h/2,z]),
      beam([-5.5,h,z],[5.5,h,z],.16,'shadow','ramp-cross-anchor')
    );
  }
  root.add(structure);

  const sticky = group('sticky-ambush-zone');
  for (const [x,z,s] of [[-3.8,-5.8,1.2],[3.5,-.3,1],[-2.5,5.2,1.35]]) sticky.add(webDisk(x,z,s,state === 'burning' ? 'burned' : 'silk'));
  root.add(sticky);

  const cocoons = group('hanging-cocoon-line');
  if (state !== 'cleared') for (const [x,y,z,s] of [[-4.5,4.9,-4.2,1.2],[4.2,6,.5,1.45],[-3.8,7.5,4.8,1.1],[2.5,8.2,7,1.35]]) cocoons.add(cocoon(x,y,z,s));
  root.add(cocoons);

  const insignia = group('royal-guard-insignia');
  insignia.position.set(-4.9,1.4,-6.9);
  insignia.add(sphere(.62,'royal','royal-shield',[0,0,0],[.18,1,.78]),beam([-.48,-.68,.08],[.48,.72,.08],.055,'gold','royal-spear-mark'),beam([.48,-.68,.08],[-.48,.72,.08],.055,'gold','royal-spear-mark'));
  root.add(insignia);

  if (state === 'webbed') {
    const ambush = group('ramp-spider-ambushers');
    for (const [x,y,z,s] of [[-4.2,5.5,2.1,.7],[3.7,7.1,6.3,.85]]) { const enemy=spider(s,false); enemy.position.set(x,y,z); ambush.add(enemy); }
    root.add(ambush);
  }

  if (state === 'cleared') {
    const route = group('rope-route');
    for (const [z0,z1,y0,y1,w] of levels) {
      for (const side of [-1,1]) route.add(beam([side*(w/2-.18),y0+.75,z0],[side*(w/2-.18),y1+.75,z1],.055,'rope','rope-handrail'));
      for (let i=0;i<8;i+=1) { const t=(i+.5)/8; route.add(box(w-.4,.08,.34,'wood','adventurer-plank',[0,lerp(y0,y1,t)+.16,lerp(z0,z1,t)])); }
    }
    root.add(route);
  }

  if (state === 'burning') {
    const burn = group('burning-silk-overlay');
    for (const [x,y,z] of [[-3,1.2,-4.5],[2.2,3.4,.8],[-1.5,5.5,5],[3,6.8,7.3]]) { const f=flame(); f.position.set(x,y,z); burn.add(f); }
    for (let i=0;i<24;i+=1) {
      const ember=sphere(.05,'ember','ember-particle',[((i*37)%100)/10-5,1+(i%8)*.72,((i*53)%160)/10-8],[1,1,1],{emissive:SPIDER_COLORS.ember,emissiveIntensity:1.2});
      ember.userData={animation:'ember-particle',phase:i*.47}; burn.add(ember);
    }
    root.add(burn);
  }
  return root;
}
