import { THREE } from './ThreeScene.js';
import { MiniatureFactory } from './MiniatureFactory.js';
import { getMiniatureRecipe } from '../miniatures/recipes.js';

const BODY_PROFILES = Object.freeze({
  masculine: Object.freeze({
    shoulders: 1.08,
    hips: 0.93,
    waist: 0.94,
    chestDepth: 1.04,
    limbLength: 0.99,
    faceWidth: 1.03,
    jawWidth: 1.05,
    stance: 1.04,
    posture: 0.02
  }),
  feminine