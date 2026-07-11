import { DungeonRendererPhase7 } from './DungeonRendererPhase7.js';
import { PHASE8D_STRUCTURE_TYPES } from './AssetRegistryPhase8.js';
import { getCampaignLandmarkRecipe } from './CampaignLandmarkRecipes.js';

export class DungeonRendererPhase8 extends DungeonRendererPhase7 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.scenario =