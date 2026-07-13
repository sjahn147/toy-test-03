import { recomputeHeroStats } from './HeroSystem.js';

export class HeroAdaptationSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.bubbles = [];
    this.sequence = 0;
    this.clock = 0;
  }

  update(dt, sim) {
    this.clock += dt;
    const survivors = [];
    for (const bubble of this.bubbles) {
      bubble.remaining -= dt;
      bubble.pulse -= dt;
      if (bubble.pulse <= 0) {
        bubble.pulse += 1;
        for (const agent of sim?.agents ?? []) {
          if (agent.alive === false || agent.roomId !== bubble.roomId) continue;
          if (sameFactionId(agent, bubble.factionId)) {
            agent.hp = Math.min(agent.maxHp ?? agent.hp ?? 1, (agent.hp ?? 1) + bubble.healPerPulse);
            clearStatuses(agent, ['poison', 'corrosion', 'sporeSleep', 'fear']);
          }
        }
        this.clearHostileFields(bubble.roomId, bubble.clearKinds, sim);
      }
      if (bubble.remaining > 0) survivors.push(bubble);
    }
    this.bubbles = survivors;

    for (const agent of sim?.agents ?? []) {
      if (agent.heroId !== 'hero.pev') continue;
      tickStatus(agent, 'borrowedShape', dt, () => delete agent.heroStatModifiers.borrowedShape);
      tickStatus(agent, 'selectiveAssimilation', dt, () => {
        if (agent.heroAdaptation !== 'clear') agent.heroAdaptation = 'clear';
        applyAdaptation(agent, 'clear');
      });
      recomputeHeroStats(agent);
    }
  }

  purifyingBubble(owner, effect, sim) {
    const bubble = {
      id: `hero-bubble-${this.sequence++}`,
      kind: 'purifying-bubble',
      ownerId: owner.id,
      heroId: owner.heroId,
      factionId: factionOf(owner),
      roomId: owner.roomId,
      radius: effect.radius ?? 3.8,
      remaining: effect.duration ?? 7,
      healPerPulse: Math.max(1, Math.round((effect.heal ?? 8) / Math.max(1, effect.duration ?? 7))),
      clearKinds: [...(effect.clearKinds ?? [])],
      pulse: 0
    };
    this.bubbles.push(bubble);
    this.clearHostileFields(owner.roomId, bubble.clearKinds, sim);
    sim?.emitEffect?.('hero-adaptation', { roomId: owner.roomId, agentId: owner.id, duration: 0.9, heroId: owner.heroId, cue: 'purifying-bubble' });
    return true;
  }

  borrowShape(owner, targetId, effect, sim) {
    const candidates = (sim?.agents ?? []).filter(agent => agent.id !== owner.id && agent.alive !== false && agent.roomId === owner.roomId);
    const target = candidates.find(agent => agent.id === targetId) ?? candidates.sort((a, b) => power(b) - power(a))[0];
    if (!target) return false;
    const armor = Math.min(effect.maximumArmor ?? 3, Math.max(0, Number(target.armor ?? 0) - Number(owner.baseArmor ?? 0)));
    const attack = Math.min(effect.maximumAttack ?? 3, Math.max(0, Number(target.attack ?? 0) - Number(owner.baseAttack ?? 0)));
    const speedMultiplier = Math.min(effect.maximumSpeedMultiplier ?? 1.18, Math.max(1, Number(target.speedMultiplier ?? 1)));
    owner.heroStatuses.borrowedShape = { remaining: effect.duration ?? 10, sourceId: target.id, sourceRole: target.role };
    owner.heroStatModifiers.borrowedShape = { armor, attack, speedMultiplier, courage: 0, interruptResistance: 0.08 };
    owner.mimicTrinkets = [target.role, target.heroId ?? target.species ?? 'unknown'].filter(Boolean).slice(0, 3);
    owner.heroVariant = `borrowed-${normalizeToken(target.role ?? target.species ?? 'shape')}`;
    recomputeHeroStats(owner);
    sim?.emitEffect?.('hero-adaptation', { roomId: owner.roomId, agentId: owner.id, duration: 0.8, heroId: owner.heroId, cue: 'borrowed-shape' });
    return true;
  }

  selectiveAssimilation(owner, effect, sim) {
    const adaptation = chooseAdaptation(owner, sim, effect.adaptations ?? ['clear']);
    owner.heroAdaptation = adaptation;
    owner.adaptationHistory = [...new Set([...(owner.adaptationHistory ?? []), adaptation])].slice(-8);
    owner.heroStatuses.selectiveAssimilation = { remaining: effect.duration ?? 24, adaptation };
    applyAdaptation(owner, adaptation);
    owner.hp = Math.min(owner.maxHp ?? owner.hp, (owner.hp ?? 0) + (effect.heal ?? 18));
    owner.heroVariant = `adaptation-${adaptation}`;
    recomputeHeroStats(owner);
    sim?.emitEffect?.('hero-adaptation', { roomId: owner.roomId, agentId: owner.id, duration: 1.2, heroId: owner.heroId, cue: `adapt-${adaptation}` });
    this.onEvent(`${owner.name ?? 'Pev'} adapted into ${adaptation} form.`, { type: 'hero-adaptation-change', heroId: owner.heroId, adaptation, roomId: owner.roomId });
    return true;
  }

  modifyIncomingDamage(source, target, amount, metadata = {}) {
    if (target?.heroId !== 'hero.pev') return amount;
    const adaptation = target.heroAdaptation ?? 'clear';
    if (adaptation === 'metal' && metadata.melee) return amount * 0.74;
    if (adaptation === 'fungal' && (metadata.poison || metadata.spore)) return amount * 0.45;
    if (adaptation === 'spectral' && !metadata.holy) return amount * 0.72;
    if (adaptation === 'clear' && (metadata.magic || metadata.projectileType === 'magic')) return amount * 0.8;
    return amount;
  }

  clearHostileFields(roomId, kinds, sim) {
    const allowed = new Set(kinds ?? []);
    const systems = [sim?.heroEnvironmentSystem?.fields, sim?.heroSkillSystem?.zones, sim?.heroGardenSystem?.patches];
    for (const records of systems) {
      if (!Array.isArray(records)) continue;
      for (const record of records) {
        if (record.roomId !== roomId) continue;
        if (!allowed.size || [...allowed].some(kind => String(record.kind ?? record.type ?? '').includes(kind))) record.remaining = 0;
      }
    }
  }

  snapshot() { return { bubbles: this.bubbles.map(item => ({ ...item, clearKinds: [...item.clearKinds] })) }; }
  metrics() { return { heroAdaptationBubbles: this.bubbles.length }; }
}

