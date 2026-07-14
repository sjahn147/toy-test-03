// Production strategy observer — context inspector renderer.

export function renderStrategyInspector(host, selection, {
  onClear = () => {},
  onSelectAgent = () => {},
  onWorldAction = () => {},
  onCancelTask = () => {}
} = {}) {
  if (!host) return;
  const dossierOpen = host.querySelector('.inspect-dossier')?.open ?? false;
  if (!selection?.inspector) {
    host.innerHTML = '<div class="strategy-empty inspector-empty">Select an agent, party, settlement, room or world object.</div>';
    return;
  }
  const { type, inspector } = selection;
  if (type === 'agent') host.innerHTML = renderAgent(inspector);
  else if (type === 'party') host.innerHTML = renderParty(inspector);
  else if (type === 'settlement') host.innerHTML = renderSettlement(inspector);
  else if (type === 'room') host.innerHTML = renderRoom(inspector);
  else if (type === 'faction') host.innerHTML = renderFaction(inspector);
  else if (['cargo', 'structure', 'prop', 'landmark', 'story-prop', 'interaction-socket', 'route'].includes(type)) host.innerHTML = renderWorldTarget(inspector);
  else host.innerHTML = '<div class="strategy-empty">No inspector surface for this selection.</div>';

  const dossier = host.querySelector('.inspect-dossier');
  if (dossier) dossier.open = dossierOpen;
  host.querySelector('[data-clear-inspect]')?.addEventListener('click', onClear);
  host.querySelectorAll('[data-inspect-agent]').forEach(button => button.addEventListener('click', () => onSelectAgent(button.dataset.inspectAgent)));
  host.querySelectorAll('[data-world-action]').forEach(button => button.addEventListener('click', () => {
    if (!button.disabled) onWorldAction(button.dataset.worldAction);
  }));
  host.querySelectorAll('[data-cancel-environment-task]').forEach(button => button.addEventListener('click', () => onCancelTask(button.dataset.cancelEnvironmentTask)));
}

function renderFaction(value) {
  if (!value) return '<div class="strategy-empty">No data for this faction.</div>';
  const { identity, stats, members } = value;
  const roster = members.length
    ? members.map(member => `<button class="strategy-related-row" data-inspect-agent="${esc(member.id)}"><span>${esc(member.name)}</span><b>${esc(member.role)}</b><em>${member.hp}/${member.maxHp}${member.status ? ` · ${esc(member.status)}` : ''}</em></button>`).join('')
    : '<div class="strategy-empty">No living members.</div>';
  return `${header(identity.name, `faction · ${members.length} units`)}
    <div class="inspect-grid">${stat(stats.population, 'population')}${stat(stats.settlements, 'settlements')}${stat(stats.territories, 'territories')}</div>
    <section class="equipment-panel"><strong>Roster · ${members.length} units</strong>${roster}</section>`;
}

function header(title, subtitle) {
  return `<div class="inspect-head"><div><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div><button class="mini-btn" data-clear-inspect>×</button></div>`;
}

function renderAgent(value) {
  const { identity, vitals, intent, flags, personality, home, cargo, party, activity } = value;
  const traits = personality.strongestTraits.length ? personality.strongestTraits.map(item => `${item.name} ${Math.round(item.value * 100)}`).join(' · ') : 'unformed';
  const activityProgress = activity ? Math.round((activity.progress ?? 0) * 100) : null;
  const essentials = `${header(identity.name, `${identity.role ?? 'unknown'} · ${identity.faction ?? 'unaffiliated'} · ${intent.status}`)}
    <div class="inspect-grid">
      ${stat(`${Math.max(0, vitals.hp)}/${vitals.maxHp}`, 'HP')}${stat(vitals.attack, 'attack')}${stat(vitals.defense, 'defense')}
      ${stat(Math.round(vitals.fatigue), 'fatigue')}${stat(Math.round(vitals.hunger), 'hunger')}${stat(value.inventory.length, 'inventory')}
    </div>
    ${activity ? `<section class="equipment-panel activity-now"><strong>Current activity</strong>${row('action', activity.label, `${activityProgress}% · ${activity.phase}`)}${row('prop', activity.prop ?? 'none', activity.assignedBy)}${row('remaining', activity.remaining == null ? '—' : `${activity.remaining.toFixed(1)}s`, activity.interruptible ? 'interruptible' : 'committed')}</section>` : ''}
    <div class="thought">“${esc(intent.thought)}”</div>
    <div class="inspect-room">${esc(intent.roomName ?? intent.roomId ?? 'unknown')} ${intent.destinationRoomName ? `→ ${esc(intent.destinationRoomName)}` : ''}</div>`;
  const deep = `${section('Home & logistics', [
      row('home', home?.name ?? (flags.displaced ? 'No viable habitat' : 'Unassigned'), home?.state ?? 'none'),
      row('supply', home?.supplyStatus ?? 'open', `${Math.round((home?.supplyEfficiency ?? 1) * 100)}% efficiency`),
      row('cargo', cargo?.resourceType ?? 'none', cargo ? `${Math.round(cargo.routeRisk * 100)}% risk` : 'available')
    ])}
    ${section('Personality & memory', [row('state', personality.state, traits), row('relationships', `${personality.bonds} bonds`, `${personality.grudges} grudges`), row('movement', flags.overflowLanding ? 'targeted landing' : 'normal', `${flags.blockedMoveCount} blocked`)])}
    ${party ? section('Expedition', [row('state', party.state, party.baseName ?? 'No base'), row('provisions', `${fmt(party.provisions)}/${party.maxProvisions}`, `water ${fmt(party.water)}/${party.maxWater}`), row('endurance', `${Math.round(party.endurance)}/${party.maxExpeditionTime}`, `${Math.round(party.expeditionTime)} elapsed`)]) : ''}
    ${renderEquipment(value)}${renderMemories(value.memories)}`;
  return `${essentials}${dossier('Full dossier', deep)}`;
}

