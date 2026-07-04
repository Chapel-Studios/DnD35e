import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';

import { DocumentLifeCycle } from './DocumentLifeCycle.mjs';

const registerDocumentEvents = () => {
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.preCreate, {
    label: 'dnd35e.DOCUMENT.EVENTS.preCreate.label',
    description: 'dnd35e.DOCUMENT.EVENTS.preCreate.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.created, {
    label: 'dnd35e.DOCUMENT.EVENTS.created.label',
    description: 'dnd35e.DOCUMENT.EVENTS.created.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.preUpdate, {
    label: 'dnd35e.DOCUMENT.EVENTS.preUpdate.label',
    description: 'dnd35e.DOCUMENT.EVENTS.preUpdate.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.updated, {
    label: 'dnd35e.DOCUMENT.EVENTS.updated.label',
    description: 'dnd35e.DOCUMENT.EVENTS.updated.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.preDestroy, {
    label: 'dnd35e.DOCUMENT.EVENTS.preDestroy.label',
    description: 'dnd35e.DOCUMENT.EVENTS.preDestroy.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(DocumentLifeCycle.destroyed, {
    label: 'dnd35e.DOCUMENT.EVENTS.destroyed.label',
    description: 'dnd35e.DOCUMENT.EVENTS.destroyed.description',
    appliesTo: ['Actor'],
  });
};

export { registerDocumentEvents };
