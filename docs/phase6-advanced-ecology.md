# Phase 6 — Advanced Ecology and Faction Warfare

Phase 6 extends the resource ecology from Phase 5 with eight advanced species, infection and attachment states, manufactured traps, and room-level faction control.

## Runtime layers

1. `applyPhase6Ecology.js` assigns ecology factions, places advanced lairs, and seeds advanced species.
2. `AdvancedEcologySystem.js` owns infections, stirge attachments, kobold traps, advanced births, and territory control.
3. `DungeonSimPhase6.js` connects advanced state to combat, death, occupancy, maturity, resurrection, and snapshots.
4. `AdvancedCreatureAssetFactory.js` and `AdvancedLairAssetFactory.js` construct species and lairs from multiple procedural props.
5. `DungeonRendererPhase6.js` renders lairs, territory marks, contested borders, traps, attachments, infections, and spawn omens.

## Species contracts

| Species | Faction | Resource behavior | Special action |
| --- | --- | --- | --- |
| Zombie | undead-host | Banks corpses | Corpse recruitment |
| Orc | red-tusk-tribe | Banks meat and trophies | Predation and expansion |
| Myconid | bluecap-colony | Converts corpses into spores | Sleep-spore burst |
| Stirge | red-wing-brood | Banks drained blood | Timed attachment |
| Carrion crawler | carrion-brood | Converts corpses into carrion stock | Scavenging |
| Kobold | copper-tail-clutch | Accumulates scrap | Builds spring-jaw traps |
| Wraith | undead-host | Accumulates death energy | Soul drain |
| Pale parasite | pale-brood | Uses living hosts | Infection and larval emergence |

## Persistent world states

- `infections`: follow a living target, are cleansed in sanctuary, or mature into larvae.
- `attachments`: replace the source stirge miniature while it drains a target.
- `traps`: remain in a room with charges and cooldown until exhausted.
- `pendingSpawns`: preserve development progress until a legal occupancy cell is available.
- `territories`: store room owner, contenders, contested state, and control strength.

## Faction conflict

All ecology agents receive an `ecologyFaction`. Combat-capable species attack rival factions in the same room. Territory ownership is evaluated from living, visible, stationary dungeon occupants:

- two or more factions: room is contested;
- one faction holding an enemy or unowned room: capture progress increases;
- capture threshold reached: ownership changes;
- safe-zone rooms are never claimable.

## Occupancy rules

Advanced lair footprints block room-grid cells. An agent displaced by a new lair attempts placement in this order:

1. remaining free cells in the current room;
2. connected internal rooms;
3. other non-safe internal rooms;
4. hidden `lair-overcrowded` state only when no legal cell exists.

## Recovery interactions

- Sanctuary removes parasite infection.
- Goddess resurrection clears infection, spore sleep, and stirge counters.
- Spore sleep cancels active combat and movement eligibility.
- Attached stirges detach when the target dies, leaves, or the feeding duration ends.

## Validation

Run:

```bash
npm run test:phase6
```

The smoke test covers lair and species seeding, corpse competition, stirge attachment, spore sleep, infection cure and rupture, kobold traps, wraith energy, orc predation, territory contest and capture, advanced reproduction, and snapshot contracts.
