import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import type { Dnd35eDocType } from '@documents/types.mjs';

const PRE_CREATE_EVENT = 'preCreate';
const CREATE_EVENT = 'created';

type CreatedEventPayload<T extends Dnd35eDocType> = {
  document: T;
  options: DatabaseCreateCallbackOptions;
};

export type {
  CreatedEventPayload,
};

export {
  CREATE_EVENT,
  PRE_CREATE_EVENT,
};
