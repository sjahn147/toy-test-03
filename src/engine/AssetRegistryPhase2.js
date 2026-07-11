import { AssetRegistry } from './AssetRegistry.js';
import { FacilityAssetFactory } from './FacilityAssetFactory.js';

const FACILITY_TYPES = new Set([
  'dungeon_entrance',
  'water_fountain',
  'rest_site',
  'camp_site',
  'merchant_stall',
  'goddess_statue'
]);

export class AssetRegistryPhase2 extends AssetRegistry {
  constructor() {
    super();
    this.facilities = new FacilityAssetFactory();
  }

  makeProp(prop) {
    if (FACILITY_TYPES.has(prop.type)) return this.facilities.create(prop);
    return super.makeProp(prop);
  }
}

export function isFacilityType(type) {
  return FACILITY_TYPES.has(type);
}
