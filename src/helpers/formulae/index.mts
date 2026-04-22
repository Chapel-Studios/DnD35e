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

import FamiliarDropdown from '../../vue/components/FamiliarDropdown.vue';
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
import type { TargetContexts } from './registry.mjs';
import {
  buildContextFromFormula,
  buildDocumentFamiliar,
  buildMergedFamiliarContext,
  familiarSchemaRegistry,
  getFamiliarBuilder,
  registerFamiliarSchema,
} from './registry.mjs';
import { DOCUMENT_LEVEL_ASPECTS, gatherAspectsFromSchema } from './schemaWalker.mjs';
import type {
  AspectGroup,
  AutocompleteOption,
  DisplayMode,
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
  ViewMode,
} from './types.mjs';
import { EDIT, isFieldAspect, PLAY, TRUE } from './types.mjs';
import type { FamiliarKeyDownResult, UseFamiliarOptions } from './useFamiliar.mjs';
import { measureTextOffset, useFamiliar } from './useFamiliar.mjs';
import type { FamiliarOverlayInputApi, OverlayAutocompleteArgs } from './useFamiliarOverlayInput.mjs';
import { useFamiliarOverlayInput } from './useFamiliarOverlayInput.mjs';
import type { AspectLookupResult, GetAutocompleteOptionsConfig } from './utils.mjs';
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
  renderFormulaDisplayHTML,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  validateFormula,
} from './utils.mjs';

export {
  buildContextFromFormula,
  buildDocumentDataMap,
  buildDocumentFamiliar,
  buildMergedFamiliarContext,
  DOCUMENT_LEVEL_ASPECTS,
  EDIT,
  ensureNameFormula,
  extractVariableAtPosition,
  extractVariables,
  FamiliarDropdown,
  familiarSchemaRegistry,
  fieldAspect,
  filterExcludedFields,
  findAspectByAccessPath,
  FormulaData,
  FormulaField,
  FormulaFormGroup,
  gatherAspectsFromSchema,
  getAutocompleteOptions,
  getCaretCoordinates,
  getFamiliarBuilder,
  getNestedValue,
  getPropertyValue,
  getTokenAtPosition,
  getVariableTokenIndex,
  getVariableTokens,
  insertAtCursor,
  isFieldAspect,
  measureTextOffset,
  mergeAspectGroups,
  nameToFormulaData,
  parseFormula,
  PLAY,
  registerFamiliarSchema,
  renderFormulaDisplayHTML,
  renderFormulaHTML,
  resolveFormula,
  resolveFormulaField,
  TRUE,
  useFamiliar,
  useFamiliarOverlayInput,
  validateFormula,
};

export type {
  AspectGroup,
  AspectLookupResult,
  AutocompleteOption,
  ContextDocumentType,
  DisplayMode,
  DocumentContext,
  FamiliarContext,
  FamiliarKeyDownResult,
  FamiliarOverlayInputApi,
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
  OverlayAutocompleteArgs,
  TargetContexts,
  UseFamiliarOptions,
  ValidationError,
  ViewMode,
};