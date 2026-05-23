import type { ClientDocument } from '@client/documents/abstract/_module.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseDeleteCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { DocumentEventEmitter } from '@helpers/DocumentEventEmitter.mjs';

import {
  createDefaultNameRegistrations,
  evaluateRegisteredFormulas,
  evaluateRegisteredFormulasForCreate,
} from './formulaRegistrationHelpers.mjs';
import type { DocumentFlagsDnd35e, FormulaRegistration } from './index.mjs';

/**
 * Lifecycle events present on every system document.
 * Subclasses extend via spread:
 *   `static override readonly LifeCycle = { ...DocumentLifeCycle, broken: 'broken' } as const`
 */
const DocumentLifeCycle = {
  /** Document first created in the DB. */
  created: 'created',
  /** Document deleted from the DB. */
  destroyed: 'destroyed',
} as const;

interface DocumentProperties {
  readonly localizedType: string;
  flags: DocumentFlagsDnd35e;
  registeredFormulas: Set<FormulaRegistration>;
  /** Per-instance lifecycle event bus. */
  readonly events: DocumentEventEmitter;
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
    readonly events = new DocumentEventEmitter();

    abstract get localizedType (): string;

    protected override _onCreate (
      data: this['_source'],
      options: DatabaseCreateCallbackOptions,
      userId: string
    ): void {
      super._onCreate(data as any, options, userId);
      // Defer until after the full synchronous _onCreate call stack (including all
      // subclass overrides that call super first) has completely unwound.
      queueMicrotask(() => void this.events.emit(DocumentLifeCycle.created, { document: this as unknown as ClientDocument }));
    }

    protected override _onDelete (
      options: DatabaseDeleteCallbackOptions,
      userId: string
    ): void {
      // Emit BEFORE super so subscribers can still access the document while it
      // remains in its collections. emit() snapshots handlers immediately, so
      // clear() below is safe — async handlers still run from the snapshot.
      void this.events.emit(DocumentLifeCycle.destroyed, { document: this as unknown as ClientDocument });
      this.events.clear();
      super._onDelete(options, userId);
    }

    protected override async _preCreate (
      data: Record<string, unknown>,
      options: DatabaseCreateCallbackOptions,
      user: foundry.documents.BaseUser
    ): Promise<boolean | void> {
      const result = await super._preCreate(data as any, options, user);
      if (result === false) return false;

      const sourceUpdate = evaluateRegisteredFormulasForCreate(this as any);
      if (sourceUpdate) this.updateSource(sourceUpdate);
    }

    override async update (updateData: Record<string, unknown>, options?: Partial<Omit<DatabaseUpdateOperation<null>, 'parent' | 'pack'>>): Promise<this | undefined> {
      evaluateRegisteredFormulas(this as any, updateData);
      return await super.update(updateData, options);
    }
  }
  
  return DocumentDnd35e as unknown as DocumentConstructor<TBase>;
};

export {
  DocumentLifeCycle,
  DocumentMixin,
};

export type {
  DocumentConstructor,
  DocumentDnd35e,
  DocumentProperties,
};