/**
 * Vitest global setup. Stubs Foundry globals at the minimum level needed
 * for unit tests. Expand as new tests touch new surfaces.
 *
 * Philosophy: only stub what tests actually call. Do NOT pre-populate the
 * whole Foundry API. Story 1 ships placeholders only.
 */

import { vi } from 'vitest';

// --- game ----------------------------------------------------------------
const i18nLocalize = (key: string): string => key;
const i18nFormat = (key: string, _data?: Record<string, unknown>): string => key;

(globalThis as any).game = {
  user: { isGM: false },
  i18n: {
    localize: vi.fn(i18nLocalize),
    format: vi.fn(i18nFormat),
    has: vi.fn((_key: string) => false),
  },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
};

// --- foundry.utils -------------------------------------------------------
function getProperty (obj: any, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setProperty (obj: any, path: string, value: unknown): boolean {
  if (!path) return false;
  const parts = path.split('.');
  const last = parts.pop()!;
  const target = parts.reduce((acc, key) => {
    if (acc[key] == null) acc[key] = {};
    return acc[key];
  }, obj);
  target[last] = value;
  return true;
}

function mergeObject<T extends Record<string, any>> (
  target: T | undefined,
  source: Partial<T> = {}
): T {
  const output = (target ?? {}) as T;
  for (const [k, v] of Object.entries(source)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof output[k] === 'object' &&
      output[k] !== null
    ) {
      mergeObject(output[k], v as any);
    } else {
      (output as any)[k] = v;
    }
  }
  return output;
}

// Shared between the bare `ActiveEffect` global (used by e.g. EffectChangesList.vue's
// `ActiveEffect.CHANGE_TYPES`) and `foundry.documents.ActiveEffect` (used by
// ActorDnd35e.mts's `foundry.documents.ActiveEffect.CHANGE_PHASES`) — real Foundry exposes
// both as the same class, so the stub must too, to keep them consistent.
class ActiveEffectStub {
  static metadata = {};
  static CHANGE_PHASES: Record<string, { label: string; hint: string }> = {
    initial: { label: '', hint: '' },
    final: { label: '', hint: '' },
    post: { label: '', hint: '' },
  };
  static CHANGE_TYPES: Record<string, { label: string; defaultPriority?: number }> = {
    add: { label: 'EFFECT.CHANGE.TYPES.add', defaultPriority: 10 },
  };
  constructor (..._args: any[]) {}
  _onCreate (..._args: any[]): void {}
  _onDelete (..._args: any[]): void {}
  async _preCreate (..._args: any[]): Promise<boolean | void> { return true; }
  updateSource (..._args: any[]): void {}
  async update (..._args: any[]): Promise<this> { return this; }
}
(globalThis as any).ActiveEffect = ActiveEffectStub;

(globalThis as any).foundry = {
  utils: {
    Color: class {
      private readonly value: string;
      constructor (value: string | number = '#000000') {
        this.value = typeof value === 'number'
          ? `#${value.toString(16).padStart(6, '0')}`
          : String(value);
      }
      toString (): string {
        return this.value;
      }
    },
    getProperty,
    setProperty,
    mergeObject,
    deepClone: <T,>(v: T): T => structuredClone(v),
    duplicate: <T,>(v: T): T => JSON.parse(JSON.stringify(v)),
  },
  abstract: {
    // Constructor-only stubs with the static surface schema layering relies on.
    // Real DataModel behavior (validation, defaults applied on construction,
    // source/value distinction) belongs in E2E.
    DataModel: class {
      static LOCALIZATION_PREFIXES: string[] = [];
      static defineSchema (): Record<string, any> { return {}; }
      constructor (..._args: any[]) {}
      prepareDerivedData (): void {}
    },
    TypeDataModel: class {
      static LOCALIZATION_PREFIXES: string[] = [];
      static defineSchema (): Record<string, any> { return {}; }
      constructor (..._args: any[]) {}
      prepareDerivedData (): void {}
    },
  },
  documents: {
    // Constructor-only; only used as a generic type argument in source.
    Item: class {},
    ActiveEffect: ActiveEffectStub,
  },
  applications: {
    // Application classes pulled in via deep imports (e.g. settings menus
    // reached through `@settings/currency`). Tests don't construct these;
    // they just need the constructors to exist so `class Foo extends X {}`
    // declarations evaluate at module load.
    api: {
      ApplicationV2: class { constructor (..._args: any[]) {} },
      DialogV2: class {
        static async confirm (..._args: any[]): Promise<boolean> { return false; }
      },
      HandlebarsApplicationMixin: <T extends new (...args: any[]) => any> (Base: T): T => Base,
    },
    sheets: {
      ActorSheetV2: class { constructor (..._args: any[]) {} },
      ItemSheetV2: class { constructor (..._args: any[]) {} },
      ActiveEffectConfig: class { constructor (..._args: any[]) {} },
    },
  },
  data: {
    fields: {
      // Constructor-only stubs. Tests that need real Foundry field behavior
      // belong in E2E, not unit. These let imports resolve so pure helpers
      // can be exercised without pulling Foundry's runtime.
      NumberField: class { constructor (public options: any = {}) {} },
      BooleanField: class { constructor (public options: any = {}) {} },
      StringField: class { constructor (public options: any = {}) {} },
      HTMLField: class { constructor (public options: any = {}) {} },
      EmbeddedDataField: class { constructor (public model: any, public options: any = {}) {} },
      SchemaField: class { constructor (public fields: any, public options: any = {}) {} },
      ArrayField: class { constructor (public element: any, public options: any = {}) {} },
      ObjectField: class { constructor (public options: any = {}) {} },
      AnyField: class { constructor (public options: any = {}) {} },
      SetField: class { constructor (public element: any, public options: any = {}) {} },
    },
    operators: {
      // Sentinel used to force-delete a key from a TypedObjectField, replacing the
      // legacy `{-=key: null}` string-prefix convention.
      ForcedDeletion: class {},
    },
  },
};

