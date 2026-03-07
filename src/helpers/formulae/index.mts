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

// Re-export Vue component
export { default as FormulaFormGroup } from './FormulaFormGroup.vue';

// Re-export from registry
export {
  buildContextFromFormula,
  decodeContextType,
  encodeContextType,
  getIntellisenseBuilder,
  hasIntellisenseSchema,
  intellisenseSchemaRegistry,
  registerIntellisenseSchema,
} from './registry.mjs';
export type {
  ContextDocumentType,
  DocumentContext,
  NonNullDocumentContext,
} from './registry.mjs';

// Re-export from types
export type {
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
export { isIntellisenseProperty } from './types.mjs';

// Re-export from utils
export {
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
