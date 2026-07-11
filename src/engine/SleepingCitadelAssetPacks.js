import { AssetPackRegistry } from './AssetPackRegistry.js';

export function createSleepingCitadelAssetPackRegistry(packs = []) {
  return new AssetPackRegistry(packs.filter(Boolean));
}

export function registerSleepingCitadelAssetPacks(registry, packs = []) {
  for (const pack of packs.filter(Boolean)) registry.register(pack);
  return registry;
}
