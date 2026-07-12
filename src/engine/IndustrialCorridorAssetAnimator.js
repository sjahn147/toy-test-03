const prepared = new WeakSet();

export class IndustrialCorridorAssetAnimator {
  prepare(root) {
    if (!root || prepared.has(root)) return root;
    root.traverse(node => {
      if (!node.userData?.animation) return;
      node.userData.industrialBase = {
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.clone(),
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
      const base = node.userData?.industrialBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'flame-flicker') {
        const pulse = 1 + Math.sin(elapsed * 9 + phase) * 0.1;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.7), base.scale.z * pulse);
      } else if (animation === 'gear-turn') {
        node.rotation.z = base.rotation.z + elapsed * 0.24;
      } else if (animation === 'machine-thrum') {
        node.position.y = base.position.y + Math.sin(elapsed * 11 + phase) * 0.018;
        node.rotation.z = base.rotation.z + Math.sin(elapsed * 7 + phase) * 0.012;
      } else if (animation === 'crane-sway') {
        node.rotation.z = base.rotation.z + Math.sin(elapsed * 0.65 + phase) * 0.025;
      } else if (animation === 'bell-tremble') {
        node.rotation.z = base.rotation.z + Math.sin(elapsed * 1.8 + phase) * 0.045;
      } else if (animation === 'pressure-test') {
        node.position.y = base.position.y - Math.max(0, Math.sin(elapsed * 1.5 + phase)) * 0.06;
      } else if (animation === 'afterglow-pulse' && node.material && base.emissiveIntensity !== null) {
        node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsed * 2.2 + phase) * 0.28);
      }
    });
  }
}
