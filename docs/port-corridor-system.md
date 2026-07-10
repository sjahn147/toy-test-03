# Port-connected dungeon and corridor movement

## Single source of truth

`src/engine/DungeonTopology.js` converts scenario room links into explicit port-to-port connections.

```text
room A
  -> wall port A
  -> orthogonal corridor polyline
  -> wall port B
  -> room B
```

The same topology is consumed by:

- `DungeonRenderer` for wall openings, door assets and corridor geometry
- `DungeonSim` for validating legal movement
- `DungeonRenderer` again for sampling an agent's visible corridor position

This prevents the visual map and movement graph from drifting apart.

## Surface alignment rule

A room's declared `y` surface is the top of its floor, not the center of its floor slab.

- Room slab extends downward from the room surface.
- Corridor slab extends downward from the same surface.
- Door threshold is placed slightly above that shared surface.
- Agents stand at a role-specific height above the surface.

This keeps room floors and corridor floors from appearing displaced or detached.

## Ports

Every connection chooses a cardinal wall port:

- `N`
- `S`
- `E`
- `W`

Each port stores:

```text
roomId
side
x, z
normalX, normalZ
width
```

The renderer cuts the corresponding wall segment around the port and inserts a door frame at exactly the same coordinates.

## Corridor travel state

A move no longer changes `agent.roomId` immediately.

```js
agent.travel = {
  connectionId,
  fromRoomId,
  toRoomId,
  elapsed,
  duration,
  progress
};
```

While travelling:

- the agent cannot attack or be targeted as if still standing in the old room
- its position is sampled from the connection polyline
- its facing follows the current corridor segment
- follow camera reads the rendered world position

Only when progress reaches `1` is `roomId` changed to the destination.

## Environment assets

Procedural environment assets are built in `AssetRegistry`:

- room floor slab and inset surface
- segmented stone walls
- door posts, lintel and threshold
- corridor floor and edge curbs

All geometry uses the topology coordinates directly.

## Large monsters

`Ogre` is a large dungeon role with:

- 42 base HP
- 9 base attack
- slower corridor movement
- a larger modular miniature recipe
- a higher gold reward

The generated warren begins with `Ogre A`. Other maps can spawn an ogre after later return cycles when the dungeon has enough food.

## Monster naming

Dungeon specimens use alphabetic labels by role:

```text
Goblin A
Goblin B
Goblin C
Skeleton A
Ogre A
```

Labels continue through `Z`, `AA`, `AB`, and so on. Generation numbers are not used for monster names.

## Effects

`DungeonSim` emits short-lived structured effects in the snapshot:

- `attack`
- `death`
- `gold`
- `heal`

`DungeonRenderer.renderEffects` creates and animates the matching geometry. Effects are positioned on the relevant agent when available, with room-center fallback.
