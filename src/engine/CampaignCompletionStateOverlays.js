import { THREE } from './ThreeScene.js';

const COLORS = { goblin:0xb88a3f, neutral:0x718b82, orc:0x8b3038, ash:0x332b2c, gold:0xd3ad54, void:0x4d3478, green:0x6e9254, blue:0x4e849c, silk:0xd8d3c1, fire:0xf17a32, white:0xd8d5c7 };

export function applyCampaignCompletionStateOverlay(root, assetId, state) {
  const overlay = new THREE.Group();
  overlay.name = `state-overlay:${state}`;
  root.add(overlay);
  const key = `${assetId}:${state}`;
  const builder = OVERLAYS[key] ?? (() => addMarker(overlay, state, COLORS.white, 0));
  builder(overlay);
  root.userData.stateOverlay = state;
  return root;
}

const OVERLAYS = {
  'industry.goblin.market:goblin-market': o => { banners(o, COLORS.goblin, 5); crates(o, 8); },
  'industry.goblin.market:neutral-market': o => { banners(o, COLORS.neutral, 4); addMarker(o, 'neutral-charter', COLORS.white, 2.5); },
  'industry.goblin.market:orc-taxed': o => { banners(o, COLORS.orc, 6); bars(o, 4); },
  'industry.goblin.market:burned': o => { debris(o, 12, COLORS.ash); flames(o, 8); },
  'orc.arena.red-pit:matches': o => { banners(o, COLORS.orc, 8); addMarker(o, 'match-bell', COLORS.gold, 4); },
  'orc.arena.red-pit:chieftain-challenge': o => { banners(o, COLORS.gold, 6); flames(o, 10); },
  'orc.arena.red-pit:liberated': o => { banners(o, COLORS.neutral, 8); addMarker(o, 'broken-chains', COLORS.white, 1.5); },
  'orc.hall.chieftain:tribal-court': o => { banners(o, COLORS.orc, 6); addMarker(o, 'court-totem', COLORS.gold, 3); },
  'orc.hall.chieftain:war-council': o => { banners(o, COLORS.ash, 8); addMarker(o, 'campaign-map', COLORS.gold, 1.2); },
  'orc.hall.chieftain:leaderless': o => { debris(o, 9, COLORS.ash); addMarker(o, 'fallen-standard', COLORS.orc, .5); },
  'sanctum.circular:dormant': o => addMarker(o, 'dormant-seal', COLORS.void, .3),
  'sanctum.circular:ritual-active': o => { pylons(o, 8, COLORS.gold); motes(o, 16, COLORS.void); },
  'sanctum.circular:fractured': o => { debris(o, 14, COLORS.void); rifts(o, 7); },
  'sanctum.heart.chamber:sleeping': o => addMarker(o, 'sleeping-membrane', COLORS.heart ?? 0x8f263e, 5),
  'sanctum.heart.chamber:awakened': o => { motes(o, 20, COLORS.fire); pylons(o, 6, 0x8f263e); },
  'sanctum.heart.chamber:claimed': o => { banners(o, COLORS.gold, 10); addMarker(o, 'claim-crown', COLORS.gold, 8); },
  'sanctum.heart.chamber:collapsed': o => { debris(o, 18, COLORS.ash); rifts(o, 9); },
  'laboratory.summoning.failed:dormant': o => addMarker(o, 'cold-circle', COLORS.void, .2),
  'laboratory.summoning.failed:breached': o => { rifts(o, 6); motes(o, 14, COLORS.void); },
  'laboratory.summoning.failed:stabilized': o => { pylons(o, 6, COLORS.blue); addMarker(o, 'stability-core', COLORS.gold, 2); },
  'laboratory.emergency.way:sealed': o => bars(o, 6),
  'laboratory.emergency.way:opened': o => { addMarker(o, 'open-route', COLORS.green, 1); lamps(o, 8, COLORS.green); },
  'laboratory.emergency.way:collapsed': o => debris(o, 16, COLORS.ash),
  'royal.vault.crown:sealed': o => { bars(o, 8); addMarker(o, 'royal-lock', COLORS.gold, 3); },
  'royal.vault.crown:opened': o => { lamps(o, 8, COLORS.gold); crates(o, 6); },
  'royal.vault.crown:stripped': o => debris(o, 10, COLORS.ash),
  'royal.banquet.shattered:haunted': o => motes(o, 16, COLORS.void),
  'royal.banquet.shattered:occupied': o => { banners(o, COLORS.orc, 8); crates(o, 10); },
  'royal.banquet.shattered:restored-feast': o => { lamps(o, 12, COLORS.gold); addMarker(o, 'feast-service', COLORS.red ?? 0x7d2f35, 1); },
  'royal.bedchamber:sealed': o => bars(o, 5),
  'royal.bedchamber:searched': o => { crates(o, 5); addMarker(o, 'opened-reliquary', COLORS.gold, 2); },
  'royal.bedchamber:sanctuary': o => { lamps(o, 10, COLORS.gold); addMarker(o, 'sanctuary-ring', COLORS.white, .4); },
  'flooded.granary.quiet-teeth:sealed': o => bars(o, 6),
  'flooded.granary.quiet-teeth:rat-dominated': o => motes(o, 18, COLORS.ash),
  'flooded.granary.quiet-teeth:restored': o => { crates(o, 12); banners(o, COLORS.neutral, 4); },
  'flooded.wine-cellar:flooded': o => water(o, 5),
  'flooded.wine-cellar:drained': o => { debris(o, 8, COLORS.ash); lamps(o, 5, COLORS.gold); },
  'flooded.wine-cellar:fermenting-colony': o => { motes(o, 16, COLORS.green); addMarker(o, 'fermentation-vat', COLORS.green, 1); },
  'fungal.glasshouse.rotten:overgrown': o => motes(o, 15, COLORS.green),
  'fungal.glasshouse.rotten:cultivated': o => { lamps(o, 8, COLORS.gold); addMarker(o, 'cultivation-grid', COLORS.green, .5); },
  'fungal.glasshouse.rotten:shattered': o => debris(o, 18, COLORS.blue),
  'fungal.gardener.chamber:sleeping': o => addMarker(o, 'sleeping-canopy', COLORS.green, 3),
  'fungal.gardener.chamber:awakened': o => { lamps(o, 7, COLORS.green); motes(o, 10, COLORS.gold); },
  'fungal.gardener.chamber:consumed': o => { pylons(o, 9, COLORS.green); motes(o, 18, COLORS.void); },
  'spider.vault.hosts:occupied': o => motes(o, 12, COLORS.silk),
  'spider.vault.hosts:rescued': o => { lamps(o, 7, COLORS.green); addMarker(o, 'rescue-route', COLORS.white, .5); },
  'spider.vault.hosts:empty-cocoons': o => debris(o, 12, COLORS.silk),
  'spider.gallery.spawning:brooding': o => motes(o, 14, COLORS.silk),
  'spider.gallery.spawning:overpopulated': o => { motes(o, 24, COLORS.silk); pylons(o, 8, COLORS.ash); },
  'spider.gallery.spawning:destroyed': o => { debris(o, 18, COLORS.ash); flames(o, 10); }
};

