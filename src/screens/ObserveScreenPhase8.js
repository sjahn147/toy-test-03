import { ObserveScreen as Phase6ObserveScreen } from './ObserveScreen.js';
import { DungeonRendererPhase8 } from '../engine/DungeonRendererPhase8.js';
import { AssetRegistryPhase8 } from '../engine/AssetRegistryPhase8.js';
import { DungeonSim } from '../sim/DungeonSimPhase8.js';
import { applyPhase7Territories } from '../data/applyPhase7Territories.js';
import { applyPhase8SpatialScale } from '../data/applyPhase8SpatialScale.js';
import { applyPhase8PropLayout } from '../data/applyPhase8PropLayout.js';
import { createLegacyGameRuntime } from '../application/GameRuntimeFactory.js';
import { StrategyObserverShell } from '../ui/StrategyObserverShell.js';

export class ObserveScreen extends Phase6ObserveScreen {
  constructor(options) {
    super(options);
    this.scenario