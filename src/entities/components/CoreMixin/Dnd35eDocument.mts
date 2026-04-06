import type { ClientDocument } from '@client/documents/abstract/_module.mjs';
import { DatabaseCreateCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';

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
      evaluate: (document: EvaluationDocument, contexts: Record<string, EvaluationDocument>) => {
        const identifiedFormula = document.system.nameFormula?.value;
        if (!identifiedFormula?.formula) return document.system.derivedName;
        const nameFormulaDnd35e = (this as any).system?.schema?.fields?.nameFormula;
        const innerField = nameFormulaDnd35e?.fields?.value as FormulaField | undefined;
        const excluded = innerField?.excludedFields ?? [];
        return FormulaData.resolveSource(identifiedFormula, { self: document, ...contexts }, document.system.derivedName, excluded);
      },
    };

    protected readonly defaultNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: EvaluationDocument, _contexts: Record<string, EvaluationDocument>) => {
        return document.system.derivedName;
      },
    };

    declare flags: Dnd35eDocumentFlags;

    declare registeredFormulas: Set<FormulaRegistration>;

    abstract get localizedType (): string;

    /**
     * Resolve registered name formulas during creation so that embedded
     * documents (e.g. a material effect dropped on a weapon) persist the
     * resolved name immediately rather than requiring a subsequent update().
     */
    protected override async _preCreate (
      data: Record<string, unknown>,
      options: DatabaseCreateCallbackOptions,
      user: foundry.documents.BaseUser
    ): Promise<boolean | void> {
      const result = await super._preCreate(data as any, options, user);
      if (result === false) return false;

      // Only resolve if the document already has a populated name formula
      // (e.g. material effects from compendium). If empty, the preCreate hook
      // will populate it later — no resolution needed at this stage.
      const nameFormula = (this as any).system?.nameFormula?.value?.formula;
      if (!nameFormula) return;

      const thisObject = this.toObject(false) as Record<string, unknown>;
      thisObject.documentName = this.documentName;
      thisObject.type = (this as any).type;

      const sourceUpdate: Record<string, unknown> = {};
      for (const registration of this.registeredFormulas) {
        const additionalContexts = this._buildFormulaContexts(registration.formulaField);
        const evaluationContext = foundry.utils.mergeObject(
          thisObject,
          foundry.utils.expandObject(sourceUpdate),
          { inplace: false }
        ) as EvaluationDocument;
        sourceUpdate[registration.impactedField] = registration.evaluate(evaluationContext, additionalContexts);
      }

      this.updateSource(sourceUpdate);
    }

    override async update (updateData: Record<string, unknown>, options?: Partial<Omit<DatabaseUpdateOperation<null>, 'parent' | 'pack'>>): Promise<this | undefined> {
      const thisObject = this.toObject(false) as Record<string, unknown>;
      // Preserve documentName/type so buildDocumentFamiliar can look up the schema on POJOs
      thisObject.documentName = this.documentName;
      thisObject.type = (this as any).type;

      // Build additional context POJOs from the live document's relationships
      // Ensure that formulas are evaluated before update to have updated data for preUpdate hooks and active effect application
      for (const registration of this.registeredFormulas) {
        const additionalContexts = this._buildFormulaContexts(registration.formulaField);
        const evaluationContext = foundry.utils.mergeObject(
          thisObject,
          foundry.utils.expandObject(updateData),
          { inplace: false }
        ) as EvaluationDocument;
        updateData[registration.impactedField] = registration.evaluate(evaluationContext, additionalContexts);
      }

      return await super.update(updateData, options);
    }

    /**
     * Build additional formula context POJOs for a specific formula field.
     * Looks up the FormulaField in the schema by path and reads its
     * `formulaContexts` declarations to know which contexts to resolve.
     */
    protected _buildFormulaContexts (formulaFieldPath: string): Record<string, EvaluationDocument> {
      const contexts: Record<string, EvaluationDocument> = {};
      const systemModel = (this as any).system;
      if (!systemModel?.schema) return contexts;

      // Walk schema to find the FormulaField at the given path (strip system. prefix)
      const fieldPath = formulaFieldPath.replace(/^system\./, '');
      let currentField: any = systemModel.schema;
      for (const part of fieldPath.split('.')) {
        currentField = currentField?.fields?.[part];
        if (!currentField) return contexts;
      }

      // Unwrap Dnd35eField compound if present (the FormulaField is the .value sub-field)
      if ((currentField?.constructor as any)?.isFamiliarField && currentField?.fields?.value) {
        currentField = currentField.fields.value;
      }

      const declarations = currentField?.formulaContexts ?? [];
      if (!declarations?.length) return contexts;

      for (const decl of declarations) {
        if (!decl.resolvePath) continue; // Runtime-provided context, skip auto-resolution
        let current: any = this;
        for (const segment of decl.resolvePath.split('.')) {
          if (!current) break;
          current = current[segment];
        }
        if (current?.documentName) {
          const pojo = current.toObject ? current.toObject(false) : { ...current };
          pojo.documentName = current.documentName;
          pojo.type = current.type;
          contexts[decl.contextName] = pojo as EvaluationDocument;
        }
      }
      return contexts;
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