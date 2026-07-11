import { THREE } from './ThreeScene.js';

const DEFAULT_PALETTE = Object.freeze({
  stone: 0x4b4a52,
  stoneLight: 0x68656d,
  stoneDark: 0x2d2d35,
  mortar: 0x25252c,
  wet: 0x1f4450,
  moss: 0x536451,
  iron: 0x4b5158,
  rust: 0x895941,
  wood: 0x705039
});

export function createDungeonMaterials(overrides = {}) {
  const palette = { ...DEFAULT_PALETTE, ...overrides };
  const standard = (color, roughness = 0.82, metalness = 0.04, extra = {}) => new THREE.MeshStandardMaterial({