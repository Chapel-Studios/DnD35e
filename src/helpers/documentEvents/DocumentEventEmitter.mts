import type { DocumentDnd35e } from '@documents/document/DocumentDnd35e.mjs';

import type { DocumentEvent, EventChecker, EventHandler, EventHandlerBundle, EventHandlerRegistration, WellKnownEventMeta } from './types.mjs';

type RegisteredEventCheck<TPayload> = {
  event: string;
  check: EventChecker<TPayload>;
  priority: number;
};

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
 * All system documents (actors, items, AEs) carry `events` via DocumentMixin.
 */
class DocumentEventEmitter<TParent extends DocumentDnd35e<any>> {
  readonly #listeners = new Map<string, Set<EventHandlerBundle<any>>>(); // key is event name, value is set of handlers
  // TODO: evaluate if we need the map or if a set of EventChecker is sufficient.
  private _registeredUpdateEventChecks = new Set<RegisteredEventCheck<any>>(); // key is event name, value is check function 
  private readonly _parent: TParent;

  constructor(parent: TParent) {
    this._parent = parent;
  }
  
  /// ─── registration for update event checks ───────────────────────────────────────

  /**
   * Register a check function for a specific event type.
   */
  registerChangeEventCheck<TPayload>(event: string, check: EventChecker<TPayload>, priority: number = 0): void {
    if ([...this._registeredUpdateEventChecks].some(
      x => x.event === event
      && x.check === check
      && x.priority === priority
    )) {
      this._registeredUpdateEventChecks.delete({ event, check, priority });
    }
    this._registeredUpdateEventChecks.add({ event, check, priority });
  }

  checkForIncomingChangeEvents(changes: Record<string, unknown>, metadata?: Record<string, unknown>): DocumentEvent<any>[] {
    const readyEvents: DocumentEvent<any>[] = [];
    const sortedEventChecks = [...this._registeredUpdateEventChecks]
      .sort((a, b) => b.priority - a.priority);
    for (const check of sortedEventChecks) {
      const result = check.check({
        parent: this._parent,
        updateData: changes,
        ...(metadata ?? {}),
      });

      if (result.result) {
        readyEvents.push({
          event: result.event,
          payload: result.payload,
          priority: check.priority ?? 0,
        });
      }
    }
    return readyEvents;
  }


  // ─── Static well-known event registry ────────────────────────────────────

  /**
   * Global registry of well-known event types across all document classes.
   * Populated via `registerEventType()` — typically called at module init time
   * by each document class that defines its own lifecycle events.
   *
   * Used by future UI (event subscription dropdowns, macro builders) and
   * module authors: `DocumentEventEmitter.wellKnownEvents.get('takeDamage')`
   */
  static readonly wellKnownEvents = new Map<string, WellKnownEventMeta>();

  /**
   * Register a well-known event type so it appears in discovery UIs.
   *
   *   DocumentEventEmitter.registerEventType('myModule.stunned', {
   *     label: 'Stunned',
   *     description: 'Fires when the creature becomes stunned.',
   *     appliesTo: ['Actor'],
   *   });
   */
  static registerEventType (type: string, meta: WellKnownEventMeta): void {
    DocumentEventEmitter.wellKnownEvents.set(type, meta);
  }

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   *
   *   const off = item.events.on('broken', handler);
   *   off(); // stop listening
   */
  on<T = unknown>(
    event: string,
    handler: EventHandler<T>,
    ...args: unknown[]
  ): EventHandlerRegistration {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    const token = crypto.randomUUID();
    set.add({ token, event, handler, args });
    return {
      token,
      event,
      cancel: () => this.cancel(token),
    };
  }

  /**
   * Subscribe for a single firing, then auto-unsubscribe.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): EventHandlerRegistration {
    let off: (() => void) | undefined;
    const wrapper: EventHandler<T> = (payload) => {
      off?.();
      return handler(payload);
    };
    const registration = this.on(event, wrapper);
    off = registration.cancel;
    return registration;
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const bundle of set) {
      if (bundle.handler === handler) {
        set.delete(bundle);
        break;
      }
    }
  }

  cancel(token: string): void {
    for (const [_, set] of this.#listeners.entries()) {
      for (const bundle of set) { 
        if (bundle.token === token) {
          set.delete(bundle);
          return;
        }
      }
    }
  }

  /**
   * Fire an event. All handlers run in registration order; errors are
   * forwarded to Foundry's error system and do not abort other handlers.
   */
  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const handlers = this.#listeners.get(event);
    if (!handlers?.size) return;
    // Snapshot to allow handlers to un/subscribe during iteration
    for (const bundle of [...handlers]) {
      try {
        await bundle.handler(payload);
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
