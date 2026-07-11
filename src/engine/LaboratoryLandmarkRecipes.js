export const LABORATORY_LANDMARK_RECIPES = Object.freeze({
  'laboratory.alchemical.main': Object.freeze({ id:'laboratory.alchemical.main', roomId:'K51', defaultState:'sealed', states:Object.freeze(['sealed','reactivated','chemical-fire']), footprint:Object.freeze({width:16.4,depth:12.4,height:7.4}), sockets:Object.freeze(['distillation-array','reagent-console','fume-hood','upgrade-anvil','chemical-fire-zone']), triangleBudget:52000 }),
  'laboratory.parasite.vats': Object.freeze({ id:'laboratory.parasite.vats', roomId:'K52', defaultState:'dormant', states:Object.freeze(['dormant','active','ruptured']), footprint:Object.freeze({width:16.2,depth:12.2,height:7.8}), sockets:Object.freeze(['parasite-vat','host-cradle','feeding-manifold','observation-console','rupture-zone']), triangleBudget:54000 }),
  'laboratory.observatory.sealed': Object.freeze({ id:'laboratory.observatory.sealed', roomId:'K53', defaultState:'sealed', states:Object.freeze(['sealed','calibrated','void-exposed']), footprint:Object.freeze({width:15.2,depth:13.4,height:10.6}), sockets:Object.freeze(['orrery-core','celestial-ring','map-table','calibration-console','void-aperture']), triangleBudget:56000 })
});
export const LABORATORY_BUNDLE_IDS = Object.freeze(Object.keys(LABORATORY_LANDMARK_RECIPES));
export const getLaboratoryLandmarkRecipe = id => LABORATORY_LANDMARK_RECIPES[id] ?? null;
export const listLaboratoryLandmarkRecipes = () => Object.values(LABORATORY_LANDMARK_RECIPES);
