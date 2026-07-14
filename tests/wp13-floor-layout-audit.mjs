import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAuthoredCampaignLayout } from '../src/content/layout/AuthoredCampaignLayout.js';

const manifest=JSON.parse(await read('../content/campaigns/sleeping-citadel/campaign.manifest.json'));
const layout=getAuthoredCampaignLayout(manifest);
const roomById=new Map(manifest.rooms.map(room=>[room.id,room]));
const placements=layout.rooms;
for(const floor of manifest.floors){
  const ids=floor.roomIds;
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)assert.equal(overlap(ids[i],ids[j]),false,`room overlap ${ids[i]}/${ids[j]}`);
}
for(const floor of manifest.floors){
  const ordinary=layout.routes.filter(route=>route.floorId===floor.id&&route.kind==='ordinary');
  const graph=new Map(floor.roomIds.map(id=>[id,new Set()]));
  for(const route of ordinary){graph.get(route.from).add(route.to);graph.get(route.to).add(route.from);}
  const seen=new Set([floor.roomIds[0]]),queue=[floor.roomIds[0]];
  while(queue.length){const current=queue.shift();for(const next of graph.get(current)??[])if(!seen.has(next)){seen.add(next);queue.push(next);}}
  assert.equal(seen.size,floor.roomIds.length,`${floor.id} ordinary graph is disconnected`);
  const loops=ordinary.length-floor.roomIds.length+1;
  if(floor.id==='F0')assert.ok(loops>=1,'F0 needs a small orientation loop');
  if(floor.id==='B1')assert.ok(loops>=6,'B1 needs settlement and faction circulation loops');
  if(floor.id==='B2')assert.ok(loops>=5,'B2 needs ecology and royal-route loops');
  if(floor.id==='B3')assert.equal(loops,0,'B3 must remain a linear finale');
}
assert.ok(layout.routes.some(route=>pair(route.from,route.to)==='M61::M62'));
assert.ok(layout.routes.some(route=>pair(route.from,route.to)==='M62::M63'));
for(const connector of layout.verticalConnectors){
  assert.notEqual(connector.from.floorId,connector.to.floorId);
  assert.deepEqual(connector.from.position,connector.to.position);
  for(const landing of[connector.from,connector.to]){
    for(const roomId of manifest.floors.find(f=>f.id===landing.floorId).roomIds){
      if(roomId===landing.roomId)continue;
      assert.equal(pointInRoom(landing.position,roomId,1.5),false,`${connector.id} landing conflicts with ${roomId}`);
      for(const socket of landing.queueSockets??[])assert.equal(pointInRoom(socket,roomId,.6),false,`${connector.id} queue conflicts with ${roomId}`);
    }
  }
}
assert.equal(layout.verticalConnectors.find(item=>item.id==='VC-01').state,'open');
assert.ok(layout.verticalConnectors.filter(item=>['open','working'].includes(item.state)).length===1,'only the entrance connector should begin open');

for(const route of layout.routes){
  for(const roomId of manifest.floors.find(f=>f.id===route.floorId).roomIds){
    if(roomId===route.from||roomId===route.to)continue;
    assert.equal(polylineIntersectsRoom(route.points,roomId,0.8),false,`${route.id} crosses ${roomId}`);
  }
}
const junctions=layout.junctions??[];
for(let i=0;i<layout.routes.length;i++)for(let j=i+1;j<layout.routes.length;j++){
  const a=layout.routes[i],b=layout.routes[j];if(a.floorId!==b.floorId)continue;
  const hits=intersections(a.points,b.points);
  for(const hit of hits){
    const sharedRoom=[a.from,a.to].some(id=>id===b.from||id===b.to);
    if(sharedRoom)continue;
    const junction=junctions.some(item=>item.floorId===a.floorId&&item.routeIds.includes(a.id)&&item.routeIds.includes(b.id)&&Math.hypot(item.position.x-hit.x,item.position.z-hit.z)<2.1);
    assert.equal(junction,true,`unexplained crossing ${a.id}/${b.id} at ${hit.x},${hit.z}`);
  }
}
console.log(JSON.stringify({rooms:manifest.rooms.length,routes:layout.routes.length,junctions:junctions.length,connectors:layout.verticalConnectors.length},null,2));
function overlap(aId,bId){const a=placements[aId],b=placements[bId],ar=roomById.get(aId),br=roomById.get(bId);return Math.abs(a.x-b.x)<(ar.size[0]+br.size[0])/2+2&&Math.abs(a.z-b.z)<(ar.size[1]+br.size[1])/2+2;}
function polylineIntersectsRoom(points,id,margin){const p=placements[id],r=roomById.get(id);for(const [a,b] of segments(points)){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4));for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(Math.abs(x-p.x)<r.size[0]/2+margin&&Math.abs(z-p.z)<r.size[1]/2+margin)return true;}}return false;}
function intersections(a,b){const hits=[];for(const sa of segments(a))for(const sb of segments(b)){const hit=segmentIntersection(sa,sb);if(hit)hits.push(hit);}return hits;}
function segments(points){return points.slice(0,-1).map((p,i)=>[p,points[i+1]]);}
function segmentIntersection([a,b],[c,d]){const den=(a.x-b.x)*(c.z-d.z)-(a.z-b.z)*(c.x-d.x);if(Math.abs(den)<1e-8)return null;const x=((a.x*b.z-a.z*b.x)*(c.x-d.x)-(a.x-b.x)*(c.x*d.z-c.z*d.x))/den;const z=((a.x*b.z-a.z*b.x)*(c.z-d.z)-(a.z-b.z)*(c.x*d.z-c.z*d.x))/den;const within=(p,q,v)=>v>=Math.min(p,q)-1e-6&&v<=Math.max(p,q)+1e-6;return within(a.x,b.x,x)&&within(a.z,b.z,z)&&within(c.x,d.x,x)&&within(c.z,d.z,z)?{x,z}:null;}
function pointInRoom(point,id,margin){const p=placements[id],r=roomById.get(id);return Math.abs(point.x-p.x)<r.size[0]/2+margin&&Math.abs(point.z-p.z)<r.size[1]/2+margin;}
function pair(a,b){return[a,b].sort().join('::');}
async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8');}
