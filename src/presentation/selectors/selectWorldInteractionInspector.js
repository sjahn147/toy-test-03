const SECRET_TAGS = new Set(['secret-route', 'secret_route']);

function table(state, name) {
  const records = state?.entities?.[name];
  return records && typeof records === 'object' ? records : {};
}

export function selectWorldInteractionInspector(state, target) {
  if (!target || typeof target !== 'object' || !target.type || !target.id) return null;
  if (target.type === 'cargo') return selectCargo(state, target);
  if (target.type === 'structure') return selectStructure(state, target);
  if (target.type === 'prop') return selectProp(state, target);
  if (target.type === 'route') return selectRoute(state, target);
  return selectSemantic(state, target);
}

function selectCargo(state, target) {
  const cargo = table(state, 'cargo')[target.id];
  if (!cargo) return selectSemantic(state, target);
  const roomId = cargo.roomId ?? target.roomId ?? null;
  const carrier = cargo.carrierId ? table(state, 'agents')[cargo.carrierId] : null;
  return {
    kind: 'cargo',
    identity: { id: target.id, name: cargo.label ?? cargo.name ?? readable(cargo.resourceType ?? target.label ?? target.id) },
    roomId,
    state: cargo.state ?? 'unknown',
    details: compact([
      detail('resource', cargo.resourceType ?? cargo.type),
      detail('amount', cargo.amount ?? cargo.quantity),
      detail('carrier', carrier?.name ?? cargo.carrierId),
      detail('destination', cargo.destinationRoomId ?? cargo.targetRoomId),
      detail('route risk', percent(cargo.routeRisk)),
      detail('priority', cargo.priority)
    ]),
    affordances: ['inspect-route', 'focus-carrier']
  };
}

function selectStructure(state, target) {
  const structure = table(state, 'structures')[target.id] ?? table(state, 'props')[target.id];
  if (!structure) return selectSemantic(state, target);
  return {
    kind: 'structure',
    identity: { id: target.id, name: structure.label ?? structure.name ?? readable(structure.type ?? target.label ?? target.id) },
    roomId: structure.roomId ?? target.roomId ?? null,
    state: structure.state ?? (structure.buildProgress < 1 ? 'under-construction' : 'active'),
    details: compact([
      detail('type', structure.type),
      detail('integrity', ratio(structure.integrity, structure.maxIntegrity)),
      detail('construction', percent(structure.buildProgress)),
      detail('faction', structure.structureFaction ?? structure.factionId),
      detail('materials', structure.materialsStored ?? structure.materials)
    ]),
    affordances: ['inspect', 'focus-room']
  };
}

function selectProp(state, target) {
  const prop = table(state, 'props')[target.id];
  if (!prop) return selectSemantic(state, target);
  return {
    kind: 'prop',
    identity: { id: target.id, name: prop.label ?? prop.name ?? readable(prop.type ?? target.label ?? target.id) },
    roomId: prop.roomId ?? target.roomId ?? null,
    state: prop.state ?? (prop.opened ? 'opened' : 'present'),
    details: compact([
      detail('type', prop.type),
      detail('species', prop.species),
      detail('faction', prop.ecologyFaction ?? prop.factionId),
      detail('resource', prop.resourceType),
      detail('amount', prop.amount)
    ]),
    affordances: ['inspect', 'focus-room']
  };
}

function selectRoute(state, target) {
  const connections = table(state, 'connections');
  const route = connections[target.id] ?? Object.values(connections).find(item => item.id === target.id) ?? null;
  const from = route?.from ?? route?.a ?? route?.roomIds?.[0] ?? null;
  const to = route?.to ?? route?.b ?? route?.roomIds?.[1] ?? null;
  const kind = route?.kind ?? (String(target.id).startsWith('secret-') ? 'secret' : 'ordinary');
  const routeState = route?.state ?? route?.routeState ?? (kind === 'secret' ? 'authored-secret' : 'open');
  return {
    kind: 'route',
    identity: { id: target.id, name: target.label ?? `${from ?? '?'} → ${to ?? '?'}` },
    roomId: target.roomId ?? from,
    state: routeState,
    secret: kind === 'secret' || SECRET_TAGS.has(kind),
    details: compact([
      detail('from', from),
      detail('to', to),
      detail('kind', kind),
      detail('width', route?.width),
      detail('logistics', route?.logisticsEnabled)
    ]),
    affordances: ['inspect-route', 'focus-route']
  };
}

function selectSemantic(state, target) {
  const room = target.roomId ? table(state, 'rooms')[target.roomId] : null;
  const details = compact([
    detail('room', room?.name ?? target.roomId),
    detail('landmark', target.assetId),
    detail('semantic node', target.semanticName),
    detail('room state', room?.visualState ?? room?.stateVariant ?? room?.state)
  ]);
  return {
    kind: target.type,
    identity: { id: target.id, name: target.label ?? readable(target.semanticName ?? target.id) },
    roomId: target.roomId ?? null,
    state: room?.visualState ?? room?.stateVariant ?? room?.state ?? 'present',
    details,
    affordances: target.type === 'story-prop' ? ['inspect-story', 'focus-room'] : ['inspect', 'focus-room']
  };
}

function detail(label, value) {
  return value === undefined || value === null || value === '' ? null : { label, value: String(value) };
}
function compact(values) { return values.filter(Boolean); }
function percent(value) { return Number.isFinite(value) ? `${Math.round(value * 100)}%` : null; }
function ratio(value, max) {
  if (!Number.isFinite(value)) return null;
  return Number.isFinite(max) && max > 0 ? `${Math.round(value)}/${Math.round(max)}` : String(Math.round(value));
}
function readable(value) {
  return String(value ?? '').replace(/[._:-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()).trim();
}
