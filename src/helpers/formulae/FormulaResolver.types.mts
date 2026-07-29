/**
 * FormulaResolver — shared type/interface declarations.
 *
 * Split out from FormulaResolver.mts to keep the resolver implementation file
 * focused on logic. Pure type declarations only — no runtime code.
 *
 * @module
 */
import type { FieldAspect } from './types.mjs';

/** Result of a reverse-lookup from a raw document path to the familiar tree. */
export interface AspectLookupResult {
  /** The FieldAspect that matched. */
  aspect: FieldAspect;
  /** The familiar tree path segments (e.g., ['hp', 'max']). */
  treePath: string[];
}

// ============================================================================
// Boolean grammar token types — used only by the private tokenizer/parser
// backing `FormulaResolver.evaluateBooleanExpression`.
// ============================================================================

export type TokenType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'ident'
  | '('
  | ')'
  | '&&'
  | '||'
  | '!'
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='
  | '+'
  | '-'
  | '*'
  | '/';

export interface Token {
  type: TokenType;
  value: string;
}

/** A resolved literal value produced while evaluating a boolean expression. */
export type LiteralValue = number | string | boolean;

// ============================================================================
// $conditional(when()else()) grammar types
// ============================================================================

/** A single `when(condition, value)` clause. */
export interface ConditionalWhenClause {
  condition: string;
  value: string;
}

/** A reason a `$conditional(...)` block failed to parse cleanly. */
export type ConditionalBlockError =
  | 'unbalancedParens'
  | 'missingElse'
  | 'multipleElse'
  | 'whenArgCount'
  | 'elseArgCount';

/** A single `$conditional(...)` block found within a formula string. */
export interface ConditionalBlock {
  /** Full "$conditional(...)" span exactly as it appeared in the source. */
  raw: string;
  startIndex: number;
  endIndex: number;
  whenClauses: ConditionalWhenClause[];
  elseValue: string | null;
  /** Present when the block is malformed — resolution leaves it raw/unresolved. */
  error?: ConditionalBlockError;
}
