/**
 * Conditional Formula Syntax — `#conditional(when(cond, value) ... else(default))`
 *
 * A flat rule-list conditional embedded directly in formula text, e.g.:
 *
 *   #conditional(when(#self.hp.value <= 0, 0) when(#self.isFlanked, 1d6+#self.sneakAttackDice) else(2))d6
 *
 * - `when(condition, value)` — zero or more, evaluated in left-to-right source order;
 *   the first clause whose condition is true supplies the result.
 * - `else(value)` — required exactly once, may appear anywhere among the clauses;
 *   supplies the result when no `when()` matches.
 * - Clause separators are don't-care — `when(...)`/`else(...)` are self-delimiting via
 *   their own balanced parens, so commas, whitespace, or nothing between clauses are
 *   all equivalent.
 * - `#conditional(...)` behaves as a single inline token — surrounding literal text
 *   and other `#context.property` tokens are untouched.
 * - Matching is lenient: `#conditional`/`when`/`else` keywords are case-insensitive,
 *   with optional whitespace before `(`.
 * - `\(` and `\)` escape a literal parenthesis (same backslash convention as `\#`
 *   for a literal `#`) — an escaped paren doesn't count toward balanced-paren
 *   depth tracking, so a value can contain unbalanced literal parens, and
 *   `\#conditional(`/escaping the paren right after `when`/`else` prevents that
 *   occurrence from being parsed as the syntax construct at all.
 * - `\,` escapes a literal comma inside a `when(...)`/`else(...)` argument (e.g.
 *   a quoted string being compared against, `when(#self.name == "\,", 500)`) —
 *   without it, the comma would be mistaken for the top-level separator between
 *   that clause's own arguments (e.g. condition vs. value).
 *
 * See `docs/migration-plan/poc/phase-07-roll-formulas.md` §7.10 for the full design.
 *
 * @module
 */

/** A single `when(condition, value)` clause. */
export interface ConditionalWhenClause {
  condition: string;
  value: string;
}

/** A reason a `#conditional(...)` block failed to parse cleanly. */
export type ConditionalBlockError =
  | 'unbalancedParens'
  | 'missingElse'
  | 'multipleElse'
  | 'whenArgCount'
  | 'elseArgCount';

/** A single `#conditional(...)` block found within a formula string. */
export interface ConditionalBlock {
  /** Full "#conditional(...)" span exactly as it appeared in the source. */
  raw: string;
  startIndex: number;
  endIndex: number;
  whenClauses: ConditionalWhenClause[];
  elseValue: string | null;
  /** Present when the block is malformed — resolution leaves it raw/unresolved. */
  error?: ConditionalBlockError;
}

const CONDITIONAL_OPEN_REGEX = /(?<!\\)#conditional\s*\(/gi;
const CLAUSE_KEYWORD_REGEX = /(?<![\p{L}\p{N}_])(when|else)\s*\(/giu;

/**
 * Find the index of the closing paren matching the '(' at `openIndex`.
 * Returns -1 if the parens never balance out.
 *
 * A backslash-escaped paren (`\(` or `\)`) doesn't count toward depth — it's
 * skipped entirely (along with its backslash) so literal/unbalanced parens can
 * appear inside a value without breaking the scan.
 */
function findMatchingParen(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++; // skip the escaped character entirely — not syntax-significant
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split text on top-level commas only, respecting nested parens.
 * Backslash-escaped characters (`\(`, `\)`, `\,`, etc.) are passed through
 * untouched and never treated as syntax (paren depth or a split point).
 */
function splitTopLevelArgs(argsText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < argsText.length; i++) {
    const ch = argsText[i];
    if (ch === '\\' && i + 1 < argsText.length) {
      current += ch + argsText[i + 1];
      i++;
      continue;
    }
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

interface RawClause {
  keyword: 'when' | 'else';
  argsText: string;
}

/**
 * Scan `innerText` (the content between `#conditional(`'s parens) for
 * `when(...)`/`else(...)` clauses. Nested clauses (e.g. inside a value that
 * contains its own `#conditional(...)`) are skipped over automatically since
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
 * Find all `#conditional(...)` blocks in a formula string, parsing each into
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
 * Resolve all `#conditional(...)` blocks in `formula`, replacing each with
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

    // Recursively resolve any nested #conditional(...) block within the winning
    // branch — ordinary tokens are left for the caller's own substitution pass.
    const resolvedWinningValue = resolveConditionalFormula(winningValue, resolveSubFormula, evaluateCondition);

    result = result.substring(0, block.startIndex) + resolvedWinningValue + result.substring(block.endIndex);
  }

  return result;
}

/**
 * True when `variable` (as produced by `extractVariables`) is the bare
 * `#conditional` keyword token immediately followed by `(` — i.e. it's being
 * used as this syntax construct, not as an actual (invalid) context reference.
 */
export function isConditionalKeywordToken(
  formula: string,
  variable: { context: string; path: string[]; endIndex: number }
): boolean {
  if (variable.context.toLowerCase() !== 'conditional' || variable.path.length !== 0) return false;
  return /^\s*\(/.test(formula.slice(variable.endIndex));
}
