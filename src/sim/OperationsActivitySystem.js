const OPERATION_DURATIONS = {
  unloading: 5.8,
  'handling-materials': 4.6,
  building: 6.4
};

const WORKSITE_ANCHORS = [
  { x: -0.72, z: 0.44, facing: Math.PI * 0.28 },
  { x: 0.68, z: 0.38, facing: -Math.PI * 0.3 },
  { x: -0.36, z: -0.62, facing: Math.PI * 0.82 },
  { x: 0.42, z: -0.58, facing: -Math.PI * 0.78 }
];

const DELIVERY_ANCHORS = [
  { x: -0.56, z: 0.5, facing: Math.PI * 0.25 },
  { x: 0.54, z: 0.48, facing: -Math.PI * 0.25 },
  { x: 0.02, z: -0.62, facing: Math.PI }
];

export class OperationsActivitySystem {
  constructor({ rooms, props, logisticsSystem, constructionSystem, settlementSystem, onEvent = () => {} }) {
    this.rooms = rooms;
    this.props = props;
    this.logisticsSystem = logisticsSystem;
    this.constructionSystem = constructionSystem;
    this.settlementSystem = settlementSystem;
    this.onEvent = onEvent;
    this.sequence = 0;
  }

  update(_dt, sim) {
    for (const agent of sim.agents) {
      const activity = agent.activity;
      if (activity?.source !== 'operations') continue;
      if (!this.isValid(agent, activity)) {
        this.clear(agent, 'interrupted');
        continue;
      }
      const duration = Math.max(0.01, activity.endsAt - activity.startedAt);
      activity.progress = clamp((sim.time - activity.startedAt) / duration, 0, 1);
      activity.phase = activity.progress < 0.12 ? 'approach' : activity.progress < 0.86 ? 'loop' : 'finish';
      if (activity.progress < 1) continue;
      this.complete(agent, activity, sim);
      if (agent.activity === activity) this.clear(agent, 'complete');
    }
  }

  decide(agent) {
    if (agent?.activity?.source !== 'operations') return null;
    return { type: 'operations-hold', activityId: agent.activity.id };
  }

  resolve(agent, action) {
    if (action?.type !== 'operations-hold') return false;
    agent.mood = agent.activity?.type ?? 'working';
    return true;
  }

  beginUnload(agent, cargo, destination, sim) {
    if (!agent || !cargo || !destination || agent.activity?.source === 'operations') return false;
    this.assign(agent, 'unloading', {
      roomId: destination.roomId,
      targetSettlementId: destination.id,
      cargoId: cargo.id,
      prop: 'cargo-unloading',
      anchor: this.anchorFor(destination, DELIVERY_ANCHORS, agent.id, sim),
      label: `Unloading ${cargo.resourceType}`
    }, sim);
    return true;
  }

  beginConstruction(agent, job, sim) {
    if (!agent || !job || agent.activity?.source === 'operations') return false;
    const prop = this.props.find(candidate => candidate.id === job.propId);
    if (!prop) return false;
    const carrying = (job.progress ?? 0) < Math.min(3, job.duration * 0.12);
    const type = carrying ? 'handling-materials' : 'building';
    this.assign(agent, type, {
      roomId: job.roomId,
      targetSettlementId: job.settlementId,
      targetPropId: job.propId,
      jobId: job.id,
      prop: carrying ? 'materials-stack' : 'worksite-tools',
      anchor: this.anchorForProp(prop, WORKSITE_ANCHORS, agent.id, sim),
      label: carrying ? `Handling materials for ${job.type.replaceAll('_', ' ')}` : `Building ${job.type.replaceAll('_', ' ')}`
    }, sim);
    return true;
  }

  assign(agent, type, details, sim) {
    const duration = (OPERATION_DURATIONS[type] ?? 5) * (0.92 + hash01(`${agent.id}:${type}:${this.sequence}`) * 0.16);
    agent.activity = {
      id: `operation-${this.sequence++}`,
      source: 'operations',
      type,
      phase: 'approach',
      progress: 0,
      startedAt: sim.time,
      endsAt: sim.time + duration,
      duration,
      interruptible: true,
      assignedBy: type === 'unloading' ? 'logistics' : 'construction',
      ...details
    };
    agent.mood = type;
    return agent.activity;
  }

