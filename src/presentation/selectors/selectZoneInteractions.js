const ACTIONS_BY_ROOM = Object.freeze({
  C14: [action('sluice.drain-system', 'Drain the flooded storehouses', 'Restore C14 and open the C15–F26 route.')],
  D16: [action('workshop.reactivate', 'Reactivate the workshop', 'Spend 2 materials to restore the D16 workshop.')],
  D20: [action('workshop.controlled-breach', 'Prepare a controlled breach', 'Use the restored workshop and 1 material to open D20–J48.')],
  E22: [action('ossuary.break-choir', 'Break the funeral choir', 'Disrupt the undead rite in the Funeral Chapel.')],
  E25: [action('ossuary.seal-last-names', 'Seal the Well of Last Names', 'Seal the wraith source and secure the royal funeral route.')],
  F30: [
    action('fungal.communion', 'Commune with the Mycelial Heart', 'Secure safe passage and a myconid accord.'),
    action('fungal.burn-heart', 'Burn out the Mycelial Heart', 'Destroy the fungal core and recover biomass.')
  ],
  G32: [action('spider.rescue-hosts', 'Rescue the living hosts', 'Cut free surviving captives after clearing the vault.')],
  I44: [action('market.negotiate-neutrality', 'Negotiate the Neutral Well accord', 'Spend 1 wealth to reduce trade-route risk in the market.')],
  J49: [action('arena.challenge-champion', 'Challenge the Red Pit champion', 'Send a capable adventurer into a formal arena challenge.')],
  K53: [action('laboratory.calibrate-observatory', 'Calibrate the observatory', 'Spend 1 material to reveal royal and sanctum routes.')],
  K54: [action('laboratory.stabilize-summoning', 'Stabilize the summoning room', 'Use the calibrated observatory to contain the breach.')],
  M61: [action('sanctum.open-seal-gate', 'Open the Heart Sanctum gate', 'Assemble three adventurers after resolving the laboratory.')],
  M63: finalActions()
});

export function selectZoneInteractions(state, target) {
  const roomId = resolveRoomId(state, target);
  const room = table(state, 'rooms')[roomId] ?? null;
  const tasks = Object.values(table(state, 'zoneInteractions'))
    .filter(task => task.targetRoomId === roomId && ['queued', 'moving', 'working', 'interrupted'].includes(task.status))
    .map(task => ({ ...task, assignedAgentIds: [...(task.assignedAgentIds ?? [])] }));
  const actions = (ACTIONS_BY_ROOM[roomId] ?? []).map(template => evaluate(template, roomId, room, state));
  return { actions, tasks, roomId };
}

function evaluate(template, roomId, room, state) {
  let reason = null;
  const rooms = table(state, 'rooms');
  const routes = table(state, 'connections');
  const settlements = table(state, 'settlements');
  const oldLantern = settlements['settlement-old-lantern-inn'] ?? Object.values(settlements).find(item => item.factionId === 'adventurer-expedition') ?? null;
  const active = Object.values(table(state, 'zoneInteractions')).find(task => task.actionId === template.id && ['queued', 'moving', 'working', 'interrupted'].includes(task.status));
  if (active) reason = `${active.label} is already ${active.status}`;
  else if (!room) reason = `Room ${roomId} is unavailable`;
  else if (template.id === 'sluice.drain-system' && room.mechanismOperational) reason = 'The drainage system is already operational';
  else if (template.id === 'workshop.reactivate' && room.workshopOperational) reason = 'The workshop is already operational';
  else if (template.id === 'workshop.reactivate' && number(oldLantern?.materials) < 2) reason = 'Requires 2 materials at a friendly settlement';
  else if (template.id === 'workshop.controlled-breach' && routeIsOpen(routes, 'conn-D20-J48')) reason = 'The powder breach is already open';
  else if (template.id === 'workshop.controlled-breach' && !rooms.D16?.workshopOperational) reason = 'Reactivate D16 first';
  else if (template.id === 'workshop.controlled-breach' && number(oldLantern?.materials) < 1) reason = 'Requires 1 material';
  else if (template.id === 'ossuary.break-choir' && room.choirBroken) reason = 'The funeral choir is already broken';
  else if (template.id === 'ossuary.seal-last-names' && room.lastNamesSealed) reason = 'The well is already sealed';
  else if (template.id === 'ossuary.seal-last-names' && !rooms.E22?.choirBroken) reason = 'Break the funeral choir first';
  else if (template.id.startsWith('fungal.') && room.fungalResolution) reason = `The Heart was resolved by ${room.fungalResolution}`;
  else if (template.id === 'spider.rescue-hosts' && room.hostsRescued) reason = 'The living hosts have already been rescued';
  else if (template.id === 'market.negotiate-neutrality' && (rooms.I44?.marketAccord || rooms.I41?.marketAccord)) reason = 'The Neutral Well accord is already active';
  else if (template.id === 'market.negotiate-neutrality' && number(oldLantern?.wealth) < 1) reason = 'Requires 1 wealth';
  else if (template.id === 'arena.challenge-champion' && room.arenaLiberated) reason = 'The Red Pit is already liberated';
  else if (template.id === 'laboratory.calibrate-observatory' && room.observatoryCalibrated) reason = 'The observatory is already calibrated';
  else if (template.id === 'laboratory.calibrate-observatory' && number(oldLantern?.materials) < 1) reason = 'Requires 1 material';
  else if (template.id === 'laboratory.stabilize-summoning' && room.summoningStabilized) reason = 'The summoning room is already stabilized';
  else if (template.id === 'laboratory.stabilize-summoning' && !rooms.K53?.observatoryCalibrated) reason = 'Calibrate K53 first';
  else if (template.id === 'sanctum.open-seal-gate' && room.sealGateOpened) reason = 'The seal gate is already open';
  else if (template.id === 'sanctum.open-seal-gate' && (!rooms.K53?.observatoryCalibrated || !rooms.K54?.summoningStabilized)) reason = 'Resolve both laboratory interactions first';
  else if (template.id.startsWith('sanctum.') && template.id !== 'sanctum.open-seal-gate' && !rooms.M61?.sealGateOpened) reason = 'Open the M61 seal gate first';
  else if (template.id.startsWith('sanctum.') && template.id !== 'sanctum.open-seal-gate' && rooms.M63?.campaignResolution) reason = `Campaign already resolved by ${rooms.M63.campaignResolution}`;
  return { ...template, category: 'zone-interaction', enabled: !reason, reason };
}

function finalActions() {
  return [
    action('sanctum.seal-heart', 'Return the Heart to sleep', 'Resolve the campaign by restoring the ancient seal.'),
    action('sanctum.claim-heart', 'Claim the Heart', 'Resolve the campaign by taking control of the Citadel.'),
    action('sanctum.shatter-heart', 'Shatter the Heart', 'Resolve the campaign by destroying the dungeon core.')
  ];
}
function action(id, label, description) { return Object.freeze({ id, label, description }); }
function table(state, name) { const value = state?.entities?.[name]; return value && typeof value === 'object' ? value : {}; }
function resolveRoomId(state, target) {
  if (!target) return null;
  if (target.roomId) return target.roomId;
  if (target.type === 'room') return target.id;
  const entity = table(state, target.type === 'structure' ? 'structures' : target.type === 'prop' ? 'props' : target.type === 'settlement' ? 'settlements' : '')[target.id];
  return entity?.roomId ?? null;
}
function routeIsOpen(routes, id) { const route = routes[id] ?? Object.values(routes).find(item => item.id === id); return ['open', 'opened'].includes(route?.state ?? route?.routeState); }
function number(value) { return Number.isFinite(value) ? value : 0; }
