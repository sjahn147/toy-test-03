import { nearestRoom, nextStep } from './Pathfinding.js';

const SPECIES = {
  rat: { hungerRate: 2.4, hungryAt: 42, starvingAt: 82, capacity: 8, spawnDuration: 7 },
  goblin: { hungerRate: 1.15, hungryAt: 48, starvingAt: 88, capacity: 5, spawnDuration: 10 },
  spider: { hungerRate: 1.0, hungryAt: 44, starvingAt: 86, capacity: 5, spawnDuration: 12 },
  slime: { hungerRate: 0.72, hungryAt: 38, starvingAt: 92, capacity: 5, spawnDuration: 8 },
  ogre: { hungerRate: 1.5