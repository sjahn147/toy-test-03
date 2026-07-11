// Runtime-wide event transport for structured WorldEvent records.
// The bus owns buffering and subscription lifecycle so adapters and future
// native runtimes expose the same event behavior.

export class WorldEventBus {
  constructor({ limit = 200 } = {}) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`WorldEventBus limit must be a positive integer, got ${limit}`);
    }
    this.limit = limit;
    this.buffer = [];
    this.listeners = new Set();
    this.destroyed = false;
  }

  publish(event) {
    if (this.destroyed || !event || typeof event !== 'object') return false;
    this.buffer.push(event);
    if (this.buffer.length > this.limit) {
      this.buffer.splice(0, this.buffer.length - this.limit);
    }
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        // Presentation listeners must never interrupt simulation progress.
      }
    }
    return true;
  }

  subscribe(listener) {
    if (this.destroyed) throw new Error('WorldEventBus is destroyed');
    if (typeof listener !== 'function') throw new Error('subscribe requires a listener function');
    this.listeners.add(listener);
    let active = true;
    return () => {
      if (!active) return false;
      active = false;
      return this.listeners.delete(listener);
    };
  }

  history({ limit = this.limit, predicate = null } = {}) {
    const source = typeof predicate === 'function' ? this.buffer.filter(predicate) : this.buffer;
    const count = Number.isInteger(limit) && limit >= 0 ? limit : this.limit;
    return source.slice(Math.max(0, source.length - count));
  }

  clear() {
    this.buffer.length = 0;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listeners.clear();
    this.clear();
  }
}
