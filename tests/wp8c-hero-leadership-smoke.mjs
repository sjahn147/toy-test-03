import assert from 'node:assert/strict';
import { HeroLeadershipSystem } from '../src/sim/heroes/HeroLeadershipSystem.js';

function hero(id, role, faction, roomId) {
  return { id, heroId: id.replace('agent-', 'hero.'), role, faction: 'dungeon', ecologyFaction: faction, roomId, alive: true, attack: 8, courage: 12, armor: 2, speedMultiplier: 1 };
}

// Jijik: friendly blast safety and construction bonuses must be reversible.
{
  const system = new HeroLeadershipSystem();
  const leader = hero('agent-jijik', 'hero-jijik', 'goblin-clan', 'D20');
  leader.heroId = 'hero.jijik';
  const ally = { id: 'goblin-1', role: 'goblin', faction: 'dungeon', ecologyFaction: 'goblin-clan', roomId: 'D20', alive: true, attack: 4, courage: 5, armor: 0, speedMultiplier: 1 };
  const job = { id: 'breach-1', roomId: 'D20', factionId: 'goblin-clan', type: 'breach-wall' };
  const sim = { agents: [leader, ally], rooms: [{ id: 'D20', tags: [] }], constructionSystem: { jobs: [job] } };
  system.update(1, sim);
  assert.equal(ally.heroBlastDamageMultiplier, 0);
  assert.equal(ally.heroBlastImpulseMultiplier, 0.72);
  assert.equal(job.heroSpeedMultiplier, 1.25);
  assert.equal(job.heroStructureDamageBonus, 0.2);
  leader.alive = false;
  system.update(1, sim);
  assert.equal('heroBlastDamageMultiplier' in ally, false, 'optional blast modifier must be removed when leadership ends');
  assert.equal('heroBlastImpulseMultiplier' in ally, false);
  assert.equal('heroSpeedMultiplier' in job, false, 'construction bonus must not become a permanent stale modifier');
  assert.equal('heroStructureDamageBonus' in job, false);
}

// Tissa: flooded movement, fire resistance, and room-route inspection must be reversible.
{
  const system = new HeroLeadershipSystem();
  const leader = hero('agent-tissa', 'hero-tissa', 'copper-tail-clutch', 'C14');
  leader.heroId = 'hero.tissa';
  const ally = { id: 'kobold-1', role: 'kobold', faction: 'dungeon', ecologyFaction: 'copper-tail-clutch', roomId: 'C14', alive: true, attack: 3, courage: 5, armor: 0, speedMultiplier: 1 };
  const room = { id: 'C14', tags: ['flooded'], waterLevel: 1 };
  const sim = { agents: [leader, ally], rooms: [room] };
  system.update(1, sim);
  assert.equal(leader.heroAquaticMode, true);
  assert.equal(ally.speedMultiplier, 1.25);
  assert.equal(ally.heroFireDamageMultiplier, 0.7);
  assert.equal(room.heroRouteInspectionMultiplier, 1.8);
  assert.equal(room.heroWaterHazardSuppression, 0.35);
  leader.alive = false;
  system.update(1, sim);
  assert.equal(ally.speedMultiplier, 1);
  assert.equal('heroFireDamageMultiplier' in ally, false);
  assert.equal('heroRouteInspectionMultiplier' in room, false);
  assert.equal('heroWaterHazardSuppression' in room, false);
  assert.equal(leader.heroAquaticMode, false);
}

// Murga: fear recovery is real progression, while leadership modifiers are removed when she leaves.
{
  const system = new HeroLeadershipSystem();
  const leader = hero('agent-murga', 'hero-murga', 'red-tusk-tribe', 'J48');
  leader.heroId = 'hero.murga';
  const ally = { id: 'orc-1', role: 'orc', faction: 'dungeon', ecologyFaction: 'red-tusk-tribe', roomId: 'J48', alive: true, attack: 6, courage: 10, armor: 1, speedMultiplier: 1, fear: 5 };
  const sim = { agents: [leader, ally], rooms: [{ id: 'J48', tags: [] }] };
  system.update(2, sim);
  assert.equal(ally.courage, 12);
  assert.equal(ally.heroHungerRateMultiplier, 0.55);
  assert.equal(ally.fear, 4.2);
  leader.alive = false;
  system.update(1, sim);
  assert.equal(ally.courage, 10);
  assert.equal('heroHungerRateMultiplier' in ally, false);
  assert.equal(ally.fear, 4.2, 'fear already recovered by Murga should not be added back');
}

console.log('WP8-C hero leadership smoke passed');
