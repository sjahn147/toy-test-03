// Zone A animator. Writes ABSOLUTE transforms from a snapshotted stable base.
// Never accumulate vertical drift, never multiply scale in place — every frame restores from base.
const preparedRoots = new WeakSet();

export class WaystationAssetAnimator {
  prepare(root) {
    if (!root || preparedRoots.has(root)) return root;
    root.traverse((node) => {
      const animation = node.userData?.animation;
      if (!animation) return;
      node.userData.waystationAnimationBase = {
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
    const t = elapsedSeconds ?? 0;
    root.traverse((node) => {
      const animation = node.userData?.animation;
      const base = node.userData?.waystationAnimationBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'lantern-flicker') {
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(t * 6.5 + phase) * 0.22 + Math.sin(t * 13.3 + phase * 2.1) * 0.09);
        }
        const pulse = 1 + Math.sin(t * 6.5 + phase) * 0.03;
        node.scale.set(base.scale.x * pulse, base.scale.y * pulse, base.scale.z * pulse);
      }

      if (animation === 'banner-wave') {
        node.rotation.z = base.rotation.z + Math.sin(t * 1.3 + phase) * 0.10;
        node.rotation.y = base.rotation.y + Math.sin(t * 0.9 + phase * 1.4) * 0.16;
      }

      if (animation === 'water-shimmer') {
        node.position.y = base.position.y + Math.sin(t * 1.6 + phase) * 0.05;
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(t * 2.1 + phase) * 0.15);
        }
      }

      if (animation === 'resurrection-pulse') {
        const pulse = 1 + Math.sin(t * 1.1 + phase) * 0.05;
        node.scale.set(base.scale.x * pulse, base.scale.y, base.scale.z * pulse);
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(t * 1.1 + phase) * 0.35);
        }
      }

      if (animation === 'rune-pulse') {
        if (node.material && base.emissiveIntensity !== null) {
          node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(t * 1.5 + phase) * 0.4);
        }
      }

      if (animation === 'mist-drift') {
        const angle = t * 0.14 + phase;
        const radius = Math.hypot(base.position.x, base.position.z);
        node.position.x = Math.cos(angle) * radius;
        node.position.z = Math.sin(angle) * radius;
        node.position.y = base.position.y + Math.sin(t * 0.5 + phase) * 0.18;
      }

      if (animation === 'chain-sway') {
        node.rotation.x = base.rotation.x + Math.sin(t * 0.9 + phase) * 0.06;
        node.rotation.z = base.rotation.z + Math.sin(t * 1.1 + phase * 1.3) * 0.05;
      }

      if (animation === 'dust-fall') {
        const fall = (t * 0.8 + phase) % 7.5;
        node.position.y = base.position.y - fall;
        node.position.x = base.position.x + Math.sin(t * 0.5 + phase) * 0.08;
        node.position.z = base.position.z + Math.cos(t * 0.46 + phase) * 0.08;
      }

      if (animation === 'ember-rise') {
        const rise = (t * 0.7 + phase) % 3.8;
        node.position.y = base.position.y + rise;
        node.position.x = base.position.x + Math.sin(t * 1.7 + phase) * 0.1;
        node.position.z = base.position.z + Math.cos(t * 1.5 + phase) * 0.09;
      }

      if (animation === 'flame-flicker') {
        const flicker = 1 + Math.sin(t * 8.2 + phase) * 0.08;
        node.scale.set(base.scale.x * flicker, base.scale.y * (1 + (flicker - 1) * 1.8), base.scale.z * flicker);
      }

      if (animation === 'crowd-shuffle') {
        node.position.x = base.position.x + Math.sin(t * 1.4 + phase) * 0.09;
        node.rotation.y = base.rotation.y + Math.sin(t * 0.8 + phase) * 0.2;
      }
    });
  }
}