  complete(agent, activity, sim) {
    if (activity.type === 'unloading') {
      const cargo = this.logisticsSystem.cargo.find(item => item.id === activity.cargoId && item.state === 'carried');
      if (cargo) this.logisticsSystem.deliver(cargo, agent, sim);
      return;
    }
    const job = this.constructionSystem.jobs.find(candidate => candidate.id === activity.jobId && candidate.state === 'building');
    if (!job) return;
    const contribution = activity.type === 'handling-materials' ? 1.8 : 2.8 + this.constructionSystem.siegePower(agent) * 0.35;
    job.progress = Math.min(job.duration, job.progress + contribution);
    const prop = this.props.find(candidate => candidate.id === job.propId);
    if (prop) {
      prop.buildProgress = job.progress / job.duration;
      prop.integrity = Math.max(1, Math.round(prop.maxIntegrity * prop.buildProgress));
    }
    sim.emitEffect?.('construction-work', { roomId: job.roomId, agentId: agent.id, duration: 0.75 });
  }

  isValid(agent, activity) {
    return Boolean(agent?.alive && !agent.departed && !agent.hidden && !agent.travel && !agent.combat && !agent.downed && !agent.hosted && !agent.attachedToId && agent.roomId === activity.roomId);
  }

  clear(agent, reason = 'cleared') {
    if (agent?.activity?.source !== 'operations') return;
    agent.lastOperation = { type: agent.activity.type, finishedAt: agent.activity.endsAt, reason };
    agent.activity = null;
    if (!agent.combat && !agent.travel) agent.mood = reason === 'complete' ? 'operation-complete' : 'operation-interrupted';
  }

  anchorFor(settlement, anchors, agentId, sim) {
    const prop = this.props.find(candidate => candidate.id === settlement.anchorPropId);
    const placement = settlement.visualPlacement ?? prop?.placement ?? {};
    return transformAnchor(settlement.id, placement, anchors, agentId, sim);
  }

  anchorForProp(prop, anchors, agentId, sim) {
    return transformAnchor(prop.id, prop.placement ?? {}, anchors, agentId, sim);
  }

  snapshot(agents) {
    return { activities: agents.filter(agent => agent.activity?.source === 'operations').map(agent => ({ agentId: agent.id, ...agent.activity, anchor: { ...agent.activity.anchor } })) };
  }

  metrics(agents) {
    const active = agents.filter(agent => agent.activity?.source === 'operations');
    return {
      activeOperations: active.length,
      unloadingOperations: active.filter(agent => agent.activity.type === 'unloading').length,
      constructionOperations: active.filter(agent => ['handling-materials', 'building'].includes(agent.activity.type)).length
    };
  }
}

function transformAnchor(ownerId, placement, anchors, agentId, sim) {
  const occupied = new Set(sim.agents.filter(candidate => candidate.activity?.source === 'operations').map(candidate => candidate.activity.anchor?.slotId).filter(Boolean));
  let index = Math.floor(hash01(`${ownerId}:${agentId}`) * anchors.length) % anchors.length;
  for (let offset = 0; offset < anchors.length; offset += 1) {
    const candidate = (index + offset) % anchors.length;
    if (!occupied.has(`${ownerId}:operation:${candidate}`)) { index = candidate; break; }
  }
  const local = anchors[index];
  const rotation = placement.rotation ?? 0;
  const scale = placement.scale ?? 1;
  const x = local.x * scale;
  const z = local.z * scale;
  return {
    slotId: `${ownerId}:operation:${index}`,
    ox: (placement.ox ?? 0) + x * Math.cos(rotation) - z * Math.sin(rotation),
    oz: (placement.oz ?? 0) + x * Math.sin(rotation) + z * Math.cos(rotation),
    facing: rotation + local.facing,
    scale
  };
}

function hash01(value) {
  let result = 2166136261;
  for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
  return (result >>> 0) / 0xffffffff;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
