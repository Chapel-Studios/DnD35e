import type { UseActionContext } from '@items/baseItem/actions/types.mjs';

const PRE_USE_ACTION_EVENT = 'preUseAction';

/**
 * Emitted before an action executes (poc.10 §10.7). `cancel()` aborts execution before
 * the action budget is consumed — idempotent, may be called by more than one subscriber.
 */
interface PreUseActionPayload extends UseActionContext {
  cancel: () => void;
}

export { PRE_USE_ACTION_EVENT };
export type { PreUseActionPayload };
