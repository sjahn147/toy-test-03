import { selectEnvironmentTaskActions } from './selectEnvironmentTaskActions.js';
import { selectSettlementOperations } from './selectSettlementOperations.js';
import { selectZoneInteractions } from './selectZoneInteractions.js';

export function selectWorldTaskActions(state, target) {
  const environment = selectEnvironmentTaskActions(state, target);
  const settlement = selectSettlementOperations(state, target);
  const zone = selectZoneInteractions(state, target);
  const seen = new Set();
  const actions = [];
  for (const action of [...zone.actions, ...environment.actions, ...settlement.actions]) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    actions.push(action);
  }
  return {
    actions,
    tasks: [...zone.tasks, ...environment.tasks, ...settlement.tasks],
    settlement: settlement.settlement,
    zoneRoomId: zone.roomId
  };
}
