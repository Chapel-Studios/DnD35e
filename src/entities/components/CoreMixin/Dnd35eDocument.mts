import type { ClientDocument } from '@client/documents/abstract/_module.mjs';
import { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';

import { Dnd35eDocumentFlags, EvaluationDocument, FormulaRegistration } from './index.mjs';

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
      this.registeredFormulas = new Set([
        this.defaultDerivedNameRegistration,
        this.defaultNameRegistration,
      ]);
    }

    protected readonly defaultDerivedNameRegistration: FormulaRegistration = {
      impactedField: 'system.derivedName',
      formulaField: 'system.nameFormula',
      evaluate: (document: EvaluationDocument) => {
        const { nameFormula, derivedName } = document.system;
        if (!nameFormula?.formula) return derivedName;
        return FormulaData.resolveSource(nameFormula, { self: document }, derivedName);
      },
    };

    protected readonly defaultNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: EvaluationDocument) => {
        return document.system.derivedName;
      },
    };

    declare flags: Dnd35eDocumentFlags;

    declare registeredFormulas: Set<FormulaRegistration>;

    abstract get localizedType (): string;

    override async update (updateData: Record<string, unknown>, options?: Partial<Omit<DatabaseUpdateOperation<null>, 'parent' | 'pack'>>): Promise<this | undefined> {
      const thisObject = this.toObject(false);
      // Ensure that formulas are evaluated before update to have updated data for preUpdate hooks and active effect application
      for (const registration of this.registeredFormulas) {
        const evaluationContext = foundry.utils.mergeObject(
          thisObject,
          foundry.utils.expandObject(updateData),
          { inplace: false }
        ) as EvaluationDocument;
        updateData[registration.impactedField] = registration.evaluate(evaluationContext);
      }

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