import { THREE } from './ThreeScene.js';
import { floorIndexFromId } from '../content/floors/SleepingCitadelFloorContract.js';

export class FloorJunctionRenderer {
  constructor({ parent, junctions = [], floorHeight = 5.4 } = {}) {
    this.parent = parent;
    this.floorHeight = floorHeight;
    this.junctions = junctions;
    this.groups = new Map();
    this.root = new THREE.Group();
    this.root.name = 'FloorJunctionGroup';
    this.root.userData.entityType = 'floor-junction-root';
    parent.add(this.root);
    this.build();
  }

  build() {
    for (const junction of this.junctions) {
      const group = new THREE.Group();
      group.name = `floor-junction:${junction.id}`;
      group.userData = { entityType:'floor-junction', junctionId:junction.id, floorId:junction.floorId, routeIds:[...(junction.routeIds ?? [])] };
      const radius = Math.max(1.35, Math.min(3.2, Number(junction.radius ?? 1.55)));
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.10, 18),
        new THREE.MeshStandardMaterial({ color:0x70675c, roughness:0.92, metalness:0.03 })
      );
      plate.position.y = 0.05;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.72, 0.075, 8, 28),
        new THREE.MeshBasicMaterial({ color:0xc8ad7f, transparent:true, opacity:0.42, depthWrite:false })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      group.add(plate, ring);
      group.position.set(junction.position.x, floorIndexFromId(junction.floorId) * this.floorHeight + 0.015, junction.position.z);
      group.traverse(node => { node.userData ??= {}; node.userData.floorId ??= junction.floorId; node.userData.junctionId ??= junction.id; });
      this.groups.set(junction.id, group);
      this.root.add(group);
    }
  }

  setActiveFloor(floorId) {
    for (const group of this.groups.values()) {
      group.visible = group.userData.floorId === floorId;
      group.userData.worldInteractionHidden = !group.visible;
    }
  }

  destroy() {
    this.parent.remove(this.root);
    disposeTree(this.root);
    this.groups.clear();
  }
}

function disposeTree(root) {
  root.traverse?.(node => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(material => material?.dispose?.());
    else node.material?.dispose?.();
  });
}
