import { EmittedEventListener } from "./_types.mjs";

export default function EventEmitterMixin<TBase extends object>(
    Base?: AbstractConstructorOf<TBase>,
): ConstructorOf<EventEmitter> & TBase;

// imported from pf2e:

export class EventEmitter {
    /**
     * An array of event types which are valid for this class.
     */
    static emittedEvents: readonly string[];

    /**
     * Add a new event listener for a certain type of event.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener}
     * @param type The type of event being registered for
     * @param listener The listener function called when the event occurs
     * @param options Options which configure the event listener
     * @param options.once Should the event only be responded to once and then removed
     */
    addEventListener(type: string, listener: EmittedEventListener, options?: { once?: boolean }): void;

    /**
     * Remove an event listener for a certain type of event.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener}
     * @param type The type of event being removed
     * @param listener The listener function being removed
     */
    removeEventListener(type: string, listener: EmittedEventListener): void;

    /**
     * Dispatch an event on this target.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent}
     * @param event The Event to dispatch
     * @returns Was default behavior for the event prevented?
     */
    dispatchEvent(event: Event): boolean;
}


// // new v13 shim
// export class EventEmitter {
//   /** Valid event names for this emitter */
//   static emittedEvents: readonly string[];

//   /** Register a listener */
//   on(type: string, listener: (...args: any[]) => void): this;

//   /** Register a one‑time listener */
//   once(type: string, listener: (...args: any[]) => void): this;

//   /** Remove a listener */
//   off(type: string, listener: (...args: any[]) => void): this;

//   /** Emit an event */
//   emit(type: string, ...args: any[]): boolean;

//   /** Get listeners for an event */
//   listeners(type: string): Function[];

//   /** Check if any listeners exist */
//   hasListeners(type: string): boolean;
// }
