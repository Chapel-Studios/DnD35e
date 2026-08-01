// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
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
 * Regression tests for poc §7.10 Half 2: the advanced (multiline) formula editor
 * modal button on `FormulaFormGroup`.
 */

const schema: FamiliarSchema = {
  self: { properties: { flag: { type: 'boolean', accessPath: 'system.flag', value: 'true' } } },
};

const mountFormulaFormGroup = (options: { hideAdvancedEditor?: boolean; value?: string } = {}) => {
  return mount(FormulaFormGroup, {
    props: {
      fieldPath: 'system.changes.0.condition',
      value: options.value ?? '#self.flag',
      contexts: schema,
      hideAdvancedEditor: options.hideAdvancedEditor,
    },
    global: {
      provide: makeGlobalProvide({
        renderModeStore: createMockRenderModeStore({ isEditMode: true }),
      }),
      stubs: {
        FormGroup: {
          template: '<div class="fg-stub"><slot name="controls" :editable="true" /><slot /><slot name="readonly" /></div>',
        },
        FamiliarOverlayInput: {
          // Real component renders the advanced-editor button via its `#decoration`
          // slot (poc §7.10 follow-up — moved out of FormGroup's #controls so it stays
          // visible even when `hideFieldControls`/`hideLabel` are set); the stub
          // must render that slot for these assertions to see the button at all.
          template: '<div class="familiar-overlay-input-stub"><input /><slot name="decoration" /></div>',
        },
        FormulaMultilineModal: {
          props: ['open', 'formula', 'contexts', 'expectedType', 'label', 'onCommit'],
          emits: ['close'],
          template: '<div class="modal-stub" :data-open="open" :data-formula="formula">'
            + '<button class="modal-stub-close" @click="$emit(\'close\')"></button></div>',
        },
      },
    },
  });
};

describe('FormulaFormGroup — advanced (multiline) editor modal', () => {
  it('renders the advanced editor button by default', () => {
    const wrapper = mountFormulaFormGroup();
    expect(wrapper.find('.field-control-btn').exists()).toBe(true);
  });

  it('suppresses the advanced editor button when hideAdvancedEditor is true', () => {
    const wrapper = mountFormulaFormGroup({ hideAdvancedEditor: true });
    expect(wrapper.find('.field-control-btn').exists()).toBe(false);
    expect(wrapper.find('.modal-stub').exists()).toBe(false);
  });

  it('opens the modal (passing the current formula) when the button is clicked', async () => {
    const wrapper = mountFormulaFormGroup({ value: '#self.flag' });
    expect(wrapper.find('.modal-stub').attributes('data-open')).toBe('false');

    await wrapper.find('.field-control-btn').trigger('click');
    await nextTick();

    const modal = wrapper.find('.modal-stub');
    expect(modal.attributes('data-open')).toBe('true');
    expect(modal.attributes('data-formula')).toBe('#self.flag');
  });

  it('closes the modal when it emits close', async () => {
    const wrapper = mountFormulaFormGroup();
    await wrapper.find('.field-control-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('.modal-stub').attributes('data-open')).toBe('true');

    await wrapper.find('.modal-stub-close').trigger('click');
    await nextTick();
    expect(wrapper.find('.modal-stub').attributes('data-open')).toBe('false');
  });
});
