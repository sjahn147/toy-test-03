const PROJECTILE_PROFILES = {
  arrow: { speed: 8.4, lifetime: 2.8, homing: false },
  magic: { speed: 6.2, lifetime: 3.2, homing: true },
  heal: { speed: 5.8, lifetime: 3.2, homing: true },
  web: { speed: 4.7, lifetime: 3.4, homing: true }
};

export class ProjectileSystem {
  constructor() {
    this.projectiles = [];
    this.sequence = 0;
  }

  spawn({ type, source, target, amount, roomId }) {
    const profile = PROJECTILE_PROFILES[type];
    if (!profile || !source || !target) return null;
    const start = agentPoint(source, 0.85);
    const end = agentPoint(target, 0.72);
    const direction = normalize(end.x - start.x, end.y - start.y, end.z - start.z);
    const projectile = {
      id: `projectile-${this.sequence++}`,
      type,
      sourceId: source.id,
      targetId: target.id,
      roomId: roomId ?? source.roomId,
      amount,
      x: start.x,
      y: start.y,
      z: start.z,
      vx: direction.x * profile.speed,
      vy: direction.y * profile.speed,
      vz: direction.z * profile.speed,
      speed: profile.speed,
      homing: profile.homing,
      age: 0,
      lifetime: profile.lifetime,
      rotation: Math.atan2(direction.x, direction.z)
    };
    this.projectiles.push(projectile);
    return projectile;
  }

  update(dt, sim) {
    const survivors = [];
    for (const projectile of this.projectiles) {
      projectile.age += dt;
      const source = sim.agents.find(agent => agent.id === projectile.sourceId);
      const target = sim.agents.find(agent => agent.id === projectile.targetId);
      if (!target || projectile.age >= projectile.lifetime || target.roomId !== projectile.roomId || target.travel) continue;

      const targetPoint = agentPoint(target, 0.72);
      const dx = targetPoint.x - projectile.x;
      const dy = targetPoint.y - projectile.y;
      const dz = targetPoint.z - projectile.z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance <= Math.max(0.24, projectile.speed * dt * 1.25)) {
        this.impact(projectile, source, target, sim);
        continue;
      }

      if (projectile.homing) {
        const direction = normalize(dx, dy, dz);
        const steering = Math.min(1, dt * 5.5);
        projectile.vx = lerp(projectile.vx, direction.x * projectile.speed, steering);
        projectile.vy = lerp(projectile.vy, direction.y * projectile.speed, steering);
        projectile.vz = lerp(projectile.vz, direction.z * projectile.speed, steering);
      }

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.z += projectile.vz * dt;
      projectile.rotation = Math.atan2(projectile.vx, projectile.vz);
      survivors.push(projectile);
    }
    this.projectiles = survivors;
  }

  impact(projectile, source, target, sim) {
    if (projectile.type === 'heal') {
      sim.applyHealing(source, target, projectile.amount, { projectileType: projectile.type });
      return;
    }
    if (projectile.type === 'web') {
      sim.applyWeb(source, target, projectile.amount);
      return;
    }
    sim.applyCombatDamage(source, target, projectile.amount, { projectileType: projectile.type });
  }

  snapshot() {
    return this.projectiles.map(projectile => ({ ...projectile }));
  }
}

function agentPoint(agent, height) {
  const cell = agent.roomCell ?? agent.travel?.destinationCell;
  return {
    x: cell?.x ?? 0,
    y: height + (agent.role === 'ogre' ? 0.45 : 0),
    z: cell?.z ?? 0
  };
}

function normalize(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
