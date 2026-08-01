/**
 * FormulaResolver — shared balanced-paren / top-level-arg-splitting helpers.
 *
 * Used by every `$name(...)` block-scanning grammar (`FormulaResolver.conditionalGrammar.mts`,
 * `FormulaResolver.functionGrammar.mts`) so the escaping/nesting rules stay identical
 * across all of them. Pure, dependency-free string utilities — no formula-domain logic.
 *
 * @module
 */

/**
 * Find the index of the closing paren matching the '(' at `openIndex`.
 * Returns -1 if the parens never balance out.
 *
 * A backslash-escaped paren (`\(` or `\)`) doesn't count toward depth — it's
 * skipped entirely (along with its backslash) so literal/unbalanced parens can
 * appear inside a value without breaking the scan.
 */
export function findMatchingParen(text: string, openIndex: number): number {
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
 * Find every index in `text` holding an unmatched `(` or `)` — i.e. a paren
 * with no corresponding partner anywhere in the string. Backslash-escaped
 * parens (`\(`/`\)`) are skipped entirely, same convention as
 * `findMatchingParen`.
 *
 * This is a *generic*, whole-string balance check — independent of any
 * specific `$conditional(...)`/`$function(...)` keyword block. A stray paren
 * sitting outside every recognized block (e.g. a leftover `(` typed before
 * a well-formed `$conditional(...)`) never surfaces via `findConditionalBlocks`/
 * `findFunctionBlocks` (those only report errors for parens *within* their
 * own keyword's span) — `validateFormula` calls this separately so that kind
 * of formula still produces a real validation error instead of only the
 * purely-visual per-character paren highlighting in `renderFormulaHTML`.
 */
export function findUnbalancedParenIndices(text: string): number[] {
  const unmatched: number[] = [];
  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++; // skip the escaped character entirely — not syntax-significant
      continue;
    }
    if (ch === '(') {
      stack.push(i);
    } else if (ch === ')') {
      if (stack.length > 0) stack.pop();
      else unmatched.push(i);
    }
  }
  unmatched.push(...stack);
  return unmatched.sort((a, b) => a - b);
}

/**
 * Split text on top-level commas only, respecting nested parens.
 * Backslash-escaped characters (`\(`, `\)`, `\,`, etc.) are passed through
 * untouched and never treated as syntax (paren depth or a split point).
 */
export function splitTopLevelArgs(argsText: string): string[] {
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
