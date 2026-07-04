import type { HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { ClientDocument } from '@client/documents/abstract/_module.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseDeleteCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { DOCUMENT_UPDATE_TYPES, type DocumentUpdateType } from '@constants/documentUpdateTypes.mjs';
import type { DocumentStoreType } from '@documents/types.mjs';
import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';
import type { DocumentEvent } from '@helpers/documentEvents/types.mjs';

import { DocumentLifeCycle } from './events/DocumentLifeCycle.mjs';
import { registerDocumentEvents } from './events/registerDocumentEvents.mjs';
import {
  createDefaultNameRegistrations,
  evaluateRegisteredFormulas,
  evaluateRegisteredFormulasForCreate,
} from './formulaRegistrationHelpers.mjs';
import type { DocumentFlagsDnd35e, DocumentSheetStore, FormulaRegistration } from './index.mjs';

/**
 * Lifecycle events present on every system document.
 * Subclasses extend via spread:
 *   `static override readonly LifeCycle = { ...DocumentLifeCycle, broken: 'broken' } as const`
 */

interface DocumentProperties {
  readonly localizedType: string;
  flags: DocumentFlagsDnd35e;
  registeredFormulas: Set<FormulaRegistration>;
  /** Per-instance lifecycle event bus. */
  readonly events: DocumentEventEmitter<this>;
  // todo: this should be detected from the foundry types but isn't, we should fix that
  id: string;
  LifeCycle: typeof DocumentLifeCycle;
}

interface DocumentUpdateMetadata {
  updateType: DocumentUpdateType;
  pendingEvents?: DocumentEvent<any>[];
  sourceDocumentId?: string;
  sourceMessage?: string;
  [key: string]: unknown;
}

interface DocumentUpdateCallbackOptions extends foundry.abstract.DatabaseUpdateCallbackOptions {
  updateMetadata?: DocumentUpdateMetadata;
}

interface HpAdjustmentMetadata extends DocumentUpdateMetadata {
  updateType: typeof DOCUMENT_UPDATE_TYPES.HP_ADJUSTMENT_UPDATE;
  adjustmentAmount: number;
  damageType?: string;
  hpAdjustmentType: HpAdjustmentType,
}

interface DocumentUpdateOptions extends Partial<Omit<DatabaseUpdateOperation<null>, 'parent' | 'pack'>> {
  updateMetadata?: DocumentUpdateMetadata;
}

// Instance type: the base document extended with mixin properties
type DocumentDnd35e<TBase extends AbstractConstructorOf<ClientDocument>> = 
  InstanceType<TBase> & DocumentProperties;

// Constructor type: TBase extended with abstract mixin members
// The abstract class adds localizedType (abstract), flags, registeredFormulas
type DocumentConstructor<TBase extends AbstractConstructorOf<ClientDocument>> = 
  (abstract new (...args: ConstructorParameters<TBase>) => DocumentDnd35e<TBase>) & { [K in keyof TBase]: TBase[K] };


const DocumentMixin = <TBase extends AbstractConstructorOf<ClientDocument>>(Base: TBase): DocumentConstructor<TBase> => {
  abstract class DocumentDnd35e extends Base {
    constructor (...args: any[]) {
      super(...args);
      const [derived, name] = createDefaultNameRegistrations(this as any);
      this.registeredFormulas = new Set([derived, name]);
    }

    declare flags: DocumentFlagsDnd35e;

    declare registeredFormulas: Set<FormulaRegistration>;

    /** Per-instance lifecycle event bus. All system documents carry this. */
    readonly events = new DocumentEventEmitter(this);

    abstract get localizedType (): string;

    static readonly LifeCycle = DocumentLifeCycle;

    protected override async _preCreate (
      data: this['_source'],
      options: DatabaseCreateCallbackOptions,
      user: foundry.documents.BaseUser
    ): Promise<boolean | void> {
      const result = await super._preCreate(data as any, options, user);
      if (result === false) return false;

      const sourceUpdate = evaluateRegisteredFormulasForCreate(this as any);
      if (sourceUpdate) this.updateSource(sourceUpdate);

      queueMicrotask(() => void this.events.emit(DocumentDnd35e.LifeCycle.preCreate, { document: this, options }));
    }
    
    protected override _onCreate (
      data: this['_source'],
      options: DatabaseCreateCallbackOptions,
      userId: string
    ): void {
      super._onCreate(data as any, options, userId);
      // Defer until after the full synchronous _onCreate call stack (including all
      // subclass overrides that call super first) has completely unwound.
      queueMicrotask(() => void this.events.emit(DocumentDnd35e.LifeCycle.created, { document: this, options }));
    }

    // this is a gate check we can use to intercept updates before they are applied to the document
    protected override async _preUpdate (
      updateData: Record<string, unknown>,
      options: DocumentUpdateOptions,
      user: foundry.documents.BaseUser
    ): Promise<boolean | void> {
      const result = await super._preUpdate(updateData, options, user);
      if (result === false) return false;
      
      evaluateRegisteredFormulas(this as any, updateData);

      const newEvents = this.events.checkForIncomingChangeEvents(updateData, options?.updateMetadata);

      if (newEvents?.length) {
        if (!options.updateMetadata) {
          options.updateMetadata = {
            updateType: DOCUMENT_UPDATE_TYPES.UNKNOWN_UPDATE,
          };
        }
        options.updateMetadata.pendingEvents = [
          ...(options.updateMetadata.pendingEvents ?? []),
          ...newEvents,
        ];
      }

      // console.log(`DocumentDnd35e._preUpdate: ${this.documentName} ${this.id}`, updateData, options);
      queueMicrotask(() => void this.events.emit(DocumentDnd35e.LifeCycle.preUpdate, { document: this, options }));
    }

    /* this is the public entry point for updates runs before everything else */
    // override async update (
    //   updateData: Record<string, unknown>,
    //   options?: DocumentUpdateOptions
    // ): Promise<this | undefined> {
    //   console.log(`DocumentDnd35e.update: ${this.documentName} ${this.id}`, updateData, options);

    //   return await super.update(updateData, options);
    // }

    /* This is for update cleanup after the update has been applied to the document. It is called after _preUpdate. */
    protected override async _onUpdate(data: Record<string, unknown>, options: DocumentUpdateCallbackOptions, userId: string): Promise<void> {
      super._onUpdate(data, options, userId);
      
      for (const event of options?.updateMetadata?.pendingEvents ?? []) {
        await this.events.emit(event.event, event);
      }

      const storeRef = game.dnd35e?.stores
        ?.[this.documentName as DocumentStoreType]
        ?.[this.id] as DocumentSheetStore<any> | undefined;
      if (!storeRef) return;
      storeRef._storeUtils.refreshDocument?.(this);
      
      // console.log(`DocumentDnd35e._onUpdate: ${this.documentName} ${this.id}`, data, options);
      queueMicrotask(() => void this.events.emit(DocumentDnd35e.LifeCycle.updated, { document: this, options }));
    }

    override async _preDelete (
      options: Partial<Omit<DatabaseDeleteCallbackOptions, 'parent' | 'pack'>>,
      user: foundry.documents.BaseUser
    ): Promise<boolean | void> {
      this.events.emit(DocumentDnd35e.LifeCycle.preDestroy, { document: this, options });

      const storesRef = game.dnd35e?.stores?.[this.documentName as DocumentStoreType];
      if (!!storesRef?.[this.id]) {
        delete storesRef[this.id];
      }

      return await super._preDelete(options, user);
    }

    protected override _onDelete (
      options: DatabaseDeleteCallbackOptions,
      userId: string
    ): void {
      // Emit BEFORE super so subscribers can still access the document while it
      // remains in its collections. emit() snapshots handlers immediately, so
      // clear() below is safe — async handlers still run from the snapshot.
      void this.events.emit(DocumentDnd35e.LifeCycle.destroyed, { document: this });
      this.events.clear();
      super._onDelete(options, userId);
    }
  }
  
  return DocumentDnd35e as unknown as DocumentConstructor<TBase>;
};

registerDocumentEvents();

export {
  DocumentMixin,
};

export type {
  DocumentConstructor,
  DocumentDnd35e,
  DocumentProperties,
  DocumentUpdateCallbackOptions,
  DocumentUpdateMetadata,
  DocumentUpdateOptions,
  HpAdjustmentMetadata,
};