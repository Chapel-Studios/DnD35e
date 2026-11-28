class BaseWeaponNameCache {
  static _cache: Set<string> | null = null;
  static _pendingPromise: Promise<Set<string>> | null = null;
  private static readonly _invalidationListeners = new Set<() => void>();

  /**
   * Returns a Set of unique base item names, rebuilding only if invalidated.
   */
  static async getNames() {
    if (this._cache) return this._cache;

    const pending = this._pendingPromise ??= this._buildCache();
    try {
      const names = await pending;
      if (this._pendingPromise === pending) this._cache = names;
      return names;
    } finally {
      if (this._pendingPromise === pending) this._pendingPromise = null;
    }
  }

  static async _buildCache() {
    const names = new Set<string>();
    const itemPacks = game.packs.filter(p => p.documentName === 'Item');

    // Fetch all pack indexes in parallel for faster startup
    const indexes = await Promise.all(
      itemPacks.map(pack => pack.getIndex({ fields: ['system.isBaseWeaponType'] }))
    );

    for (const index of indexes) {
      for (const entry of index) {
        if (entry.system?.isBaseWeaponType === true) {
          names.add(entry.name);
        }
      }
    }

    return names;
  }

  static invalidate(): void {
    this._cache = null;
    this._pendingPromise = null;
    for (const listener of [...this._invalidationListeners]) listener();
  }

  static onInvalidate (listener: () => void): () => void {
    this._invalidationListeners.add(listener);
    return () => { this._invalidationListeners.delete(listener); };
  }
}


export { BaseWeaponNameCache };
