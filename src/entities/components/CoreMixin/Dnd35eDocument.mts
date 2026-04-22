import type { ClientDocument } from '@client/documents/abstract/_module.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';

import {
  createDefaultNameRegistrations,
  evaluateRegisteredFormulas,
  evaluateRegisteredFormulasForCreate,
} from './formulaRegistrationHelpers.mjs';
import type { Dnd35eDocumentFlags, FormulaRegistration } from './index.mjs';

interface Dnd35eDocumentProperties {
  readonly localizedType: string;
  flags: Dnd35eDocumentFlags;
  registeredFormulas: Set<FormulaRegistration>;
}

// Instance type: the base document extended with mixin properties
type Dnd35eDocument<TBase extends AbstractConstructorOf<ClientDocument>> = 
  InstanceType<TBase> & Dnd35eDocumentProperties;

// Constructor type: TBase extended with abstract mixin members
// The abstract class adds localizedType (abstract), flags, registeredFormulas
type Dnd35eDocumentConstructor<TBase extends AbstractConstructorOf<ClientDocument>> = 
  (abstract new (...args: ConstructorParameters<TBase>) => Dnd35eDocument<TBase>) & { [K in keyof TBase]: TBase[K] };


const Dnd35eDocumentMixin = <TBase extends AbstractConstructorOf<ClientDocument>>(Base: TBase): Dnd35eDocumentConstructor<TBase> => {
  abstract class Dnd35eDocument extends Base {
    constructor (...args: any[]) {
      super(...args);
      const [derived, name] = createDefaultNameRegistrations(this as any);
      this.registeredFormulas = new Set([derived, name]);
    }

    declare flags: Dnd35eDocumentFlags;

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
  
  return Dnd35eDocument as unknown as Dnd35eDocumentConstructor<TBase>;
};

export {
  Dnd35eDocumentMixin,
};

export type {
  Dnd35eDocument,
  Dnd35eDocumentConstructor,
  Dnd35eDocumentProperties,
};