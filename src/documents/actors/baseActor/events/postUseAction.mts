import type { ActionResult, UseActionContext } from '@items/baseItem/actions/types.mjs';

const POST_USE_ACTION_EVENT = 'postUseAction';

/** Emitted after an action completes (poc.10 §10.7) — resource tracking, backlash effects, etc. */
interface PostUseActionPayload extends UseActionContext {
  result: ActionResult;
}

export { POST_USE_ACTION_EVENT };
export type { PostUseActionPayload };
