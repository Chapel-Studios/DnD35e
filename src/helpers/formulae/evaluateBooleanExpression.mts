/**
 * evaluateBooleanExpression — small, purpose-built comparison/logical expression
 * evaluator for boolean-typed formulas (§7.2a of Phase 7).
 *
 * Operates on an already-substituted formula string (all `#context.property`
 * tokens have been replaced with their literal values by `resolveFormula()`).
 * This is NOT a general JS `eval` and is distinct from `Roll.safeEval` (which
 * only handles dice-formula arithmetic, no comparison/logical operators).
 *
 * Supported grammar (standard precedence, lowest to highest):
 *   orExpr         := andExpr ( '||' andExpr )*
 *   andExpr        := notExpr ( '&&' notExpr )*
 *   notExpr        := '!' notExpr | comparison
 *   comparison     := additive ( ('>' | '<' | '>=' | '<=' | '==' | '!=') additive )?
 *   additive       := multiplicative ( ('+' | '-') multiplicative )*
 *   multiplicative := unary ( ('*' | '/') unary )*
 *   unary          := ('-' | '+') unary | primary
 *   primary        := '(' orExpr ')' | NUMBER | STRING | 'true' | 'false' | IDENT
 *
 * `IDENT` covers bareword literals — after substitution, a resolved string
 * value (e.g. a weapon name) appears unquoted in the formula text, so any
 * token that isn't a recognized literal/operator is treated as a string literal.
 *
 * Comparison operands may be arithmetic sub-expressions (e.g.
 * `#actor.hp.max / 2`) — `+`/`-`/`*`/`/` are evaluated with standard
 * precedence before the surrounding comparison is applied.
 *
 * @module
 */

type TokenType =
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

interface Token {
  type: TokenType;
  value: string;
}

const TOKEN_REGEX = /\s*(?:(>=|<=|==|!=|&&|\|\||[()!<>+*/-])|('[^']*'|"[^"]*")|(\d+(?:\.\d+)?)|([^\s()!<>=&|]+))/g;

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(expression)) !== null) {
    const [, operator, quoted, number, word] = match;
    if (operator) {
      tokens.push({ type: operator as TokenType, value: operator });
    } else if (quoted) {
      tokens.push({ type: 'string', value: quoted.slice(1, -1) });
    } else if (number) {
      tokens.push({ type: 'number', value: number });
    } else if (word) {
      if (word === 'true' || word === 'false') {
        tokens.push({ type: 'boolean', value: word });
      } else {
        tokens.push({ type: 'ident', value: word });
      }
    } else {
      // Only whitespace matched (or nothing) — advance to avoid an infinite loop
      if (TOKEN_REGEX.lastIndex === match.index) TOKEN_REGEX.lastIndex++;
    }
  }

  return tokens;
}

type LiteralValue = number | string | boolean;

class ExpressionParser {
  private readonly tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private consume(expected?: TokenType): Token {
    const token = this.tokens[this.position];
    if (!token) throw new Error('Unexpected end of expression');
    if (expected && token.type !== expected) {
      throw new Error(`Expected '${expected}' but got '${token.value}'`);
    }
    this.position++;
    return token;
  }

  parse(): boolean {
    const result = this.parseOr();
    if (this.position < this.tokens.length) {
      throw new Error(`Unexpected token '${this.peek()?.value}'`);
    }
    return this.toBoolean(result);
  }

  private parseOr(): LiteralValue {
    let left = this.parseAnd();
    while (this.peek()?.type === '||') {
      this.consume('||');
      const right = this.parseAnd();
      left = this.toBoolean(left) || this.toBoolean(right);
    }
    return left;
  }

  private parseAnd(): LiteralValue {
    let left = this.parseNot();
    while (this.peek()?.type === '&&') {
      this.consume('&&');
      const right = this.parseNot();
      left = this.toBoolean(left) && this.toBoolean(right);
    }
    return left;
  }

