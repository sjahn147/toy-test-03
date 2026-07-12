// Production strategy observer — context inspector renderer.
// Route A handoff (stage 2): adds "layered depth" — the agent dossier now leads
// with essentials (vitals, thought, location) and folds the deep sections
// (home/logistics, personality, expedition, loadout, memories) into a native
// <details> so the first read stays calm and density is available on demand.

export function renderStrategyInspector(host, selection, { onClear = () => {}, onSelectAgent = () => {} } = {}) {
  if (!host) return;
  const dossierOpen = host.querySelector('.inspect-dossier')?.open ?? false;
  if (!selection?.inspector) {
    host.innerHTML = '<div class="strategy-empty inspector-empty">Select an agent, party, settlement or room from the world.</div>';
    return;
  }
  const { type, inspector } = selection;
  if (type === 'agent') host.innerHTML = renderAgent(inspector);
  else if (type === 'party') host.innerHTML = renderParty(inspector);
  else if (type === 'settlement') host.innerHTML = renderSettlement(inspector);
  else if (type === 'room') host.innerHTML = renderRoom(inspector);
  else if (type === 'faction') host.innerHTML = renderFaction(inspector);
  else host.innerHTML = '<div class="strategy-empty">No inspector surface for this selection.</div>';

  const dossier = host.querySelector('.inspect-dossier');
  if (dossier) dossier.open = dossierOpen;
  host.querySelector('[data-clear-inspect]')?.addEventListener('click', onClear);
  host.querySelectorAll('[data-inspect-agent]').forEach(button => button.addEventListener('click', () => onSelectAgent(button.dataset.inspectAgent)));
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
  return `${header(value.identity.name ?? value.identity.id, `${value.identity.state} · ${value.factionId ?? 'unaffiliated'}`)}
    <div class="inspect-grid">${stat(`${value.population.current}/${value.population.capacity}`, 'population')}${stat(value.integrity == null ? '—' : Math.round(value.integrity), 'integrity')}${stat(value.control == null ? '—' : Math.round(value.control), 'control')}${stat(value.buildings?.length ?? 0, 'buildings')}</div>
    ${resources ? `<section class="equipment-panel"><strong>Stocks</strong>${resources}</section>` : ''}`;
}

function renderRoom(value) {
  return `${header(value.identity.name, `${value.identity.kind ?? 'room'}${value.identity.zoneCode ? ` · ${value.identity.zoneCode}` : ''}`)}
    <div class="inspect-grid">${stat(`${value.size.w}×${value.size.d}`, 'size')}${stat(value.occupants.length, 'occupants')}${stat(value.props.length, 'props')}${stat(value.connections.length, 'connections')}</div>
    ${value.ownership ? section('Ownership', [row('faction', value.ownership.factionId ?? 'none', value.ownership.control == null ? '' : `${Math.round(value.ownership.control)} control`)]) : ''}
    ${section(`Occupants · ${value.occupants.length}`, value.occupants.length ? value.occupants.map(agent => `<button class="strategy-related-row" data-inspect-agent="${esc(agent.id)}"><span>${esc(agent.name)}</span><b>${esc(agent.role ?? '')}</b></button>`) : ['<div class="strategy-empty">No occupants</div>'])}`;
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