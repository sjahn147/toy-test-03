const preparedRoots = new WeakSet();

export class SpiderColonyAssetAnimator {
  prepare(root) {
    if (!root || preparedRoots.has(root)) return root;
    root.traverse((node) => {
      const animation = node.userData?.animation;
      if (!animation) return;
      node.userData.spiderAnimationBase = {
        position: node.position.clone(),
        rotation: node.rotation.clone(),
        scale: node.scale.clone(),
        emissiveIntensity: node.material?.emissiveIntensity ?? null
      };
    });
    preparedRoots.add(root);
    return root;
  }

  update(root, elapsedSeconds) {
    if (!root) return;
    this.prepare(root);
    root.traverse((node) => {
      const animation = node.userData?.animation;
      const base = node.userData?.spiderAnimationBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'silk-sway') {
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.62 + phase) * 0.025;
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.78 + phase * 1.7) * 0.045;
      }

      if (animation === 'spider-breathe') {
        const pulse = 1 + Math.sin(elapsedSeconds * 1.45 + phase) * 0.035;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 0.65), base.scale.z * pulse);
        node.position.y = base.position.y + Math.sin(elapsedSeconds * 1.45 + phase) * 0.04;
      }

      if (animation === 'egg-pulse') {
        const pulse = 1 + Math.sin(elapsedSeconds * 1.2 + phase) * 0.055;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.4), base.scale.z * pulse);
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsedSeconds * 1.2 + phase) * 0.12);
        }
      }

      if (animation === 'ember-particle') {
        const rise = (elapsedSeconds * 0.72 + phase) % 4.2;
        node.position.y = base.position.y + rise;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 1.8 + phase) * 0.12;
        node.position.z = base.position.z + Math.cos(elapsedSeconds * 1.55 + phase) * 0.1;
      }

      if (animation === 'falling-dust') {
        const fall = (elapsedSeconds * 0.85 + phase) % 8.4;
        node.position.y = base.position.y - fall;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 0.52 + phase) * 0.08;
        node.position.z = base.position.z + Math.cos(elapsedSeconds * 0.47 + phase) * 0.08;
      }

      if (animation === 'spore-orbit') {
        const angle = elapsedSeconds * 0.32 + phase;
        const radius = Math.hypot(base.position.x, base.position.z);
        node.position.x = Math.cos(angle) * radius;
        node.position.z = Math.sin(angle) * radius;
        node.position.y = base.position.y + Math.sin(elapsedSeconds * 0.8 + phase) * 0.22;
      }

      if (animation === 'flame-flicker') {
        const flicker = 1 + Math.sin(elapsedSeconds * 8.2 + phase) * 0.08;
        node.scale.set(base.scale.x * flicker, base.scale.y * (1 + (flicker - 1) * 1.8), base.scale.z * flicker);
      }
    });
  }
}
