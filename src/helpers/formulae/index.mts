import { ItemDnd35e } from '@items/baseItem/index.mjs';

type Formula = string | null | undefined;

const replaceDataAttribute = <TContext extends ItemDnd35e> (formula: Formula, context: TContext): string => {
  if (!formula) return context.name;

  return formula.replace(/@([\w.]+)/g, (_, path) => {
    const value = foundry.utils.getProperty(context, path) as string | number | undefined;
    return typeof value !== 'undefined' ? String(value) : `@${path}`;
  });
};

export { replaceDataAttribute };

import FormulaFormGroup from './FormulaFormGroup.vue';
import type {
  ContextDocumentType,
  DocumentContext,
  NonNullDocumentContext,
} from './registry.mjs';
import {
  buildContextFromFormula,
  decodeContextType,
  encodeContextType,
  getIntellisenseBuilder,
  hasIntellisenseSchema,
  intellisenseSchemaRegistry,
  registerIntellisenseSchema,
} from './registry.mjs';
import type {
  AutocompleteOption,
  FormulaFieldData,
  FormulaFormGroupProps,
  FormulaVariable,
  IntellisenseContext,
  IntellisenseObject,
  IntellisenseProperty,
  IntellisenseSchema,
  Token,
  ValidationError,
} from './types.mjs';
import { isIntellisenseProperty } from './types.mjs';
import {
  buildDocumentDataMap,
  ensureNameFormula,
  extractVariableAtPosition,
  extractVariables,
  getAutocompleteOptions,
  getCaretCoordinates,
  getNestedValue,
  getPropertyValue,
  getTokenAtPosition,
  getVariableTokenIndex,
  getVariableTokens,
  insertAtCursor,
  intellisenseProp,
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
  decodeContextType,
  encodeContextType,
  ensureNameFormula,
  extractVariableAtPosition,
  extractVariables,
  FormulaFormGroup,
  getAutocompleteOptions,
  getCaretCoordinates,
  getIntellisenseBuilder,
  getNestedValue,
  getPropertyValue,
  getTokenAtPosition,
  getVariableTokenIndex,
  getVariableTokens,
  hasIntellisenseSchema,
  insertAtCursor,
  intellisenseProp,
  intellisenseSchemaRegistry,
  isIntellisenseProperty,
  nameToFormulaData,
  parseFormula,
  registerIntellisenseSchema,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  validateFormula,
};

export type {
  AutocompleteOption,
  ContextDocumentType,
  DocumentContext,
  FormulaFieldData,
  FormulaFormGroupProps,
  FormulaVariable,
  IntellisenseContext,
  IntellisenseObject,
  IntellisenseProperty,
  IntellisenseSchema,
  NonNullDocumentContext,
  Token,
  ValidationError,
};