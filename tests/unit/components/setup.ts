/**
 * Vue component test setup — mock factories for DocumentSheetStore and RenderModeStore.
 *
 * Components inject the real stores via {@link DocumentSheetStoreSymbol} /
 * {@link RenderModeStoreSymbol}. In unit tests we mount a component with `global.provide`
 * mapping those symbols to factory-produced partial stores. Each factory accepts an
 * options object so individual tests override only what they exercise.
 *
 * Self-contained: no module-level state, parallel-safe. Mirrors the shape contract of
 * the schema-tester factory (each test gets its own store instance).
 *
 * @module
 */

import type { FieldEditability, FieldVisibility } from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import { everyoneVisibility, normalEditability } from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import { vi } from 'vitest';
import { computed, ref } from 'vue';

// Tests that import this setup module also `vi.mock('@ec/CoreMixin/index.mjs', ...)`
// to expose registry symbols with these exact keys. Using `Symbol.for(...)` (the global
// symbol registry) means identity matches across the mock and this provider — even though
// we never import the real symbols (which would pull in document/sheet UI).
const DocumentSheetStoreSymbol = Symbol.for('test.DocumentSheetStore');
const RenderModeStoreSymbol = Symbol.for('test.RenderModeStore');

// ---------------------------------------------------------------------------
// RenderModeStore mock
// ---------------------------------------------------------------------------

export type MockRenderModeOptions = {
  isGM?: boolean;
  isEditMode?: boolean;
  isPlayMode?: boolean;
  isTrueMode?: boolean;
};

export const createMockRenderModeStore = (options: MockRenderModeOptions = {}): unknown => {
  const {
    isGM = false,
    isEditMode = true,
    isPlayMode = false,
    isTrueMode = false,
  } = options;

  return {
    isGM: computed(() => isGM),
    isEditMode: computed(() => isEditMode),
    isPlayMode: computed(() => isPlayMode),
    isTrueMode: computed(() => isTrueMode),
    viewMode: computed(() => (isEditMode ? 'edit' : isTrueMode ? 'true' : 'play')),
    setViewMode: vi.fn(),
    renderViewModeBar: vi.fn(),
  };
};

// ---------------------------------------------------------------------------
// DocumentSheetStore mock
// ---------------------------------------------------------------------------

export type MockDocumentStoreOptions = {
  /** Per-path visibility result returned by `getIsFieldVisible`. Defaults to `true`. */
  fieldVisibility?: Record<string, boolean>;
  /** Per-path editability result returned by `getIsFieldEditable`. Defaults to `true`. */
  fieldEditability?: Record<string, boolean>;
  /** Per-path resolved visibility from `_storeUtils.resolveVisibility`. */
  resolvedVisibility?: Record<string, FieldVisibility>;
  /** Per-path resolved editability from `_storeUtils.resolveEditability`. */
  resolvedEditability?: Record<string, FieldEditability>;
  /** Per-path source values returned by `_storeUtils.getSourceProperty`. */
  sourceValues?: Record<string, unknown>;
  /** Per-path mask presence from `documentGetters.hasMaskForField`. */
  masks?: Record<string, unknown>;
  /** Field labels returned by `_storeUtils.getFieldLabel`. */
  labels?: Record<string, string>;
  /** Field hints returned by `_storeUtils.getFieldHint`. */
  hints?: Record<string, string>;
};

/**
 * Returns a Partial<DocumentSheetStore> shape cast as `unknown` so consumers can provide it
 * via Vue's `inject` without satisfying every property of the real store.
 *
 * Only the surface actually exercised by FormGroup / NumberFormGroup is wired up.
 */
export const createMockDocumentStore = (options: MockDocumentStoreOptions = {}): unknown => {
  const {
    fieldVisibility = {},
    fieldEditability = {},
    resolvedVisibility = {},
    resolvedEditability = {},
    sourceValues = {},
    masks = {},
    labels = {},
    hints = {},
  } = options;

  const getIsFieldVisible = vi.fn((path: string, _default?: FieldVisibility) =>
    computed(() => fieldVisibility[path] ?? true)
  );

  const getIsFieldEditable = vi.fn((path: string, _default?: FieldEditability) =>
    computed(() => fieldEditability[path] ?? true)
  );

  const hasMaskForField = vi.fn((path: string) => computed(() => path in masks));
  const getMaskForField = vi.fn((path: string) => computed(() => masks[path]));

  const resolveVisibility = vi.fn((path: string, _default?: FieldVisibility): FieldVisibility =>
    resolvedVisibility[path] ?? everyoneVisibility
  );

  const resolveEditability = vi.fn((path: string, _default?: FieldEditability): FieldEditability =>
    resolvedEditability[path] ?? normalEditability
  );

  const getSourceProperty = vi.fn(<T,>(path: string) =>
    computed(() => sourceValues[path] as T)
  );

  const getDirectFieldUpdater = vi.fn((_path: string) => vi.fn());
  const getViewAwareFieldUpdater = vi.fn((_path: string) => vi.fn());

  return {
    documentGetters: {
      getIsFieldVisible,
      getIsFieldEditable,
      getMaskForField,
      hasMaskForField,
    },
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
    _storeUtils: {
      getFieldLabel: vi.fn((path: string) => labels[path] ?? ''),
      getFieldHint: vi.fn((path: string) => hints[path] ?? ''),
      resolveVisibility,
      resolveEditability,
      getSourceProperty,
    },
  };
};

// ---------------------------------------------------------------------------
// Global provide convenience
// ---------------------------------------------------------------------------

/**
 * Build the `global.provide` map for `mount(component, { global: { provide: makeGlobalProvide(...) } })`.
 * Pass the factory-created stores; this just hands them to the matching injection symbols.
 */
export const makeGlobalProvide = (stores: {
  documentStore?: unknown;
  renderModeStore?: unknown;
}): Record<symbol, unknown> => ({
  [DocumentSheetStoreSymbol as symbol]: stores.documentStore ?? createMockDocumentStore(),
  [RenderModeStoreSymbol as symbol]: stores.renderModeStore ?? createMockRenderModeStore(),
});

// Re-export the ref helper for tests that want reactive overrides.
export { ref };