function applyAdaptation(agent, adaptation) {
  const modifier = {
    clear: { armor: 0, attack: 0, courage: 1, speedMultiplier: 1.08, interruptResistance: 0.08 },
    metal: { armor: 4, attack: 1, courage: 1, speedMultiplier: 0.9, interruptResistance: 0.22 },
    fungal: { armor: 1, attack: 1, courage: 3, speedMultiplier: 0.96, interruptResistance: 0.15 },
    spectral: { armor: 2, attack: 3, courage: 2, speedMultiplier: 1.16, interruptResistance: 0.18 }
  }[adaptation] ?? { armor: 0, attack: 0, courage: 0, speedMultiplier: 1, interruptResistance: 0 };
  agent.heroStatModifiers.adaptation = modifier;
  agent.incorporeal = adaptation === 'spectral';
}

function chooseAdaptation(owner, sim, allowed) {
  const room = (sim?.rooms ?? []).find(room => room.id === owner.roomId);
  const tags = new Set(room?.tags ?? []);
  const props = (sim?.props ?? []).filter(prop => prop.roomId === owner.roomId);
  const scores = { clear: 1, metal: 0, fungal: 0, spectral: 0 };
  if ([...tags].some(tag => /water|flood|spring|clean/.test(tag))) scores.clear += 4;
  if ([...tags].some(tag => /industrial|metal|forge|machine/.test(tag)) || props.some(prop => /metal|scrap|armor/.test(prop.type ?? ''))) scores.metal += 5;
  if ([...tags].some(tag => /fung|spore|garden|soil/.test(tag)) || props.some(prop => /mushroom|spore|fung/.test(prop.type ?? ''))) scores.fungal += 5;
  if ([...tags].some(tag => /death|ossuary|royal|spectral/.test(tag)) || props.some(prop => /corpse|grave|death/.test(prop.type ?? ''))) scores.spectral += 5;
  return [...allowed].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || a.localeCompare(b))[0] ?? 'clear';
}
function tickStatus(agent, key, dt, onExpire) { const status = agent.heroStatuses?.[key]; if (!status) return; status.remaining -= dt; if (status.remaining <= 0) { delete agent.heroStatuses[key]; onExpire?.(); } }
function clearStatuses(agent, keys) { for (const key of keys) { if (key in agent) agent[key] = 0; if (agent.heroStatuses?.[key]) delete agent.heroStatuses[key]; } }
function sameFactionId(agent, factionId) { return factionOf(agent) === factionId; }
function factionOf(agent) { return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null; }
function power(agent) { return (agent.hp ?? 0) + (agent.attack ?? 0) * 5 + (agent.armor ?? 0) * 4; }
function normalizeToken(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
