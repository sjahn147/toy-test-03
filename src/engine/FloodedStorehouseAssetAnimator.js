export class FloodedStorehouseAssetAnimator {
  update(root, elapsedSeconds, deltaSeconds = 1 / 60) {
    if (!root) return;
    root.traverse(node => {
      if (node.name === 'water-surface') animateWater(node, elapsedSeconds);
      else if (node.name === 'waterfall-sheet') animateWaterfall(node, elapsedSeconds);
      else if (node.name === 'drainage-waterwheel') animateSpin(node, deltaSeconds, 'y');
      else if (node.name === 'gear-wheel') animateSpin(node, deltaSeconds, 'z');
      else if (node.name === 'pressure-needle') animateNeedle(node, elapsedSeconds);
      else if (node.name === 'hanging-chain' || node.name === 'chain-hoist') animateHanging(node, elapsedSeconds);
      else if (node.name === 'floating-barrel') animateFloat(node, elapsedSeconds);
      else if (node.name === 'spark-mote') animateSpark(node, elapsedSeconds);
      else if (node.name === 'status-lamp') animateLamp(node, elapsedSeconds);
    });
  }
}

function animateWater(node, t) {
  const baseY = node.userData.baseY ?? node.position.y;
  const amp = node.userData.waveAmplitude ?? 0.02;
  const speed = node.userData.waveSpeed ?? 0.65;
  node.position.y = baseY + Math.sin(t * speed + node.id * 0.13) * amp;
  node.rotation.z = Math.sin(t * 0.23 + node.id) * 0.004;
}
function animateWaterfall(node, t) {
  const base = node.userData.baseOpacity ?? node.material.opacity;
  node.material.opacity = Math.max(0.12, base + Math.sin(t * 2.2 + node.id) * 0.08);
  node.scale.y = 1 + Math.sin(t * 1.7 + node.id * 0.2) * 0.04;
}
function animateSpin(node, dt, axis) {
  const speed = node.userData.spinSpeed ?? 0;
  if (!speed) return;
  node.rotation[axis] += speed * Math.min(dt, 0.05);
}
function animateNeedle(node, t) {
  const base = node.userData.baseRotationZ ?? node.rotation.z;
  node.rotation.z = base + Math.sin(t * 0.9 + node.id * 0.1) * 0.08;
}
function animateHanging(node, t) {
  const base = node.userData.baseRotationZ ?? 0;
  node.rotation.z = base + Math.sin(t * 0.72 + node.id * 0.07) * 0.028;
}
function animateFloat(node, t) {
  const baseY = node.userData.baseY ?? node.position.y;
  node.position.y = baseY + Math.sin(t * 0.8 + node.id * 0.1) * 0.05;
  node.rotation.z = Math.sin(t * 0.55 + node.id) * 0.06;
}
function animateSpark(node, t) {
  const baseY = node.userData.baseY ?? node.position.y;
  const phase = node.userData.phase ?? 0;
  node.position.y = baseY + ((t * 0.7 + phase) % 1) * 0.65;
  node.scale.setScalar(0.75 + Math.sin(t * 8 + phase) * 0.2);
}
function animateLamp(node, t) {
  const base = node.userData.baseEmissiveIntensity ?? node.material.emissiveIntensity ?? 0.3;
  node.material.emissiveIntensity = base * (0.82 + Math.sin(t * 3.1 + node.id) * 0.18);
}
