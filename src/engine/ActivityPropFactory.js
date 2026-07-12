import { THREE } from './ThreeScene.js';

export class ActivityPropFactory {
  constructor() {
    this.materials = new Map();
  }

  create(activity, agent = {}) {
    const group = new THREE.Group();
    group.name = `activity-prop:${activity?.prop ?? activity?.type ?? 'none'}`;
    group.userData.activityType = activity?.type ?? null;
    group.userData.activityProp = activity?.prop ?? null;

    const prop = activity?.prop;
    if (prop === 'bowl-spoon') this.addBowl(group);
    else if (prop === 'cookpot-ladle') this.addCookpot(group);
    else if (prop === 'bedroll-blanket' || prop === 'rough-bedroll') this.addBedroll(group, prop === 'rough-bedroll');
    else if (prop === 'camp-mug') this.addMug(group);
    else if (prop === 'watch-lantern') this.addLantern(group, false);
    else if (prop === 'watch-torch') this.addLantern(group, true);
    else if (prop === 'meat-ration') this.addRation(group, false);
    else if (prop === 'bone-offering') this.addRation(group, true);
    else if (prop === 'hammer-plank') this.addRepairKit(group);
    else return null;

    group.userData.ownerRole = agent.role ?? null;
    return group;
  }

  addBowl(group) {
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.58),
      this.mat('bowl', 0x6f5540, { roughness: 0.86 })
    );
    bowl.name = 'activity-bowl';
    bowl.rotation.x = Math.PI;
    bowl.position.set(-0.16, 0.62, 0.2);
    const broth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.012, 14),
      this.mat('broth', 0x8b4f2f, { roughness: 0.55, emissive: 0x241006 })
    );
    broth.name = 'activity-broth';
    broth.position.set(-0.16, 0.67, 0.2);
    const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.34, 6), this.mat('utensil', 0xa7aaab, { roughness: 0.38, metalness: 0.36 }));
    spoon.name = 'activity-spoon';
    spoon.rotation.z = 0.58;
    spoon.position.set(0.18, 0.72, 0.2);
    group.add(bowl, broth, spoon);
  }

  addCookpot(group) {
    const iron = this.mat('cook-iron', 0x3c4144, { roughness: 0.58, metalness: 0.28 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.2, 12), iron);
    pot.name = 'activity-pot';
    pot.position.set(0, 0.18, 0.42);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.018, 6, 16), iron);
    rim.name = 'activity-pot-rim';
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.285, 0.42);
    const stew = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.015, 14), this.mat('stew', 0x9f5934, { roughness: 0.45, emissive: 0x2e1307 }));
    stew.name = 'activity-stew';
    stew.position.set(0, 0.29, 0.42);
    const ladle = new THREE.Group();
    ladle.name = 'activity-ladle';
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.52, 6), this.mat('ladle-metal', 0x9ca1a3, { roughness: 0.4, metalness: 0.32 }));
    handle.rotation.z = 0.38;
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), iron);
    cup.position.set(-0.1, -0.22, 0);
    cup.rotation.x = Math.PI;
    ladle.position.set(0.12, 0.54, 0.39);
    ladle.add(handle, cup);
    for (let index = 0; index < 3; index += 1) {
      const steam = new THREE.Mesh(new THREE.TorusGeometry(0.035 + index * 0.012, 0.008, 4, 10, Math.PI * 1.2), this.mat(`steam-${index}`, 0xd9ddd8, { transparent: true, opacity: 0.34, emissive: 0x5f5f5f }));
      steam.name = `activity-steam-${index}`;
      steam.rotation.set(Math.PI / 2, 0, index * 0.6);
      steam.position.set((index - 1) * 0.065, 0.39 + index * 0.055, 0.42);
      group.add(steam);
    }
    group.add(pot, rim, stew, ladle);
  }

  addBedroll(group, rough) {
    const roll = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.055, 0.34), this.mat(rough ? 'rough-bed' : 'bedroll', rough ? 0x5b4c3e : 0x445d76, { roughness: 0.94 }));
    roll.name = 'activity-bedroll';
    roll.position.set(0, 0.035, 0.02);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.035, 0.3), this.mat(rough ? 'rough-blanket' : 'blanket', rough ? 0x6c5743 : 0x6f8298, { roughness: 0.96, transparent: true, opacity: 0.92 }));
    blanket.name = 'activity-blanket';
    blanket.position.set(0.08, 0.14, 0.01);
    blanket.rotation.z = 0.04;
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.28), this.mat('pillow', rough ? 0x645846 : 0x8794a0, { roughness: 0.92 }));
    pillow.name = 'activity-pillow';
    pillow.position.set(-0.25, 0.09, 0.02);
    group.add(roll, blanket, pillow);
  }

  addMug(group) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.15, 10), this.mat('mug', 0x8a6a4d, { roughness: 0.84 }));
    mug.name = 'activity-mug';
    mug.position.set(-0.18, 0.58, 0.2);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 10, Math.PI * 1.55), this.mat('mug-handle', 0x8a6a4d, { roughness: 0.84 }));
    handle.name = 'activity-mug-handle';
    handle.rotation.y = Math.PI / 2;
    handle.position.set(-0.11, 0.59, 0.2);
    group.add(mug, handle);
  }

  addLantern(group, torch) {
    if (torch) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.62, 6), this.mat('torch-wood', 0x5b3c28, { roughness: 0.96 }));
      shaft.name = 'activity-watch-tool';
      shaft.position.set(-0.22, 0.55, 0.18);
      shaft.rotation.z = -0.08;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 7), this.mat('torch-flame', 0xffa448, { roughness: 0.18, emissive: 0xb13a0c }));
      flame.name = 'activity-watch-flame';
      flame.position.set(-0.19, 0.92, 0.18);
      group.add(shaft, flame);
    } else {
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 8), this.mat('lantern-frame', 0x4e4540, { roughness: 0.54, metalness: 0.3 }));
      frame.name = 'activity-watch-tool';
      frame.position.set(-0.22, 0.52, 0.18);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 9, 7), this.mat('lantern-glow', 0xffc568, { roughness: 0.12, emissive: 0xd15b18, transparent: true, opacity: 0.92 }));
      glow.name = 'activity-watch-flame';
      glow.position.set(-0.22, 0.54, 0.18);
      const light = new THREE.PointLight(0xffa85a, 0.52, 2.4, 2);
      light.name = 'activity-watch-light';
      light.position.copy(glow.position);
      group.add(frame, glow, light);
    }
  }

  addRation(group, bone) {
    const ration = bone
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34, 7), this.mat('ration-bone', 0xd1c9af, { roughness: 0.82 }))
      : new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), this.mat('ration-meat', 0x7f3932, { roughness: 0.86 }));
    ration.name = 'activity-ration';
    ration.rotation.z = bone ? Math.PI / 2 : 0.18;
    ration.position.set(0.16, 0.58, 0.22);
    group.add(ration);
  }

  addRepairKit(group) {
    const wood = this.mat('repair-wood', 0x6d4b31, { roughness: 0.95 });
    const iron = this.mat('repair-iron', 0x84898a, { roughness: 0.48, metalness: 0.3 });
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.065, 0.14), wood);
    plank.name = 'activity-plank';
    plank.position.set(-0.08, 0.18, 0.38);
    plank.rotation.y = 0.18;
    const hammer = new THREE.Group();
    hammer.name = 'activity-hammer';
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.38, 6), wood);
    handle.rotation.z = 0.26;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.08), iron);
    head.position.set(-0.05, 0.19, 0);
    head.rotation.z = 0.26;
    hammer.position.set(0.18, 0.58, 0.2);
    hammer.add(handle, head);
    group.add(plank, hammer);
  }

  animate(root, activity, time) {
    if (!root || !activity) return;
    const phase = time * 4.2 + hash01(activity.id) * Math.PI * 2;
    const pulse = Math.sin(phase);
    const bowl = root.getObjectByName('activity-bowl');
    if (bowl) bowl.position.y = 0.62 + Math.max(0, pulse) * 0.025;
    const spoon = root.getObjectByName('activity-spoon');
    if (spoon) spoon.rotation.z = 0.58 + Math.max(0, pulse) * 0.62;
    const ladle = root.getObjectByName('activity-ladle');
    if (ladle) {
      ladle.rotation.y = time * 2.8;
      ladle.position.x = 0.12 + Math.sin(time * 2.8) * 0.07;
      ladle.position.z = 0.39 + Math.cos(time * 2.8) * 0.05;
    }
    root.traverse(child => {
      if (child.name.startsWith('activity-steam-')) {
        const index = Number(child.name.split('-').pop()) || 0;
        child.position.y = 0.39 + index * 0.055 + ((time * 0.16 + index * 0.23) % 0.18);
        child.rotation.z = time * 0.3 + index;
      }
    });
    const flame = root.getObjectByName('activity-watch-flame');
    if (flame) {
      const scale = 1 + Math.sin(time * 9.2 + hash01(activity.id) * 8) * 0.12;
      flame.scale.set(scale * 0.92, scale, scale * 0.92);
    }
    const light = root.getObjectByName('activity-watch-light');
    if (light) light.intensity = 0.48 + Math.sin(time * 8.4) * 0.08;
    const blanket = root.getObjectByName('activity-blanket');
    if (blanket) blanket.scale.y = 1 + Math.sin(time * 1.25) * 0.08;
    const hammer = root.getObjectByName('activity-hammer');
    if (hammer) hammer.rotation.z = -0.18 - Math.max(0, Math.sin(time * 4.8)) * 0.92;
  }

  mat(key, color, options = {}) {
    const cacheKey = `${key}:${color}:${JSON.stringify(options)}`;
    if (this.materials.has(cacheKey)) return this.materials.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0,
      emissiveIntensity: options.emissive ? 0.62 : 0
    });
    this.materials.set(cacheKey, material);
    return material;
  }
}

function hash01(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return (result % 1000) / 1000;
}
