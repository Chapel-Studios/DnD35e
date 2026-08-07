/**
 * FormulaResolver — consolidated FormulaFamiliar resolution engine.
 *
 * Public facade over the split grammar/resolution modules — each static
 * method here is a direct reference to a plain function in one of:
 * - `FormulaResolver.aspectResolution.mts` — parsing, variable substitution, aspect lookup
 * - `FormulaResolver.validation.mts` — formula & type validation
 * - `FormulaResolver.booleanGrammar.mts` — boolean comparison/logical grammar
 * - `FormulaResolver.conditionalGrammar.mts` — `$conditional(when()else())` grammar
 *
 * None of the underlying functions use `this`, so every static method here
 * remains safe to destructure and call standalone (e.g.
 * `const { evaluateBooleanExpression } = FormulaResolver;`).
 *
 * Editor-only concerns (HTML highlighting, autocomplete, localized display,
 * schema→AspectGroup derivation, context/document assembly) live elsewhere —
 * see `utils.mts`, `schemaWalker.mts`, `registry.mts` — and consume this
 * class's static methods rather than duplicating resolution logic.
 *
 * @module
 */
import {
  extractVariables,
  fieldAspect,
  filterExcludedFields,
  findAspectByAccessPath,
  getFieldAspect,
  getNestedValue,
  getPropertyValue,
  mergeAspectGroups,
  parseFormula,
  parseVariableSegments,
  resolveFormula,
} from './FormulaResolver.aspectResolution.mjs';
import { evaluateBooleanExpression } from './FormulaResolver.booleanGrammar.mjs';
import {
  findConditionalBlocks,
  resolveConditionalFormula,
} from './FormulaResolver.conditionalGrammar.mjs';
import { findFunctionBlocks, resolveFunctionBlocks } from './FormulaResolver.functionGrammar.mjs';
import { validateFormula, validateFormulaType } from './FormulaResolver.validation.mjs';

export class FormulaResolver {
  // Aspect resolution — parsing, variable substitution, aspect lookup
  static filterExcludedFields = filterExcludedFields;
  static parseFormula = parseFormula;
  static parseVariableSegments = parseVariableSegments;
  static extractVariables = extractVariables;
  static resolveFormula = resolveFormula;
  static getNestedValue = getNestedValue;
  static fieldAspect = fieldAspect;
  static getFieldAspect = getFieldAspect;
  static getPropertyValue = getPropertyValue;
  static findAspectByAccessPath = findAspectByAccessPath;
  static mergeAspectGroups = mergeAspectGroups;

  // Validation
  static validateFormula = validateFormula;
  static validateFormulaType = validateFormulaType;

  // Boolean comparison/logical grammar
  static evaluateBooleanExpression = evaluateBooleanExpression;

  // $conditional(when()else()) grammar
  static findConditionalBlocks = findConditionalBlocks;
  static resolveConditionalFormula = resolveConditionalFormula;

  // $contains()/$find()/$any()/$count()/$stringContains() array & string function grammar
  static findFunctionBlocks = findFunctionBlocks;
  static resolveFunctionBlocks = resolveFunctionBlocks;
}

export type { FunctionGrammarHelpers } from './FormulaResolver.functionGrammar.mjs';
export type {
  AspectLookupResult,
  ConditionalBlock,
  ConditionalBlockError,
  ConditionalWhenClause,
  FunctionBlock,
  FunctionBlockError,
  FunctionName,
} from './FormulaResolver.types.mjs';
