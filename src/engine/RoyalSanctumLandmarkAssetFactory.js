import {createAntechamber,createThrone,createSealGate} from './RoyalSanctumDioramas.js';
import {getRoyalSanctumLandmarkRecipe} from './RoyalSanctumLandmarkRecipes.js';
export class RoyalSanctumLandmarkAssetFactory {
  create(id,ctx={}) {
    const recipe=getRoyalSanctumLandmarkRecipe(id);
    if(!recipe) return null;
    const state=ctx.state&&recipe.states.includes(ctx.state)?ctx.state:recipe.defaultState;
    const root=id==='royal.antechamber'?createAntechamber(state):id==='royal.throne.black'?createThrone(state):createSealGate(state);
    root.userData={assetId:id,roomId:recipe.roomId,state,triangleBudget:recipe.triangleBudget};
    return root;
  }
}
