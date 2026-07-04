import type { DocumentDnd35e } from '@documents/document/DocumentDnd35e.mjs';

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

type EventHandlerBundle<T = unknown> = {
  token: string;
  event: string;
  handler: EventHandler<T>;
  args: unknown[];
};

type EventHandlerRegistration = {
  token: string;
  event: string;
  cancel: () => void;
};

type EventCheckerParams<TParent extends DocumentDnd35e<any>> = {
  parent: TParent;
  updateData: Record<string, unknown>;
};

type EventChecker<
  TPayload,
  TParent extends DocumentDnd35e<any> = DocumentDnd35e<any>,
  TParams extends EventCheckerParams<TParent> = EventCheckerParams<TParent>
> = (params: TParams & Record<string, unknown>) => EventCheckResult<TPayload>;

type EventCheckResult<TPayload> = {
  documentId: string;
  event: string;
  result: boolean;
  args: unknown[];
  payload?: TPayload;
  priority?: number;
};

/**
 * Metadata for a registered well-known event type.
 * Used by UI (future) and module authors to discover available event types.
 *
 * `label` and `description` are **i18n keys** — resolve with `game.i18n.localize(meta.label)`
 * at point-of-use. Do not call `game.i18n.localize()` at registration time because
 * `registerEventType()` is called at module-load, before Foundry's i18n is initialised.
 */
interface WellKnownEventMeta {
  /** i18n key for the human-readable display label. */
  label: string;
  /** i18n key for the short description of when this event fires. */
  description: string;
  /** Document types this event may be emitted on (e.g. `['Actor', 'Item']`). */
  appliesTo: string[];
}

type DocumentEvent<TPayload extends {} = {}> = {
  event: string,
  payload: TPayload,
  priority: number,
};

export type {
  DocumentEvent,
  EventChecker,
  EventCheckerParams,
  EventCheckResult,
  EventHandler,
  EventHandlerBundle,
  EventHandlerRegistration,
  WellKnownEventMeta,
};