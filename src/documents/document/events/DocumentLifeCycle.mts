import { CREATE_EVENT, PRE_CREATE_EVENT } from './created.mjs';
import { DESTROY_EVENT, PRE_DESTROY_EVENT } from './destroyed.mjs';
import { PRE_UPDATE_EVENT, UPDATE_EVENT } from './updated.mjs';

const DocumentLifeCycle = {
  /** Document about to be created in the DB. */
  preCreate: PRE_CREATE_EVENT,
  /** Document first created in the DB. */
  created: CREATE_EVENT,
  /** Document about to be updated in the DB. */
  preUpdate: PRE_UPDATE_EVENT,
  /** Document updated in the DB. */
  updated: UPDATE_EVENT,
  /** Document about to be deleted from the DB. */
  preDestroy: PRE_DESTROY_EVENT,
  /** Document deleted from the DB. */
  destroyed: DESTROY_EVENT,
} as const;

export {
  DocumentLifeCycle,
};
