import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');

function readJson(path) {
  const absolute = resolve(ROOT, path);
  try {
    return JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

const campaign = readJson('content/campaigns/sleeping-citadel/campaign.manifest.json');
const assetCatalog = readJson('content/assets/asset-catalog.json');
const assetAliases = readJson('content/assets/asset-aliases.json');
const uiManifest = readJson('content/ui/surface-manifest.json');
const campaignSchema = readJson('content/schemas/campaign.schema.json');
const assetSchema = readJson('content/schemas/asset-catalog.schema.json');
const uiSchema = readJson('content/schemas/ui-surface.schema.json');

const errors = [];
const warnings = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};
const warn = (condition, message) => {
  if (!condition) warnings.push(message);
};

function duplicates(values) {
  const seen = new Set();
  const duplicate = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}

function assertUnique(values, label) {
  const duplicate = duplicates(values);
  assert(duplicate.length === 0, `${label} contains duplicate IDs: ${duplicate.join(', ')}`);
}

function resolveAssetId(id, entries, aliases) {
  if (entries.has(id)) return id;
  const target = aliases[id];
  return target && entries.has(target) ? target : null;
}

function addUndirectedEdge(graph, from, to) {
  if (!graph.has(from)) graph.set(from, new Set());
  if (!graph.has(to)) graph.set(to, new Set());
  graph.get(from).add(to);
  graph.get(to).add(from);
}

function checkEndpoint(roomIds, connection, label) {
  const [from, to] = Array.isArray(connection)
    ? connection
    : [connection.from, connection.to];
  assert(roomIds.has(from), `${label} references missing room ${from}`);
  assert(roomIds.has(to), `${label} references missing room ${to}`);
  assert(from !== to, `${label} connects room ${from} to itself`);
  return [from, to];
}

assert(campaign.schemaVersion >= 1, 'campaign schemaVersion must be at least 1');
assert(assetCatalog.schemaVersion >= 1, 'asset catalog schemaVersion must be at least 1');
assert(uiManifest.schemaVersion >= 1, 'UI manifest schemaVersion must be at least 1');
assert(campaignSchema.$schema, 'campaign schema must declare a JSON Schema dialect');
assert(assetSchema.$schema, 'asset catalog schema must declare a JSON Schema dialect');
assert(uiSchema.$schema, 'UI schema must declare a JSON Schema dialect');

const rooms = campaign.rooms ?? [];
const zones = campaign.zones ?? [];
const factions = campaign.factions ?? [];
const roomIds = new Set(rooms.map(room => room.id));
const zoneIds = new Set(zones.map(zone => zone.id));
const assetEntries = new Map((assetCatalog.entries ?? []).map(entry => [entry.id, entry]));
const aliases = assetAliases.aliases ?? {};

assertUnique(rooms.map(room => room.id), 'campaign rooms');
assertUnique(zones.map(zone => zone.id), 'campaign zones');
assertUnique(factions.map(faction => faction.id), 'campaign factions');
assertUnique((assetCatalog.entries ?? []).map(entry => entry.id), 'asset catalog');
assertUnique((uiManifest.surfaces ?? []).map(surface => surface.id), 'UI surfaces');
assertUnique([
  ...(campaign.connections ?? []).map(([from, to]) => `normal:${[from, to].sort().join(':')}`),
  ...(campaign.conditionalConnections ?? []).map(connection => connection.id),
  ...(campaign.secretConnections ?? []).map(connection => connection.id)
], 'connection records');

assert(roomIds.has(campaign.entryRoomId), `entry room ${campaign.entryRoomId} does not exist`);
assert(
  rooms.length === campaign.validation?.expectedRoomCount,
  `expected ${campaign.validation?.expectedRoomCount} rooms but found ${rooms.length}`
);
assert(rooms.length === 63, `Sleeping Citadel production baseline requires 63 rooms, found ${rooms.length}`);

const assignedRooms = [];
for (const zone of zones) {
  assert(assetEntries.has(zone.zoneKit), `zone ${zone.id} references missing zone kit ${zone.zoneKit}`);
  for (const roomId of zone.roomIds ?? []) {
    assert(roomIds.has(roomId), `zone ${zone.id} references missing room ${roomId}`);
    assignedRooms.push(roomId);
  }
}
assertUnique(assignedRooms, 'zone room assignments');
for (const room of rooms) {
  assert(zoneIds.has(room.zoneId), `room ${room.id} references missing zone ${room.zoneId}`);
  const zone = zones.find(candidate => candidate.id === room.zoneId);
  assert(zone?.roomIds?.includes(room.id), `room ${room.id} is not listed in zone ${room.zoneId}`);
  assert(Array.isArray(room.size) && room.size.length === 2 && room.size.every(value => value > 0), `room ${room.id} has invalid size`);
  assert((room.tags?.length ?? 0) >= 2, `room ${room.id} must expose at least two system tags`);
  assert((room.stateVariants?.length ?? 0) >= 3, `room ${room.id} must define at least three state variants`);
  const resolvedAsset = resolveAssetId(room.landmarkBundle, assetEntries, aliases);
  assert(Boolean(resolvedAsset), `room ${room.id} landmark ${room.landmarkBundle} is absent from catalog and aliases`);
}
assert(assignedRooms.length === rooms.length, `zone assignments cover ${assignedRooms.length} records for ${rooms.length} rooms`);

for (const [alias, target] of Object.entries(aliases)) {
  assert(alias !== target, `asset alias ${alias} resolves to itself`);
  assert(assetEntries.has(target), `asset alias ${alias} points to missing target ${target}`);
}

const graph = new Map([...roomIds].map(id => [id, new Set()]));
for (const [index, connection] of (campaign.connections ?? []).entries()) {
  const [from, to] = checkEndpoint(roomIds, connection, `connections[${index}]`);
  if (roomIds.has(from) && roomIds.has(to)) addUndirectedEdge(graph, from, to);
}
for (const [index, connection] of (campaign.conditionalConnections ?? []).entries()) {
  const [from, to] = checkEndpoint(roomIds, connection, `conditionalConnections[${index}]`);
  if (roomIds.has(from) && roomIds.has(to)) addUndirectedEdge(graph, from, to);
  assert(Boolean(connection.condition), `conditional connection ${connection.id} has no condition`);
}
for (const [index, connection] of (campaign.secretConnections ?? []).entries()) {
  checkEndpoint(roomIds, connection, `secretConnections[${index}]`);
  assert((connection.discovery?.length ?? 0) > 0, `secret connection ${connection.id} has no discovery rule`);
}
assert(
  (campaign.secretConnections?.length ?? 0) >= (campaign.validation?.minimumSecretConnections ?? 0),
  `secret connection count is below the declared minimum`
);

const visited = new Set();
const queue = [campaign.entryRoomId];
while (queue.length) {
  const roomId = queue.shift();
  if (visited.has(roomId)) continue;
  visited.add(roomId);
  for (const neighbor of graph.get(roomId) ?? []) {
    if (!visited.has(neighbor)) queue.push(neighbor);
  }
}
const unreachable = [...roomIds].filter(id => !visited.has(id));
assert(unreachable.length === 0, `rooms unreachable through normal or conditional routes: ${unreachable.join(', ')}`);

for (const faction of factions) {
  assert((faction.initialRooms?.length ?? 0) > 0, `faction ${faction.id} has no initial room`);
  for (const roomId of faction.initialRooms ?? []) {
    assert(roomIds.has(roomId), `faction ${faction.id} references missing initial room ${roomId}`);
  }
  assert((faction.goals?.length ?? 0) > 0, `faction ${faction.id} has no campaign goal`);
}

const settlementCandidates = rooms.filter(room => room.tags?.some(tag => tag.includes('settlement') || tag.includes('inn-core')));
assert(
  settlementCandidates.length >= (campaign.validation?.minimumSettlementCandidates ?? 0),
  `settlement candidate count ${settlementCandidates.length} is below declared minimum ${campaign.validation?.minimumSettlementCandidates}`
);

const surfaceIds = new Set((uiManifest.surfaces ?? []).map(surface => surface.id));
for (const surface of uiManifest.surfaces ?? []) {
  assert((surface.selectors?.length ?? 0) > 0, `UI surface ${surface.id} has no selector`);
  assert(Array.isArray(surface.commands), `UI surface ${surface.id} must declare a command array`);
}
for (const required of ['surface.global-bar', 'surface.timeline', 'surface.overlay-toolbar', 'surface.camera-controls']) {
  assert(surfaceIds.has(required), `UI manifest is missing required surface ${required}`);
}
assert((uiManifest.accessibility?.minimumTouchTargetPx ?? 0) >= 44, 'UI touch targets must be at least 44px');

const expectedZoneKitCount = assetCatalog.coverage?.expectedZoneKitCount ?? 0;
const zoneKitCount = [...assetEntries.values()].filter(entry => entry.template === 'zone-kit').length;
assert(zoneKitCount >= expectedZoneKitCount, `asset catalog declares ${expectedZoneKitCount} zone kits but contains ${zoneKitCount}`);

const expectedLandmarkCount = assetCatalog.coverage?.expectedRoomLandmarkCount ?? 0;
const resolvedLandmarks = new Set(rooms.map(room => resolveAssetId(room.landmarkBundle, assetEntries, aliases)).filter(Boolean));
warn(resolvedLandmarks.size >= expectedLandmarkCount, `unique resolved room landmarks ${resolvedLandmarks.size} are below coverage target ${expectedLandmarkCount}; shared bundles may be intentional`);

if (warnings.length) {
  console.warn('\nProduction content warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('\nProduction content validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Production content valid: ${rooms.length} rooms, ${zones.length} zones, ${factions.length} factions, ${assetEntries.size} asset entries, ${uiManifest.surfaces.length} UI surfaces.`);
}
