import assert from 'node:assert/strict';
import { EnvironmentTaskSystem } from '../src/sim/EnvironmentTaskSystem.js';
import { ActiveCampaignGraph } from '../src/domain/ActiveCampaignGraph.js';

const rooms = [
  { id: 'A01', name: 'Gate', x: 0, z: 0, w: 12, d: 10 },
  { id: 'B06', name: 'Dormitory', x: 20, z: 0, w: 16, d: 12 },
  { id: 'H39', name: 'Cellar', x: 40, z: 0, w: 16, d: 12 }
];
const props = [{ id: 'crate', roomId: 'B06', type: 'crate' }];
const routes = [
  { id: 'ordinary-A01-B06', from: 'A01', to: 'B06', kind: 'ordinary', state: 'open' },
  { id: 'secret-B08-H39', from: 'B06', to: 'H39', kind: 'secret', state: 'hidden' }
];
const routeGraph = new ActiveCampaignGraph(routes);
const routeData = routeGraph.getRoute('secret-B08-H39');
const graph = new Map([...routeGraph.graph].map(([roomId, neighbors]) => [roomId, [...neighbors]]));
const agents = [
  { id: 'rogue', name: 'Milo', role: 'rogue', faction: 'party', roomId: 'A01', alive: true, fatigue: 1, activity: null, travel: null, combat: null },
  { id: 'fighter', name: 'Rana', role: 'fighter', faction: 'party', roomId: 'A01', alive: true, fatigue: 0, activity: null, travel: null, combat: null }
];
const events = [];
const sim = {
  rooms, props, agents, graph, routeGraph, scenario: { routes: [routeData] }, visited: new Set(['A01']), time: 0,
  beginTravel(agent, roomId) { agent.roomId = roomId; agent.travel = null; },
  routeState(id) { return routeGraph.getRoute(id); },
  setRouteState(id, state) {
    const result = routeGraph.setRouteState(id, state);
    this.graph = new Map([...routeGraph.graph].map(([roomId, neighbors]) => [roomId, [...neighbors]]));
    return result;
  },
  emitEffect() {}
};
const system = new EnvironmentTaskSystem({ rooms, props, onEvent: (text, meta) => events.push({ text, meta }) });

function complete(taskResult) {
  const task = system.tasks.get(taskResult.result.id);
  const agent = agents.find(candidate => candidate.id === task.assignedAgentId);
  let action = system.decide(agent, sim);
  if (action?.type === 'environment-task-move') {
    system.resolve(agent, action, sim);
    action = system.decide(agent, sim);
  }
  assert.equal(action?.type, 'environment-task-hold');
  assert.equal(agent.activity?.source, 'environment-task');
  sim.time = agent.activity.endsAt + 0.01;
  system.update(0.1, sim);
  assert.equal(task.status, 'completed');
  return { task, agent };
}

const scout = system.enqueue({ actionId: 'room.scout', target: { type: 'room', id: 'B06', roomId: 'B06' } }, sim);
assert.equal(scout.ok, true);
complete(scout);
assert.equal(rooms[1].scouted, true);

const salvage = system.enqueue({ actionId: 'room.salvage', target: { type: 'room', id: 'B06', roomId: 'B06' }, preferredAgentId: 'fighter' }, sim);
assert.equal(salvage.ok, true);
const salvageTask = system.tasks.get(salvage.result.id);
const salvageAgent = agents.find(agent => agent.id === salvageTask.assignedAgentId);
if (salvageAgent.roomId !== 'B06') system.resolve(salvageAgent, system.decide(salvageAgent, sim), sim);
system.decide(salvageAgent, sim);
salvageAgent.combat = { phase: 'windup' };
system.update(0.1, sim);
assert.equal(salvageTask.status, 'interrupted');
salvageAgent.combat = null;
complete(salvage);
assert.equal(props[0].salvaged, true);
assert.ok(rooms[1].materials >= 2);

const discover = system.enqueue({ actionId: 'route.discover', target: { type: 'route', id: routeData.id, roomId: 'B06' } }, sim);
assert.equal(discover.ok, true);
complete(discover);
assert.equal(routeGraph.getRoute('secret-B08-H39').state, 'discovered');
const open = system.enqueue({ actionId: 'route.open', target: { type: 'route', id: routeData.id, roomId: 'B06' } }, sim);
assert.equal(open.ok, true);
complete(open);
assert.equal(routeGraph.getRoute('secret-B08-H39').state, 'opened');
assert.ok(sim.graph.get('B06').includes('H39'), 'opened secret route did not enter the active graph');

const story = system.enqueue({ actionId: 'story.inspect', target: { type: 'story-prop', id: 'B06:story.map', roomId: 'B06', semanticName: 'story.map' } }, sim);
assert.equal(story.ok, true);
complete(story);
assert.equal(rooms[1].storyDiscovered, true);
assert.ok(system.snapshot().discoveries.includes('B06:story.map'));
assert.ok(system.metrics().environmentTasksCompleted >= 5);
assert.ok(events.some(event => event.meta?.type === 'environment-task-completed'));
console.log('WP3 environment task system smoke passed');
