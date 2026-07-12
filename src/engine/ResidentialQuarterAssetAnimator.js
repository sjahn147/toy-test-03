const prepared=new WeakSet();
export class ResidentialQuarterAssetAnimator{
  prepare(root){
    if(!root||prepared.has(root)) return root;
    root.traverse(node=>{
      if(!node.userData?.animation) return;
      node.userData.residentialBase={position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone(),emissiveIntensity:node.material?.emissiveIntensity??null};
    });
    prepared.add(root); return root;
  }
  update(root,elapsed=0){
    this.prepare(root);
    root?.traverse(node=>{
      const animation=node.userData?.animation, base=node.userData?.residentialBase;
      if(!animation||!base) return;
      const phase=node.userData.phase??node.id*0.173;
      if(animation==='flame-flicker'){
        const p=1+Math.sin(elapsed*8+phase)*0.09;
        node.scale.set(base.scale.x*p,base.scale.y*(1+(p-1)*1.8),base.scale.z*p);
      } else if(animation==='water-shimmer'){
        node.position.y=base.position.y+Math.sin(elapsed*1.7+phase)*0.035;
      } else if(animation==='spore-float'){
        node.position.y=base.position.y+Math.sin(elapsed*1.2+phase)*0.22;
        node.position.x=base.position.x+Math.sin(elapsed*0.7+phase)*0.08;
      } else if(animation==='cloth-sway'){
        node.rotation.z=base.rotation.z+Math.sin(elapsed*1.5+phase)*0.08;
      } else if(animation==='holy-pulse'&&node.material&&base.emissiveIntensity!==null){
        node.material.emissiveIntensity=Math.max(0,base.emissiveIntensity+Math.sin(elapsed*1.4+phase)*0.25);
      }
    });
  }
}
