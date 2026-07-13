export const ENGLISH_CHRONICLE_CATALOG = Object.freeze({
  'campaign.observation.started': entry([
    '{scenario} was placed under the glass. It objected by continuing.',
    'The glass came down over {scenario}. Everything underneath kept its own counsel.'
  ]),
  'campaign.observer.noise': entry([
    'A tiny god tapped the glass near {room}. The inhabitants blamed one another.',
    'Something outside the world knocked near {room}. The world declined to explain.'
  ]),
  'campaign.observer.coin': entry([
    'A coin fell in {room}. {actor} developed a theory before it stopped rolling.',
    'The heavens contributed one coin to {room}. {actor} immediately assigned it a motive.'
  ]),

  'party.expedition.escaped': entry([
    '{actor} escaped with {gold} coins and promised to return with worse friends.',
    '{actor} left carrying {gold} coins, a revised account of events, and no useful caution.'
  ], [
    '{actor} departed the dungeon with {gold} coins.'
  ]),
  'party.return.scheduled': entry([
    'Above ground, the tavern began simplifying the story.',
    'Somewhere above, a survivor reached the part where accuracy became inconvenient.'
  ]),
  'party.member.returned': entry([
    '{actor} returned at level {level}. This was not comforting.',
    '{actor} came back stronger, which settled none of the important questions.'
  ]),
  'party.member.recruited': entry([
    '{actor} joined after hearing an inaccurate version of events.',
    '{actor} arrived with fresh equipment and second-hand confidence.'
  ]),
  'party.level.gained': entry([
    '{actor} learned a terrible little lesson and reached level {level}.',
    'Experience improved {actor}. The experience itself remained indefensible.'
  ]),

  'agent.move.started': entry([
    '{actor} entered the corridor toward {room}.',
    '{actor} set out for {room}.'
  ], [
    'Route: {fromRoom} → {room}.'
  ]),
  'agent.move.arrived': entry([
    '{actor} arrived in {room}.',
    '{actor} reached {room} with the corridor still behind them.'
  ], [
    'Arrival from {fromRoom} at {room}.'
  ]),
  'agent.move.retreat': entry([
    '{actor} withdrew toward {room}. Survival had finally won an argument.',
    '{actor} left the room in the direction most recently associated with living.'
  ]),
  'agent.move.rescue': entry([
    '{actor} abandoned the safer plan and went back for {target}.',
    '{actor} turned toward {target}. Loyalty is an expensive form of navigation.'
  ]),
  'agent.move.revenge': entry([
    '{actor} remembered {target} and chose a deliberate route.',
    '{actor} went looking for {target}. Memory had become directional.'
  ]),
  'agent.move.explore': entry([
    '{actor} chose an unseen room over another familiar mistake.',
    '{actor} went where the map had not yet learned to lie.'
  ]),

  'system.route.invalid': entry([
    '{actor} could not find a valid route to {room}.',
    'No traversable connection existed between {actor} and {room}.'
  ], [
    'Pathfinding rejected the requested move. destination={room}'
  ]),
  'system.route.oscillation': entry([
    '{actor} stopped retracing the same blocked corridor.',
    'Oscillation guard held {actor} in place.'
  ], [
    'Repeated A↔B movement was suppressed.'
  ]),
  'system.capacity.blocked': entry([
    '{site} could not produce another {species}. Capacity or safety constraints blocked the spawn.'
  ], [
    'Spawn rejected at {site}: population {population}/{capacity}, safe socket unavailable or settlement inactive.'
  ]),
  'system.target.missing': entry([
    '{actor} had no valid target for {action}.',
    'The requested target was no longer available.'
  ]),

  'combat.hit': entry([
    '{actor} hit {target} for {amount}.',
    '{target} lost {amount} health to {actor}.'
  ], [
    'damage={amount}; source={actor}; target={target}'
  ]),
  'combat.heal': entry([
    '{actor} restored {amount} health to {target}.',
    '{target} recovered {amount} health under {actor}\'s care.'
  ], [
    'healing={amount}; source={actor}; target={target}'
  ]),
  'combat.started': entry([
    '{actor} and {target} began settling the local disagreement physically.',
    'The room stopped being neutral when {actor} reached {target}.'
  ]),
  'combat.downed': entry([
    '{target} went down. The argument was not yet final.',
    '{target} fell, still technically recoverable.'
  ]),
  'combat.death': entry([
    '{target} stopped participating in the experiment.',
    '{target} became part of the room\'s evidence.'
  ]),
  'combat.disengage.blocked': entry([
    '{actor} tried to leave {target} behind. {target} declined the arrangement.',
    '{actor} discovered that close combat had terms and conditions.'
  ]),
  'combat.disengage.moved': entry([
    '{actor} broke away from {target}, paying for the distance in blood and tempo.',
    '{actor} escaped the engagement. The engagement kept a small fee.'
  ]),
  'combat.webbed': entry([
    '{target} was wrapped in silk. The room acquired temporary furniture.',
    '{actor} fastened {target} to the local architecture.'
  ]),
  'combat.trap.triggered': entry([
    '{actor} triggered {trap} for {amount}. A terrible little mechanism fulfilled its purpose.',
    '{trap} introduced itself to {actor} with {amount} damage.'
  ]),
  'combat.trap.death': entry([
    '{actor} was converted into a cautionary tale.',
    '{actor} proved the trap had not been decorative.'
  ]),

  'discovery.mimic.revealed': entry([
    '{actor} opened {object}. {mimic} opened back.',
    '{object} contained {mimic}, mostly in the sense that a mouth contains teeth.'
  ]),
  'discovery.treasure.found': entry([
    '{actor} found {gold} suspicious coins.',
    '{actor} recovered {gold} coins. Their innocence was not established.'
  ]),
  'discovery.armory.weapon': entry([
    '{actor} found a weapon that looked barely legal.',
    'The armory improved {actor}\'s prospects and lowered everyone else\'s.'
  ]),
  'discovery.shrine.rest': entry([
    '{actor} rested at {room} and mistook relief for destiny.',
    '{room} gave {actor} five quiet points of hope. Hope charged no interest yet.'
  ]),
  'discovery.treasure.rumor': entry([
    'A new rumor condensed into a chest in {room}.',
    '{room} acquired a chest by the usual method: people wanting one to be there.'
  ]),

  'ecology.predator.fed': entry([
    '{actor} fed. The dungeon remembered the taste.',
    '{actor} ate well enough for the ecosystem to take notes.'
  ]),
  'ecology.birth.stirring': entry([
    'Something under the flagstones began dividing its inheritance.',
    'The stone floor developed the private industry of making more mouths.'
  ]),
  'ecology.spawn.single': entry([
    '{actor} crawled out of {site} and immediately had opinions.',
    '{site} produced {actor}. Space became marginally less theoretical.'
  ]),
  'ecology.spawn.cluster': entry([
    '{site} produced {count} more {speciesPlural}. None appeared consulted.',
    '{count} {speciesPlural} emerged from {site}. The habitat had mistaken capacity for encouragement.',
    'The population of {site} increased by {count}. Privacy decreased by more.'
  ]),
  'ecology.trap.rearmed': entry([
    '{trap} reset itself with quiet malice.',
    '{trap} returned to work without supervision.'
  ]),
  'ecology.habitat.full': entry([
    '{site} ran out of room before it ran out of young.',
    'At {site}, capacity became a harder predator than hunger.'
  ]),

  'settlement.threatened': entry([
    '{site} became threatened in {room}. The walls noticed first.',
    '{site} had begun to understand that ownership was a temporary material.'
  ]),
  'settlement.collapsing': entry([
    '{site} began collapsing. Its inhabitants started measuring home in salvage.',
    '{site} folded inward as the structures that defined it gave up their argument.'
  ]),
  'settlement.ruined': entry([
    '{site} was reduced to a ruined habitat. The address remained.',
    '{site} ceased to be a home and became a direction people avoided.'
  ]),
  'settlement.rehomed': entry([
    '{actor} adopted {site} after losing the previous definition of home.',
    '{actor} accepted {site}. Refuge is often a name given after arrival.'
  ]),
  'settlement.displaced': entry([
    '{actor} was displaced from {site}. The dungeon offered corridors instead of sympathy.',
    '{actor} lost {site} and inherited the map.'
  ]),
  'settlement.capacity': entry([
    '{site} ran out of room before it ran out of residents.',
    '{site} had filled every safe corner and several unsafe opinions.'
  ]),

  'logistics.escort.move': entry([
    '{actor} moved to escort {target}\'s cargo.',
    '{actor} kept pace with the shipment.'
  ], [
    'Escort repositioning for cargo {cargoId}.'
  ]),
  'logistics.carry.move': entry([
    '{actor} carried {resource} toward {site}.',
    '{resource} remained in transit under {actor}\'s supervision.'
  ], [
    'Cargo {cargoId} advanced toward {site}.'
  ]),
  'logistics.delivered': entry([
    '{actor} delivered {amount} {resource} to {site}. By evening, someone would call this policy.',
    '{site} received {amount} {resource}. The walls gained another reason to remain walls.'
  ]),
  'logistics.dropped': entry([
    '{resource} was dropped in {room}. Ownership became an open question.',
    'A shipment of {resource} stopped moving in {room}. The local scavengers revised their schedules.'
  ]),
  'logistics.raided': entry([
    '{resource} changed hands in {room}. The route report used a less honest verb.',
    'The convoy lost {resource} in {room}. Someone else called it collection.'
  ]),
  'logistics.recovered': entry([
    '{actor} recovered the abandoned {resource}. Waste is a political category.',
    '{resource} found a new carrier in {actor}.'
  ]),

  'construction.started': entry([
    '{faction} began building {structure} in {room}. The room was not asked.',
    '{structure} began taking shape in {room}, one bad certainty at a time.'
  ]),
  'construction.completed': entry([
    '{structure} was completed in {room}. The map acquired another opinion.',
    '{room} gained {structure}. Passage would now require negotiation or tools.'
  ]),
  'construction.work': entry([
    '{actor} worked on {structure}.',
    '{actor} added labor to {structure}.'
  ], [
    'Construction contribution={amount}.'
  ]),
  'siege.hit': entry([
    '{actor} dealt {amount} siege damage to {structure}.',
    '{structure} lost {amount} integrity to {actor}.'
  ], [
    'siegeDamage={amount}; structure={structure}'
  ]),
  'siege.structure.destroyed': entry([
    '{faction} destroyed {structure} in {room}. The route became simpler and the future worse.',
    '{structure} came apart in {room}. Everyone nearby inherited the opening.'
  ]),
  'siege.phase.changed': entry([
    'The siege of {site} entered {phase}. The vocabulary had caught up with the damage.',
    '{site} moved into {phase}. Its defenders were already using shorter sentences.'
  ]),

  'personality.rescue': entry([
    '{actor} abandoned a safer plan to reach {target}.',
    '{actor} chose {target} over the available good sense.'
  ]),
  'personality.home.defense': entry([
    '{actor} turned toward home after remembering its damaged walls.',
    '{actor} went back to {site}. Loyalty had supplied a destination.'
  ]),
  'personality.aggression': entry([
    '{actor} pressed toward {target} instead of wandering.',
    '{actor} found a purpose in {target}, regrettably for both of them.'
  ]),
  'personality.revenge': entry([
    '{actor} remembered who hurt them and chose a deliberate route.',
    '{actor}\'s grudge stopped being an emotion and became an itinerary.'
  ]),
  'personality.retreat': entry([
    '{actor} chose survival over another empty circuit of the dungeon.',
    '{actor} went home before courage could become paperwork.'
  ]),
  'personality.explore': entry([
    '{actor} selected an unseen room rather than pacing between familiar doors.',
    '{actor} chose uncertainty. Familiarity had not recommended itself.'
  ]),

  'hero.death': entry([
    '{actor} was defeated permanently. The faction would have to become ordinary again.',
    '{actor} fell. The title survived for several seconds, looking for another body.'
  ]),
  'hero.skill.started': entry([
    '{actor} began {skill}. The room received enough warning to become afraid properly.',
    '{actor} prepared {skill}. Even the floor understood the shape of the mistake.'
  ]),
  'hero.skill.interrupted': entry([
    '{actor}\'s {skill} was interrupted. Power returned to being an intention.',
    '{skill} failed in {actor}\'s hands before it could fail everyone else.'
  ]),
  'hero.skill.resolved': entry([
    '{actor} completed {skill}. The room accepted the result without agreement.',
    '{skill} took effect. Consequences began filing in.'
  ]),
  'hero.deployable.created': entry([
    '{actor} deployed {object} in {room}.',
    '{room} acquired {object}, temporarily and against its interests.'
  ], [
    'deployableId={objectId}; kind={object}'
  ]),
  'hero.deployable.destroyed': entry([
    '{object} was destroyed in {room}. Its purpose outlived it by a moment.',
    '{object} came apart before the plan did.'
  ]),
  'hero.field.created': entry([
    '{actor} changed the conditions in {room}. The air became partisan.',
    '{room} entered {field}. Neutral ground was no longer available.'
  ]),
  'hero.explosion': entry([
    '{room} received the explosive conclusion to {actor}\'s argument.',
    '{actor}\'s charge went off in {room}. Architecture was briefly negotiable.'
  ]),
  'hero.adaptation.changed': entry([
    '{actor} adapted into {adaptation} form. Identity remained the least stable material in the room.',
    '{actor} became {adaptation}. The environment had offered a suggestion and been taken literally.'
  ]),
  'hero.physics.collision': entry([
    '{target} struck the edge of {room}. The room held its ground.',
    '{target} met the architecture at speed.'
  ], [
    'Physical boundary collision in {room}.'
  ]),
  'hero.barrier.created': entry([
    '{actor} closed the route in {room}. Passage became a military opinion.',
    '{room} acquired a gate where an exit had recently been.'
  ]),
  'hero.summon.created': entry([
    '{actor} called {count} {summonPlural} into {room}. Death had kept a reserve list.',
    '{count} {summonPlural} answered {actor}. Attendance remained compulsory.'
  ]),

  'legacy.unknown': entry([
    '{text}'
  ], [
    'Unclassified legacy event: {text}'
  ])
});

export function getEnglishChronicleEntry(key) {
  return ENGLISH_CHRONICLE_CATALOG[key] ?? null;
}

function entry(variants, detailVariants = []) {
  return Object.freeze({
    variants: Object.freeze([...(Array.isArray(variants) ? variants : [variants])]),
    detailVariants: Object.freeze([...(Array.isArray(detailVariants) ? detailVariants : [detailVariants])])
  });
}
