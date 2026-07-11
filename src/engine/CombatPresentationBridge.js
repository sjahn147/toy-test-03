import { DungeonSim } from '../sim/DungeonSim.js';

const CORPSE_LINGER_SECONDS = 2.4;
let installed = false;

export function installCombatPresentationBridge() {
  if (installed) return;
  installed = true;

  const baseResolve = DungeonSim.prototype.resolve;
  const baseEmitEffect = DungeonSim.prototype.emitEffect;
  const baseOnDeath = DungeonSim.prototype.onDeath;

  DungeonSim.prototype.resolve = function resolveWithPresentationSource(agent, action) {
    const previousSource = this.__presentationSourceAgentId;
    if (action?.type === 'attack' || action?.type === 'heal') this.__presentationSourceAgentId = agent?.id ?? null;
    try {
      return baseResolve.call(this, agent, action);
    } finally {
      this.__presentationSourceAgentId = previousSource ?? null;
    }
  };

  DungeonSim.prototype.emitEffect = function emitEffectWithPresentationMetadata(type, payload = {}) {
    const before = this.effects?.length ?? 0;
    const result = baseEmitEffect.call(this, type, payload);
    const effect = this.effects?.[before];
    if (!effect) return result;

    if ((type === 'attack' || type === 'heal') && this.__presentationSourceAgentId) {
      effect.sourceAgentId = this.__presentationSourceAgentId;
    }
    if (type === 'death' && effect.agentId) {
      const target = this.agents?.find(agent => agent.id === effect.agentId);
      markCorpse(target, this.time);
    }
    return result;
  };

  DungeonSim.prototype.onDeath = function onDeathWithPresentationState(killer, target) {
    markCorpse(target, this.time);
    return baseOnDeath.call(this, killer, target);
  };
}

function markCorpse(agent, time) {
  if (!agent) return;
  agent.deathAt ??= time;
  agent.corpseLinger = CORPSE_LINGER_SECONDS;
  agent.travel = null;
}

export { CORPSE_LINGER_SECONDS };
