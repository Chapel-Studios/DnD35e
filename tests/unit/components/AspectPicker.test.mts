// @vitest-environment happy-dom

import type { FamiliarContext } from '@helpers/formulae/types.mjs';
import AspectPicker from '@vc/fields/formGroups/AspectPicker.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

/**
 * Regression tests for `hideContextHint` suppressing AspectPicker's own error display
 * (fixing a duplicate error message shown both in this field's hint AND in a consumer's
 * shared context/error line, e.g. the AE Changes table row).
 *
 * `updateValidation()` only runs on user interaction or a `modelValue`/`familiarContext`
 * change (no initial validation on mount) — mount with a resolvable `modelValue`, then
 * change it to an unresolvable raw path to trigger the "property not found" error via the
 * real `validateFormula`/`findAspectByAccessPath` pipeline (not mocked).
 */

const familiarContext: FamiliarContext = {
  properties: {
    flag: { type: 'boolean', accessPath: 'system.flag', value: 'true' },
  },
};

// AspectPicker calls `overlayRef.value?.getInputElement()` etc. via `nextTick(syncScroll)`
// after every validation pass — expose no-op stand-ins so that deferred call doesn't throw.
const FamiliarOverlayInputStub = defineComponent({
  props: ['hint'],
  setup (props, { expose }) {
    expose({
      getInputElement: () => undefined,
      getHighlightElement: () => undefined,
      getDropdownMenuElement: () => undefined,
    });
    return () => h('input', { 'data-hint': props.hint });
  },
});

const mountAspectPicker = (options: { hideContextHint: boolean }) => {
  return mount(AspectPicker, {
    props: {
      modelValue: 'system.flag',
      familiarContext,
      contextName: 'item',
      hideContextHint: options.hideContextHint,
    },
    global: {
      stubs: {
        FamiliarOverlayInput: FamiliarOverlayInputStub,
      },
    },
  });
};

describe('AspectPicker — hideContextHint error suppression', () => {
  it('surfaces the "property not found" error in its own hint by default', async () => {
    const wrapper = mountAspectPicker({ hideContextHint: false });
    await wrapper.setProps({ modelValue: 'system.unresolvable' });
    await nextTick();
    const hint = wrapper.find('input').attributes('data-hint');
    expect(hint).toBe('dnd35e.Formula.Errors.propertyNotFound');
  });

  it('suppresses the error from its own hint when hideContextHint is true', async () => {
    const wrapper = mountAspectPicker({ hideContextHint: true });
    await wrapper.setProps({ modelValue: 'system.unresolvable' });
    await nextTick();
    const hint = wrapper.find('input').attributes('data-hint');
    expect(hint).toBe('');
  });

  it('still emits update:error when hideContextHint is true (consumer surfaces it instead)', async () => {
    const wrapper = mountAspectPicker({ hideContextHint: true });
    await wrapper.setProps({ modelValue: 'system.unresolvable' });
    await nextTick();
    const emitted = wrapper.emitted('update:error');
    expect(emitted).toBeTruthy();
    const lastError = emitted?.[emitted.length - 1]?.[0];
    expect(lastError).toBe('dnd35e.Formula.Errors.propertyNotFound');
  });
});
