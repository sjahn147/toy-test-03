import { THREE } from './ThreeScene.js';

export class ExpeditionAssetFactory {
  constructor() {
    this.materials = new Map();
  }

  createFieldCamp(prop) {
    const group = new THREE.Group();
    group.name = `field-camp:${prop.id}`;
    const wood = this.mat('field-camp-wood', 0x67462f, { roughness: 0.94 });
    const darkWood = this.mat('field-camp-dark-wood',