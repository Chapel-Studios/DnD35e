import type { ClientDocument } from '@client/documents/abstract/_module.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';

import {
  createDefaultNameRegistrations,
  evaluateRegisteredFormulas,
  evaluateRegisteredFormulasForCreate,
} from './formulaRegistrationHelpers.mjs';
import type { DocumentFlagsDnd35e, FormulaRegistration } from './index.mjs';

interface DocumentProperties {
  readonly localizedType: string;
  flags: DocumentFlagsDnd35e;
  registeredFormulas: Set<FormulaRegistration>;
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

    abstract get localizedType (): string;

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
  DocumentMixin,
};

export type {
  DocumentConstructor,
  DocumentDnd35e,
  DocumentProperties,
};