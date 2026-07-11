export const ROYAL_SANCTUM_LANDMARK_RECIPES=Object.freeze({
'royal.antechamber':Object.freeze({id:'royal.antechamber',roomId:'L56',defaultState:'sealed',states:Object.freeze(['sealed','occupied','fortified']),footprint:Object.freeze({width:18.4,depth:14.4,height:9.2}),sockets:Object.freeze(['guardian-statue','royal-crest','processional-aisle','occupation-camp','fortification-line']),triangleBudget:56000}),
'royal.throne.black':Object.freeze({id:'royal.throne.black',roomId:'L59',defaultState:'empty',states:Object.freeze(['empty','claimed','awakened']),footprint:Object.freeze({width:20.8,depth:15.8,height:11.4}),sockets:Object.freeze(['black-throne','crown-dais','faction-banner','awakened-eye','boss-gate']),triangleBudget:62000}),
'sanctum.gate.seal':Object.freeze({id:'sanctum.gate.seal',roomId:'M61',defaultState:'sealed',states:Object.freeze(['sealed','under-assault','opened']),footprint:Object.freeze({width:16.8,depth:11.6,height:12.2}),sockets:Object.freeze(['seal-door','ritual-lock','siege-scar','opened-threshold','guardian-socket']),triangleBudget:60000})});
export const ROYAL_SANCTUM_BUNDLE_IDS=Object.freeze(Object.keys(ROYAL_SANCTUM_LANDMARK_RECIPES));
export const getRoyalSanctumLandmarkRecipe=id=>ROYAL_SANCTUM_LANDMARK_RECIPES[id]??null;
export const listRoyalSanctumLandmarkRecipes=()=>Object.values(ROYAL_SANCTUM_LANDMARK_RECIPES);
