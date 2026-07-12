const prepared = new WeakSet();

export class OssuaryCathedralAssetAnimator {
  prepare(root) {
    if (!root || prepared.has(root)) return root;
    root.traverse(node => {
      if (!node.userData?.animation) return;
      node.userData.ossuaryBase = {
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
      const base = node.userData?.ossuaryBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'corpse-flame') {
        const pulse = 1 + Math.sin(elapsed * 8 + phase) * 0.16;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.6), base.scale.z * pulse);
      } else if (animation === 'soul-rise') {
        const t = (elapsed * 0.35 + phase) % 1;
        node.position.y = base.position.y + t * 1.6;
        if (node.material) node.material.opacity = 0.42 * (1 - t);
      } else if (animation === 'bell-tremble') {
        node.rotation.z = base.rotation.z + Math.sin(elapsed * 1.9 + phase) * 0.05;
      } else if (animation === 'chain-sway') {
        node.rotation.x = base.rotation.x + Math.sin(elapsed * 0.9 + phase) * 0.06;
      } else if (animation === 'organ-pulse' && node.material && base.emissiveIntensity !== null) {
        node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsed * 1.4 + phase) * 0.32);
      } else if (animation === 'gate-creak') {
        node.rotation.y = base.rotation.y + Math.sin(elapsed * 0.35 + phase) * 0.045;
      } else if (animation === 'skeleton-twitch') {
        node.rotation.z = base.rotation.z + Math.sin(elapsed * 2.4 + phase) * 0.03;
      } else if (animation === 'well-surge') {
        node.position.y = base.position.y + Math.sin(elapsed * 0.6 + phase) * 0.12;
      }
    });
  }
}
