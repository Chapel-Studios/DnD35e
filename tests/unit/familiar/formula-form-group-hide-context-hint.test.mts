// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

// FormulaFormGroup injects these two stores via their direct module paths (not the
// `@documents/document/index.mjs` barrel other FormGroups use), so mock those exact
// specifiers with the same `Symbol.for(...)` identities `../components/setup.ts` provides.
vi.mock('@documents/document/sheet/DocumentSheetStore.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';

import { createMockRenderModeStore, makeGlobalProvide } from '../components/setup';

/**
 * Regression tests for `hideContextHint` suppressing FormulaFormGroup's own error display
 * (fixing a duplicate error message shown both in this field's hint AND in a consumer's
 * shared context/error line, e.g. the AE Changes table row).
 *
 * `expectedType: 'number'` + a formula resolving to a boolean-typed context property
 * produces a real type-mismatch `ValidationError` via `validateFormulaType()`
 * (`utils.mts`), which surfaces through `useFormulaEditor`'s `formulaErrors` — this
 * exercises the real validation pipeline, not a mocked one.
 */

const schema: FamiliarSchema = {
  self: { properties: { flag: { type: 'boolean', accessPath: 'system.flag', value: 'true' } } },
};

const mountFormulaFormGroup = (options: { hideContextHint: boolean }) => {
  return mount(FormulaFormGroup, {
    props: {
      fieldPath: 'system.changes.0.condition',
      value: '#self.flag',
      expectedType: 'number',
      contexts: schema,
      hideContextHint: options.hideContextHint,
    },
    global: {
      provide: makeGlobalProvide({
        renderModeStore: createMockRenderModeStore({ isEditMode: true }),
      }),
      stubs: {
        FormGroup: { template: '<div class="fg-stub" :data-hint="hint"><slot /><slot name="readonly" /></div>', props: ['hint'] },
        FamiliarOverlayInput: { template: '<input />' },
      },
    },
  });
};

describe('FormulaFormGroup — hideContextHint error suppression', () => {
  afterEach(() => {
    (globalThis.Roll.safeEval as Mock).mockReset();
  });

  // The default tests/setup.mts Roll.safeEval stub always returns a finite number (0) for
  // non-numeric text, unlike Foundry's real dice-formula parser, which throws — force a
  // throw here so `validateFormulaType`'s 'number' branch actually produces an error.
  const forceTypeMismatchError = () => {
    (globalThis.Roll.safeEval as Mock).mockImplementation(() => {
      throw new Error('not a valid dice formula');
    });
  };

  it('surfaces the type-mismatch error in its own hint by default', async () => {
    forceTypeMismatchError();
    const wrapper = mountFormulaFormGroup({ hideContextHint: false });
    // onMounted validates synchronously but the re-render reflecting it is scheduled — flush it.
    await nextTick();
    const hint = wrapper.find('.fg-stub').attributes('data-hint');
    expect(hint).toBe('dnd35e.Formula.Errors.notANumber');
  });

  it('suppresses the type-mismatch error from its own hint when hideContextHint is true', async () => {
    forceTypeMismatchError();
    const wrapper = mountFormulaFormGroup({ hideContextHint: true });
    await nextTick();
    const hint = wrapper.find('.fg-stub').attributes('data-hint');
    expect(hint).toBe('');
  });

  it('still emits update:error when hideContextHint is true (consumer surfaces it instead)', async () => {
    forceTypeMismatchError();
    const wrapper = mountFormulaFormGroup({ hideContextHint: true });
    // `onMounted` sets formulaErrors reactively (pre-flush queue) — the `watch(currentError, ...)`
    // re-emission after mount-time validation needs a tick to flush before it's observable.
    await nextTick();
    const emitted = wrapper.emitted('update:error');
    expect(emitted).toBeTruthy();
    const lastError = emitted?.[emitted.length - 1]?.[0];
    expect(lastError).toBe('dnd35e.Formula.Errors.notANumber');
  });
});
