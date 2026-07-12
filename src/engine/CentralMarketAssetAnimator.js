const preparedRoots = new WeakSet();

export class CentralMarketAssetAnimator {
  prepare(root) {
    if (!root || preparedRoots.has(root)) return root;
    root.traverse(node => {
      const animation = node.userData?.animation;
      if (!animation) return;
      node.userData.centralMarketAnimationBase = {
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.clone(),
        opacity: node.material?.opacity ?? null,
        emissiveIntensity: node.material?.emissiveIntensity ?? null
      };
    });
    preparedRoots.add(root);
    return root;
  }

  update(root, elapsedSeconds = 0) {
    if (!root) return;
    this.prepare(root);
    root.traverse(node => {
      const animation = node.userData?.animation;
      const base = node.userData?.centralMarketAnimationBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'cloth-sway') {
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.48 + phase) * 0.018;
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.61 + phase * 1.37) * 0.05;
      } else if (animation === 'sign-creak') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.36 + phase) * 0.035;
        node.rotation.y = base.rotation.y + Math.sin(elapsedSeconds * 0.21 + phase * 0.73) * 0.012;
      } else if (animation === 'lantern-sway') {
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.54 + phase) * 0.025;
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.47 + phase * 1.4) * 0.032;
      } else if (animation === 'lantern-glow') {
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsedSeconds * 2.7 + phase) * 0.1);
        }
      } else if (animation === 'flame-flicker') {
        const pulse = 1 + Math.sin(elapsedSeconds * 8.4 + phase) * 0.09 + Math.sin(elapsedSeconds * 13.7 + phase * 0.4) * 0.025;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.7), base.scale.z * pulse);
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsedSeconds * 8.4 + phase) * 0.16);
        }
      } else if (animation === 'smoke-rise') {
        const rise = (elapsedSeconds * 0.28 + phase) % 1.8;
        node.position.y = base.position.y + rise;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 0.6 + phase) * 0.12;
        node.position.z = base.position.z + Math.cos(elapsedSeconds * 0.51 + phase) * 0.08;
        if (node.material && base.opacity !== null) node.material.opacity = Math.max(0.02, base.opacity * (1 - rise / 2.05));
      } else if (animation === 'chain-tremble') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.72 + phase) * 0.018;
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.53 + phase * 1.3) * 0.012;
      } else if (animation === 'water-ripple') {
        const pulse = 1 + Math.sin(elapsedSeconds * 1.05 + phase) * 0.012;
        node.scale.set(base.scale.x * pulse, base.scale.y, base.scale.z * pulse);
        if (node.material && base.opacity !== null) node.material.opacity = base.opacity + Math.sin(elapsedSeconds * 0.8 + phase) * 0.035;
      } else if (animation === 'poison-ripple') {
        const pulse = 1 + Math.sin(elapsedSeconds * 1.7 + phase) * 0.02;
        node.scale.set(base.scale.x * pulse, base.scale.y, base.scale.z * pulse);
        if (node.material && base.opacity !== null) node.material.opacity = base.opacity + Math.sin(elapsedSeconds * 2.1 + phase) * 0.055;
      } else if (animation === 'bucket-sway') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.58 + phase) * 0.045;
        node.position.y = base.position.y + Math.sin(elapsedSeconds * 0.42 + phase) * 0.035;
      } else if (animation === 'rope-drift') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.42 + phase) * 0.018;
      } else if (animation === 'hidden-lamp-pulse') {
        if (node.material && base.emissiveIntensity !== null) {
          const blink = Math.max(0, Math.sin(elapsedSeconds * 1.35 + phase));
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + blink * 0.22 - 0.04);
        }
      } else if (animation === 'dust-breath') {
        const drift = (elapsedSeconds * 0.11 + phase) % 1.2;
        node.position.y = base.position.y + drift * 0.45;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 0.25 + phase) * 0.08;
        if (node.material && base.opacity !== null) node.material.opacity = Math.max(0.01, base.opacity * (1 - drift / 1.35));
      }
    });
  }

  dispose(root) {
    if (!root) return;
    root.traverse(node => {
      if (node.userData?.centralMarketAnimationBase) delete node.userData.centralMarketAnimationBase;
    });
    preparedRoots.delete(root);
  }
}