// --- Roll ----------------------------------------------------------------
// Must be a class (not a plain object) — `class D20Roll extends Roll` (src/dice/D20Roll.mts)
// evaluates `Roll` as a constructor at module-load time, so any test whose import graph
// reaches the dice module needs `Roll` to be extendable.
//
// The real Foundry `Roll.safeEval` reads `this.MATH_PROXY` internally, so calling
// it detached from `Roll` (e.g. `const fn = Roll.safeEval; fn(x)` instead of
// `Roll.safeEval(x)`) silently breaks it in production. Enforce correct `this`
// binding here with a regular (non-arrow) function so any future regression of
// that bug class fails loudly in unit tests instead of passing silently.
class RollStub {
  static safeEval = vi.fn(function (this: unknown, expr: string) {
    if (this !== (globalThis as any).Roll) {
      throw new Error(
        'Roll.safeEval stub was called without `this` bound to `Roll` (e.g. via a destructured ' +
        'reference like `const fn = Roll.safeEval; fn(expr)`). Call it as `Roll.safeEval(expr)` — ' +
        'the real implementation depends on `this.MATH_PROXY` and breaks silently otherwise.'
      );
    }
    // Minimal stub — tests that need real evaluation should override per-test.
    const n = Number(expr);
    return Number.isFinite(n) ? n : 0;
  });

  terms: unknown[] = [];

  constructor (public formula: string = '', public data: Record<string, unknown> = {}, public options: Record<string, unknown> = {}) {}
}
(globalThis as any).Roll = RollStub;

// --- Handlebars ------------------------------------------------------------
// `rollMessages.mts` precompiles a `.hbs` template at module load time via
// `Handlebars.compile()` (see its module doc comment). Tests don't render chat
// cards, so the stub just needs to not throw when the module is imported.
(globalThis as any).Handlebars = {
  compile: vi.fn((_source: string, _options?: Record<string, unknown>) => {
    return vi.fn((_data: Record<string, unknown>) => '');
  }),
};

// --- global document constructors ---------------------------------------
(globalThis as any).Actor = class {
  static metadata = {};
  constructor (..._args: any[]) {}
  _onCreate (..._args: any[]): void {}
  _onDelete (..._args: any[]): void {}
  async _preCreate (..._args: any[]): Promise<boolean | void> { return true; }
  updateSource (..._args: any[]): void {}
  async update (..._args: any[]): Promise<this> { return this; }
};

(globalThis as any).TokenDocument = class {
  static metadata = {};
  constructor (..._args: any[]) {}
  async _preCreate (..._args: any[]): Promise<boolean | void> { return true; }
  updateSource (..._args: any[]): void {}
  async update (..._args: any[]): Promise<this> { return this; }
};

// --- CONST -----------------------------------------------------------------
(globalThis as any).CONST = {
  TOKEN_DISPOSITIONS: {
    SECRET: -2,
    HOSTILE: -1,
    NEUTRAL: 0,
    FRIENDLY: 1,
  },
  TOKEN_DISPLAY_MODES: {
    NONE: 0,
    CONTROL: 10,
    OWNER_HOVER: 20,
    HOVER: 30,
    OWNER: 40,
    ALWAYS: 50,
  },
};