function renderParty(value) {
  return `${header(value.identity.name, `${value.identity.state} · ${value.roster.length} members`)}
    ${section('Expedition', [row('leader', value.identity.leaderName ?? 'none', value.target.roomName ?? 'no target'), row('cohesion', value.cohesion == null ? '—' : `${Math.round(value.cohesion * 100)}%`, value.base?.name ?? 'No base'), row('supply', `${fmt(value.expedition.provisions)}/${value.expedition.maxProvisions}`, `water ${fmt(value.expedition.water)}/${value.expedition.maxWater}`)])}
    <section class="equipment-panel"><strong>Roster · ${value.roster.length} units</strong>${value.roster.map(member => `<button class="strategy-related-row" data-inspect-agent="${esc(member.id)}"><span>${esc(member.name)}</span><b>${esc(member.role)}</b><em>${Math.max(0, member.hp)}/${member.maxHp}${member.orphaned ? ' · orphaned' : ''}</em></button>`).join('')}</section>`;
}

function renderSettlement(value) {
  const resources = value.resources ? Object.entries(value.resources).map(([key, amount]) => row(key, amount, '')).join('') : '';
  const management = value.management ?? {};
  const services = Object.entries(value.services ?? {}).map(([key, active]) => row(key, active ? 'open' : 'closed', active ? 'available' : 'unavailable'));
  const nextUpgrade = value.nextUpgrade ? section('Next restoration tier', [
    row('materials', value.nextUpgrade.materials ?? 0, `stored ${value.resources?.materials ?? 0}`),
    row('supply', value.nextUpgrade.supply ?? 0, `reserved ${management.supplyReserve ?? 0}`),
    row('labor', value.nextUpgrade.labor ?? 0, value.upgradeProgress == null ? '' : `${Math.round(value.upgradeProgress)} progress`)
  ]) : '';
  return `${header(value.identity.name ?? value.identity.id, `${value.identity.state} · ${value.factionId ?? 'unaffiliated'}`)}
    <div class="inspect-grid">${stat(`${value.population.current}/${value.population.capacity}`, 'population')}${stat(value.integrity == null ? '—' : Math.round(value.integrity), 'integrity')}${stat(value.control == null ? '—' : Math.round(value.control), 'control')}${stat(value.identity.tier ?? 0, 'tier')}</div>
    ${section('Management', [row('workers', management.workers ?? 0, `target ${management.workerTarget ?? 0}`), row('garrison', management.garrison ?? 0, `target ${management.garrisonTarget ?? 0}`), row('defense', management.defenseMode ?? 'normal', `supply reserve ${management.supplyReserve ?? 0}`)])}
    ${nextUpgrade}
    ${services.length ? section('Inn services', services) : ''}
    ${resources ? `<section class="equipment-panel"><strong>Stocks</strong>${resources}</section>` : ''}
    ${renderTaskSurface(value)}`;
}

