type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * Per-document lifecycle event bus.
 *
 * Each document instance carries its own emitter — subscribers are scoped to
 * one document, not all documents of that type (contrast: global Foundry Hooks).
 *
 * Usage:
 *   const off = weapon.events.on(Weapon.LifeCycle.onHit, handler);
 *   off(); // unsubscribe
 *
 *   weapon.events.once(Weapon.LifeCycle.broken, handler); // fires once
 *
 * Phase 6 will move this onto Dnd35eDocumentMixin so all document types
 * (actors, AEs) also carry it. For Phase 5 it lives on PhysicalItem only.
 */
class DocumentEventEmitter {
  readonly #listeners = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   *
   *   const off = item.events.on('broken', handler);
   *   off(); // stop listening
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe for a single firing, then auto-unsubscribe.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    let off: (() => void) | undefined;
    const wrapper: EventHandler<T> = (payload) => {
      off?.();
      return handler(payload);
    };
    off = this.on(event, wrapper);
    return off;
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.#listeners.get(event)?.delete(handler as EventHandler);
  }

  /**
   * Fire an event. All handlers run in registration order; errors are
   * forwarded to Foundry's error system and do not abort other handlers.
   */
  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const handlers = this.#listeners.get(event);
    if (!handlers?.size) return;
    // Snapshot to allow handlers to un/subscribe during iteration
    for (const handler of [...handlers]) {
      try {
        await handler(payload);
      } catch (err) {
        Hooks.onError(`DocumentEventEmitter[${event}]`, err as Error, {
          msg: `Error in '${event}' lifecycle event handler`,
          log: 'error',
        });
      }
    }
  }

  /**
   * Remove all listeners. Call on document deletion to prevent memory leaks
   * when subscribers hold references to parent documents.
   */
  clear(): void {
    this.#listeners.clear();
  }

  /** Event names that currently have at least one subscriber. */
  get activeEvents(): string[] {
    return [...this.#listeners.keys()].filter((k) => this.#listeners.get(k)!.size > 0);
  }
}

export { DocumentEventEmitter };
export type { EventHandler };
