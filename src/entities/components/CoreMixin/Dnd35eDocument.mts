import { ClientDocument } from '@client/documents/abstract/_module.mjs';
import { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { DocumentContext, NonNullDocumentContext } from '@helpers/formulae/registry.mjs';
import type { FormulaFieldData } from '@helpers/formulae/types.mjs';
import { resolveFormulaField } from '@helpers/index.mjs';

import { Dnd35eDocumentFlags, FormulaContextBuilder, FormulaRegistration } from './index.mjs';

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
  (abstract new (...args: ConstructorParameters<TBase>) => Dnd35eDocument<TBase>) & TBase;


const Dnd35eDocumentMixin = <TBase extends AbstractConstructorOf<ClientDocument>>(Base: TBase): Dnd35eDocumentConstructor<TBase> => {
  abstract class Dnd35eDocument extends Base {
    constructor (...args: any[]) {
      super(...args);
      this.registeredFormulas = new Set([
        this.defaultDerivedNameRegistration,
        this.defaultNameRegistration,
      ]);
    }

    protected readonly defaultDerivedNameRegistration: FormulaRegistration = {
      impactedField: 'system.derivedName',
      formulaField: 'system.nameFormula',
      evaluate: (document: NonNullDocumentContext) => {
        if (!document) return;

        const system = document.system as Record<string, unknown>;
        const baseContext = this.nameContextBuilder(document) ?? {} as Record<string, DocumentContext>;
        baseContext.self = document;

        const newName = resolveFormulaField(
          system.nameFormula as FormulaFieldData | null | undefined,
          baseContext,
          (system.derivedName as string | undefined) ?? ''
        );
        console.log('[updateDocument] Resolved newName:', newName);
        return newName;
      },
    };

    protected readonly defaultNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: NonNullDocumentContext) => {
        return (document.system as Record<string, unknown>).derivedName as string | undefined;
      },
    };

    declare flags: Dnd35eDocumentFlags;

    declare registeredFormulas: Set<FormulaRegistration>;

    abstract get localizedType (): string;

    protected abstract nameContextBuilder: FormulaContextBuilder;

    override async update (data: Record<string, unknown>, options?: Partial<Omit<DatabaseUpdateOperation<null>, 'parent' | 'pack'>>): Promise<this | undefined> {
      // Ensure that formulas are evaluated before update to have updated data for preUpdate hooks and active effect application
      for (const registration of this.registeredFormulas) {
        // TODO: evaluate should either be passed the data object or it should retun a partial update object to be merged.
        data[registration.impactedField] = registration.evaluate(this as unknown as NonNullDocumentContext);
      }

      return await super.update(data, options);
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