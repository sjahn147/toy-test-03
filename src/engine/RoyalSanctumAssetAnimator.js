export class RoyalSanctumAssetAnimator {
  constructor(root) {
    this.eyes=[];
    root.traverse(node=>{
      if(node.userData?.animationChannel==='awakened-eye') this.eyes.push({node,base:node.scale.clone()});
    });
  }
  update(deltaSeconds) {
    const time=(this.time=(this.time||0)+deltaSeconds);
    for(const item of this.eyes) item.node.scale.set(item.base.x,item.base.y*(1+Math.sin(time*2.1)*0.12),item.base.z);
  }
}