function renderRoom(value) {
  const canonical = value.roomState ?? null;
  const status = value.status ?? {};
  const resourceRows = Object.entries(canonical?.economy ?? value.resources ?? {}).filter(([key]) => !key.startsWith('cargo')).map(([key, amount]) => row(key, amount));
  const routeRows = (value.routes ?? []).map(route => row(route.otherRoomId, route.state, `${route.kind}${route.hidden ? ' · hidden' : ''}${route.locked ? ' · locked' : ''}`));
  const propRows = (value.props ?? []).slice(0, 10).map(prop => row(prop.label, prop.state ?? prop.type ?? 'present', prop.type ?? ''));
  return `${header(value.identity.name, `${value.identity.kind ?? 'room'}${value.identity.zoneCode ? ` · ${value.identity.zoneCode}` : ''}`)}
    ${renderRoomSummary(value)}
    ${resourceRows.length ? section('Resources', resourceRows) : ''}
    ${routeRows.length ? section(`Routes · ${routeRows.length}`, routeRows) : ''}
    ${propRows.length ? dossier(`Props · ${value.props.length}`, section('Room props', propRows)) : ''}
    ${renderTaskSurface(value)}
    ${section(`Occupants · ${value.occupants.length}`, value.occupants.length ? value.occupants.map(agent => `<button class="strategy-related-row" data-inspect-agent="${esc(agent.id)}"><span>${esc(agent.name)}</span><b>${esc(agent.role ?? '')}</b><em>${esc(agent.factionId ?? '')}</em></button>`) : ['<div class="strategy-empty">No occupants</div>'])}`;
}

function renderRoomSummary(value) {
  const room = value.roomState;
  if (!room) {
    const status = value.status ?? {};
    return `<div class="inspect-grid">${stat(`${value.size.w}×${value.size.d}`, 'size')}${stat(value.occupants.length, 'occupants')}${stat(status.danger == null ? '—' : Math.round(status.danger), 'danger')}${stat(status.contested ? 'yes' : 'no', 'contested')}</div>`;
  }
  const control = Math.round(room.ownership?.control ?? 0);
  const population = room.population?.current ?? 0;
  const capacity = room.population?.capacity ?? 0;
  const danger = Math.round((room.danger?.score ?? 0) * 100);
  const integrity = Math.round(room.settlement?.integrity ?? 100);
  const supply = Math.round((room.settlement?.supplyEfficiency ?? 1) * 100);
  const statusChips = (room.presentation?.statuses ?? []).map(item => `<span class="inventory-chip status-${esc(item.id)}">${esc(item.glyph)} ${esc(item.id.replaceAll('-', ' '))}</span>`).join('');
  const causes = roomCauses(room);
  const species = Object.entries(room.population?.bySpecies ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => row(name, count, '')).join('');
  const activity = [
    ...(room.activity?.construction ?? []).map(item => row(item.type, `${Math.round(item.progress * 100)}%`, item.state)),
    ...(room.activity?.workOrders ?? []).map(item => row(item.label, `${Math.round(item.progress * 100)}%`, item.status))
  ].join('');
  return `<div class="wp11-room-summary-card">
    <div class="wp11-room-primary">
      ${gauge('Control', control, `${control}% ${room.ownership?.controlTrend ?? 'steady'}`, 'control')}
      ${gauge('Population', capacity > 0 ? Math.min(100, population / capacity * 100) : 0, capacity > 0 ? `${population}/${capacity}` : population, 'population')}
      ${gauge('Danger', danger, room.danger?.level ?? 'low', 'danger')}
      ${room.settlement ? gauge('Integrity', integrity, `${integrity}%`, 'integrity') : gauge('Usable floor', room.spatial?.totalCells ? room.spatial.walkableCells / room.spatial.totalCells * 100 : 0, room.spatial ? `${room.spatial.walkableCells}/${room.spatial.totalCells}` : '—', 'space')}
      ${room.settlement ? gauge('Supply', supply, room.settlement.supplyStatus ?? 'open', 'supply') : ''}
    </div>
    ${statusChips ? `<div class="inventory-line">${statusChips}</div>` : ''}
    ${causes.length ? `<section class="equipment-panel"><strong>Why this room is changing</strong><ul class="wp11-room-cause-list">${causes.map(cause => `<li>${esc(cause)}</li>`).join('')}</ul></section>` : ''}
    ${species ? `<section class="equipment-panel"><strong>Population</strong>${species}</section>` : ''}
    ${activity ? `<section class="equipment-panel"><strong>Active work</strong>${activity}</section>` : ''}
  </div>`;
}

