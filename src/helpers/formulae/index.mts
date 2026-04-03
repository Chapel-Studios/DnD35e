import type { ItemDnd35e } from '@items/baseItem/index.mjs';

type Formula = string | null | undefined;

const replaceDataAttribute = <TContext extends ItemDnd35e> (formula: Formula, context: TContext): string => {
  if (!formula) return context.name;

  return formula.replace(/@([\w.]+)/g, (_, path) => {
    const value = foundry.utils.getProperty(context, path) as string | number | undefined;
    return typeof value !== 'undefined' ? String(value) : `@${path}`;
  });
};

export { replaceDataAttribute };

import type { FormulaDataSource } from './FormulaData.mjs';
import { FormulaData } from './FormulaData.mjs';
import type { FormulaFieldOptions } from './FormulaField.mjs';
import { FormulaField } from './FormulaField.mjs';
import FormulaFormGroup from './FormulaFormGroup.vue';
import type {
  ContextDocumentType,
  DocumentContext,
  NonNullDocumentContext,
} from './registry.mjs';
import {
  buildContextFromFormula,
  buildDocumentFamiliar,
  familiarSchemaRegistry,
  registerFamiliarSchema,
} from './registry.mjs';
import { DOCUMENT_LEVEL_ASPECTS, gatherAspectsFromSchema } from './schemaWalker.mjs';
import type {
  AspectGroup,
  AutocompleteOption,
  EditorViewMode,
  FamiliarContext,
  FamiliarSchema,
  FieldAspect,
  FormulaContextBinding,
  FormulaFieldData,
  FormulaFieldMeta,
  FormulaFormGroupProps,
  FormulaToken,
  FormulaVariable,
  ValidationError,
} from './types.mjs';
import { IDENTIFIED, isFieldAspect, UNIDENTIFIED } from './types.mjs';
import {
  buildDocumentDataMap,
  ensureNameFormula,
  extractVariableAtPosition,
  extractVariables,
  fieldAspect,
  getAutocompleteOptions,
  getCaretCoordinates,
  getNestedValue,
  getPropertyValue,
  getTokenAtPosition,
  getVariableTokenIndex,
  getVariableTokens,
  insertAtCursor,
  nameToFormulaData,
  parseFormula,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  validateFormula,
} from './utils.mjs';

export {
  buildContextFromFormula,
  buildDocumentDataMap,
  buildDocumentFamiliar,
  DOCUMENT_LEVEL_ASPECTS,
  ensureNameFormula,
  extractVariableAtPosition,
  extractVariables,
  familiarSchemaRegistry,
  fieldAspect,
  FormulaData,
  FormulaField,
  FormulaFormGroup,
  gatherAspectsFromSchema,
  getAutocompleteOptions,
  getCaretCoordinates,
  getNestedValue,
  getPropertyValue,
  getTokenAtPosition,
  getVariableTokenIndex,
  getVariableTokens,
  IDENTIFIED,
  insertAtCursor,
  isFieldAspect,
  nameToFormulaData,
  parseFormula,
  registerFamiliarSchema,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  UNIDENTIFIED,
  validateFormula,
};

export type {
  AspectGroup,
  AutocompleteOption,
  ContextDocumentType,
  DocumentContext,
  EditorViewMode,
  FamiliarContext,
  FamiliarSchema,
  FieldAspect,
  FormulaContextBinding,
  FormulaDataSource,
  FormulaFieldData,
  FormulaFieldMeta,
  FormulaFieldOptions,
  FormulaFormGroupProps,
  FormulaToken,
  FormulaVariable,
  NonNullDocumentContext,
  ValidationError,
};