  private parseNot(): LiteralValue {
    if (this.peek()?.type === '!') {
      this.consume('!');
      return !this.toBoolean(this.parseNot());
    }
    return this.parseComparison();
  }

  private parseComparison(): LiteralValue {
    const left = this.parseAdditive();
    const operator = this.peek()?.type;
    if (operator && ['>', '<', '>=', '<=', '==', '!='].includes(operator)) {
      this.consume();
      const right = this.parseAdditive();
      return this.compare(left, operator, right);
    }
    return left;
  }

  private parseAdditive(): LiteralValue {
    let left = this.parseMultiplicative();
    while (this.peek()?.type === '+' || this.peek()?.type === '-') {
      const operator = this.consume().type;
      const right = this.parseMultiplicative();
      left = this.arithmetic(left, operator, right);
    }
    return left;
  }

  private parseMultiplicative(): LiteralValue {
    let left = this.parseUnary();
    while (this.peek()?.type === '*' || this.peek()?.type === '/') {
      const operator = this.consume().type;
      const right = this.parseUnary();
      left = this.arithmetic(left, operator, right);
    }
    return left;
  }

  private parseUnary(): LiteralValue {
    if (this.peek()?.type === '-') {
      this.consume('-');
      const value = this.parseUnary();
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) throw new Error(`Unary '-' requires a numeric operand (got '${value}')`);
      return -num;
    }
    if (this.peek()?.type === '+') {
      this.consume('+');
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private arithmetic(left: LiteralValue, operator: string, right: LiteralValue): number {
    const leftNum = typeof left === 'number' ? left : Number(left);
    const rightNum = typeof right === 'number' ? right : Number(right);
    if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) {
      throw new Error(`Operator '${operator}' requires numeric operands (got '${left}', '${right}')`);
    }

    switch (operator) {
      case '+': return leftNum + rightNum;
      case '-': return leftNum - rightNum;
      case '*': return leftNum * rightNum;
      case '/': return leftNum / rightNum;
      default: throw new Error(`Unknown operator '${operator}'`);
    }
  }

  private parsePrimary(): LiteralValue {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of expression');

    if (token.type === '(') {
      this.consume('(');
      const value = this.parseOr();
      this.consume(')');
      return value;
    }
    if (token.type === '!') {
      return this.parseNot();
    }
    if (token.type === 'number') {
      this.consume();
      return Number(token.value);
    }
    if (token.type === 'boolean') {
      this.consume();
      return token.value === 'true';
    }
    if (token.type === 'string' || token.type === 'ident') {
      this.consume();
      return token.value;
    }
    throw new Error(`Unexpected token '${token.value}'`);
  }

  private compare(left: LiteralValue, operator: string, right: LiteralValue): boolean {
    if (operator === '==') return left === right || String(left) === String(right);
    if (operator === '!=') return !(left === right || String(left) === String(right));

    // Ordering operators require numeric operands
    const leftNum = typeof left === 'number' ? left : Number(left);
    const rightNum = typeof right === 'number' ? right : Number(right);
    if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) {
      throw new Error(`Operator '${operator}' requires numeric operands (got '${left}', '${right}')`);
    }

    switch (operator) {
      case '>': return leftNum > rightNum;
      case '<': return leftNum < rightNum;
      case '>=': return leftNum >= rightNum;
      case '<=': return leftNum <= rightNum;
      default: throw new Error(`Unknown operator '${operator}'`);
    }
  }

  private toBoolean(value: LiteralValue): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value.length > 0;
  }
}

/**
 * Evaluate a boolean expression over already-substituted literals.
 * Throws a descriptive Error on invalid syntax — callers should catch and
 * fall back / surface a validation error rather than letting this throw
 * during derived-data preparation.
 */
export function evaluateBooleanExpression(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed) throw new Error('Empty boolean expression');

  const tokens = tokenize(trimmed);
  if (!tokens.length) throw new Error('Empty boolean expression');

  const parser = new ExpressionParser(tokens);
  return parser.parse();
}
