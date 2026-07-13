import { selectEnvironmentTaskActions } from './selectEnvironmentTaskActions.js';
import { selectSettlementOperations } from './selectSettlementOperations.js';

export function selectWorldTaskActions(state, target) {
  const environment = selectEnvironmentTaskActions(state, target);
  const settlement = selectSettlementOperations(state, target);
  const seen = new Set();
  const actions = [];
  for (const action of [...environment.actions, ...settlement.actions]) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    actions.push(action);
  }
  return { actions, tasks: [...environment.tasks, ...settlement.tasks], settlement: settlement.settlement };
}
