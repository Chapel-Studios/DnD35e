import { expect } from 'vitest';

/**
 * Reusable factory for DataModel schema inspection.
 *
 * Each call to `createSchemaTester(Model)` walks the result of
 * `Model.defineSchema()` and returns its own self-contained tester —
 * no shared state, safe to use in parallel test files.
 *
 * The factory does NOT instantiate the DataModel; only schema *shape* is
 * inspected. Runtime behavior (defaults applied on construction, validators
 * rejecting bad input) is verified in Playwright E2E against a real
 * Foundry instance.
 *
 * Future phases (Actor, Race, Class, Feat, Spell, …) reuse this helper
 * unchanged. Add new assertion methods here when a model needs a check
 * that no existing assertion can express.
 */

type AnyField = foundry.data.fields.DataField;
type FieldCtor = new (...args: any[]) => AnyField;

interface DataModelLike {
  defineSchema (): Record<string, AnyField>;
}

interface SchemaTester {
  /** Raw schema object returned by `Model.defineSchema()`. */
  readonly schema: Record<string, AnyField>;
  /** All top-level field keys. */
  fieldKeys (): string[];
  /** Returns the field at a dotted path, or undefined. */
  field (path: string): AnyField | undefined;
  /** Asserts a field exists at the path; returns it. */
  assertField (path: string): AnyField;
  /** Asserts a field is an instance of the given DataField subclass. */
  assertFieldType (path: string, ExpectedCtor: FieldCtor): AnyField;
  /** Asserts the field's declared `initial` value (or function-derived default). */
  assertDefault (path: string, expected: unknown): void;
  /** Asserts the field has a custom `validate` function attached. */
  assertHasValidator (path: string): void;
  /** Asserts the field's `choices` option contains every entry in `expected`. */
  assertChoices (path: string, expected: readonly unknown[]): void;
}

/**
 * Walk a dotted path through a schema object, descending into `SchemaField.fields`
 * (and similar `.fields`-bearing wrappers like `Dnd35eSectionField`).
 */
function walkSchema (
  schema: Record<string, AnyField>,
  path: string
): AnyField | undefined {
  if (!path) return undefined;
  const parts = path.split('.');
  let current: any = schema[parts[0]];
  for (let i = 1; i < parts.length; i++) {
    if (!current) return undefined;
    const inner = current.fields as Record<string, AnyField> | undefined;
    if (!inner || typeof inner !== 'object') return undefined;
    current = inner[parts[i]];
  }
  return current as AnyField | undefined;
}

function createSchemaTester (Model: DataModelLike): SchemaTester {
  const schema = Model.defineSchema();

  const tester: SchemaTester = {
    schema,

    fieldKeys (): string[] {
      return Object.keys(schema);
    },

    field (path: string): AnyField | undefined {
      return walkSchema(schema, path);
    },

    assertField (path: string): AnyField {
      const f = walkSchema(schema, path);
      expect(f, `Expected schema field at "${path}"`).toBeDefined();
      return f as AnyField;
    },

    assertFieldType (path: string, ExpectedCtor: FieldCtor): AnyField {
      const f = tester.assertField(path);
      expect(f, `Expected field at "${path}" to be ${ExpectedCtor.name}`).toBeInstanceOf(ExpectedCtor);
      return f;
    },

    assertDefault (path: string, expected: unknown): void {
      const f = tester.assertField(path);
      const initial = (f as any).options?.initial;
      const actual = typeof initial === 'function' ? initial() : initial;
      expect(actual).toEqual(expected);
    },

    assertHasValidator (path: string): void {
      const f = tester.assertField(path);
      const v = (f as any).options?.validate;
      expect(typeof v, `Expected field at "${path}" to have a custom validate function`).toBe('function');
    },

    assertChoices (path: string, expected: readonly unknown[]): void {
      const f = tester.assertField(path);
      const choices = (f as any).options?.choices;
      expect(choices, `Expected field at "${path}" to declare choices`).toBeDefined();
      const arr = Array.isArray(choices) ? choices : Object.keys(choices as Record<string, unknown>);
      for (const c of expected) {
        expect(arr).toContain(c);
      }
    },
  };

  return tester;
}

export { createSchemaTester };
export type { DataModelLike, SchemaTester };
