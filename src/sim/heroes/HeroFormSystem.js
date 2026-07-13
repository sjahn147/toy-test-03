const COURT_ASPECTS = Object.freeze({
  king: { role: 'hero-form-glop-king', name: 'King Aspect', hpRatio: 0.34, attack: 8, armor: 1, courage: 16, size: 'small' },
  guard: { role: 'hero-form-glop-guard', name: 'Guard Aspect', hpRatio: 0.42, attack: 7, armor: 5, courage: 20, size: 'medium' },
  scribe: { role: 'hero-form-glop-scribe', name: 'Scribe Aspect', hpRatio: 0.28, attack: 6, armor: 0, courage: 14, size: 'small' }
});

const SHADE_PROFILE = Object.freeze({ role: 'hero-form-isara-shade', name: 'Procession Shade', hp: 18, attack: 5, armor: 0, courage: 18, size: 'small' });

/**
 * Owns temporary hero-created agents. These forms are real combatants, but are
 * not unique heroes and never enter the ordinary spawn network.
 */
export class HeroFormSystem {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.groups = new Map();
    this.sequence = 0;
    this.events = [];
    this.formsSpawned = 0;
    this.formsMerged = 0;
  }

  initialize(sim) {
    for (const agent of sim?.agents ?? []) {
      if (!agent?.heroFormGroupId) continue;
      const group = this.groups.get(agent.heroFormGroupId) ?? {
        id: agent.heroFormGroupId,
        ownerHeroId: agent.heroFormOf,
        ownerAgentId: agent.heroFormOwnerAgentId ?? null,
        type: agent.heroFormGroupType ?? 'restored',
        roomId: agent.roomId,
        remaining: agent.heroFormRemaining ?? 1,
        formIds: [],
        destroyedKinds: []
      };
      if (!group.formIds.includes(agent.id)) group.formIds.push(agent.id);
      this.groups.set(group.id, group);
    }
  }

  update(dt, sim) {
    for (const group of this.groups.values()) {
      group.remaining -= dt;
      const forms = this.formsFor(group, sim);
      group.roomId = forms.find(form => form.alive !== false && !form.departed)?.roomId ?? group.roomId;
      if (group.type === 'glop-court') this.updateCourt(group, forms, dt, sim);
      if (group.type === 'isara-shades') this.updateShades(group, forms, sim);
    }

    for (const group of [...this.groups.values()]) {
      const forms = this.formsFor(group, sim);
      const living = forms.filter(form => form.alive !== false && !form.departed);
      if (group.type === 'glop-court' && (group.remaining <= 0 || living.length === 0)) this.mergeCourt(group, sim);
      else if (group.type === 'isara-shades' && (group.remaining <= 0 || living.length === 0)) this.expireGroup(group, sim, 'procession-ended');
    }
  }

  decide(agent, sim) {
    if (!agent?.heroFormOf || agent.alive === false || agent.departed || agent.hidden || agent.travel || agent.combat || agent.downed) return null;
    const hostiles = this.hostilesInRoom(agent, sim);
    if (!hostiles.length) return null;
    if (agent.heroFormKind === 'scribe') {
      const target = strongest(hostiles);
      if ((agent.heroFormCooldown ?? 0) <= 0) return { type: 'hero-form-debuff', targetId: target?.id };
    }
    const target = agent.heroFormKind === 'guard' ? strongest(hostiles) : weakest(hostiles);
    return target ? { type: 'hero-form-attack', targetId: target.id } : null;
  }

  resolve(agent, action, sim) {
    if (!agent?.heroFormOf) return false;
    if (action?.type === 'hero-form-attack') {
      const target = (sim?.agents ?? []).find(candidate => candidate.id === action.targetId && candidate.alive !== false && candidate.roomId === agent.roomId);
      if (!target) return false;
      return Boolean(sim?.combatSystem?.startAttack?.(agent, target, sim));
    }
    if (action?.type === 'hero-form-debuff') {
      const target = (sim?.agents ?? []).find(candidate => candidate.id === action.targetId && candidate.alive !== false && candidate.roomId === agent.roomId);
      if (!target) return false;
      target.heroStatuses ??= {};
      if (!target.heroStatuses.courtAnnotation) {
        target.heroStatuses.courtAnnotation = {
          remaining: 4.5,
          originalAttack: target.attack ?? 0,
          sourceId: agent.id
        };
        target.attack = Math.max(1, (target.attack ?? 1) - 2);
      }
      target.combat = null;
      agent.heroFormCooldown = 5;
      sim?.emitEffect?.('hero-form-effect', { roomId: agent.roomId, agentId: target.id, duration: 0.9, formKind: 'scribe', colorRole: 'slime-gold' });
      return true;
    }
    return false;
  }

  splitCourt(hero, { duration = 11, aspects = ['king', 'guard', 'scribe'] } = {}, sim) {
    if (!hero || hero.alive === false || hero.hidden || this.groupForOwner(hero.id)) return false;
    const group = {
      id: `hero-form-group-${this.sequence++}`,
      ownerHeroId: hero.heroId,
      ownerAgentId: hero.id,
      type: 'glop-court',
      roomId: hero.roomId,
      remaining: duration,
      initialHp: hero.hp,
      formIds: [],
      destroyedKinds: []
    };
    hero.hidden = true;
    hero.combat = null;
    hero.heroStatuses ??= {};
    hero.heroStatuses.splitCourt = { groupId: group.id, remaining: duration };
    hero.heroVariant = 'split-court';
    sim?.occupancy?.release?.(hero.id);

    for (const kind of aspects) {
      const profile = COURT_ASPECTS[kind];
      if (!profile) continue;
      const form = this.spawnForm({
        group,
        kind,
        profile: {
          ...profile,
          hp: Math.max(10, Math.round(hero.maxHp * profile.hpRatio))
        },
        owner: hero
      }, sim);
      group.formIds.push(form.id);
    }
    this.groups.set(group.id, group);
    this.emit(`${hero.displayName ?? hero.name} divided into a royal court.`, { type: 'hero-form-split', heroId: hero.heroId, agentId: hero.id, groupId: group.id, roomId: hero.roomId });
    return true;
  }

  raiseShades(hero, { maximum = 2, duration = 9 } = {}, sim) {
    if (!hero || hero.alive === false) return 0;
    const count = Math.max(0, Math.min(3, maximum));
    if (!count) return 0;
    const group = {
      id: `hero-form-group-${this.sequence++}`,
      ownerHeroId: hero.heroId,
      ownerAgentId: hero.id,
      type: 'isara-shades',
      roomId: hero.roomId,
      remaining: duration,
      formIds: [],
      destroyedKinds: []
    };
    for (let index = 0; index < count; index += 1) {
      const form = this.spawnForm({ group, kind: `shade-${index + 1}`, profile: SHADE_PROFILE, owner: hero }, sim);
      group.formIds.push(form.id);
    }
    this.groups.set(group.id, group);
    this.emit(`${hero.displayName ?? hero.name} drew ${count} shades into the procession.`, { type: 'hero-shades-raised', heroId: hero.heroId, agentId: hero.id, groupId: group.id, count, roomId: hero.roomId });
    return count;
  }

  onAgentDeath(agent, sim) {
    if (!agent?.heroFormGroupId) return false;
    const group = this.groups.get(agent.heroFormGroupId);
    if (!group) return false;
    if (agent.heroFormKind && !group.destroyedKinds.includes(agent.heroFormKind)) group.destroyedKinds.push(agent.heroFormKind);
    this.emit(`${agent.name} was dispersed.`, { type: 'hero-form-destroyed', formId: agent.id, ownerHeroId: agent.heroFormOf, formKind: agent.heroFormKind, roomId: agent.roomId });
    return true;
  }

  groupForOwner(ownerAgentId) {
    return [...this.groups.values()].find(group => group.ownerAgentId === ownerAgentId) ?? null;
  }

  formsFor(group, sim) {
    const ids = new Set(group?.formIds ?? []);
    return (sim?.agents ?? []).filter(agent => ids.has(agent.id));
  }

  spawnForm({ group, kind, profile, owner }, sim) {
    const index = (sim?.agents?.length ?? 0) + 1;
    const form = {
      id: `${group.id}-${kind}`,
      index,
      name: `${owner.displayName ?? owner.name} — ${profile.name}`,
      role: profile.role,
      faction: owner.faction,
      ecologyFaction: owner.ecologyFaction,
      roomId: owner.roomId,
      homeRoomId: owner.roomId,
      size: profile.size,
      level: owner.level ?? 8,
      hp: profile.hp,
      maxHp: profile.hp,
      attack: profile.attack,
      baseAttack: profile.attack,
      courage: profile.courage,
      armor: profile.armor,
      speedMultiplier: 1,
      alive: true,
      departed: false,
      hidden: false,
      downed: false,
      travel: null,
      combat: null,
      mood: 'hero-form-reveal',
      heroFormOf: owner.heroId,
      heroFormOwnerAgentId: owner.id,
      heroFormGroupId: group.id,
      heroFormGroupType: group.type,
      heroFormKind: kind,
      heroFormRemaining: group.remaining,
      temporary: true
    };
    sim.agents.push(form);
    sim?.combatSystem?.initializeAgent?.(form);
    sim?.equipmentSystem?.initializeAgent?.(form);
    sim?.occupancy?.placeAgent?.(form, form.roomId);
    sim?.emitEffect?.('hero-form-reveal', { roomId: form.roomId, agentId: form.id, duration: 1.1, formKind: kind, heroId: owner.heroId, colorRole: owner.heroId === 'hero.isara' ? 'undead-veil' : 'slime-gold' });
    this.formsSpawned += 1;
    return form;
  }

  updateCourt(group, forms, dt, sim) {
    const owner = (sim?.agents ?? []).find(agent => agent.id === group.ownerAgentId);
    if (owner?.heroStatuses?.splitCourt) owner.heroStatuses.splitCourt.remaining = Math.max(0, group.remaining);
    for (const form of forms) {
      form.heroFormRemaining = Math.max(0, group.remaining);
      form.heroFormCooldown = Math.max(0, (form.heroFormCooldown ?? 0) - dt);
      if (form.heroFormKind === 'king') this.applyKingAura(form, forms);
      if (form.heroFormKind === 'guard') form.armor = Math.max(form.armor ?? 0, 5);
    }
  }

  updateShades(group, forms, sim) {
    for (const form of forms) {
      form.heroFormRemaining = Math.max(0, group.remaining);
      form.speedMultiplier = 1.14;
      form.heroStatuses ??= {};
      form.heroStatuses.incorporeal = { remaining: Math.max(0, group.remaining) };
    }
  }

  applyKingAura(king, forms) {
    for (const form of forms) {
      if (form.alive === false || form.departed) continue;
      form.heroFormKingBaseCourage ??= form.courage ?? 0;
      form.courage = form.heroFormKingBaseCourage + 2;
    }
  }

  mergeCourt(group, sim) {
    const owner = (sim?.agents ?? []).find(agent => agent.id === group.ownerAgentId);
    const forms = this.formsFor(group, sim);
    const living = forms.filter(form => form.alive !== false && !form.departed);
    const mergeRoom = living[0]?.roomId ?? group.roomId;
    const livingHp = living.reduce((sum, form) => sum + Math.max(0, form.hp ?? 0), 0);
    const totalMax = forms.reduce((sum, form) => sum + Math.max(1, form.maxHp ?? 1), 0);

    this.cleanupForms(forms, sim);
    if (owner && owner.alive !== false) {
      owner.hidden = false;
      owner.roomId = mergeRoom;
      owner.heroVariant = group.destroyedKinds.length ? 'court-diminished' : null;
      owner.heroStatuses ??= {};
      delete owner.heroStatuses.splitCourt;
      owner.heroStatuses.courtLosses = [...new Set([...(owner.heroStatuses.courtLosses ?? []), ...group.destroyedKinds])];
      const survivalRatio = totalMax > 0 ? livingHp / totalMax : 0;
      owner.hp = Math.max(1, Math.min(owner.maxHp, Math.round(group.initialHp * (0.45 + survivalRatio * 0.55))));
      sim?.occupancy?.placeAgent?.(owner, mergeRoom);
      sim?.emitEffect?.('hero-form-merge', { roomId: mergeRoom, agentId: owner.id, duration: 1.25, heroId: owner.heroId, colorRole: 'slime-gold', lostAspects: group.destroyedKinds.length });
    }
    this.groups.delete(group.id);
    this.formsMerged += 1;
    this.emit(`${owner?.displayName ?? 'The court'} became one again.`, { type: 'hero-form-merge', heroId: owner?.heroId ?? group.ownerHeroId, agentId: owner?.id ?? null, groupId: group.id, roomId: mergeRoom, destroyedKinds: [...group.destroyedKinds] });
  }

  expireGroup(group, sim, reason) {
    const forms = this.formsFor(group, sim);
    this.cleanupForms(forms, sim);
    this.groups.delete(group.id);
    this.emit(`Temporary hero forms dispersed (${reason}).`, { type: 'hero-form-expired', heroId: group.ownerHeroId, groupId: group.id, roomId: group.roomId, reason });
  }

  cleanupForms(forms, sim) {
    for (const form of forms) {
      sim?.occupancy?.release?.(form.id);
      form.alive = false;
      form.departed = true;
      form.hidden = true;
      form.combat = null;
      form.travel = null;
    }
  }

  hostilesInRoom(agent, sim) {
    return (sim?.agents ?? []).filter(candidate =>
      candidate.id !== agent.id && candidate.alive !== false && !candidate.departed && !candidate.hidden && !candidate.travel &&
      candidate.roomId === agent.roomId && factionOf(candidate) !== factionOf(agent)
    );
  }

  emit(text, meta = {}) {
    const event = { text, ...meta };
    this.events.unshift(event);
    this.events = this.events.slice(0, 80);
    this.onEvent(text, meta);
  }

  snapshot(sim = null) {
    const agentById = new Map((sim?.agents ?? []).map(agent => [agent.id, agent]));
    return {
      forms: [...this.groups.values()].flatMap(group => group.formIds.map((formId, index) => {
        const form = agentById.get(formId);
        return {
          id: formId,
          groupId: group.id,
          ownerHeroId: group.ownerHeroId,
          ownerAgentId: group.ownerAgentId,
          type: group.type,
          formKind: form?.heroFormKind ?? null,
          role: form?.role ?? null,
          factionId: factionOf(form) ?? null,
          roomId: form?.roomId ?? group.roomId,
          hp: form?.hp ?? null,
          maxHp: form?.maxHp ?? null,
          alive: form ? form.alive !== false : true,
          departed: form?.departed === true,
          remaining: Math.max(0, form?.heroFormRemaining ?? group.remaining),
          destroyedKinds: [...group.destroyedKinds],
          ordinal: index
        };
      })),
      groups: [...this.groups.values()].map(group => ({
        ...group,
        formIds: [...group.formIds],
        destroyedKinds: [...group.destroyedKinds]
      })),
      recentEvents: this.events.map(event => ({ ...event }))
    };
  }

  metrics() {
    return {
      heroFormGroupsActive: this.groups.size,
      heroFormsSpawned: this.formsSpawned,
      heroFormMerges: this.formsMerged
    };
  }
}

function factionOf(agent) {
  return agent?.ecologyFaction ?? agent?.factionId ?? agent?.faction ?? null;
}

function strongest(list) {
  return [...list].sort((a, b) => power(b) - power(a) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function weakest(list) {
  return [...list].sort((a, b) => power(a) - power(b) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function power(agent) {
  return (agent?.hp ?? 0) + (agent?.attack ?? 0) * 4 + (agent?.armor ?? 0) * 3;
}
