import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';

import { getEffectiveNameFormulaSource } from './logic/displayName.mjs';
import type { EvaluationDocument, FormulaRegistration } from './sheet/index.mjs';

/**
 * Minimal interface for documents that support formula registration.
 * Both the mixin and Dnd35eActiveEffect satisfy this.
 */
interface FormulaRegistrationHost {
  system: any;
  documentName: string;
  type: string;
  registeredFormulas: Set<FormulaRegistration>;
  toObject(source?: boolean): Record<string, unknown>;
  updateSource(data: Record<string, unknown>): void;
}

/**
 * Create the default name formula registrations for a document.
 * Returns [derivedNameRegistration, nameRegistration] in evaluation order.
 */
function createDefaultNameRegistrations (host: FormulaRegistrationHost): [FormulaRegistration, FormulaRegistration] {
  const derivedNameRegistration: FormulaRegistration = {
    impactedField: 'system.nameFormula.resolvedValue',
    formulaField: 'system.nameFormula',
    evaluate: (document: EvaluationDocument, contexts: Record<string, EvaluationDocument>) => {
      const identifiedFormula = getEffectiveNameFormulaSource(document.name, document.system, host);
      if (!identifiedFormula?.formula) return document.name;
      const nameFormulaField = host.system?.schema?.fields?.nameFormula as FormulaField | undefined;
      const excluded = nameFormulaField?.excludedFields ?? [];
      return FormulaData.resolveSource(identifiedFormula, { self: document, ...contexts }, document.name, excluded);
    },
  };

  const nameRegistration: FormulaRegistration = {
    impactedField: 'name',
    formulaField: 'system.nameFormula',
    evaluate: (document: EvaluationDocument, _contexts: Record<string, EvaluationDocument>) => {
      const identifiedFormula = getEffectiveNameFormulaSource(document.name, document.system, host);
      return identifiedFormula?.resolvedValue || document.system.nameFormula?.resolvedValue || document.name;
    },
  };

  return [derivedNameRegistration, nameRegistration];
}

/**
 * Evaluate all registered formulas against the current document state + pending update data.
 * Mutates `updateData` in place, adding resolved formula values.
 */
function evaluateRegisteredFormulas (
  host: FormulaRegistrationHost,
  updateData: Record<string, unknown>
): void {
  const thisObject = host.toObject(false) as Record<string, unknown>;
  thisObject.documentName = host.documentName;
  thisObject.type = host.type;

  for (const registration of host.registeredFormulas) {
    const additionalContexts = buildFormulaContexts(host, registration.formulaField);
    const evaluationContext = foundry.utils.mergeObject(
      thisObject,
      foundry.utils.expandObject(updateData),
      { inplace: false }
    ) as EvaluationDocument;
    updateData[registration.impactedField] = registration.evaluate(evaluationContext, additionalContexts);
  }
}

/**
 * Evaluate registered formulas for a document being created (uses source data).
 * Returns the source update object to pass to `updateSource()`.
 */
function evaluateRegisteredFormulasForCreate (host: FormulaRegistrationHost): Record<string, unknown> | null {
  const nameFormula = host.system?.nameFormula?.formula;
  if (!nameFormula) return null;

  const thisObject = host.toObject(false) as Record<string, unknown>;
  thisObject.documentName = host.documentName;
  thisObject.type = host.type;

  const sourceUpdate: Record<string, unknown> = {};
  for (const registration of host.registeredFormulas) {
    const additionalContexts = buildFormulaContexts(host, registration.formulaField);
    const evaluationContext = foundry.utils.mergeObject(
      thisObject,
      foundry.utils.expandObject(sourceUpdate),
      { inplace: false }
    ) as EvaluationDocument;
    sourceUpdate[registration.impactedField] = registration.evaluate(evaluationContext, additionalContexts);
  }

  return sourceUpdate;
}

/**
 * Build additional formula context POJOs for a specific formula field.
 * Walks the schema to find the FormulaField and resolves its `formulaContexts` declarations.
 */
function buildFormulaContexts (host: FormulaRegistrationHost, formulaFieldPath: string): Record<string, EvaluationDocument> {
  const contexts: Record<string, EvaluationDocument> = {};
  const systemModel = host.system;
  if (!systemModel?.schema) return contexts;

  const fieldPath = formulaFieldPath.replace(/^system\./, '');
  let currentField: any = systemModel.schema;
  for (const part of fieldPath.split('.')) {
    currentField = currentField?.fields?.[part];
    if (!currentField) return contexts;
  }

  const declarations = currentField?.formulaContexts ?? [];
  if (!declarations?.length) return contexts;

  for (const decl of declarations) {
    if (!decl.resolvePath) continue;
    let current: any = host;
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

export {
  buildFormulaContexts,
  createDefaultNameRegistrations,
  evaluateRegisteredFormulas,
  evaluateRegisteredFormulasForCreate,
};

export type {
  FormulaRegistrationHost,
};
