// authored 콘텐츠(캠페인 manifest, asset catalog)의 in-memory 레지스트리.
// I/O 없음 — 파싱된 JSON을 받아 ID로 조회만 제공합니다.
// 내부 ID 중복(방/존/세력)은 여기서 던지지 않고 ContentValidator가 보고합니다.

const SUPPORTED_SCHEMA_VERSION = 1;

export class ContentRegistry {
  constructor() {
    this.campaigns = new Map();   // campaignId → manifest
    this.zones = new Map();       // zoneId → { campaignId, zone }
    this.rooms = new Map();       // roomId → { campaignId, room }
    this.factions = new Map();    // factionId → { campaignId, faction }
    this.bundles = new Map();     // bundleId → catalog entry
    this.ids = new Map();         // id → { kind, campaignId? } 전역 ID 대장
  }

  registerCampaign(manifestJson) {
    if (!manifestJson || typeof manifestJson !== 'object') {
      throw new Error('registerCampaign: manifest must be a parsed JSON object');
    }
    if (manifestJson.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      throw new Error(`registerCampaign: unsupported schemaVersion ${manifestJson.schemaVersion} (expected ${SUPPORTED_SCHEMA_VERSION})`);
    }
    const id = manifestJson.id;
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('registerCampaign: manifest.id must be a non-empty string');
    }
    if (this.campaigns.has(id)) {
      throw new Error(`registerCampaign: duplicate campaign id "${id}"`);
    }

    this.campaigns.set(id, manifestJson);
    this.ids.set(id, { kind: 'campaign', campaignId: id });

    for (const zone of manifestJson.zones ?? []) {
      if (!this.zones.has(zone.id)) {
        this.zones.set(zone.id, { campaignId: id, zone });
        this.ids.set(zone.id, { kind: 'zone', campaignId: id });
      }
    }
    for (const room of manifestJson.rooms ?? []) {
      if (!this.rooms.has(room.id)) {
        this.rooms.set(room.id, { campaignId: id, room });
        this.ids.set(room.id, { kind: 'room', campaignId: id });
      }
    }
    for (const faction of manifestJson.factions ?? []) {
      if (!this.factions.has(faction.id)) {
        this.factions.set(faction.id, { campaignId: id, faction });
        this.ids.set(faction.id, { kind: 'faction', campaignId: id });
      }
    }
    return manifestJson;
  }

  registerAssetCatalog(catalogJson) {
    if (!catalogJson || typeof catalogJson !== 'object') {
      throw new Error('registerAssetCatalog: catalog must be a parsed JSON object');
    }
    if (catalogJson.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      throw new Error(`registerAssetCatalog: unsupported schemaVersion ${catalogJson.schemaVersion} (expected ${SUPPORTED_SCHEMA_VERSION})`);
    }
    if (!Array.isArray(catalogJson.entries)) {
      throw new Error('registerAssetCatalog: catalog.entries must be an array');
    }
    for (const entry of catalogJson.entries) {
      if (this.bundles.has(entry.id)) {
        throw new Error(`registerAssetCatalog: duplicate bundle id "${entry.id}"`);
      }
      this.bundles.set(entry.id, entry);
      this.ids.set(entry.id, { kind: 'bundle' });
    }
    return catalogJson;
  }

  getCampaign(id) {
    return this.campaigns.get(id) ?? null;
  }

  getZone(id) {
    return this.zones.get(id)?.zone ?? null;
  }

  getRoom(id) {
    return this.rooms.get(id)?.room ?? null;
  }

  getFaction(id) {
    return this.factions.get(id)?.faction ?? null;
  }

  resolvePropBundle(bundleId) {
    return this.bundles.get(bundleId) ?? null;
  }

  hasAssetCatalog() {
    return this.bundles.size > 0;
  }

  // manifest 순서 보존
  listRooms(campaignId) {
    return [...(this.campaigns.get(campaignId)?.rooms ?? [])];
  }

  listConnections(campaignId) {
    return [...(this.campaigns.get(campaignId)?.connections ?? [])];
  }
}
