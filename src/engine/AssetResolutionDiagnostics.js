export class AssetResolutionDiagnostics {
  constructor({ maxEntries = 200, dedupeWindowMs = 5000, now = () => Date.now() } = {}) {
    this.maxEntries = maxEntries;
    this.dedupeWindowMs = dedupeWindowMs;
    this.now = now;
    this._entries = [];
    this._lastSeen = new Map();
  }

  record(code, detail = {}) {
    const timestamp = this.now();
    const key = `${code}:${detail.bundleId ?? ''}:${detail.path ?? ''}:${detail.state ?? ''}`;
    const previous = this._lastSeen.get(key);
    if (previous !== undefined && timestamp - previous < this.dedupeWindowMs) return null;

    const entry = Object.freeze({ code, timestamp, ...detail });
    this._lastSeen.set(key, timestamp);
    this._entries.push(entry);
    if (this._entries.length > this.maxEntries) this._entries.splice(0, this._entries.length - this.maxEntries);
    return entry;
  }

  snapshot() {
    return [...this._entries];
  }

  clear() {
    this._entries.length = 0;
    this._lastSeen.clear();
  }
}

export function createDiagnosticAsset(bundleId, context = {}) {
  return {
    name: `missing-asset:${bundleId}`,
    children: [],
    userData: {
      assetResolution: {
        bundleId,
        source: 'diagnostic',
        state: context.state ?? null,
        missing: true
      }
    }
  };
}
