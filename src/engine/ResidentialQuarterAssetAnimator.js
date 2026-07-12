const prepared = new WeakSet();

export class ResidentialQuarterAssetAnimator {
  prepare(root) {
    if (!root || prepared.has(root)) return root;
    root.traverse(node => {
      if (!node.userData?.animation) return;
      node.userData.residentialBase = {
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.clone(),
        opacity: node.material?.opacity ?? null,
        emissiveIntensity: node.material?.emissiveIntensity ?? null
      };
    });
    prepared.add(root);
    return root;
  }

  update(root, elapsed = 0) {
    this.prepare(root);
    root?.traverse(node => {
      const animation = node.userData?.animation;
      const base = node.userData?.residentialBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'flame-flicker' || animation === 'candle-flicker') {
        const pulse = 1 + Math.sin(elapsed * 8 + phase) * 0.09;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.8), base.scale.z * pulse);
        if (node.material && base.emissiveIntensity !== null) node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsed * 11 + phase) * 0.18);
      } else if (animation === 'water-ripple' || animation === 'water-shimmer') {
        node.position.y = base.position.y + Math.sin(elapsed * 1.7 + phase) * 0.025;
        node.scale.x = base.scale.x * (1 + Math.sin(elapsed * 1.2 + phase) * 0.018);
      } else if (animation === 'spore-float') {
        node.position.y = base.position.y + Math.sin(elapsed * 1.2 + phase) * 0.22;
        node.position.x = base.position.x + Math.sin(elapsed * 0.7 + phase) * 0.08;
      } else if (animation === 'laundry-sway' || animation === 'cloth-sway') {
        node.rotation.z = base.rotation.z + Math.sin(elapsed * 1.5 + phase) * 0.08;
      } else if (animation === 'fungus-pulse') {
        const pulse = 1 + Math.sin(elapsed * 1.8 + phase) * 0.045;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.5), base.scale.z * pulse);
      } else if (animation === 'sacred-pulse' || animation === 'holy-pulse') {
        node.rotation.z = base.rotation.z + elapsed * 0.08;
        if (node.material && base.emissiveIntensity !== null) node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsed * 1.4 + phase) * 0.25);
      } else if (animation === 'steam-drift') {
        node.position.y = base.position.y + Math.sin(elapsed * 1.1 + phase) * 0.18;
        node.position.x = base.position.x + Math.sin(elapsed * 0.65 + phase) * 0.08;
        if (node.material && base.opacity !== null) node.material.opacity = Math.max(0.08, base.opacity + Math.sin(elapsed * 1.3 + phase) * 0.08);
      } else if (animation === 'dust-fall') {
        node.position.y = base.position.y - ((elapsed * 0.28 + phase) % 1.4);
      } else if (animation === 'ember-rise') {
        node.position.y = base.position.y + ((elapsed * 0.22 + phase) % 0.75);
      }
    });
  }
}
