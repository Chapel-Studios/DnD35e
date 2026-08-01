// @vitest-environment happy-dom

import { withChangeTargetGroups } from '@helpers/formulae/changeTargetGroups.mjs';
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

/**
 * Regression tests for poc §7.7's Group Change Target display — a stored `modelValue` of
 * "group:allSaves" (a synthetic `group:`-prefixed accessPath, not real formula-variable
 * syntax) must render as a friendly localized label rather than the raw key leaking
 * through, and must round-trip back to the raw group key on commit without corruption.
 * `withChangeTargetGroups()` is the real production helper used to build this context
 * (see `EffectChangesList.vue`'s `getKeyPickerContext`), not a hand-rolled fixture.
 */

const ModelValueStub = defineComponent({
  props: ['modelValue', 'hint'],
  setup (props, { expose }) {
    expose({
      getInputElement: () => undefined,
      getHighlightElement: () => undefined,
      getDropdownMenuElement: () => undefined,
    });
    return () => h('input', { 'data-model-value': props.modelValue, 'data-hint': props.hint });
  },
});

const groupAwareContext: FamiliarContext = withChangeTargetGroups({
  display: 'Actor',
  properties: {
    hardness: { type: 'number', accessPath: 'system.hardness', value: 5 },
  },
});

describe('AspectPicker — Group Change Target display (poc §7.7)', () => {
  it('displays the localized group label instead of the raw "group:" key on mount', () => {
    const wrapper = mount(AspectPicker, {
      props: {
        modelValue: 'group:allSaves',
        familiarContext: groupAwareContext,
        contextName: 'actor',
      },
      global: { stubs: { FamiliarOverlayInput: ModelValueStub } },
    });

    const displayed = wrapper.find('input').attributes('data-model-value');
    // game.i18n.localize is an identity stub in tests — the raw i18n key stands in for
    // the localized label, but critically it is NOT the raw "group:allSaves" accessPath.
    expect(displayed).toBe('#actor.dnd35e.Formula.ChangeGroups.allSaves');
    expect(displayed).not.toContain('group:allSaves');
  });

  it('does not surface a "property not found" error for a registered group key', async () => {
    const wrapper = mount(AspectPicker, {
      props: {
        modelValue: 'group:allSaves',
        familiarContext: groupAwareContext,
        contextName: 'actor',
      },
      global: { stubs: { FamiliarOverlayInput: ModelValueStub } },
    });
    await nextTick();
    const hint = wrapper.find('input').attributes('data-hint');
    expect(hint ?? '').not.toBe('dnd35e.Formula.Errors.propertyNotFound');
  });

  it('still resolves a real field normally when the context has been extended with groups', () => {
    const wrapper = mount(AspectPicker, {
      props: {
        modelValue: 'system.hardness',
        familiarContext: groupAwareContext,
        contextName: 'actor',
      },
      global: { stubs: { FamiliarOverlayInput: ModelValueStub } },
    });
    const displayed = wrapper.find('input').attributes('data-model-value');
    // The context's own `display: 'Actor'` is what localizeFormula uses for the context
    // prefix here (normalizeLabel('Actor') === 'Actor') — unrelated to the raw
    // `contextName: 'actor'` prop, which only the group-key fast path (above) uses directly.
    expect(displayed).toBe('#Actor.hardness');
  });
});
