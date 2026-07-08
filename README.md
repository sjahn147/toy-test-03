# The Little Dungeon That Could

A tiny Three.js dungeon-observer web app.

You do not control the adventurers directly. You build a little dungeon, drop in a party, monsters, traps, and treasure, then watch the tiny agents make questionable decisions.

## Current MVP

- 3-screen app flow: Title -> Build -> Observe
- Three.js isometric dungeon diorama
- Simple agent simulation
- Adventurers and monsters act from small behavior rules
- Event log for emergent dungeon stories
- No build step required for GitHub Pages

## Run

Open `index.html` through a static server, or enable GitHub Pages for the repository.

For local testing:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Architecture

```text
src/
  app/App.js
  screens/
    TitleScreen.js
    BuildScreen.js
    ObserveScreen.js
  engine/
    ThreeScene.js
    DungeonRenderer.js
  sim/
    DungeonSim.js
    AgentAI.js
    Pathfinding.js
  data/
    scenarios.js
```

## Design direction

The core kick is not tactical control. The kick is watching small rule-driven agents behave like dungeon mice: greedy rogues, scared wizards, protective clerics, cowardly goblins, and very unreasonable skeletons.
