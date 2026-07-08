# Production roadmap

This project is moving toward a fantasy ant-farm / dungeon vivarium game.

## Core product sentence

Build a tiny dungeon vivarium, then watch greedy adventurers, hungry monsters, bad rumors, and worse decisions evolve into a self-sustaining fantasy ant farm.

## Near-term feature pillars

### 1. Asset pipeline

Current state:

- `assets/manifest.json` declares future asset packs and model slots.
- `src/engine/AssetRegistry.js` provides primitive fallback meshes.
- `DungeonRenderer` now asks the registry for floors, walls, corridors, props, and agents.

Next:

- Add selected low-poly dungeon GLB files.
- Add selected creature GLB files.
- Add model caching and clone support.
- Add primitive fallback when a model fails to load.

### 2. Agent readability

Add an inspect panel for clicked agents:

```text
Name
Role
HP
Level
Gold
Kills
Current thought
Memory
Fear / greed / hunger / loyalty
```

### 3. Dungeon ecology

Current loops:

- Party kills monsters -> reputation rises.
- Party survives -> returns stronger or brings recruits.
- Monsters kill party members -> food rises.
- Food and hatcheries -> monster packs spawn.

Next loops:

- Corpses -> undead conversion.
- Pantry -> food storage.
- Shrine -> healing or curse suppression.
- Gate -> outside monster migration.
- Treasure heat -> rogue-heavy parties.
- Fear -> stronger parties but fewer novices.

### 4. Overlays

Useful observer overlays:

- Noise map
- Smell / corpse map
- Treasure heat
- Fear map
- Monster spawn pressure
- Party path intent

### 5. Session report

Generate a report every few minutes:

```text
Most dangerous room
Longest-lived monster
Greediest adventurer
Worst decision
Dungeon rumor
New bloodline
Deaths by trap / monster / greed
```

### 6. Mobile UX

- Collapsible HUD
- Larger observer buttons
- Camera reset button
- Tap-to-inspect instead of hover
- Lower render detail option

## Asset candidates

Keep third-party assets vendored locally when possible.

Suggested layout:

```text
assets/
  vendor/
    kenney/
      dungeon/
        LICENSE.txt
        models/
        textures/
    quaternius/
      creatures/
        LICENSE.txt
        models/
```

Do not hotlink third-party asset files unless the license and hosting terms explicitly allow that use.
