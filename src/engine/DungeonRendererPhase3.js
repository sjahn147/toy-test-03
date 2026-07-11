import { THREE } from './ThreeScene.js';
import { DungeonRendererPhase2 } from './DungeonRendererPhase2.js';
import { ProjectileAssetFactory } from './ProjectileAssetFactory.js';

export class DungeonRendererPhase3 extends DungeonRendererPhase2 {
  constructor(three, scenario, assets) {
    super(three, scenario, assets);
    this.projectileFactory = new ProjectileAssetFactory();
    this.projectileMeshes = new Map();
    this.webMeshes = new Map();
  }

  renderState(snapshot) {
    super.renderState(snapshot);
    this.renderProjectiles(snapshot.projectiles ?? []);
    this.renderCombatPoses(snapshot.agents, snapshot.time);
    this.renderWebbing(snapshot.agents, snapshot.time);
  }

  renderProjectiles(projectiles) {
    const live = new Set(projectiles.map(projectile => projectile.id));
    for (const [id, mesh] of this.projectileMeshes) {
      if (!live.has(id)) {
        this.group.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }

    for (const projectile of projectiles) {
      let mesh = this.projectileMeshes.get(projectile.id);
      if (!mesh) {
        mesh = this.projectileFactory.create(projectile);
        mesh.userData.projectileId = projectile.id;
        this.projectileMeshes.set(projectile.id, mesh);
        this.group.add(mesh);
      }
      const room = this.topology.roomById.get(projectile.roomId);
      mesh.position.set(projectile.x, this.roomY(room) + projectile.y, projectile.z);
      mesh.rotation.y = projectile.rotation;
      if (projectile.type === 'arrow') mesh.rotation.x = Math.PI / 2;
      if (projectile.type !== 'arrow') {
        mesh.rotation.z += 0.12;
        mesh.rotation.x += 0.08;
      }
    }
  }

  renderCombatPoses(agents, time) {
    for (const agent of agents) {
      const mesh = this.agentMeshes.get(agent.id);
      if (!mesh) continue;
      const model = mesh.getObjectByName('miniature-model');
      if (!model) continue;

      if (agent.downed) {
        model.rotation.z = lerp(model.rotation.z, Math.PI * 0.46, 0.18);
        model.position.y = lerp(model.position.y, -0.2, 0.18);
        mesh.visible = true;
        continue;
      }

      model.rotation.z = lerp(model.rotation.z, 0, 0.15);
      model.position.y = lerp(model.position.y, 0, 0.15);
      const combat = agent.combat;
      if (!combat) {
        model.rotation.x = lerp(model.rotation.x, 0, 0.18);
        model.position.z = lerp(model.position.z, 0, 0.18);
        continue;
      }

      if (combat.phase === 'windup') {
        model.rotation.x = lerp(model.rotation.x, -0.28, 0.24);
        model.position.z = lerp(model.position.z, -0.18, 0.22);
      } else if (combat.phase === 'impact') {
        model.rotation.x = lerp(model.rotation.x, 0.34, 0.5);
        model.position.z = lerp(model.position.z, 0.28, 0.5);
      } else {
        model.rotation.x = lerp(model.rotation.x, 0, 0.2);
        model.position.z = lerp(model.position.z, 0, 0.2);
      }

      if (combat.ranged) model.rotation.y += Math.sin(time * 8 + agent.index) * 0.006;
    }
  }

  renderWebbing(agents, time) {
    const webbed = new Set(agents.filter(agent => (agent.webbed ?? 0) > 0).map(agent => agent.id));
    for (const [id, mesh] of this.webMeshes) {
      if (!webbed.has(id)) {
        this.group.remove(mesh);
        this.webMeshes.delete(id);
      }
    }

    for (const agent of agents) {
      if ((agent.webbed ?? 0) <= 0) continue;
      const agentMesh = this.agentMeshes.get(agent.id);
      if (!agentMesh) continue;
      let web = this.webMeshes.get(agent.id);
      if (!web) {
        web = makeWebCage();
        this.webMeshes.set(agent.id, web);
        this.group.add(web);
      }
      web.position.copy(agentMesh.position);
      web.position.y += 0.42;
      web.rotation.y = time * 0.3;
      const pulse = 0.92 + Math.sin(time * 4 + agent.index) * 0.08;
      web.scale.setScalar(pulse);
    }
  }

  destroy() {
    this.projectileMeshes.clear();
    this.webMeshes.clear();
    super.destroy();
  }
}

function makeWebCage() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xe0edf2, transparent: true, opacity: 0.48 });
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 + i * 0.05, 0.018, 5, 20), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.24 + i * 0.18;
    group.add(ring);
  }
  for (let i = 0; i < 6; i += 1) {
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.92, 5), material);
    strand.position.set(Math.cos(i * Math.PI / 3) * 0.36, 0, Math.sin(i * Math.PI / 3) * 0.36);
    strand.rotation.z = Math.sin(i * Math.PI / 3) * 0.18;
    group.add(strand);
  }
  return group;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
