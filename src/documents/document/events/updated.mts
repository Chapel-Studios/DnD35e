import type { DatabaseUpdateCallbackOptions } from '@common/abstract/_types.mjs';
import type { Dnd35eDocType } from '@documents/types.mjs';

const PRE_UPDATE_EVENT = 'preUpdate';
const UPDATE_EVENT = 'updated';

type UpdatedEventPayload<T extends Dnd35eDocType> = {
  document: T;
  options: DatabaseUpdateCallbackOptions;
};

export type {
  UpdatedEventPayload,
};

export {
  PRE_UPDATE_EVENT,
  UPDATE_EVENT,
};
