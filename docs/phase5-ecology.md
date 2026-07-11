# Phase 5 — Dungeon ecology

Phase 5 replaces target-count monster spawning with resource-gated species populations.

## Runtime flow

```text
species hunger
→ search prey, corpse or stored food
→ corridor movement
→ feed or transport a host
→ lair resource increases
→ timed spawn omen
→ occupied-cell-safe birth
→ juvenile growth
```

The main files are:

- `src/data/applyPhase5Ecology.js` — assigns lore-specific lairs and initial populations
- `src/sim/EcosystemSystem.js` — hunger, feeding, corpses, hosts and reproduction
- `src/sim/DungeonSimPhase5.js` — integrates ecology with combat, equipment, resurrection and occupancy
- `src/engine/EcologyAssetFactory.js` — multi-prop lairs and ecology entity assets
- `src/engine/DungeonRendererPhase5.js` — renders lairs, corpses, hosts and spawn omens

## Species and home rooms

| Species | Lair | Primary resource | Reproduction |
| --- | --- | --- | --- |
| Skeleton | Working Ossuary | bone stock | bones assemble into a new skeleton |
| Goblin | Goblin Hearth-Lair | food stock | two adults and stored food |
| Spider | Silk Brood Chamber | blood stock or living host | egg sac development |
| Slime | Digestive Spawning Pool | biomass | mature slime division |
| Rat | Granary Rat Warren | grain stock | two adults and grain |
| Ogre | Ogre Butcher-Camp | food stock | rare outside-ogre arrival represented by a butcher offering |

Lairs are placed in suitable existing rooms and tag those rooms with:

```text
monster_lair
territory
<species>_home
```

Their footprints block occupancy cells, so creatures cannot stand inside a fire, pool, bone shelf or egg sac.

## Hunger

Each biological species has:

```js
{
  hunger,
  homeRoomId,
  maturity,
  starvationClock
}
```

Hunger rises continuously. Above the species hunger threshold, ecological actions take priority over the ordinary combat/navigation AI. Above the starvation threshold, the creature periodically loses health.

Skeletons do not eat and therefore do not accumulate hunger.

## Food web

Implemented direct predation:

```text
rat → goblin
rat → spider
rat, goblin, spider → ogre
corpse → slime
corpse bones → skeleton population
```

A prey animal eaten directly does not create a corpse or normal equipment drop. This prevents one food unit from being counted twice.

## Corpse entities

Ordinary combat deaths produce persistent corpse records:

```js
{
  sourceRole,
  roomId,
  x,
  z,
  biomass,
  bones,
  food,
  age
}
```

Corpses remain visible until consumed or until their decay lifetime expires.

- Slimes convert biomass into spawning-pool biomass.
- Skeletons harvest bones for the ossuary.
- Hungry flesh-eating species can consume food value.

## Spider hosts

A spider can target a downed adventurer before bleedout.

```text
downed adventurer
→ cocooned living host
→ carried through corridors
→ deposited at spider lair
→ timed egg development
→ new spider
```

The hidden adventurer remains a living agent associated with the host entity.

If the carrier dies before reaching the lair, the cocoon opens and the adventurer returns to a downed state with a short rescue window. If development completes, the host is consumed but remains eligible for goddess reconstruction.

## Staged births

Reproduction never creates a creature immediately. It creates a `pendingSpawn`:

```js
{
  species,
  roomId,
  duration,
  progress,
  sourceHostId
}
```

The renderer displays a species-specific omen:

- moving bone pile
- goblin bedding bundle
- spider egg sacs
- bubbling slime mass
- rat nest and pups
- ogre butcher offering

When development finishes, the system requests a free occupancy cell. If the lair is full, the omen remains and retries later.

## Juvenile growth

New biological monsters start below full maturity and grow over time. Species have different maturation periods. Only adults count toward reproduction requirements. Skeletons emerge fully assembled.

## Resurrection interaction

Consumed or hosted adventurers may still be reconstructed at the goddess statue. On successful return, ecology death flags are reset so a later death can create a new corpse or host state correctly.

## Testing

Run:

```bash
npm run test:phase5
```

The smoke test covers:

- all six lair types
- seeded rats and spiders
- combat death to corpse conversion
- slime corpse-to-biomass conversion
- ogre predation without duplicate corpse creation
- resource-gated pending births
- spider cocoon capture, transport and deposit
- ecology snapshot contracts
