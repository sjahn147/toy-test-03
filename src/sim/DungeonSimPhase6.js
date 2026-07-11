import { DungeonSim as Phase5DungeonSim } from './DungeonSimPhase5.js';
import { hydrateAgent } from './AgentAI.js';
import { AdvancedEcologySystem } from './AdvancedEcologySystem.js';
import { factionFor } from '../data/applyPhase6Ecology.js';

const ADVANCED_RADII = {
  plague_mortuary: 1.12,
  orc_tribe_camp: 1.22,
  fungal_garden: 1.08,
  blood_roost: 1.02,
  carrion_pit: 1.1,
  kobold_workshop: 1.08,
  cursed_chapel: 1.02,
  parasite_pool: 0.98
};

const ADVANCED_MATURITY = {
  zombie: 1,
  orc: 74,
  myconid: 48