import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';

import { DocumentLifeCycle } from './DocumentLifeCycle.mjs';

const registerDocumentEvents = () => {
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.preCreate, {
    label: 'dnd35e.DOCUMENT.EVENTS.preCreate.label',
    description: 'dnd35e.DOCUMENT.EVENTS.preCreate.hint',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.created, {
    label: 'dnd35e.DOCUMENT.EVENTS.created.label',
    description: 'dnd35e.DOCUMENT.EVENTS.created.hint',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.preUpdate, {
    label: 'dnd35e.DOCUMENT.EVENTS.preUpdate.label',
    description: 'dnd35e.DOCUMENT.EVENTS.preUpdate.hint',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.updated, {
    label: 'dnd35e.DOCUMENT.EVENTS.updated.label',
    description: 'dnd35e.DOCUMENT.EVENTS.updated.hint',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.preDestroy, {
    label: 'dnd35e.DOCUMENT.EVENTS.preDelete.label',
    description: 'dnd35e.DOCUMENT.EVENTS.preDelete.hint',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.destroyed, {
    label: 'dnd35e.DOCUMENT.EVENTS.deleted.label',
    description: 'dnd35e.DOCUMENT.EVENTS.deleted.hint',
    appliesTo: ['Actor'],
  });
};

export { registerDocumentEvents };
