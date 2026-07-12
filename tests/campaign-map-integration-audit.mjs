import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCampaign } from '../src/content/ScenarioCompiler.js';
import { listWaystationLandmarkRecipes } from '../src/engine/WaystationLandmarkRecipes.js';
import { listFloodedStorehouseLandmarkRecipes } from '../src/engine/FloodedStorehouseLandmarkRecipes.js';
import { listFungalGardenLandmarkRecipes } from '../src/engine/FungalGardenLandmarkRecipes.js';
import { listSpiderColonyLandmarkRecipes } from '../src/engine/SpiderColonyLandmarkRecipes.js';
import { listLaboratoryLandmarkRecipes } from '../src/engine/LaboratoryLandmarkRecipes.js';
import { listRoyalSanctumLandmarkRecipes } from '../src/engine