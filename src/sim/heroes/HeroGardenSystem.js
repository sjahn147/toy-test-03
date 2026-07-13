import { recomputeHeroStats } from './HeroSystem.js';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export class HeroGardenSystem {
  constructor({ onEvent = () => {} } = {}) { this.onEvent = onEvent; this.patches = []; this.sequence = 0; }
  update(dt, sim) {
    const survivors = [];
    for (const patch of this.patches) {
      patch.remaining -= dt; patch.pulse -= dt;
      if (patch.pulse <= 0) { patch.pulse += 1; this.pulsePatch(patch, sim); }
      if (patch.remaining > 0) survivors.push(patch);
    }
    this.patches = survivors;
    for (const agent of sim?.agents ?? []) {
      tickStatus(agent, 'gardenRoot', dt);
      tickStatus(agent, 'gardenSlow', dt);
    }
    for (const hero of (sim?.agents ?? []).filter(agent => agent.heroId === 'hero.sleeping-gardener')) {
      tickStatus(hero, 'seasonalTurn', dt, () => { delete hero.heroStatModifiers.season; recomputeHeroStats(hero); });
    }
  }
  rootedOrchard(owner, effect, sim) {
    const patch = { id:`garden-${this.sequence++}`,kind:'rooted-orchard',ownerId:owner.id,heroId:owner.heroId,factionId:factionOf(owner),roomId:owner.roomId,radius:effect.radius??5.2,remaining:effect.duration??14,pulse:0,healPerSecond:effect.healPerSecond??1.1,hostileRoot:effect.hostileRoot??1.2,season:owner.heroSeason??'spring' };
    this.patches.push(patch); owner.gardenPatchIds=[...(owner.gardenPatchIds??[]),patch.id]; owner.gardenAwake=true; return true;
  }
  pruneBlight(owner,effect,sim){
    let removed=0;
    for(const source of [sim?.heroEnvironmentSystem?.fields,sim?.heroSkillSystem?.zones,this.patches]){
      const collection = source instanceof Map ? [...source.values()] : source;
      if(!Array.isArray(collection))continue;
      for(const item of collection){if(item.roomId!==owner.roomId||item.ownerId===owner.id)continue;if(/blight|poison|death|corrosion|hostile|web/.test(String(item.kind??item.type??''))){item.remaining=0;removed+=1;if(removed>= (effect.removeFields??2))break;}}
    }
    for(const target of roomHostiles(owner,sim).slice(0,3))sim?.applyCombatDamage?.(owner,target,effect.damage??10,{heroSkill:true,pruning:true});
    sim.heroResourceLedger??={};const faction=factionOf(owner);sim.heroResourceLedger[faction]??={};sim.heroResourceLedger[faction].biomass=(sim.heroResourceLedger[faction].biomass??0)+(effect.biomassGain??3);
    return removed>0||roomHostiles(owner,sim).length>0;
  }
  turnSeasons(owner,effect,sim){
    const current=owner.heroSeason??'spring',order=effect.order??SEASONS,index=Math.max(0,order.indexOf(current));const next=order[(index+1)%order.length];owner.heroSeason=next;owner.heroVariant=`season-${next}`;owner.heroStatuses.seasonalTurn={remaining:effect.duration??16,season:next};owner.heroStatModifiers.season=seasonModifier(next);recomputeHeroStats(owner);
    for(const patch of this.patches.filter(item=>item.ownerId===owner.id))patch.season=next;
    sim?.emitEffect?.('hero-garden',{roomId:owner.roomId,agentId:owner.id,duration:1.1,cue:`season-${next}`});return true;
  }
  pulsePatch(patch,sim){
    for(const agent of sim?.agents??[]){if(agent.alive===false||agent.roomId!==patch.roomId)continue;if(factionOf(agent)===patch.factionId){const mult=patch.season==='spring'?1.5:patch.season==='summer'?1.15:0.8;agent.hp=Math.min(agent.maxHp??agent.hp,(agent.hp??0)+patch.healPerSecond*mult);}else{agent.heroStatuses??={};if(patch.season==='winter')agent.heroStatuses.gardenSlow={remaining:1.2};else agent.heroStatuses.gardenRoot={remaining:patch.hostileRoot};}}
  }
  isMovementBlocked(agent){return Boolean(agent?.heroStatuses?.gardenRoot?.remaining>0);}
  snapshot(){return{patches:this.patches.map(item=>({...item}))};}
  metrics(){return{heroGardenPatches:this.patches.length};}
}
function seasonModifier(season){return{spring:{armor:1,attack:0,courage:2,speedMultiplier:1,interruptResistance:0.1},summer:{armor:0,attack:3,courage:2,speedMultiplier:1.05,interruptResistance:0.05},autumn:{armor:2,attack:1,courage:3,speedMultiplier:0.94,interruptResistance:0.18},winter:{armor:4,attack:0,courage:4,speedMultiplier:0.78,interruptResistance:0.28}}[season];}
function tickStatus(agent,key,dt,onExpire){const status=agent.heroStatuses?.[key];if(!status)return;status.remaining-=dt;if(status.remaining<=0){delete agent.heroStatuses[key];onExpire?.();}}
function roomHostiles(owner,sim){return(sim?.agents??[]).filter(agent=>agent.id!==owner.id&&agent.alive!==false&&agent.roomId===owner.roomId&&factionOf(agent)!==factionOf(owner));}
function factionOf(agent){return agent?.ecologyFaction??agent?.factionId??agent?.faction??null;}
