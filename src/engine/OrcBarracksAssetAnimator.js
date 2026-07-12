const preparedRoots = new WeakSet();

export class OrcBarracksAssetAnimator {
  prepare(root) {
    if (!root || preparedRoots.has(root)) return root;
    root.traverse(node => {
      const animation = node.userData?.animation;
      if (!animation) return;
      node.userData.orcBarracksAnimationBase = {
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
      const base = node.userData?.orcBarracksAnimationBase;
      if (!animation || !base) return;
      const phase = node.userData.phase ?? node.id * 0.173;

      if (animation === 'banner-sway' || animation === 'cloth-sway') {
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.42 + phase) * 0.015;
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.55 + phase * 1.31) * 0.042;
      } else if (animation === 'sign-creak') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.34 + phase) * 0.028;
        node.rotation.y = base.rotation.y + Math.sin(elapsedSeconds * 0.22 + phase * 0.7) * 0.01;
      } else if (animation === 'target-swing') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.72 + phase) * 0.035;
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.41 + phase * 1.4) * 0.015;
      } else if (animation === 'weapon-tremble') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.68 + phase) * 0.01;
      } else if (animation === 'chain-sway') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.48 + phase) * 0.026;
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.37 + phase * 1.2) * 0.012;
      } else if (animation === 'drum-pulse') {
        const pulse = 1 + Math.sin(elapsedSeconds * 1.7 + phase) * 0.018;
        node.scale.set(base.scale.x, base.scale.y * pulse, base.scale.z * pulse);
      } else if (animation === 'forge-flicker' || animation === 'flame-flicker') {
        const pulse = 1 + Math.sin(elapsedSeconds * 8.2 + phase) * 0.08 + Math.sin(elapsedSeconds * 13.1 + phase * 0.4) * 0.02;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.7), base.scale.z * pulse);
        if (node.material && base.emissiveIntensity !== null) node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsedSeconds * 8.2 + phase) * 0.14);
      } else if (animation === 'bellows-pulse') {
        const compression = 1 - (Math.sin(elapsedSeconds * 1.15 + phase) + 1) * 0.055;
        node.scale.set(base.scale.x * compression, base.scale.y, base.scale.z * (1 + (1 - compression) * 0.35));
      } else if (animation === 'whetstone-turn') {
        node.rotation.x = base.rotation.x + elapsedSeconds * 0.85;
      } else if (animation === 'ember-rise') {
        const rise = (elapsedSeconds * 0.55 + phase) % 1.9;
        node.position.y = base.position.y + rise;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 1.2 + phase) * 0.09;
        if (node.material && base.opacity !== null) node.material.opacity = Math.max(0.03, base.opacity * (1 - rise / 2.05));
      } else if (animation === 'smoke-drift') {
        const rise = (elapsedSeconds * 0.22 + phase) % 1.7;
        node.position.y = base.position.y + rise;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 0.45 + phase) * 0.13;
        node.position.z = base.position.z + Math.cos(elapsedSeconds * 0.39 + phase) * 0.08;
        if (node.material && base.opacity !== null) node.material.opacity = Math.max(0.015, base.opacity * (1 - rise / 1.95));
      } else if (animation === 'hook-sway') {
        node.rotation.z = base.rotation.z + Math.sin(elapsedSeconds * 0.46 + phase) * 0.03;
        node.rotation.x = base.rotation.x + Math.sin(elapsedSeconds * 0.31 + phase * 1.6) * 0.012;
      } else if (animation === 'cauldron-steam') {
        const rise = (elapsedSeconds * 0.3 + phase) % 1.45;
        node.position.y = base.position.y + rise;
        node.position.x = base.position.x + Math.sin(elapsedSeconds * 0.52 + phase) * 0.08;
        if (node.material && base.opacity !== null) node.material.opacity = Math.max(0.01, base.opacity * (1 - rise / 1.6));
      } else if (animation === 'fly-orbit') {
        const radius = node.userData.orbitRadius ?? 0.32;
        const angle = elapsedSeconds * (1.1 + (node.id % 4) * 0.17) + phase;
        node.position.x = base.position.x + Math.cos(angle) * radius;
        node.position.z = base.position.z + Math.sin(angle) * radius;
        node.position.y = base.position.y + Math.sin(angle * 1.7) * 0.12;
      } else if (animation === 'parasite-pulse') {
        const pulse = 1 + Math.sin(elapsedSeconds * 1.25 + phase) * 0.045;
        node.scale.set(base.scale.x * pulse, base.scale.y * (1 + (pulse - 1) * 1.4), base.scale.z * pulse);
        if (node.material && base.emissiveIntensity !== null) node.material.emissiveIntensity = Math.max(0, base.emissiveIntensity + Math.sin(elapsedSeconds * 1.25 + phase) * 0.06);
      }
    });
  }

  dispose(root) {
    if (!root) return;
    root.traverse(node => {
      if (node.userData?.orcBarracksAnimationBase) delete node.userData.orcBarracksAnimationBase;
    });
    preparedRoots.delete(root);
  }
}
