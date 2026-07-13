import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectWorldTaskActions } from '../src/presentation/selectors/selectWorldTaskActions.js';
import { selectSettlementInspector } from '../src/presentation/selectors/selectSettlementInspector.js';

const state={
  entities:{
    agents:{ fighter:{id:'fighter',role:'fighter',faction:'party',roomId:'H36',alive:true} },
    rooms:{ H36:{id:'H36'},H38:{id:'H38'},H40:{id:'H40'},I45:{id:'I45'} },
    connections:{ 'secret-H40-I45':{id:'secret-H40-I45',from:'H40',to:'I45',kind:'secret',state:'opened',active:true} },
    props:{},structures:{},environmentTasks:{},settlementOrders:{},
    settlements:{
      'settlement-licensed-waystation':{id:'settlement-licensed-waystation',factionId:'adventurer-expedition',roomId:'A01',state:'active',materials:7},
      'settlement-old-lantern-inn':{id:'settlement-old-lantern-inn',name:'Old Lantern Inn',type:'old-lantern-inn',factionId:'adventurer-expedition',roomId:'H36',state:'active',tier:3,population:4,presentPopulation:4,capacity:18,structuralIntegrity:74,control:82,materials:4,food:7,wealth:3,supplyReserve:2,workerTarget:1,garrisonTarget:1,assignedWorkerIds:['fighter'],assignedGarrisonIds:[],defenseMode:'normal',nextUpgrade:{materials:13,supply:10,labor:48},upgradeProgress:14,services:{trade:true,rumors:true,smuggling:true,partyRegroup:true,foodService:true,guestRooms:true}}
    }, effects:{},cargo:{},parties:{},factions:{}
  },
  indexes:{agentsByRoom:{H36:['fighter']},propsByRoom:{},settlementsByFaction:{'adventurer-expedition':['settlement-old-lantern-inn']},environmentTasksByRoom:{},environmentTasksByTarget:{},settlementOrdersByRoom:{},settlementOrdersBySettlement:{}}
};
const settlementTarget={type:'settlement',id:'settlement-old-lantern-inn',roomId:'H36'};
const surface=selectWorldTaskActions(state,settlementTarget);
for(const id of ['settlement.upgrade','settlement.allocate-materials','settlement.allocate-supply','settlement.assign-workers','settlement.release-workers','settlement.set-garrison','settlement.release-garrison','settlement.fortify','inn.trade','inn.recruit','inn.regroup','inn.rest','inn.rumors','inn.smuggling']) assert.ok(surface.actions.some(action=>action.id===id),`missing ${id}`);
assert.equal(surface.actions.find(action=>action.id==='inn.smuggling').enabled,true);

state.entities.settlementOrders.busy={id:'settlement-order-busy',actionId:'inn.trade',settlementId:'settlement-old-lantern-inn',targetRoomId:'H36',status:'working',progress:.5};
const busy=selectWorldTaskActions(state,settlementTarget);
assert.equal(busy.actions.find(action=>action.id==='inn.trade').enabled,false);
assert.ok(busy.tasks.some(task=>task.id==='settlement-order-busy'));

const inspector=selectSettlementInspector(state,'settlement-old-lantern-inn');
assert.equal(inspector.management.supplyReserve,2);
assert.equal(inspector.management.workerTarget,1);
assert.equal(inspector.services.trade,true);
assert.equal(inspector.nextUpgrade.labor,48);
assert.ok(inspector.actions.length>6);

state.entities.connections['secret-H40-I45'].state='hidden';
const closed=selectWorldTaskActions(state,{type:'room',id:'H40',roomId:'H40'});
assert.equal(closed.actions.find(action=>action.id==='inn.smuggling').enabled,false);

const renderer=await readFile(new URL('../src/ui/renderStrategyInspector.js',import.meta.url),'utf8');
assert.match(renderer,/Next restoration tier/);
assert.match(renderer,/Inn services/);
const systemSource=await readFile(new URL('../src/sim/SettlementOperationsSystem.js',import.meta.url),'utf8');
assert.match(systemSource,/secret-H40-I45/);
assert.match(systemSource,/settlement-duty/);
console.log('WP4 settlement action selector smoke passed');
