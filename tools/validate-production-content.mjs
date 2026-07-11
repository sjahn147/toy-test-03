import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  campaign: 'content/campaigns/sleeping-citadel/campaign.manifest.json',
  assets: 'content/assets/asset-catalog.json',
  ui: 'content/ui/surface-manifest.json'
};

const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function note(message) {
  notes.push(message);
}

async function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  try {
    return JSON.parse(await readFile(absolutePath, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return null;
  }
}

function uniqueById(items, label) {
  const ids = new Set();
  for (const item of items ?? []) {
    if (!item?.id) {
      fail(`${label}: entry without id`);
      continue;
    }
    if (ids.has(item.id)) fail(`${label}: duplicate id ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function requireRef(id, ids, context) {
  if (!ids.has(id)) fail(`${context}: unresolved reference ${id}`);
}

async function validateSchemaReference(document, documentPath) {
  if (!document?.$schema) {
    fail(`${documentPath}: missing $schema`);
    return;
  }
  const schemaPath = path.normalize(path.join(path.dirname(documentPath), document.$schema));
  try {
    await access(path.join(repoRoot, schemaPath));
    await readJson(schemaPath);
  } catch (error) {
    fail(`${documentPath}: schema reference ${document.$schema} is not readable (${error.message})`);
  }
}

function validateCampaign(campaign, assetIds) {
  if (!campaign) return;
  const zoneIds = uniqueById(campaign.zones, 'campaign.zones');
  const roomIds = uniqueById(campaign.rooms, 'campaign.rooms');
  uniqueById(campaign.factions, 'campaign.factions');
  uniqueById(campaign.conditionalConnections, 'campaign.conditionalConnections');
  uniqueById(campaign.secretConnections, 'campaign.secretConnections');
  uniqueById(campaign.campaignMilestones, 'campaign.campaignMilestones');
  uniqueById(campaign.globalEvents, 'campaign.globalEvents');

  if (campaign.rooms?.length !== campaign.validation?.expectedRoomCount) {
    fail(`campaign.rooms: expected ${campaign.validation?.expectedRoomCount}, found ${campaign.rooms?.length ?? 0}`);
  }
  requireRef(campaign.entryRoomId, roomIds, 'campaign.entryRoomId');

  const roomsByZone = new Map();
  for (const room of campaign.rooms ?? []) {
    requireRef(room.zoneId, zoneIds, `room ${room.id}.zoneId`);
    if (!Array.isArray(room.size) || room.size.length !== 2 || room.size.some(value => !Number.isFinite(value) || value < 6)) {
      fail(`room ${room.id}: invalid size`);
    }
    if ((room.tags?.length ?? 0) < 2) fail(`room ${room.id}: requires at least two system tags`);
    if ((room.stateVariants?.length ?? 0) < 2) fail(`room ${room.id}: requires at least two state variants`);
    requireRef(room.landmarkBundle, assetIds, `room ${room.id}.landmarkBundle`);
    if (!roomsByZone.has(room.zoneId)) roomsByZone.set(room.zoneId, new Set());
    roomsByZone.get(room.zoneId).add(room.id);
  }

  for (const zone of campaign.zones ?? []) {
    requireRef(zone.zoneKit, assetIds, `zone ${zone.id}.zoneKit`);
    const declared = new Set(zone.roomIds ?? []);
    const actual = roomsByZone.get(zone.id) ?? new Set();
    for (const roomId of declared) {
      requireRef(roomId, roomIds, `zone ${zone.id}.roomIds`);
      const room = campaign.rooms.find(candidate => candidate.id === roomId);
      if (room && room.zoneId !== zone.id) fail(`zone ${zone.id}: room ${roomId} declares zone ${room.zoneId}`);
    }
    for (const roomId of actual) {
      if (!declared.has(roomId)) fail(`zone ${zone.id}: room ${roomId} missing from zone.roomIds`);
    }
    for (const roomId of declared) {
      if (!actual.has(roomId)) fail(`zone ${zone.id}: zone.roomIds contains non-member ${roomId}`);
    }
  }

  for (const pair of campaign.connections ?? []) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      fail(`campaign.connections: invalid pair ${JSON.stringify(pair)}`);
      continue;
    }
    requireRef(pair[0], roomIds, 'campaign.connections');
    requireRef(pair[1], roomIds, 'campaign.connections');
    if (pair[0] === pair[1]) fail(`campaign.connections: self-link ${pair[0]}`);
  }

  for (const connection of [...(campaign.conditionalConnections ?? []), ...(campaign.secretConnections ?? [])]) {
    requireRef(connection.from, roomIds, `${connection.id}.from`);
    requireRef(connection.to, roomIds, `${connection.id}.to`);
  }

  if ((campaign.secretConnections?.length ?? 0) < (campaign.validation?.minimumSecretConnections ?? 0)) {
    fail(`campaign.secretConnections: minimum ${campaign.validation.minimumSecretConnections}, found ${campaign.secretConnections.length}`);
  }

  for (const faction of campaign.factions ?? []) {
    for (const roomId of faction.initialRooms ?? []) requireRef(roomId, roomIds, `faction ${faction.id}.initialRooms`);
  }

  const adjacency = new Map([...roomIds].map(id => [id, new Set()]));
  const addConnection = (from, to) => {
    if (!adjacency.has(from) || !adjacency.has(to)) return;
    adjacency.get(from).add(to);
    adjacency.get(to).add(from);
  };
  for (const [from, to] of campaign.connections ?? []) addConnection(from, to);
  for (const connection of campaign.conditionalConnections ?? []) addConnection(connection.from, connection.to);
  for (const connection of campaign.secretConnections ?? []) addConnection(connection.from, connection.to);

  const visited = new Set();
  const queue = roomIds.has(campaign.entryRoomId) ? [campaign.entryRoomId] : [];
  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adjacency.get(current) ?? []) if (!visited.has(neighbor)) queue.push(neighbor);
  }
  for (const roomId of roomIds) if (!visited.has(roomId)) fail(`campaign graph: ${roomId} is unreachable from ${campaign.entryRoomId}`);

  note(`campaign: ${roomIds.size} rooms, ${zoneIds.size} zones, ${campaign.secretConnections?.length ?? 0} secret connections`);
}

function validateAssets(catalog) {
  if (!catalog) return new Set();
  const templateIds = new Set(Object.keys(catalog.templates ?? {}));
  const assetIds = uniqueById(catalog.entries, 'assetCatalog.entries');

  for (const entry of catalog.entries ?? []) {
    if (entry.template && !templateIds.has(entry.template)) fail(`asset ${entry.id}: unknown template ${entry.template}`);
    if (!entry.kind && !entry.template) fail(`asset ${entry.id}: requires kind or template`);
    if (entry.authored) {
      for (const [key, value] of Object.entries(entry.authored)) {
        if (typeof value === 'string' && !value.startsWith('assets/')) fail(`asset ${entry.id}.authored.${key}: path must start with assets/`);
      }
    }
    if (!entry.authored && !entry.proceduralFallback && !entry.template) {
      fail(`asset ${entry.id}: no authored target, procedural fallback or template`);
    }
  }

  const zoneKitCount = (catalog.entries ?? []).filter(entry => entry.template === 'zone-kit').length;
  const landmarkCount = (catalog.entries ?? []).filter(entry => entry.template === 'campaign-landmark').length;
  if (zoneKitCount < (catalog.coverage?.expectedZoneKitCount ?? 0)) {
    fail(`asset coverage: expected at least ${catalog.coverage.expectedZoneKitCount} zone kits, found ${zoneKitCount}`);
  }
  if (landmarkCount < (catalog.coverage?.expectedRoomLandmarkCount ?? 0)) {
    fail(`asset coverage: expected at least ${catalog.coverage.expectedRoomLandmarkCount} campaign landmarks, found ${landmarkCount}`);
  }
  for (const id of catalog.coverage?.innVerticalSliceIds ?? []) requireRef(id, assetIds, 'asset coverage.innVerticalSliceIds');

  note(`assets: ${assetIds.size} catalog entries, ${zoneKitCount} zone kits, ${landmarkCount} campaign landmarks`);
  return assetIds;
}

function validateUi(ui) {
  if (!ui) return;
  const surfaceIds = uniqueById(ui.surfaces, 'ui.surfaces');
  const selectionTypes = new Set(ui.selectionTypes ?? []);
  const desktopRegions = new Set(ui.layout?.desktop?.regions ?? []);
  const mobileRegions = new Set(ui.layout?.mobile?.regions ?? []);

  for (const surface of ui.surfaces ?? []) {
    if (!desktopRegions.has(surface.region) && !mobileRegions.has(surface.region)) {
      fail(`surface ${surface.id}: unknown region ${surface.region}`);
    }
    if (surface.entityType && !selectionTypes.has(surface.entityType)) {
      fail(`surface ${surface.id}: entityType ${surface.entityType} is not selectable`);
    }
    for (const selector of surface.selectors ?? []) {
      if (!/^select[A-Z]/.test(selector)) fail(`surface ${surface.id}: invalid selector ${selector}`);
    }
    for (const command of surface.commands ?? []) {
      if (!command.includes('.')) fail(`surface ${surface.id}: command lacks namespace ${command}`);
    }
  }
  for (const [overlay, selector] of Object.entries(ui.overlaySelectors ?? {})) {
    if (!/^select[A-Z]/.test(selector)) fail(`overlay ${overlay}: invalid selector ${selector}`);
  }
  if ((ui.accessibility?.minimumTouchTargetPx ?? 0) < 44) fail('ui.accessibility: touch target must be at least 44px');
  note(`ui: ${surfaceIds.size} surfaces, ${selectionTypes.size} selection types`);
}

const [campaign, assets, ui] = await Promise.all([
  readJson(paths.campaign),
  readJson(paths.assets),
  readJson(paths.ui)
]);

await Promise.all([
  validateSchemaReference(campaign, paths.campaign),
  validateSchemaReference(assets, paths.assets),
  validateSchemaReference(ui, paths.ui)
]);

const assetIds = validateAssets(assets);
validateCampaign(campaign, assetIds);
validateUi(ui);

if (errors.length) {
  console.error('Production content validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Production content validation passed.');
  for (const message of notes) console.log(`- ${message}`);
}
