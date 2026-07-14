import { THREE } from './ThreeScene.js';
import { roomSurfaceY } from './DungeonTopology.js';

export class VerticalConnectorRenderer {
  constructor({ parent, connectors = [], rooms = [], floorHeight = 5.4 } = {}) {
    this.parent = parent;
    this.floorHeight = floorHeight;
    this.roomById = new Map(rooms.map(room => [room.id, room]));
    this.connectors = new Map(connectors.map(connector => [connector.id, connector]));
    this.groups = new Map();
    this.activeFloorId = connectors[0]?.from?.floorId ?? 'F0';
    this.root = new THREE.Group();
    this.root.name = 'VerticalConnectorGroup';
    this.root.userData.entityType = 'vertical-connector-root';
    parent.add(this.root);
    this.build();
  }

  build() {
    for (const connector of this.connectors.values()) {
      const group = this.createConnector(connector);
      this.groups.set(connector.id, group);
      this.root.add(group);
    }
    this.setActiveFloor(this.activeFloorId);
  }

  sync(snapshots = []) {
    for (const snapshot of snapshots ?? []) {
      const current = this.connectors.get(snapshot.id);
      if (!current) continue;
      const before = signature(current);
      Object.assign(current, snapshot);
      if (before !== signature(current)) {
        const old = this.groups.get(current.id);
        if (old) { this.root.remove(old); disposeTree(old); }
        const next = this.createConnector(current);
        this.groups.set(current.id, next);
        this.root.add(next);
      }
    }
    this.setActiveFloor(this.activeFloorId);
  }

  setActiveFloor(floorId) {
    this.activeFloorId = floorId;
    for (const [id, group] of this.groups) {
      const connector = this.connectors.get(id);
      const touches = connector.from.floorId === floorId || connector.to.floorId === floorId;
      group.visible = touches && connector.visibility !== 'hidden';
      group.userData.worldInteractionHidden = !group.visible;
      for (const child of group.children) {
        const childFloor = child.userData?.floorId;
        if (childFloor) child.visible = childFloor === floorId;
      }
    }
  }

  createConnector(connector) {
    const group = new THREE.Group();
    group.name = `vertical-connector:${connector.id}`;
    group.userData = { entityType:'vertical-connector', connectorId:connector.id, routeId:connector.id, fromRoomId:connector.from.roomId, toRoomId:connector.to.roomId, connectorState:connector.state };
    group.add(this.createLanding(connector, connector.from));
    group.add(this.createLanding(connector, connector.to));
    return group;
  }

  createLanding(connector, landing) {
    const group = new THREE.Group();
    group.name = `connector-landing:${landing.id}`;
    group.userData = { entityType:'vertical-connector', connectorId:connector.id, landingId:landing.id, roomId:landing.roomId, floorId:landing.floorId };
    const room = this.roomById.get(landing.roomId);
    const y = roomSurfaceY(room, this.floorHeight);
    const stateColor = connectorColor(connector.state);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.4,0.16,16), new THREE.MeshStandardMaterial({ color:stateColor, roughness:0.76, metalness:connector.type.includes('lift')||connector.type.includes('hoist')?0.32:0.06 }));
    base.position.y = 0.08;
    group.add(base);
    if (connector.type.includes('stair')) addStair(group, stateColor);
    else if (connector.type.includes('lift') || connector.type.includes('hoist')) addLift(group, stateColor);
    else addShaft(group, stateColor);
    const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.46,0.07,8,24), new THREE.MeshBasicMaterial({ color:stateColor, transparent:true, opacity:0.86, depthWrite:false }));
    glyph.rotation.x = Math.PI/2;
    glyph.position.y = 1.5;
    group.add(glyph);
    group.position.set(landing.position.x, y + 0.02, landing.position.z);
    group.traverse(node => { node.userData ??= {}; node.userData.entityType ??='vertical-connector'; node.userData.connectorId ??=connector.id; node.userData.roomId ??=landing.roomId; node.userData.floorId ??=landing.floorId; });
    return group;
  }

  destroy() {
    this.parent.remove(this.root);
    disposeTree(this.root);
    this.groups.clear();
    this.connectors.clear();
  }
}

function addStair(group,color){for(let i=0;i<6;i++){const step=new THREE.Mesh(new THREE.BoxGeometry(1.8-i*0.12,0.14,0.34),new THREE.MeshStandardMaterial({color,roughness:0.92}));step.position.set(0,0.12+i*0.12,-0.75+i*0.28);group.add(step);}}
function addLift(group,color){const frameMat=new THREE.MeshStandardMaterial({color,roughness:0.62,metalness:0.42});for(const x of[-0.9,0.9]){const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,2.1,0.12),frameMat.clone());post.position.set(x,1.05,0);group.add(post);}const beam=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.12,0.12),frameMat.clone());beam.position.y=2.05;group.add(beam);const cage=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.12,1.5),new THREE.MeshStandardMaterial({color,roughness:0.72,metalness:0.28}));cage.position.y=0.24;group.add(cage);}
function addShaft(group,color){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.0,0.12,8,24),new THREE.MeshStandardMaterial({color,roughness:0.8,metalness:0.18}));ring.rotation.x=Math.PI/2;ring.position.y=0.18;group.add(ring);for(const x of[-0.55,0.55]){const rail=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.8,0.1),new THREE.MeshStandardMaterial({color,roughness:0.7,metalness:0.35}));rail.position.set(x,0.9,0);group.add(rail);}}
function connectorColor(state){if(['open','working'].includes(state))return 0x78b48b;if(['hidden'].includes(state))return 0x4f4b59;if(['blocked','webbed','damaged','collapsed'].includes(state))return 0xa45f55;return 0xb78a4f;}
function signature(connector){return `${connector.state}:${connector.visibility}:${connector.damage ?? 0}:${connector.repairProgress ?? 0}`;}
function disposeTree(root){root.traverse?.(node=>{node.geometry?.dispose?.();if(Array.isArray(node.material))node.material.forEach(item=>item?.dispose?.());else node.material?.dispose?.();});}
