const ability = (id, type, options = {}) => ({
  id,
  type,
  cooldown: options.cooldown ?? 8,
  windup: options.windup ?? 0.8,
  recovery: options.recovery ?? 0.6,
  range: options.range ?? 1.8,
  targetPolicy: options.targetPolicy ?? 'nearest-hostile',
  telegraph: options.telegraph ?? { shape: 'cone', radius: options.range ?? 1.8, cue: id },
  effects: options.effects ?? [],
  priority: options.priority ?? 1,
  requires: options.requires ?? null
});

const unit = ({
  role, name, factionId, parentSpecies, tier, size, stats, siteTypes, siteTier = 1,
  populationCost = 2, globalCap = 4, localCap = 1, costs = {}, bodyPlan, scale = 1,
  animationProfile = null, kit = [], abilities = [], tags = []
}) => ({
  role, name, factionId, parentSpecies, tier, size,
  stats: { hp: 20, attack: 5, courage: 8, speed: 1, ...stats },
  ecology: { siteTypes, siteTier, populationCost, globalCap, localCap, costs, parentSpecies },
  visual: { articulated: true, bodyPlan, scale, animationProfile: animationProfile ?? inferAnimationProfile(bodyPlan), kit },
  abilities,
  tags
});

export const ELITE_BESTIARY = {
  // Brass Button goblins. The champion is a plain faction boss, not an auction-themed abstraction.
  'goblin-tollmaster': unit({
    role: 'goblin-tollmaster', name: 'Brass-Button Tollmaster', factionId: 'goblin-clan', parentSpecies: 'goblin',
    tier: 'specialist', size: 'medium', stats: { hp: 24, attack: 4, courage: 9 },
    siteTypes: ['outpost', 'field-camp', 'core'], costs: { food: 1, stolenGoods: 2 }, bodyPlan: 'goblin', scale: 0.9,
    kit: ['brass-cap', 'ledger', 'toll-sign', 'coin-pouches', 'short-spear'],
    abilities: [ability('set-toll-gate', 'barricade', { cooldown: 14, windup: 1.6, range: 4, targetPolicy: 'room', effects: [{ type: 'slow-zone', duration: 8 }, { type: 'call-reinforcement', role: 'goblin', count: 1 }] })],
    tags: ['controller', 'builder']
  }),
  'goblin-scrap-warden': unit({
    role: 'goblin-scrap-warden', name: 'Scrap Warden', factionId: 'goblin-clan', parentSpecies: 'goblin',
    tier: 'veteran', size: 'medium', stats: { hp: 34, attack: 6, courage: 11, armor: 3, speed: 0.82 },
    siteTypes: ['outpost', 'core'], costs: { scrap: 4, food: 1 }, bodyPlan: 'goblin', scale: 0.98,
    kit: ['scrap-armor', 'pot-shoulder', 'door-shield', 'iron-club', 'spare-plates'],
    abilities: [ability('scrap-bulwark', 'guard', { cooldown: 9, windup: 0.7, effects: [{ type: 'guard-allies', duration: 5, amount: 3 }] }), ability('shield-rush', 'charge', { cooldown: 11, windup: 1.1, range: 4, effects: [{ type: 'damage', amount: 7 }, { type: 'push', distance: 1.5 }] })],
    tags: ['vanguard', 'armored']
  }),
  'goblin-bombardier': unit({
    role: 'goblin-bombardier', name: 'Goblin Bombardier', factionId: 'goblin-clan', parentSpecies: 'goblin',
    tier: 'specialist', size: 'small', stats: { hp: 17, attack: 4, courage: 6, speed: 1.1 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { powder: 1, scrap: 1 }, bodyPlan: 'goblin', scale: 0.72,
    kit: ['goggles', 'bomb-pack', 'fire-pot', 'sling'],
    abilities: [ability('lob-fire-pot', 'area-damage', { cooldown: 8, windup: 1.2, range: 7, targetPolicy: 'hostile-cluster', telegraph: { shape: 'circle', radius: 2.4, cue: 'fuse-hiss' }, effects: [{ type: 'damage-area', amount: 6, radius: 2.4 }, { type: 'hazard', hazard: 'fire', duration: 5 }] })],
    tags: ['artillery']
  }),
  'goblin-market-ogre': unit({
    role: 'goblin-market-ogre', name: 'Market Ogre', factionId: 'goblin-clan', parentSpecies: 'ogre',
    tier: 'large', size: 'large', stats: { hp: 78, attack: 11, courage: 12, armor: 2, speed: 0.72 },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 4, globalCap: 2, costs: { food: 7, stolenGoods: 4 }, bodyPlan: 'ogre', scale: 1.15,
    kit: ['market-stall-back', 'cargo-crates', 'harness', 'pillar-club', 'goblin-riders'],
    abilities: [ability('throw-cargo', 'area-damage', { cooldown: 10, windup: 1.4, range: 6, effects: [{ type: 'damage-area', amount: 9, radius: 2 }, { type: 'spawn-cover', duration: 12 }] }), ability('stall-charge', 'charge', { cooldown: 14, windup: 1.6, range: 5, effects: [{ type: 'damage', amount: 13 }, { type: 'break-structure' }] })],
    tags: ['large', 'carrier', 'siege']
  }),
  'goblin-brass-boss': unit({
    role: 'goblin-brass-boss', name: 'Brass-Button Boss', factionId: 'goblin-clan', parentSpecies: 'goblin',
    tier: 'champion', size: 'medium', stats: { hp: 48, attack: 8, courage: 14, armor: 2, speed: 1.05 },
    siteTypes: ['core'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { food: 4, scrap: 3, stolenGoods: 6 }, bodyPlan: 'goblin', scale: 0.96,
    kit: ['boss-coat', 'brass-crown', 'cutlass', 'pistol-crossbow', 'banner-pack'],
    abilities: [ability('boss-order', 'buff', { cooldown: 12, windup: 0.9, range: 7, targetPolicy: 'allies', effects: [{ type: 'buff-allies', stat: 'attack', amount: 2, duration: 6 }, { type: 'retarget-allies' }] }), ability('dirty-retreat', 'dash', { cooldown: 16, windup: 0.4, range: 5, effects: [{ type: 'smoke', duration: 4 }, { type: 'retreat-to-site' }] })],
    tags: ['champion', 'commander']
  }),

  // Copper-Tail kobolds.
  'kobold-gear-shell': unit({
    role: 'kobold-gear-shell', name: 'Gear-Shell Workguard', factionId: 'copper-tail-clutch', parentSpecies: 'kobold',
    tier: 'veteran', size: 'medium', stats: { hp: 36, attack: 6, courage: 10, armor: 4, speed: 0.78 },
    siteTypes: ['outpost', 'core'], costs: { scrap: 4, mechanismParts: 2 }, bodyPlan: 'kobold-frame', scale: 1,
    kit: ['boiler-chest', 'piston-legs', 'gear-shoulders', 'plate-shield', 'wrench-spear', 'wind-key'],
    abilities: [ability('lock-frame', 'guard', { cooldown: 9, windup: 0.8, effects: [{ type: 'self-armor', amount: 5, duration: 5 }, { type: 'taunt', radius: 3 }] }), ability('steam-vent', 'cone-damage', { cooldown: 12, windup: 1.2, range: 3.5, effects: [{ type: 'damage-area', amount: 6, radius: 3 }, { type: 'blind', duration: 2 }] })],
    tags: ['vanguard', 'construct-suit']
  }),
  'kobold-sluice-diver': unit({
    role: 'kobold-sluice-diver', name: 'Sluice Diver', factionId: 'copper-tail-clutch', parentSpecies: 'kobold',
    tier: 'specialist', size: 'medium', stats: { hp: 25, attack: 5, courage: 8, speed: 1.05 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { scrap: 2, air: 1 }, bodyPlan: 'kobold', scale: 0.86,
    kit: ['diving-helmet', 'air-tanks', 'hose-belt', 'valve-wrench', 'harpoon', 'flippers'],
    abilities: [ability('open-sluice', 'hazard', { cooldown: 15, windup: 2, range: 5, targetPolicy: 'room', effects: [{ type: 'hazard', hazard: 'flood', duration: 10 }, { type: 'slow-hostiles', duration: 5 }] }), ability('harpoon', 'pull', { cooldown: 8, windup: 0.9, range: 5, effects: [{ type: 'damage', amount: 5 }, { type: 'pull', distance: 2 }] })],
    tags: ['controller', 'water-adapted']
  }),
  'kobold-powder-sapper': unit({
    role: 'kobold-powder-sapper', name: 'Powder-Tail Sapper', factionId: 'copper-tail-clutch', parentSpecies: 'kobold',
    tier: 'specialist', size: 'small', stats: { hp: 19, attack: 4, courage: 6, speed: 1.12 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { powder: 2, scrap: 1 }, bodyPlan: 'kobold', scale: 0.74,
    kit: ['powder-keg-back', 'fuse-tail', 'blast-stick', 'lantern', 'tool-belt'],
    abilities: [ability('place-charge', 'delayed-bomb', { cooldown: 12, windup: 1.5, range: 2, targetPolicy: 'structure-or-large', telegraph: { shape: 'circle', radius: 2.8, cue: 'burning-fuse' }, effects: [{ type: 'damage-area', amount: 12, radius: 2.8 }, { type: 'break-structure' }] })],
    tags: ['siege', 'builder']
  }),
  'kobold-burrow-engine': unit({
    role: 'kobold-burrow-engine', name: 'Copper-Tail Burrow Engine', factionId: 'copper-tail-clutch', parentSpecies: 'kobold',
    tier: 'large', size: 'large', stats: { hp: 82, attack: 10, courage: 15, armor: 5, speed: 0.62 },
    siteTypes: ['core'], siteTier: 2, populationCost: 4, globalCap: 1, costs: { scrap: 10, mechanismParts: 6, powder: 2 }, bodyPlan: 'drill-construct', scale: 1.1,
    kit: ['triple-drill', 'six-legs', 'three-cockpits', 'scrap-bin', 'stabilizers'],
    abilities: [ability('drill-rush', 'charge', { cooldown: 14, windup: 2, range: 6, effects: [{ type: 'damage', amount: 15 }, { type: 'break-structure' }, { type: 'push', distance: 2 }] }), ability('deploy-repair-post', 'spawn-site', { cooldown: 30, windup: 3, range: 1, targetPolicy: 'room', effects: [{ type: 'establish-field-camp', species: 'kobold' }] })],
    tags: ['large', 'construct', 'siege', 'builder']
  }),
  'kobold-master-trapper': unit({
    role: 'kobold-master-trapper', name: 'Copper-Tail Master Trapper', factionId: 'copper-tail-clutch', parentSpecies: 'kobold',
    tier: 'champion', size: 'medium', stats: { hp: 42, attack: 7, courage: 13, armor: 2, speed: 1.05 },
    siteTypes: ['core'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { scrap: 6, mechanismParts: 5, powder: 2 }, bodyPlan: 'kobold', scale: 0.9,
    kit: ['master-goggles', 'trap-rack', 'clockwork-crossbow', 'wire-spools', 'tool-apron'],
    abilities: [ability('trap-web', 'build-traps', { cooldown: 10, windup: 1.4, range: 5, targetPolicy: 'room', effects: [{ type: 'build-trap', count: 2, charges: 2 }] }), ability('remote-trigger', 'trigger-traps', { cooldown: 13, windup: 0.6, range: 8, effects: [{ type: 'trigger-friendly-traps' }] })],
    tags: ['champion', 'builder', 'controller']
  }),

  // Red-Tusk orcs.
  'orc-shield-wall': unit({
    role: 'orc-shield-wall', name: 'Red-Tusk Shieldwall', factionId: 'red-tusk-tribe', parentSpecies: 'orc',
    tier: 'veteran', size: 'medium', stats: { hp: 42, attack: 7, courage: 13, armor: 4, speed: 0.82 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { meat: 2, weapons: 2 }, bodyPlan: 'orc-heavy', scale: 1,
    kit: ['tower-shield', 'short-spear', 'shoulder-plates', 'red-banner'],
    abilities: [ability('form-shieldwall', 'formation', { cooldown: 6, windup: 0.6, effects: [{ type: 'formation-armor', amount: 4, duration: 7 }, { type: 'guard-allies', duration: 7, amount: 2 }] }), ability('shield-shove', 'push', { cooldown: 8, windup: 0.8, range: 2, effects: [{ type: 'damage', amount: 6 }, { type: 'push', distance: 2 }] })],
    tags: ['vanguard', 'formation']
  }),
  'orc-butcher-priest': unit({
    role: 'orc-butcher-priest', name: 'Butcher-Priest', factionId: 'red-tusk-tribe', parentSpecies: 'orc',
    tier: 'specialist', size: 'medium', stats: { hp: 34, attack: 7, courage: 12, speed: 0.9 },
    siteTypes: ['outpost', 'core'], costs: { meat: 3, trophy: 1 }, bodyPlan: 'orc', scale: 0.96,
    kit: ['butcher-apron', 'rib-charms', 'meat-hooks', 'cleaver', 'blood-bowl'],
    abilities: [ability('blood-feast', 'heal', { cooldown: 12, windup: 1.4, range: 5, targetPolicy: 'injured-allies', effects: [{ type: 'heal-allies', amount: 8, radius: 5 }, { type: 'buff-allies', stat: 'attack', amount: 2, duration: 5 }] }), ability('dress-corpse', 'corpse-consume', { cooldown: 9, windup: 1.8, range: 2, targetPolicy: 'corpse', effects: [{ type: 'consume-corpse-resource', resource: 'meat', amount: 3 }] })],
    tags: ['support', 'corpse-user']
  }),
  'orc-chainmaster': unit({
    role: 'orc-chainmaster', name: 'Red-Pit Chainmaster', factionId: 'red-tusk-tribe', parentSpecies: 'orc',
    tier: 'elite', size: 'medium', stats: { hp: 40, attack: 8, courage: 14, armor: 2 },
    siteTypes: ['outpost', 'core'], costs: { meat: 2, weapons: 3, trophy: 1 }, bodyPlan: 'orc', scale: 0.98,
    kit: ['arena-helm', 'chain-hook', 'chain-coil', 'buckler'],
    abilities: [ability('chain-drag', 'pull', { cooldown: 8, windup: 1.2, range: 7, targetPolicy: 'ranged-hostile', effects: [{ type: 'damage', amount: 6 }, { type: 'pull', distance: 3 }, { type: 'slow', duration: 2 }] })],
    tags: ['controller', 'skirmisher']
  }),
  'orc-siege-bearer': unit({
    role: 'orc-siege-bearer', name: 'Siege Harness Brute', factionId: 'red-tusk-tribe', parentSpecies: 'orc',
    tier: 'large', size: 'large', stats: { hp: 92, attack: 13, courage: 16, armor: 4, speed: 0.65 },
    siteTypes: ['outpost', 'core'], siteTier: 2, populationCost: 4, globalCap: 2, costs: { meat: 6, weapons: 4, timber: 3 }, bodyPlan: 'orc-large', scale: 1.15,
    kit: ['siege-frame', 'battering-ram', 'braziers', 'ammo-sacks', 'iron-hammer'],
    abilities: [ability('battering-charge', 'charge', { cooldown: 14, windup: 1.8, range: 6, effects: [{ type: 'damage', amount: 16 }, { type: 'break-structure' }, { type: 'knockdown', duration: 2 }] }), ability('drop-brazier', 'hazard', { cooldown: 16, windup: 1.2, range: 3, effects: [{ type: 'hazard', hazard: 'fire', duration: 7 }] })],
    tags: ['large', 'siege']
  }),
  'orc-war-chief': unit({
    role: 'orc-war-chief', name: 'Red-Tusk War Chief', factionId: 'red-tusk-tribe', parentSpecies: 'orc',
    tier: 'champion', size: 'large', stats: { hp: 76, attack: 12, courage: 18, armor: 4, speed: 0.9 },
    siteTypes: ['core'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { meat: 7, weapons: 5, trophy: 6 }, bodyPlan: 'orc-heavy', scale: 1.12,
    kit: ['chieftain-helm', 'great-axe', 'trophy-cloak', 'war-horn'],
    abilities: [ability('war-horn', 'buff', { cooldown: 14, windup: 1, range: 8, targetPolicy: 'allies', effects: [{ type: 'buff-allies', stat: 'attack', amount: 3, duration: 7 }, { type: 'buff-allies', stat: 'speed', amount: 0.2, duration: 7 }] }), ability('chieftain-cleave', 'cone-damage', { cooldown: 9, windup: 1.1, range: 3, effects: [{ type: 'damage-area', amount: 12, radius: 3 }, { type: 'fear', duration: 2 }] })],
    tags: ['champion', 'commander']
  }),

  // Conventional fantasy undead form the medium roster: skeletons, ghouls, ghasts, wights and wraiths.
  'skeleton-guard': unit({
    role: 'skeleton-guard', name: 'Skeleton Guard', factionId: 'undead-host', parentSpecies: 'skeleton',
    tier: 'veteran', size: 'medium', stats: { hp: 28, attack: 6, courage: 20, armor: 3, speed: 0.86 },
    siteTypes: ['field-camp', 'outpost', 'core', 'emergent'], costs: { bones: 3 }, bodyPlan: 'skeleton', scale: 0.92,
    kit: ['rusted-helm', 'round-shield', 'spear', 'bone-mail'],
    abilities: [ability('brace-spears', 'guard', { cooldown: 7, windup: 0.7, effects: [{ type: 'self-armor', amount: 3, duration: 5 }, { type: 'counter-charge', amount: 7 }] })],
    tags: ['vanguard', 'undead']
  }),
  'skeleton-archer': unit({
    role: 'skeleton-archer', name: 'Skeleton Archer', factionId: 'undead-host', parentSpecies: 'skeleton',
    tier: 'specialist', size: 'medium', stats: { hp: 22, attack: 6, courage: 20, speed: 0.92 },
    siteTypes: ['outpost', 'core', 'emergent'], costs: { bones: 2, weapons: 1 }, bodyPlan: 'skeleton', scale: 0.9,
    kit: ['bone-bow', 'grave-quiver', 'hood-rags'],
    abilities: [ability('grave-volley', 'area-damage', { cooldown: 10, windup: 1.3, range: 8, targetPolicy: 'hostile-cluster', telegraph: { shape: 'circle', radius: 2.2, cue: 'bow-creak' }, effects: [{ type: 'damage-area', amount: 7, radius: 2.2 }, { type: 'slow', duration: 2 }] })],
    tags: ['artillery', 'undead']
  }),
  'skeleton-knight': unit({
    role: 'skeleton-knight', name: 'Skeleton Knight', factionId: 'undead-host', parentSpecies: 'skeleton',
    tier: 'elite', size: 'medium', stats: { hp: 46, attack: 9, courage: 20, armor: 5, speed: 0.8 },
    siteTypes: ['outpost', 'core'], siteTier: 2, costs: { bones: 5, weapons: 3, deathEnergy: 1 }, bodyPlan: 'skeleton', scale: 1,
    kit: ['full-plate', 'greatsword', 'tattered-surcoat', 'plume'],
    abilities: [ability('grave-cleave', 'cone-damage', { cooldown: 8, windup: 1.1, range: 3, effects: [{ type: 'damage-area', amount: 10, radius: 3 }] }), ability('deathless-stand', 'guard', { cooldown: 16, windup: 0.6, effects: [{ type: 'prevent-death', duration: 4 }, { type: 'self-armor', amount: 5, duration: 4 }] })],
    tags: ['vanguard', 'undead']
  }),
  ghoul: unit({
    role: 'ghoul', name: 'Ghoul', factionId: 'undead-host', parentSpecies: 'zombie',
    tier: 'veteran', size: 'medium', stats: { hp: 32, attack: 8, courage: 15, speed: 1.18 },
    siteTypes: ['field-camp', 'outpost', 'core', 'emergent'], costs: { corpses: 2 }, bodyPlan: 'ghoul', scale: 0.92,
    kit: ['long-claws', 'hunched-spine', 'torn-shroud'],
    abilities: [ability('ghoul-pounce', 'charge', { cooldown: 8, windup: 0.8, range: 4, effects: [{ type: 'damage', amount: 8 }, { type: 'knockdown', duration: 1.4 }] }), ability('corpse-feast', 'corpse-consume', { cooldown: 10, windup: 1.5, targetPolicy: 'corpse', effects: [{ type: 'consume-corpse-heal', amount: 12 }] })],
    tags: ['skirmisher', 'corpse-user', 'undead']
  }),
  ghast: unit({
    role: 'ghast', name: 'Ghast', factionId: 'undead-host', parentSpecies: 'zombie',
    tier: 'elite', size: 'medium', stats: { hp: 45, attack: 10, courage: 18, speed: 1.05 },
    siteTypes: ['outpost', 'core'], siteTier: 2, costs: { corpses: 4, deathEnergy: 2 }, bodyPlan: 'ghoul', scale: 1.05,
    kit: ['long-claws', 'hunched-spine', 'rotting-mane', 'stink-cloud'],
    abilities: [ability('ghast-stench', 'aura', { cooldown: 12, windup: 1, range: 4, targetPolicy: 'room-hostiles', effects: [{ type: 'fear', duration: 2.5 }, { type: 'weaken', amount: 2, duration: 5 }] }), ability('rending-flurry', 'multi-hit', { cooldown: 8, windup: 0.9, range: 2, effects: [{ type: 'damage', amount: 5, hits: 3 }] })],
    tags: ['controller', 'undead']
  }),
  wight: unit({
    role: 'wight', name: 'Barrow Wight', factionId: 'undead-host', parentSpecies: 'wraith',
    tier: 'elite', size: 'medium', stats: { hp: 48, attack: 10, courage: 20, armor: 3, speed: 0.95 },
    siteTypes: ['outpost', 'core'], siteTier: 2, costs: { deathEnergy: 4, bones: 2 }, bodyPlan: 'wight', scale: 1,
    kit: ['barrow-mail', 'black-blade', 'grave-crown', 'spectral-eyes'],
    abilities: [ability('life-drain-blade', 'drain', { cooldown: 9, windup: 1, range: 2.4, effects: [{ type: 'damage', amount: 9 }, { type: 'heal-self', amount: 7 }] }), ability('command-dead', 'buff', { cooldown: 13, windup: 1.1, range: 6, targetPolicy: 'allies', effects: [{ type: 'buff-allies', stat: 'attack', amount: 2, duration: 6 }, { type: 'retarget-allies' }] })],
    tags: ['commander', 'undead']
  }),
  'wraith-lord': unit({
    role: 'wraith-lord', name: 'Wraith Lord', factionId: 'undead-host', parentSpecies: 'wraith',
    tier: 'elite', size: 'large', stats: { hp: 52, attack: 11, courage: 20, speed: 1.05, ethereal: true },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 4, globalCap: 2, costs: { deathEnergy: 7 }, bodyPlan: 'spectral', scale: 1.2,
    kit: ['spectral-crown', 'great-scythe', 'torn-mantle', 'soul-lanterns'],
    abilities: [ability('soul-sweep', 'cone-damage', { cooldown: 9, windup: 1.3, range: 4, effects: [{ type: 'damage-area', amount: 11, radius: 4 }, { type: 'drain-all', amount: 4 }] }), ability('phase-step', 'dash', { cooldown: 10, windup: 0.4, range: 5, effects: [{ type: 'teleport-behind-target' }] })],
    tags: ['large', 'spectral', 'undead']
  }),
  'death-knight': unit({
    role: 'death-knight', name: 'Death Knight', factionId: 'undead-host', parentSpecies: 'skeleton',
    tier: 'champion', size: 'large', stats: { hp: 88, attack: 13, courage: 20, armor: 6, speed: 0.88 },
    siteTypes: ['core'], siteTier: 3, populationCost: 6, globalCap: 1, costs: { bones: 8, weapons: 5, deathEnergy: 10 }, bodyPlan: 'skeleton-heavy', scale: 1.15,
    kit: ['black-plate', 'rune-greatsword', 'horned-helm', 'grave-cloak'],
    abilities: [ability('deathly-challenge', 'taunt', { cooldown: 12, windup: 0.8, range: 6, targetPolicy: 'strongest-hostile', effects: [{ type: 'taunt', duration: 5 }, { type: 'self-armor', amount: 4, duration: 5 }] }), ability('black-rune-cleave', 'area-damage', { cooldown: 10, windup: 1.5, range: 4, effects: [{ type: 'damage-area', amount: 15, radius: 4 }, { type: 'death-hazard', duration: 6 }] })],
    tags: ['champion', 'vanguard', 'undead']
  }),
  'bone-golem': unit({
    role: 'bone-golem', name: 'Bone Golem', factionId: 'undead-host', parentSpecies: 'skeleton',
    tier: 'large', size: 'large', stats: { hp: 96, attack: 12, courage: 20, armor: 5, speed: 0.62 },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 5, globalCap: 2, costs: { bones: 12, deathEnergy: 3 }, bodyPlan: 'bone-golem', scale: 1.2,
    kit: ['bone-cage-torso', 'skull-shoulders', 'femur-club', 'rib-shield'],
    abilities: [ability('bone-slam', 'area-damage', { cooldown: 10, windup: 1.5, range: 3, effects: [{ type: 'damage-area', amount: 13, radius: 3 }, { type: 'knockdown', duration: 1.5 }] }), ability('rebuild-from-bones', 'heal', { cooldown: 18, windup: 2.2, targetPolicy: 'corpse', effects: [{ type: 'consume-bones-heal', amount: 18 }] })],
    tags: ['large', 'construct', 'undead']
  }),
  'crypt-horror': unit({
    role: 'crypt-horror', name: 'Crypt Horror', factionId: 'undead-host', parentSpecies: 'ghoul',
    tier: 'large', size: 'large', stats: { hp: 84, attack: 14, courage: 18, speed: 0.82 },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 5, globalCap: 2, costs: { corpses: 8, deathEnergy: 3 }, bodyPlan: 'ghoul-large', scale: 1.22,
    kit: ['massive-claws', 'hunched-spine', 'grave-stones-back', 'jaw-tusks'],
    abilities: [ability('crypt-leap', 'charge', { cooldown: 12, windup: 1.3, range: 6, effects: [{ type: 'damage-area', amount: 13, radius: 2.5 }, { type: 'knockdown', duration: 2 }] }), ability('devour-fallen', 'corpse-consume', { cooldown: 9, windup: 1.6, targetPolicy: 'corpse-or-downed', effects: [{ type: 'consume-corpse-heal', amount: 20 }] })],
    tags: ['large', 'predator', 'undead']
  }),
  'corpse-colossus': unit({
    role: 'corpse-colossus', name: 'Corpse Colossus', factionId: 'undead-host', parentSpecies: 'zombie',
    tier: 'abomination', size: 'huge', stats: { hp: 128, attack: 15, courage: 20, armor: 3, speed: 0.48 },
    siteTypes: ['core', 'event'], siteTier: 3, populationCost: 7, globalCap: 1, costs: { corpses: 14, deathEnergy: 6 }, bodyPlan: 'corpse-colossus', scale: 1.35,
    kit: ['stitched-torsos', 'multiple-arms', 'coffin-plate', 'corpse-sacks'],
    abilities: [ability('many-arm-sweep', 'area-damage', { cooldown: 10, windup: 1.7, range: 4.5, effects: [{ type: 'damage-area', amount: 16, radius: 4.5 }, { type: 'push', distance: 2 }] }), ability('shed-zombies', 'summon', { cooldown: 18, windup: 2.4, range: 2, effects: [{ type: 'summon', role: 'zombie', count: 2 }] })],
    tags: ['abomination', 'huge', 'undead']
  }),
  'bell-tower-revenant': unit({
    role: 'bell-tower-revenant', name: 'Bell-Tower Revenant', factionId: 'undead-host', parentSpecies: 'wight',
    tier: 'abomination', size: 'huge', stats: { hp: 112, attack: 12, courage: 20, armor: 4, speed: 0.5 },
    siteTypes: ['core', 'event'], siteTier: 3, populationCost: 7, globalCap: 1, costs: { bones: 10, deathEnergy: 12 }, bodyPlan: 'bell-revenant', scale: 1.35,
    kit: ['rib-bell-body', 'spine-clapper', 'bone-tripod', 'funeral-cloths'],
    abilities: [ability('funeral-toll', 'area-control', { cooldown: 14, windup: 2.4, range: 8, targetPolicy: 'room-hostiles', telegraph: { shape: 'ring', radius: 8, cue: 'bell-swing' }, effects: [{ type: 'interrupt' }, { type: 'fear', duration: 3 }, { type: 'summon-from-corpses', role: 'skeleton', count: 2 }] })],
    tags: ['abomination', 'huge', 'controller', 'undead']
  }),

  // Bluecap fungal ecology.
  'myconid-shepherd': unit({
    role: 'myconid-shepherd', name: 'Bluecap Shepherd', factionId: 'bluecap-colony', parentSpecies: 'myconid',
    tier: 'specialist', size: 'medium', stats: { hp: 30, attack: 5, courage: 10, speed: 0.84 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { spore: 2, biomass: 2 }, bodyPlan: 'fungal', scale: 0.98,
    kit: ['wide-blue-cap', 'root-tentacles', 'spore-pouches', 'seedlings-back'],
    abilities: [ability('plant-spore-bed', 'spawn-site', { cooldown: 22, windup: 2.4, targetPolicy: 'room', effects: [{ type: 'establish-field-camp', species: 'myconid' }] }), ability('soothing-spores', 'heal', { cooldown: 11, windup: 1.2, range: 4, targetPolicy: 'allies', effects: [{ type: 'heal-allies', amount: 6, radius: 4 }] })],
    tags: ['support', 'builder']
  }),
  'myconid-spore-thrower': unit({
    role: 'myconid-spore-thrower', name: 'Spore Thrower', factionId: 'bluecap-colony', parentSpecies: 'myconid',
    tier: 'specialist', size: 'medium', stats: { hp: 26, attack: 6, courage: 9, speed: 0.78 },
    siteTypes: ['outpost', 'core'], costs: { spore: 3, biomass: 1 }, bodyPlan: 'fungal', scale: 1,
    kit: ['bell-cap', 'spore-sacs', 'long-stem-arms'],
    abilities: [ability('sleep-spore-shell', 'area-control', { cooldown: 10, windup: 1.4, range: 8, targetPolicy: 'hostile-cluster', telegraph: { shape: 'circle', radius: 2.5, cue: 'spore-sac-inflate' }, effects: [{ type: 'sleep-area', duration: 3, radius: 2.5 }] })],
    tags: ['artillery', 'controller']
  }),
  'myconid-pillar-walker': unit({
    role: 'myconid-pillar-walker', name: 'Pillar Walker', factionId: 'bluecap-colony', parentSpecies: 'myconid',
    tier: 'large', size: 'large', stats: { hp: 86, attack: 10, courage: 15, armor: 4, speed: 0.5 },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 4, globalCap: 2, costs: { spore: 6, biomass: 7 }, bodyPlan: 'fungal-pillar', scale: 1.25,
    kit: ['three-root-legs', 'pillar-cap', 'branch-arms', 'glow-gills'],
    abilities: [ability('rooted-bulwark', 'guard', { cooldown: 12, windup: 1.5, effects: [{ type: 'self-armor', amount: 7, duration: 8 }, { type: 'spawn-cover', duration: 8 }] }), ability('root-stomp', 'area-damage', { cooldown: 10, windup: 1.3, range: 3.5, effects: [{ type: 'damage-area', amount: 11, radius: 3.5 }, { type: 'root', duration: 2 }] })],
    tags: ['large', 'vanguard']
  }),
  'myconid-corpse-orchard': unit({
    role: 'myconid-corpse-orchard', name: 'Walking Corpse Orchard', factionId: 'bluecap-colony', parentSpecies: 'myconid',
    tier: 'abomination', size: 'large', stats: { hp: 94, attack: 8, courage: 16, speed: 0.48 },
    siteTypes: ['core', 'emergent'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { biomass: 8, corpses: 3, spore: 5 }, bodyPlan: 'corpse-orchard', scale: 1.2,
    kit: ['corpse-stems', 'multiple-caps', 'central-spore-sac', 'root-legs'],
    abilities: [ability('orchard-bloom', 'summon', { cooldown: 16, windup: 2.1, range: 4, effects: [{ type: 'summon', role: 'myconid', count: 2 }, { type: 'hazard', hazard: 'spores', duration: 7 }] }), ability('root-feed', 'corpse-consume', { cooldown: 10, windup: 1.8, targetPolicy: 'corpse', effects: [{ type: 'consume-corpse-heal', amount: 16 }, { type: 'add-site-resource', resource: 'biomass', amount: 2 }] })],
    tags: ['abomination', 'producer']
  }),

  // Red-Silk spiders.
  'spider-cocoon-bearer': unit({
    role: 'spider-cocoon-bearer', name: 'Cocoon Bearer', factionId: 'red-wing-brood', parentSpecies: 'spider',
    tier: 'veteran', size: 'medium', stats: { hp: 34, attack: 7, courage: 11, speed: 0.9 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { silk: 2, hosts: 1 }, bodyPlan: 'arachnid', scale: 0.95,
    kit: ['broad-abdomen', 'cocoon-back', 'grasping-front-legs', 'silk-sacs'],
    abilities: [ability('cocoon-grab', 'capture', { cooldown: 10, windup: 1.1, range: 2, targetPolicy: 'downed-hostile', effects: [{ type: 'capture-downed' }] }), ability('drop-cocoon-cover', 'spawn-cover', { cooldown: 14, windup: 0.8, range: 2, effects: [{ type: 'spawn-cover', duration: 10 }] })],
    tags: ['carrier', 'capture']
  }),
  'spider-silk-mason': unit({
    role: 'spider-silk-mason', name: 'Silk Mason', factionId: 'red-wing-brood', parentSpecies: 'spider',
    tier: 'specialist', size: 'medium', stats: { hp: 28, attack: 5, courage: 9, speed: 0.86 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { silk: 4 }, bodyPlan: 'arachnid', scale: 0.9,
    kit: ['spindle-abdomen', 'four-spinnerets', 'hooked-forelegs', 'folded-silk-membrane'],
    abilities: [ability('web-barricade', 'barricade', { cooldown: 12, windup: 1.8, range: 4, targetPolicy: 'room', effects: [{ type: 'web-zone', duration: 10 }, { type: 'slow-zone', duration: 10 }] }), ability('silk-snare', 'root', { cooldown: 8, windup: 0.8, range: 5, effects: [{ type: 'root', duration: 2.5 }] })],
    tags: ['builder', 'controller']
  }),
  'spider-well-strider': unit({
    role: 'spider-well-strider', name: 'Well Strider', factionId: 'red-wing-brood', parentSpecies: 'spider',
    tier: 'large', size: 'large', stats: { hp: 72, attack: 11, courage: 14, speed: 1.05 },
    siteTypes: ['outpost', 'core'], siteTier: 2, populationCost: 4, globalCap: 2, costs: { silk: 6, hosts: 2 }, bodyPlan: 'arachnid-long', scale: 1.2,
    kit: ['long-legs', 'narrow-body', 'wall-hooks', 'fangs'],
    abilities: [ability('vertical-ambush', 'teleport-strike', { cooldown: 12, windup: 1.4, range: 7, targetPolicy: 'isolated-hostile', effects: [{ type: 'teleport-behind-target' }, { type: 'damage', amount: 13 }, { type: 'web', duration: 2 }] }), ability('leg-sweep', 'area-damage', { cooldown: 9, windup: 1, range: 3.5, effects: [{ type: 'damage-area', amount: 9, radius: 3.5 }, { type: 'push', distance: 1.5 }] })],
    tags: ['large', 'ambusher']
  }),
  'spider-brood-matriarch': unit({
    role: 'spider-brood-matriarch', name: 'Brood Matriarch', factionId: 'red-wing-brood', parentSpecies: 'spider',
    tier: 'champion', size: 'large', stats: { hp: 90, attack: 11, courage: 17, armor: 2, speed: 0.78 },
    siteTypes: ['core'], siteTier: 3, populationCost: 6, globalCap: 1, costs: { silk: 10, hosts: 5, blood: 5 }, bodyPlan: 'arachnid', scale: 1.3,
    kit: ['brood-sacs', 'crown-spines', 'egg-clusters', 'massive-fangs'],
    abilities: [ability('lay-egg-clutch', 'summon', { cooldown: 17, windup: 2.2, range: 3, effects: [{ type: 'summon', role: 'spider', count: 3 }] }), ability('brood-command', 'buff', { cooldown: 13, windup: 0.9, range: 7, targetPolicy: 'allies', effects: [{ type: 'buff-allies', stat: 'speed', amount: 0.25, duration: 6 }, { type: 'retarget-allies' }] })],
    tags: ['champion', 'producer']
  }),

  // Pale laboratory parasites.
  'parasite-pale-steward': unit({
    role: 'parasite-pale-steward', name: 'Pale Steward', factionId: 'pale-brood', parentSpecies: 'parasite',
    tier: 'specialist', size: 'medium', stats: { hp: 28, attack: 6, courage: 10, speed: 0.95 },
    siteTypes: ['outpost', 'core', 'emergent'], costs: { hosts: 1, reagents: 1 }, bodyPlan: 'humanoid', scale: 0.92,
    kit: ['steward-clothes', 'neck-parasite', 'split-jaw', 'clouded-eye'],
    abilities: [ability('false-aid', 'infect', { cooldown: 11, windup: 1.1, range: 2, targetPolicy: 'injured-hostile', effects: [{ type: 'infect', duration: 12 }] }), ability('reveal-host', 'transform', { cooldown: 18, windup: 0.5, effects: [{ type: 'buff-self', stat: 'attack', amount: 4, duration: 8 }, { type: 'fear', duration: 1.5 }] })],
    tags: ['infiltrator', 'infectious']
  }),
  'parasite-vacant-host': unit({
    role: 'parasite-vacant-host', name: 'Vacant Host', factionId: 'pale-brood', parentSpecies: 'parasite',
    tier: 'veteran', size: 'medium', stats: { hp: 38, attack: 8, courage: 14, speed: 0.9 },
    siteTypes: ['outpost', 'core', 'emergent'], costs: { hosts: 2 }, bodyPlan: 'vacant-host', scale: 1,
    kit: ['hollow-torso', 'rib-doors', 'internal-larvae', 'long-arms'],
    abilities: [ability('larval-burst', 'summon', { cooldown: 13, windup: 1.4, range: 3, effects: [{ type: 'summon', role: 'parasite', count: 2 }, { type: 'damage-area', amount: 5, radius: 2 }] })],
    tags: ['summoner', 'infectious']
  }),
  'parasite-needle-choir': unit({
    role: 'parasite-needle-choir', name: 'Needle Choir', factionId: 'pale-brood', parentSpecies: 'parasite',
    tier: 'specialist', size: 'medium', stats: { hp: 30, attack: 7, courage: 14, speed: 1.08 },
    siteTypes: ['outpost', 'core'], costs: { hosts: 2, reagents: 2 }, bodyPlan: 'swarm', scale: 0.95,
    kit: ['needle-larvae', 'nerve-cords', 'central-ganglion'],
    abilities: [ability('needle-surge', 'multi-hit', { cooldown: 8, windup: 0.9, range: 4, targetPolicy: 'nearest-hostile', effects: [{ type: 'damage', amount: 3, hits: 4 }, { type: 'weaken', amount: 2, duration: 4 }] }), ability('chorus-react', 'counter', { cooldown: 10, windup: 0.2, effects: [{ type: 'counter-damage', amount: 4 }] })],
    tags: ['swarm', 'skirmisher']
  }),
  'parasite-walking-vat': unit({
    role: 'parasite-walking-vat', name: 'Walking Vat', factionId: 'pale-brood', parentSpecies: 'parasite',
    tier: 'large', size: 'large', stats: { hp: 88, attack: 7, courage: 18, armor: 4, speed: 0.52 },
    siteTypes: ['core'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { hosts: 4, reagents: 7, scrap: 5 }, bodyPlan: 'walking-vat', scale: 1.2,
    kit: ['glass-tank', 'four-mechanical-legs', 'fluid-core', 'reagent-canisters', 'control-panel'],
    abilities: [ability('release-specimens', 'summon', { cooldown: 16, windup: 2, range: 3, effects: [{ type: 'summon', role: 'parasite', count: 3 }] }), ability('reagent-spray', 'cone-damage', { cooldown: 10, windup: 1.2, range: 4, effects: [{ type: 'damage-area', amount: 7, radius: 4 }, { type: 'infect', duration: 8 }] })],
    tags: ['large', 'construct', 'producer']
  }),

  // Secondary ecologies.
  'slime-rust-bloom': unit({
    role: 'slime-rust-bloom', name: 'Rust Bloom Slime', factionId: 'slime-bloom', parentSpecies: 'slime',
    tier: 'specialist', size: 'medium', stats: { hp: 34, attack: 6, courage: 12, speed: 0.72 },
    siteTypes: ['field-camp', 'outpost', 'core', 'emergent'], costs: { biomass: 2, metal: 2 }, bodyPlan: 'slime', scale: 1.05,
    kit: ['rust-scrap-inside', 'acid-bubbles', 'iron-core'],
    abilities: [ability('corrosive-splash', 'area-damage', { cooldown: 9, windup: 1, range: 4, effects: [{ type: 'damage-area', amount: 6, radius: 2.5 }, { type: 'corrode', amount: 2, duration: 7 }] })],
    tags: ['controller', 'corrosive']
  }),
  'slime-mirror-gel': unit({
    role: 'slime-mirror-gel', name: 'Mirror Gel', factionId: 'slime-bloom', parentSpecies: 'slime',
    tier: 'elite', size: 'medium', stats: { hp: 42, attack: 6, courage: 14, speed: 0.68 },
    siteTypes: ['outpost', 'core'], siteTier: 2, costs: { biomass: 4, glass: 2 }, bodyPlan: 'slime', scale: 1.08,
    kit: ['mirror-core', 'clear-shell', 'silver-shards'],
    abilities: [ability('reflective-skin', 'reflect', { cooldown: 12, windup: 0.6, effects: [{ type: 'reflect-next-projectile', duration: 5 }] }), ability('prism-flash', 'area-control', { cooldown: 10, windup: 1, range: 4, effects: [{ type: 'blind', duration: 2.5, radius: 4 }] })],
    tags: ['defender', 'reflective']
  }),
  'slime-cistern-mother': unit({
    role: 'slime-cistern-mother', name: 'Cistern Mother', factionId: 'slime-bloom', parentSpecies: 'slime',
    tier: 'large', size: 'large', stats: { hp: 96, attack: 10, courage: 16, speed: 0.4 },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { biomass: 10, water: 6 }, bodyPlan: 'slime', scale: 1.45,
    kit: ['three-cores', 'pseudopods', 'submerged-debris', 'surface-bubbles'],
    abilities: [ability('flood-with-slime', 'hazard', { cooldown: 15, windup: 2, range: 6, targetPolicy: 'room', effects: [{ type: 'hazard', hazard: 'slime-water', duration: 10 }, { type: 'slow-hostiles', duration: 6 }] }), ability('bud-slimes', 'summon', { cooldown: 16, windup: 1.8, effects: [{ type: 'summon', role: 'slime', count: 2 }] })],
    tags: ['large', 'producer']
  }),
  'rat-bell-tail': unit({
    role: 'rat-bell-tail', name: 'Bell-Tail Plague Rat', factionId: 'warren-vermin', parentSpecies: 'rat',
    tier: 'specialist', size: 'small', stats: { hp: 12, attack: 3, courage: 5, speed: 1.35 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { grain: 1 }, bodyPlan: 'rat', scale: 0.8,
    kit: ['tail-bell', 'rag-collar'],
    abilities: [ability('alarm-bell', 'call-reinforcement', { cooldown: 15, windup: 0.7, range: 7, effects: [{ type: 'call-reinforcement', role: 'rat', count: 2 }, { type: 'reduce-site-cooldown', amount: 5 }] })],
    tags: ['scout', 'support']
  }),
  'rat-packback': unit({
    role: 'rat-packback', name: 'Packback Rat', factionId: 'warren-vermin', parentSpecies: 'rat',
    tier: 'veteran', size: 'medium', stats: { hp: 28, attack: 5, courage: 8, speed: 1.05 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { grain: 2, refuse: 1 }, bodyPlan: 'rat-swarm', scale: 1,
    kit: ['pack-frame', 'sacks', 'multiple-rats'],
    abilities: [ability('steal-supplies', 'resource-steal', { cooldown: 10, windup: 1.2, range: 3, targetPolicy: 'cargo-or-settlement', effects: [{ type: 'steal-resource', amount: 2 }, { type: 'retreat-to-site' }] })],
    tags: ['carrier', 'thief']
  }),
  'rat-quiet-teeth-king': unit({
    role: 'rat-quiet-teeth-king', name: 'Quiet Teeth Rat King', factionId: 'warren-vermin', parentSpecies: 'rat',
    tier: 'champion', size: 'medium', stats: { hp: 52, attack: 8, courage: 13, speed: 0.98 },
    siteTypes: ['core'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { grain: 8, refuse: 5 }, bodyPlan: 'swarm', scale: 1.08,
    kit: ['tail-knot', 'twelve-rats', 'stolen-crown'],
    abilities: [ability('swarm-order', 'buff', { cooldown: 11, windup: 0.8, range: 6, targetPolicy: 'allies', effects: [{ type: 'buff-allies', stat: 'speed', amount: 0.3, duration: 6 }, { type: 'retarget-allies' }] }), ability('scatter-and-bite', 'area-damage', { cooldown: 9, windup: 0.9, range: 4, effects: [{ type: 'damage-area', amount: 8, radius: 4 }, { type: 'bleed', duration: 5 }] })],
    tags: ['champion', 'swarm', 'commander']
  }),
  'carrion-marrow-plough': unit({
    role: 'carrion-marrow-plough', name: 'Marrow Plough', factionId: 'carrion-brood', parentSpecies: 'carrion',
    tier: 'veteran', size: 'medium', stats: { hp: 38, attack: 8, courage: 10, speed: 0.9 },
    siteTypes: ['field-camp', 'outpost', 'core'], costs: { carrion: 2 }, bodyPlan: 'crawler', scale: 1,
    kit: ['bone-rake-head', 'segmented-body', 'ten-legs'],
    abilities: [ability('marrow-charge', 'charge', { cooldown: 9, windup: 1, range: 5, effects: [{ type: 'damage', amount: 9 }, { type: 'push', distance: 1.5 }] })],
    tags: ['vanguard', 'scavenger']
  }),
  'carrion-corpse-lantern': unit({
    role: 'carrion-corpse-lantern', name: 'Corpse Lantern Crawler', factionId: 'carrion-brood', parentSpecies: 'carrion',
    tier: 'specialist', size: 'medium', stats: { hp: 30, attack: 5, courage: 9, speed: 0.82 },
    siteTypes: ['outpost', 'core'], costs: { carrion: 3 }, bodyPlan: 'crawler', scale: 0.96,
    kit: ['glow-gut', 'corpse-hooks', 'feelers'],
    abilities: [ability('carrion-beacon', 'mark', { cooldown: 12, windup: 1, range: 7, targetPolicy: 'corpse-or-downed', effects: [{ type: 'mark-target', duration: 8 }, { type: 'retarget-allies' }] })],
    tags: ['support', 'scavenger']
  }),
  'carrion-larder-mother': unit({
    role: 'carrion-larder-mother', name: 'Larder Mother', factionId: 'carrion-brood', parentSpecies: 'carrion',
    tier: 'large', size: 'large', stats: { hp: 90, attack: 10, courage: 15, speed: 0.48 },
    siteTypes: ['core', 'outpost'], siteTier: 2, populationCost: 5, globalCap: 1, costs: { carrion: 8, corpses: 3 }, bodyPlan: 'crawler-large', scale: 1.25,
    kit: ['corpse-sacs', 'bone-rake', 'ten-legs', 'larval-pouches'],
    abilities: [ability('birth-crawlers', 'summon', { cooldown: 18, windup: 2.2, effects: [{ type: 'summon', role: 'carrion', count: 2 }] }), ability('drop-carrion-bait', 'hazard', { cooldown: 13, windup: 1, range: 4, effects: [{ type: 'hazard', hazard: 'carrion-bait', duration: 8 }, { type: 'retreat-to-site' }] })],
    tags: ['large', 'producer', 'scavenger']
  }),
  'ogre-doorframe-sleeper': unit({
    role: 'ogre-doorframe-sleeper', name: 'Doorframe Sleeper', factionId: 'ogre-solitary', parentSpecies: 'ogre',
    tier: 'elite', size: 'large', stats: { hp: 86, attack: 13, courage: 12, armor: 3, speed: 0.65 },
    siteTypes: ['emergent', 'outpost'], populationCost: 4, globalCap: 2, costs: { food: 5 }, bodyPlan: 'ogre', scale: 1.18,
    kit: ['doorframe-armor', 'rubble-cloak', 'stone-club'],
    abilities: [ability('doorway-ambush', 'ambush', { cooldown: 15, windup: 0.5, range: 3, effects: [{ type: 'damage', amount: 15 }, { type: 'knockdown', duration: 2 }] }), ability('block-passage', 'barricade', { cooldown: 12, windup: 1, targetPolicy: 'room', effects: [{ type: 'slow-zone', duration: 8 }, { type: 'self-armor', amount: 4, duration: 8 }] })],
    tags: ['large', 'ambusher']
  }),
  'ogre-bonehook-butcher': unit({
    role: 'ogre-bonehook-butcher', name: 'Bonehook Butcher', factionId: 'ogre-solitary', parentSpecies: 'ogre',
    tier: 'champion', size: 'large', stats: { hp: 104, attack: 15, courage: 15, armor: 2, speed: 0.68 },
    siteTypes: ['core', 'event'], siteTier: 2, populationCost: 6, globalCap: 1, costs: { food: 8, corpses: 3 }, bodyPlan: 'ogre', scale: 1.25,
    kit: ['bone-hooks', 'butcher-apron', 'meat-rack', 'cleaver-club'],
    abilities: [ability('hook-drag', 'pull', { cooldown: 9, windup: 1.2, range: 6, effects: [{ type: 'damage', amount: 9 }, { type: 'pull', distance: 3 }] }), ability('butcher-fallen', 'corpse-consume', { cooldown: 11, windup: 1.7, targetPolicy: 'corpse-or-downed', effects: [{ type: 'consume-corpse-heal', amount: 22 }, { type: 'add-site-resource', resource: 'food', amount: 2 }] })],
    tags: ['champion', 'large', 'predator']
  })
};

export const ELITE_ROLES = new Set(Object.keys(ELITE_BESTIARY));

export function getEliteDefinition(role) {
  return ELITE_BESTIARY[role] ?? null;
}

export function isEliteRole(role) {
  return ELITE_ROLES.has(role);
}

export function eliteDefinitionsForFaction(factionId) {
  return Object.values(ELITE_BESTIARY).filter(definition => definition.factionId === factionId);
}

export function validateEliteBestiary() {
  const errors = [];
  for (const [role, definition] of Object.entries(ELITE_BESTIARY)) {
    if (definition.role !== role) errors.push(`${role}: role mismatch`);
    if (!definition.name || !definition.factionId || !definition.parentSpecies) errors.push(`${role}: missing identity`);
    if (!definition.visual?.bodyPlan || !Array.isArray(definition.visual?.kit)) errors.push(`${role}: missing visual recipe`);
    if (!definition.ecology?.siteTypes?.length || !definition.ecology?.populationCost) errors.push(`${role}: missing ecology recipe`);
    if (!definition.abilities?.length) errors.push(`${role}: no ability`);
    for (const action of definition.abilities ?? []) {
      if (!(action.windup > 0) || !(action.cooldown > 0)) errors.push(`${role}/${action.id}: ability lacks telegraphed timing`);
    }
  }
  return errors;
}

function inferAnimationProfile(bodyPlan = '') {
  if (bodyPlan.includes('arachnid')) return 'arachnid';
  if (bodyPlan.includes('fungal') || bodyPlan === 'corpse-orchard') return 'fungal';
  if (bodyPlan.includes('construct') || bodyPlan.includes('vat') || bodyPlan.includes('revenant')) return 'construct';
  if (bodyPlan.includes('crawler')) return 'crawler';
  if (bodyPlan.includes('swarm') || bodyPlan.includes('rat')) return 'swarm';
  if (bodyPlan.includes('spectral')) return 'spectral';
  if (bodyPlan.includes('heavy') || bodyPlan.includes('large') || bodyPlan.includes('golem') || bodyPlan.includes('colossus') || bodyPlan === 'ogre') return 'heavy-biped';
  return 'biped';
}
