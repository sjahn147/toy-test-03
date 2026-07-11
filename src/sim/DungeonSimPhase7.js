import { DungeonSim as Phase6DungeonSim } from './DungeonSimPhase6.js';
import { TerritorySystem } from './TerritorySystem.js';

const TERRITORY_RADII = {
  territory_resource: 0.72,
  territory_banner: 0.55,
  barricade: 0.92,
  watch_post: 0.95
};

export class DungeonSim extends Phase6DungeonSim {
  constructor(scenario, options = {}) {
    super(scenario, options);
    this.territorySystem = new TerritorySystem({
      rooms: this.rooms,
      props: this.props,
      graph: this.graph,
      onEvent: text => this.event(text)
    });
    this.blockTerritoryFootprints();
  }

  update(dt) {
    this.territorySystem.update(dt, this);
    super.update(dt);
  }

  resolve(agent, action) {
    if (this.isActive(agent) && !agent.travel && !agent.combat && !agent.carryingHostId && (agent.hunger ?? 0) < 72) {
      const territoryAction = this.territorySystem.decide(agent, this);
      if (territoryAction) {
        if (territoryAction.text) this.event(territoryAction.text);
        if (this.territorySystem.resolve(agent, territoryAction, this)) return;
      }
    }
    super.resolve(agent, action);
  }

  blockTerritoryFootprints() {
    for (const prop of this.props) this.blockTerritoryProp(prop);
  }

  blockTerritoryProp(prop) {
    const radius = TERRITORY_RADII[prop.type];
    if (!radius || prop.territoryBlocked) return;
    const room = this.rooms.find(candidate => candidate.id === prop.roomId);
    if (!room) return;
    const placement = prop.placement ?? {};
    this.occupancy.blockArea(
      room.id,
      room.x + (placement.ox ?? 0),
      room.z + (placement.oz ?? 0),
      radius * (placement.scale ?? 1),
      prop.id
    );
    prop.territoryBlocked = true;
  }

  snapshot() {
    for (const prop of this.props) this.blockTerritoryProp(prop);
    return {
      ...super.snapshot(),
      territory: this.territorySystem.snapshot()
    };
  }

  metrics() {
    return {
      ...super.metrics(),
      ...this.territorySystem.metrics()
    };
  }
}
