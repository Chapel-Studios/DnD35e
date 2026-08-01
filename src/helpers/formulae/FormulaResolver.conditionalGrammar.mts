/**
 * FormulaResolver — `$conditional(when()else())` grammar.
 *
 * Parses and resolves `$conditional(when(cond, value) ... else(default))`
 * blocks: a flat rule-list conditional syntax layered on top of the plain
 * `#context.property` substitution grammar. `$` is a distinct sigil from
 * `#` on purpose — `#` always means "context/property data reference";
 * `$` marks a control-flow/keyword construct, so `$conditional(...)` is
 * never mistaken for (or extracted as) a `#`-style variable token in the
 * first place. `resolveConditionalFormula` takes its sub-formula resolver
 * and condition evaluator as parameters (rather than importing them) to
 * keep this module fully decoupled from both the aspect-resolution and
 * boolean-grammar modules.
 *
 * Split out from FormulaResolver.mts to keep each grammar self-contained.
 * Consumed by FormulaResolver.mts as static methods.
 *
 * @module
 */
import { findMatchingParen, splitTopLevelArgs } from './FormulaResolver.parenUtils.mjs';
import type { ConditionalBlock, ConditionalBlockError, ConditionalWhenClause } from './FormulaResolver.types.mjs';

const CONDITIONAL_OPEN_REGEX = /(?<!\\)\$conditional\s*\(/gi;
const CLAUSE_KEYWORD_REGEX = /(?<![\p{L}\p{N}_])(when|else)\s*\(/giu;

interface RawClause {
  keyword: 'when' | 'else';
  argsText: string;
}

/**
 * Scan `innerText` (the content between `$conditional(`'s parens) for
 * `when(...)`/`else(...)` clauses. Nested clauses (e.g. inside a value that
 * contains its own `$conditional(...)`) are skipped over automatically since
 * each match consumes through its own balanced closing paren before resuming
 * the search.
 */
function findClauses(innerText: string): { clauses: RawClause[]; error?: ConditionalBlockError } {
  const clauses: RawClause[] = [];
  const regex = new RegExp(CLAUSE_KEYWORD_REGEX.source, 'giu');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(innerText)) !== null) {
    const keyword = match[1].toLowerCase() as 'when' | 'else';
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(innerText, openParenIndex);

    if (closeParenIndex === -1) {
      return { clauses, error: 'unbalancedParens' };
    }

    clauses.push({ keyword, argsText: innerText.substring(openParenIndex + 1, closeParenIndex) });
    regex.lastIndex = closeParenIndex + 1;
  }

  return { clauses };
}

/**
 * Find all `$conditional(...)` blocks in a formula string, parsing each into
 * its `when`/`else` clauses. Malformed blocks are still returned (with
 * `.error` set) so validation and resolution can handle them explicitly
 * rather than throwing.
 */
export function findConditionalBlocks(formula: string): ConditionalBlock[] {
  const blocks: ConditionalBlock[] = [];
  const openRegex = new RegExp(CONDITIONAL_OPEN_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = openRegex.exec(formula)) !== null) {
    const startIndex = match.index;
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(formula, openParenIndex);

    if (closeParenIndex === -1) {
      blocks.push({
        raw: formula.substring(startIndex),
        startIndex,
        endIndex: formula.length,
        whenClauses: [],
        elseValue: null,
        error: 'unbalancedParens',
      });
      break;
    }

    const innerText = formula.substring(openParenIndex + 1, closeParenIndex);
    const { clauses, error: clauseError } = findClauses(innerText);

    const whenClauses: ConditionalWhenClause[] = [];
    let elseValue: string | null = null;
    let elseCount = 0;
    let shapeError: ConditionalBlockError | undefined;

    for (const clause of clauses) {
      const args = splitTopLevelArgs(clause.argsText);
      if (clause.keyword === 'when') {
        if (args.length !== 2) {
          shapeError ??= 'whenArgCount';
          continue;
        }
        whenClauses.push({ condition: args[0], value: args[1] });
      } else {
        elseCount++;
        if (args.length !== 1) {
          shapeError ??= 'elseArgCount';
          continue;
        }
        elseValue = args[0];
      }
    }

    let error = clauseError ?? shapeError;
    if (!error && elseCount === 0) error = 'missingElse';
    if (!error && elseCount > 1) error = 'multipleElse';

    blocks.push({
      raw: formula.substring(startIndex, closeParenIndex + 1),
      startIndex,
      endIndex: closeParenIndex + 1,
      whenClauses,
      elseValue,
      ...(error && { error }),
    });

    openRegex.lastIndex = closeParenIndex + 1;
  }

  return blocks;
}

/**
 * Resolve all `$conditional(...)` blocks in `formula`, replacing each with
 * its winning branch's (still-unresolved) text. Ordinary `#context.property`
 * tokens are left untouched — the caller is expected to run its own
 * substitution pass over the result afterward.
 *
 * @param formula The formula text to scan for conditional blocks
 * @param resolveSubFormula Fully resolves an arbitrary sub-formula string
 *   (used to resolve a `when()` condition to a literal before evaluating it)
 * @param evaluateCondition Evaluates a fully-resolved condition string to a boolean
 */
export function resolveConditionalFormula(
  formula: string,
  resolveSubFormula: (text: string) => string,
  evaluateCondition: (resolvedCondition: string) => boolean
): string {
  const blocks = findConditionalBlocks(formula);
  if (blocks.length === 0) return formula;

  let result = formula;

  // Process in reverse order so earlier blocks' indices stay valid as we splice.
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    // Malformed block — leave raw/unresolved rather than guessing.
    if (block.error) continue;

    let winningValue = block.elseValue ?? '';
    for (const clause of block.whenClauses) {
      const resolvedCondition = resolveSubFormula(clause.condition);
      let isTrue = false;
      try {
        isTrue = evaluateCondition(resolvedCondition);
      } catch {
        isTrue = false;
      }
      if (isTrue) {
        winningValue = clause.value;
        break;
      }
    }

    // Recursively resolve any nested $conditional(...) block within the winning
    // branch — ordinary tokens are left for the caller's own substitution pass.
    const resolvedWinningValue = resolveConditionalFormula(
      winningValue,
      resolveSubFormula,
      evaluateCondition
    );

    result = result.substring(0, block.startIndex) + resolvedWinningValue + result.substring(block.endIndex);
  }

  return result;
}
