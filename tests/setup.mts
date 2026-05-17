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
  target: T,
  source: Partial<T> = {}
): T {
  for (const [k, v] of Object.entries(source)) {
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof target[k] === 'object' &&
      target[k] !== null
    ) {
      mergeObject(target[k], v as any);
    } else {
      (target as any)[k] = v;
    }
  }
  return target;
}

(globalThis as any).foundry = {
  utils: {
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
    },
  },
};

// --- Roll ----------------------------------------------------------------
(globalThis as any).Roll = {
  safeEval: vi.fn((expr: string) => {
    // Minimal stub — tests that need real evaluation should override per-test.
    const n = Number(expr);
    return Number.isFinite(n) ? n : 0;
  }),
};