function material(color, emissive = false) { return new THREE.MeshStandardMaterial({ color, roughness:.8, metalness:.08, emissive:emissive ? color : 0, emissiveIntensity:.45, transparent:true, opacity:.9 }); }
function addMarker(o, name, color, y) { const m=new THREE.Mesh(new THREE.TorusGeometry(1.3,.18,8,24),material(color,true));m.name=name;m.rotation.x=Math.PI/2;m.position.y=y;o.add(m); }
function banners(o,color,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(1.1,2.8,.12),material(color));m.name='state-banner';m.position.set(-7+i*(14/Math.max(1,n-1)),3,-6);o.add(m);}}
function crates(o,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.8,.7,.8),material(0x65422b));m.name='state-cargo';m.position.set(-5+(i%6)*2,.35,-2+Math.floor(i/6)*4);o.add(m);}}
function bars(o,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.18,4,.2),material(0x454b53));m.name='state-barrier';m.position.set(-3+i*(6/Math.max(1,n-1)),2,-5);o.add(m);}}
function debris(o,n,color){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.25+(i%3)*.12,0),material(color));m.name='state-debris';m.position.set(-6+(i%7)*2,.25,-3+Math.floor(i/7)*3);o.add(m);}}
function flames(o,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(.18,.8,6),material(COLORS.fire,true));m.name='state-flame';m.position.set(-5+i*(10/Math.max(1,n-1)),.6,(i%2?2:-2));o.add(m);}}
function pylons(o,n,color){for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const m=new THREE.Mesh(new THREE.CylinderGeometry(.2,.35,3.8,8),material(color,true));m.name='state-pylon';m.position.set(Math.cos(a)*6,1.9,Math.sin(a)*5);o.add(m);}}
function motes(o,n,color){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.12+(i%3)*.04,8,6),material(color,true));m.name='state-mote';m.position.set(Math.cos(i*1.7)*5,1+(i%6),Math.sin(i*1.7)*4);o.add(m);}}
function rifts(o,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.22,3.5,.35),material(COLORS.void,true));m.name='state-rift';m.position.set(-5+i*(10/Math.max(1,n-1)),1.75,(i%2?2:-2));m.rotation.z=(i-n/2)*.07;o.add(m);}}
function lamps(o,n,color){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),material(color,true));m.name='state-lamp';m.position.set(-6+i*(12/Math.max(1,n-1)),3.5,(i%2?3:-3));o.add(m);}}
function water(o,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(12-i, .12, 1.5),material(COLORS.blue));m.name='state-water';m.position.set(0,.08,-3+i*1.5);o.add(m);}}
