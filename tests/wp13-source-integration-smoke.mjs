import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const files={
  compiler:await read('../src/content/ScenarioCompiler.js'),
  dungeon:await read('../src/sim/DungeonSim.js'),
  renderer:await read('../src/engine/DungeonRenderer.js'),
  screen:await read('../src/screens/StrategyObserverScreen.js'),
  topology:await read('../src/engine/DungeonTopology.js'),
  normalized:await read('../src/compat/normalizeLegacySnapshot.js'),
  html:await read('../index.html')
};
assert.match(files.compiler,/verticalConnectors/);assert.match(files.compiler,/floorId/);
assert.match(files.dungeon,/VerticalConnectorSystem/);assert.match(files.dungeon,/verticalConnectors/);
assert.match(files.renderer,/this\.agentGroundOffset\(agent, mesh\)/);
assert.doesNotMatch(files.renderer,/y: y \+ height \+ \(sample\.yOffset/);
assert.match(files.screen,/ObserveScreenFloorWP13/);assert.match(files.screen,/StrategyDungeonRendererWP13/);
assert.match(files.topology,/horizontal corridor/);
assert.match(files.normalized,/verticalConnectorTable/);
assert.match(files.normalized,/vertical-connector/);
assert.match(files.html,/wp13-floor-map\.css/);
console.log('WP13 source integration smoke passed');
async function read(relative){return readFile(new URL(relative,import.meta.url),'utf8');}
