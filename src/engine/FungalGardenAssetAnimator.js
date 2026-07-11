export class FungalGardenAssetAnimator {
  constructor(root) {
    this.root = root;
    this.elapsed = 0;
    this.pulses = [];
    this.motes = [];
    this.hanging = [];

    root.traverse(node => {
      if (node.name === 'organic-pulse') {
        node.userData.baseScale = node.scale.clone();
        node.userData.baseY = node.position.y;
        this.pulses.push(node);
      }
      if (node.name === 'spore-mote') {
        node.userData.baseY = node.position.y;
        node.userData.baseX = node.position.x;
        node.userData.phase ??= this.motes.length * 0.73;
        this.motes.push(node);
      }
      if (node.name === 'hanging-prop') {
        node.userData.baseRotationZ = node.rotation.z;
        node.userData.phase ??= this.hanging.length * 0.91;
        this.hanging.push(node);
      }
    });
  }

  update(deltaSeconds) {
    const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    this.elapsed += Math.min(delta, 0.1);

    this.pulses.forEach((node, index) => {
      const phase = node.userData.phase ?? index * 0.67;
      const pulse = 1 + Math.sin(this.elapsed * 1.75 + phase) * 0.045;
      node.scale.copy(node.userData.baseScale).multiplyScalar(pulse);
      node.position.y = node.userData.baseY + Math.sin(this.elapsed * 1.3 + phase) * 0.018;
      if (node.material?.emissiveIntensity !== undefined) {
        node.material.emissiveIntensity = 0.68 + Math.sin(this.elapsed * 1.65 + phase) * 0.12;
      }
    });

    this.motes.forEach((node, index) => {
      const phase = node.userData.phase ?? index * 0.73;
      node.position.y = node.userData.baseY + Math.sin(this.elapsed * 0.85 + phase) * 0.16;
      node.position.x = node.userData.baseX + Math.cos(this.elapsed * 0.47 + phase) * 0.06;
      node.rotation.y = this.elapsed * 0.22 + phase;
    });

    this.hanging.forEach((node, index) => {
      const phase = node.userData.phase ?? index * 0.91;
      node.rotation.z = node.userData.baseRotationZ + Math.sin(this.elapsed * 0.62 + phase) * 0.035;
    });
  }
}
