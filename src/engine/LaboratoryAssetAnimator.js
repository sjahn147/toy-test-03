export class LaboratoryAssetAnimator {
  constructor(root) {
    this.root = root;
    this.rings = [];
    this.bubbles = [];
    root.traverse(node => {
      if (node.userData?.animationChannel === 'orrery-ring') {
        this.rings.push({ node, base: node.rotation.clone(), speed: node.userData.speed || 0.1 });
      }
      if (node.name === 'bio-bubble') {
        this.bubbles.push({ node, baseY: node.position.y, phase: node.position.x + node.position.z });
      }
    });
  }

  update(deltaSeconds) {
    const time = (this.time = (this.time || 0) + deltaSeconds);
    for (const item of this.rings) {
      item.node.rotation.set(item.base.x, item.base.y + time * item.speed, item.base.z);
    }
    for (const item of this.bubbles) {
      item.node.position.y = item.baseY + Math.sin(time * 1.8 + item.phase) * 0.18;
    }
  }
}
