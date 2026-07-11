export const CAMPAIGN_COMPLETION_RECIPES = Object.freeze({
  'industry.goblin.market': recipe('industry.goblin.market','D19','goblin-market',['goblin-market','neutral-market','orc-taxed','burned'],20,15,8,['market-square','stall-row','stolen-goods','tax-checkpoint','faction-banner','trade-lane']),
  'orc.arena.red-pit': recipe('orc.arena.red-pit','J49','matches',['matches','chieftain-challenge','liberated'],23,18,9,['combat-pit','spectator-stands','fighter-gate','chieftain-dais','trophy-rack','liberation-banner']),
  'orc.hall.chieftain': recipe('orc.hall.chieftain','J50','tribal-court',['tribal-court','war-council','leaderless'],19,15,9,['war-throne','trophy-wall','council-table','tribal-standard','judgement-stone','royal-route']),
  'sanctum.circular': recipe('sanctum.circular','M62','dormant',['dormant','ritual-active','fractured'],23,19,12,['ritual-core','outer-ring','inner-ring','faction-altar','boss-stage','fracture-rift']),
  'sanctum.heart.chamber': recipe('sanctum.heart.chamber','M63','sleeping',['sleeping','awakened','claimed','collapsed'],27,21,15,['heart-core','boss-dais','artery-bridge','claim-standard','reset-conduit','collapse-rift']),
  'laboratory.summoning.failed': recipe('laboratory.summoning.failed','K54','dormant',['dormant','breached','stabilized'],19,16,10,['summoning-circle','containment-pylon','wraith-breach','stabilizer-console','death-energy-well','escape-lane']),
  'laboratory.emergency.way': recipe('laboratory.emergency.way','K55','sealed',['sealed','opened','collapsed'],11,19,8,['blast-door','escape-rail','warning-beacon','service-console','collapse-zone','final-access']),
  'royal.vault.crown': recipe('royal.vault.crown','L57','sealed',['sealed','opened','stripped'],17,13,9,['crown-vault','relic-pedestal','trap-grid','treasure-rack','laboratory-link','vault-door']),
  'royal.banquet.shattered': recipe('royal.banquet.shattered','L58','haunted',['haunted','occupied','restored-feast'],23,17,10,['high-table','banquet-row','ghost-dais','service-arch','settlement-hearth','dance-floor']),
  'royal.bedchamber': recipe('royal.bedchamber','L60','sealed',['sealed','searched','sanctuary'],16,13,8,['royal-bed','relic-cabinet','privacy-screen','secret-panel','sanctuary-lamp','rest-zone']),
  'flooded.granary.quiet-teeth': recipe('flooded.granary.quiet-teeth','C12','sealed',['sealed','rat-dominated','restored'],15,12,8,['grain-silo','cargo-bay','rat-warren','firebreak','loading-crane','restoration-table']),
  'flooded.wine-cellar': recipe('flooded.wine-cellar','C13','flooded',['flooded','drained','fermenting-colony'],16,11,8,['barrel-rack','flood-basin','tasting-table','fungal-vat','cargo-lift','drain-channel']),
  'fungal.glasshouse.rotten': recipe('fungal.glasshouse.rotten','F27','overgrown',['overgrown','cultivated','shattered'],17,13,10,['glasshouse-frame','cultivation-bed','irrigation-line','secret-route','spore-canopy','shatter-zone']),
  'fungal.gardener.chamber': recipe('fungal.gardener.chamber','F29','sleeping',['sleeping','awakened','consumed'],14,11,8,['gardener-cot','medicine-table','root-throne','memory-shelf','rest-circle','consumption-core']),
  'spider.vault.hosts': recipe('spider.vault.hosts','G32','occupied',['occupied','rescued','empty-cocoons'],16,12,10,['host-cocoon','rescue-platform','silk-hoist','feeding-line','cocoon-rack','exit-lane']),
  'spider.gallery.spawning': recipe('spider.gallery.spawning','G33','brooding',['brooding','overpopulated','destroyed'],17,13,10,['egg-clutch','nursery-web','brood-altar','hatch-lane','fire-target','queen-signal'])
});

function recipe(id, roomId, defaultState, states, width, depth, height, sockets) {
  return Object.freeze({ id, roomId, defaultState, states:Object.freeze(states), footprint:Object.freeze({width,depth,height}), sockets:Object.freeze(sockets), triangleBudget:64000 });
}

export const CAMPAIGN_COMPLETION_BUNDLE_IDS = Object.freeze(Object.keys(CAMPAIGN_COMPLETION_RECIPES));
export const getCampaignCompletionRecipe = id => CAMPAIGN_COMPLETION_RECIPES[id] ?? null;
export const listCampaignCompletionRecipes = () => Object.values(CAMPAIGN_COMPLETION_RECIPES);