function gauge(label, value, display, kind) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="wp11-room-gauge is-${esc(kind)}"><header><span>${esc(label)}</span><b>${esc(display)}</b></header><div class="wp11-room-gauge-track"><i style="--value:${percent}%"></i></div></div>`;
}

function roomCauses(room) {
  const causes = [];
  if (room.ownership?.controlTrend === 'falling') causes.push(`Control is falling by ${Math.abs(room.ownership.controlDelta ?? 0).toFixed(1)}.`);
  if ((room.population?.hostile ?? 0) > 0) causes.push(`${room.population.hostile} hostile units are present.`);
  if ((room.population?.overcrowded ?? 0) > 0) causes.push(`${room.population.overcrowded} residents exceed effective capacity.`);
  if (room.settlement?.supplyStatus === 'blockaded') causes.push('The settlement is cut off from supply.');
  else if (room.settlement?.supplyStatus === 'threatened') causes.push('The supply route is under pressure.');
  if (room.activity?.siege) causes.push(`Siege phase: ${room.activity.siege.phase}.`);
  if (room.environment?.infected) causes.push(`${room.environment.infectedAgents ?? 0} infected or hosted units are present.`);
  if (room.spatial?.conflicts > 0) causes.push(`${room.spatial.conflicts} placement conflicts require attention.`);
  return causes.slice(0, 5);
}

function renderWorldTarget(value) {
  if (!value) return '<div class="strategy-empty">No data for this world object.</div>';
  const details = (value.details ?? []).map(item => row(item.label, item.value));
  const affordances = (value.affordances ?? []).map(item => `<span class="inventory-chip">${esc(String(item).replaceAll('-', ' '))}</span>`).join('');
  return `${header(value.identity?.name ?? value.identity?.id ?? 'World object', `${value.kind ?? 'target'} · ${value.state ?? 'present'}`)}
    <div class="inspect-room">${value.roomId ? `Room ${esc(value.roomId)}` : 'World-space object'}</div>
    ${details.length ? section('Details', details) : ''}
    ${affordances ? `<section class="equipment-panel"><strong>Interaction surface</strong><div class="inventory-line">${affordances}</div></section>` : ''}
    ${renderTaskSurface(value)}`;
}

function renderTaskSurface(value) {
  const actions = value.actions ?? [];
  const tasks = value.tasks ?? [];
  if (!actions.length && !tasks.length) return '';
  const taskRows = tasks.map(task => `<div class="environment-task-row${String(task.id).startsWith('zone-interaction-') ? ' is-zone-interaction' : ''}"><b>${esc(task.label)}</b><button class="environment-task-cancel" data-cancel-environment-task="${esc(task.id)}">cancel</button><span>${esc(task.status)}${task.assignedAgentId ? ` · ${esc(task.assignedAgentId)}` : ''}</span><small>${Math.round((task.progress ?? 0) * 100)}%</small><progress max="1" value="${Math.max(0, Math.min(1, task.progress ?? 0))}"></progress></div>`).join('');
  const actionRows = actions.map(action => `<button class="environment-action-button${action.category === 'zone-interaction' ? ' is-zone-interaction' : ''}" data-world-action="${esc(action.id)}" ${action.enabled ? '' : 'disabled'}><b>${esc(action.label)}</b><span>${esc(action.enabled ? action.description : action.reason ?? action.description)}</span><em>${action.enabled ? 'assign' : 'blocked'}</em></button>`).join('');
  return `<section class="equipment-panel environment-action-panel"><strong>Field orders</strong>${taskRows ? `<div class="environment-action-list">${taskRows}</div>` : ''}${actionRows ? `<div class="environment-action-list">${actionRows}</div>` : ''}</section>`;
}

function renderEquipment(value) {
  if (!value.equipment.length && !value.inventory.length) return '';
  const rows = value.equipment.map(item => row(item?.slot ?? 'item', item?.name ?? item?.value ?? 'empty', item?.broken ? 'broken' : item?.rarity ?? '')).join('');
  const bag = value.inventory.map(item => `<span class="inventory-chip">${esc(item?.name ?? item)}</span>`).join('') || '<span class="inventory-chip is-empty">empty pack</span>';
  return `<section class="equipment-panel"><strong>Loadout</strong>${rows}<div class="inventory-line">${bag}</div></section>`;
}

function renderMemories(memories) {
  const recent = memories.slice(0, 4);
  return `<div class="memory-list">${recent.length ? recent.map(memory => `<div>${esc((memory?.type ?? 'memory').replaceAll('-', ' '))} · ${Math.round((memory?.currentIntensity ?? memory?.intensity ?? 0) * 100)}%</div>`).join('') : '<div>No recent persistent memories.</div>'}</div>`;
}

function dossier(title, innerHtml) {
  return `<details class="inspect-dossier"><summary><span>${esc(title)}</span><em aria-hidden="true"></em></summary><div class="inspect-dossier-body">${innerHtml}</div></details>`;
}
function section(title, rows) { return `<section class="equipment-panel"><strong>${esc(title)}</strong>${rows.join ? rows.join('') : rows}</section>`; }
function stat(value, label) { return `<div><b>${esc(value)}</b><span>${esc(label)}</span></div>`; }
function row(label, value, detail = '') { return `<div class="equipment-row"><span>${esc(label)}</span><b>${esc(value)}</b><em>${esc(detail)}</em></div>`; }
function fmt(value) { return Math.round((value ?? 0) * 10) / 10; }
function esc(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
