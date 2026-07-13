import assert from 'node:assert/strict';
import { SettlementOperationsSystem } from '../src/sim/SettlementOperationsSystem.js';

const rooms = ['A01','H36','H37','H38','H39','H40','I45','B08'].map((id, index) => ({ id, name: id, x: index * 10, z: 0, w: 16, d: 12 }));
const graph = new Map([
  ['A01', ['H36']], ['H36', ['A01','H37','H38']], ['H37', ['H36','H39']], ['H38', ['H36','H40']],
  ['H39', ['H37','H40','B08']], ['H40', ['H38','H39','I45']], ['I45', ['H40']], ['B08', ['H39']]
]);
const settlements = new Map([
  ['settlement-licensed-waystation', { id:'settlement-licensed-waystation', name:'Waystation', factionId:'adventurer-expedition', roomId:'A01', state:'active', indestructible:true, materials:10, food:10, wealth:5 }],
  ['settlement-old-lantern-inn', { id:'settlement-old-lantern-inn', name:'Old Lantern Inn', type:'old-lantern-inn', factionId:'adventurer-expedition', roomId:'H36', state:'active', tier:3, materials:1, food:8, wealth:3, capacity:18, presentPopulation:4, services:{ trade:true, rumors:true, smuggling:true, partyRegroup:true, foodService:true, guestRooms:true } }]
]);
const routes = [
  { id:'secret-H40-I45', from:'H40', to:'I45', kind:'secret', state:'opened' },
  { id:'secret-B08-H39', from:'B08', to:'H39', kind:'secret', state:'hidden' }
];
const agents = [
  agent('fighter','fighter','A01',8),
  agent('rogue','rogue','A01',6),
  agent('cleric','cleric','H36',7),
  agent('wizard','wizard','H36',4),
  agent('archer','archer','H36',3)
];
const party = { id:'party-1', memberIds:agents.map(value=>value.id), state:'exploring', provisions:2, maxProvisions:12, water:1, maxWater:10 };
const oldLantern = { tier:3, progress:0, snapshot(){ return { services:settlements.get('settlement-old-lantern-inn').services }; } };
const sim = {
  rooms, props:[], agents, graph, time:0, visited:new Set(),
  settlementSystem:{ settlements, safeSettlementId:'settlement-licensed-waystation', assignHome(a){ a.homeSettlementId='settlement-old-lantern-inn'; } },
  territorySystem:{ factionSupply:new Map([['adventurer-expedition',12]]) },
  expeditionSystem:{ parties:[party] }, occupancy:{ placeAgent(){} }, personalitySystem:{ initializeAgent(){} },
  scenario:{ routes }, routeGraph:{ getRoute(id){ return routes.find(route=>route.id===id); }, setRouteState(id,state){ const route=routes.find(value=>value.id===id); if(!route) return {ok:false,error:'missing'}; route.state=state; return {ok:true,result:route}; } },
  ensureOldLanternInnSystem(){ return oldLantern; },
  beginTravel(a, roomId){ a.roomId=roomId; a.travel=null; },
  setRouteState(id,state){ return this.routeGraph.setRouteState(id,state); },
  emitEffect(){}, roomName(id){ return id; }
};
const events=[];
const system = new SettlementOperationsSystem({ rooms, props:[], onEvent:(text,meta)=>events.push({text,meta}) });

function agent(id, role, roomId, gold){ return { id, name:id, role, roomId, faction:'party', factionId:'adventurer-expedition', ecologyFaction:'adventurer-expedition', alive:true, departed:false, hidden:false, downed:false, hosted:false, attachedToId:null, travel:null, combat:null, activity:null, fatigue:70, stress:50, hp:4, maxHp:12, gold, inventory:[], equipment:{} }; }

function finish(response, limit=24){
  assert.equal(response.ok,true,response.error);
  const order=system.orders.get(response.result.id);
  for(let i=0;i<limit && !['completed','failed','cancelled'].includes(order.status);i+=1){
    const assigned=sim.agents.find(value=>value.id===order.assignedAgentId);
    assert.ok(assigned,`missing assignee for ${order.id}`);
    const action=system.decide(assigned,sim);
    if(action) system.resolve(assigned,action,sim);
    if(assigned.activity?.source==='settlement-operation'){
      sim.time=assigned.activity.endsAt+0.01;
      system.update(0.1,sim);
    } else {
      system.update(0.1,sim);
    }
  }
  assert.equal(order.status,'completed',`${order.actionId} ended ${order.status}: ${order.lastError}`);
  return order;
}

const materialOrder=finish(system.enqueue({ actionId:'settlement.allocate-materials', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
assert.equal(materialOrder.stage,'delivery');
assert.ok(settlements.get('settlement-old-lantern-inn').materials>=3);
assert.ok(settlements.get('settlement-licensed-waystation').materials<10);

const supplyBefore=sim.territorySystem.factionSupply.get('adventurer-expedition');
finish(system.enqueue({ actionId:'settlement.allocate-supply', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
assert.equal(settlements.get('settlement-old-lantern-inn').supplyReserve,2);
assert.equal(sim.territorySystem.factionSupply.get('adventurer-expedition'),supplyBefore-2);

finish(system.enqueue({ actionId:'settlement.upgrade', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
assert.ok(oldLantern.progress>=5.5);
assert.equal(settlements.get('settlement-old-lantern-inn').upgradeRequested,true);

finish(system.enqueue({ actionId:'inn.rest', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
assert.ok(sim.agents.some(value=>value.fatigue<=15));

finish(system.enqueue({ actionId:'inn.rumors', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
assert.notEqual(routes.find(route=>route.id==='secret-B08-H39').state,'hidden');
assert.equal(system.rumors.length,1);

const materialsBeforeSmuggling=settlements.get('settlement-old-lantern-inn').materials;
const smuggling=finish(system.enqueue({ actionId:'inn.smuggling', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim),32);
assert.equal(smuggling.stage,'return');
assert.equal(settlements.get('settlement-old-lantern-inn').materials,materialsBeforeSmuggling+2);

const countBefore=sim.agents.length;
finish(system.enqueue({ actionId:'inn.recruit', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
assert.equal(sim.agents.length,countBefore+1);
assert.ok(system.recruits.length===1);

finish(system.enqueue({ actionId:'settlement.assign-workers', target:{type:'settlement',id:'settlement-old-lantern-inn'} },sim));
system.update(0.1,sim);
const directive=[...system.directives.values()][0];
assert.equal(directive.workerTarget,2);
assert.equal(directive.workerIds.length,2);
const worker=sim.agents.find(value=>value.id===directive.workerIds[0]);
const dutyAction=system.decide(worker,sim); if(dutyAction) system.resolve(worker,dutyAction,sim);
assert.ok(worker.settlementDuty || worker.activity?.source==='settlement-duty');

assert.ok(system.metrics().settlementOrdersCompleted>=7);
assert.ok(events.some(event=>event.meta?.type==='settlement-order-completed'));
console.log('WP4 settlement operations smoke passed');
