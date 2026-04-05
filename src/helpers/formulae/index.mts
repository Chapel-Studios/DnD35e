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
import FamiliarDropdown from '../../vue/components/FamiliarDropdown.vue';
import type {
  ContextDocumentType,
  DocumentContext,
  NonNullDocumentContext,
} from './registry.mjs';
import {
  buildContextFromFormula,
  buildDocumentFamiliar,
  buildMergedFamiliarContext,
  familiarSchemaRegistry,
  getFamiliarBuilder,
  registerFamiliarSchema,
} from './registry.mjs';
import type { TargetContexts } from './registry.mjs';
import { DOCUMENT_LEVEL_ASPECTS, gatherAspectsFromSchema } from './schemaWalker.mjs';
import type { FamiliarKeyDownResult, UseFamiliarOptions } from './useFamiliar.mjs';
import { measureTextOffset, useFamiliar } from './useFamiliar.mjs';
import type {
  AspectGroup,
  AutocompleteOption,
  EditorViewMode,
  FamiliarContext,
  FamiliarSchema,
  FieldAspect,
  FormulaContextBinding,
  FormulaContextDeclaration,
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
  filterExcludedFields,
  findAspectByAccessPath,
  getAutocompleteOptions,
  getCaretCoordinates,
  getNestedValue,
  getPropertyValue,
  getTokenAtPosition,
  getVariableTokenIndex,
  getVariableTokens,
  insertAtCursor,
  mergeAspectGroups,
  nameToFormulaData,
  parseFormula,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  validateFormula,
} from './utils.mjs';
import type { AspectLookupResult, GetAutocompleteOptionsConfig } from './utils.mjs';

export {
  buildContextFromFormula,
  buildDocumentDataMap,
  buildDocumentFamiliar,
  buildMergedFamiliarContext,
  DOCUMENT_LEVEL_ASPECTS,
  ensureNameFormula,
  extractVariableAtPosition,
  extractVariables,
  familiarSchemaRegistry,
  FamiliarDropdown,
  fieldAspect,
  filterExcludedFields,
  findAspectByAccessPath,
  FormulaData,
  getFamiliarBuilder,
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
  measureTextOffset,
  mergeAspectGroups,
  nameToFormulaData,
  parseFormula,
  registerFamiliarSchema,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  UNIDENTIFIED,
  useFamiliar,
  validateFormula,
};

export type {
  AspectGroup,
  AspectLookupResult,
  AutocompleteOption,
  ContextDocumentType,
  DocumentContext,
  EditorViewMode,
  FamiliarContext,
  FamiliarKeyDownResult,
  FamiliarSchema,
  FieldAspect,
  FormulaContextBinding,
  FormulaContextDeclaration,
  FormulaDataSource,
  FormulaFieldData,
  FormulaFieldMeta,
  FormulaFieldOptions,
  FormulaFormGroupProps,
  FormulaToken,
  FormulaVariable,
  GetAutocompleteOptionsConfig,
  NonNullDocumentContext,
  TargetContexts,
  UseFamiliarOptions,
  ValidationError,
};