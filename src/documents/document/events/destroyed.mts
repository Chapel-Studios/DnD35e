import type { DatabaseDeleteCallbackOptions } from '@common/abstract/_types.mjs';
import type { Dnd35eDocType } from '@documents/types.mjs';

const PRE_DESTROY_EVENT = 'preDestroy';
const DESTROY_EVENT = 'destroyed';

type DestroyedEventPayload<T extends Dnd35eDocType> = {
  document: T;
  options?: Partial<Omit<DatabaseDeleteCallbackOptions, 'parent' | 'pack'>>;
};

export type {
  DestroyedEventPayload,
};

export {
  DESTROY_EVENT,
  PRE_DESTROY_EVENT,
};
