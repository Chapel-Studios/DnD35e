// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import ToggleSwitchFormGroup from '@vc/fields/formGroups/ToggleSwitchFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.identified';

const mountToggleSwitchFormGroup = (options: { editable: boolean; value?: boolean }) => {
  const value = options.value ?? true;
  return mount(ToggleSwitchFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Identified',
      value,
      trueLabel: 'dnd35e.COMMON.Yes',
      falseLabel: 'dnd35e.COMMON.No',
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: value },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        ToggleSwitch: { template: '<div class="toggle-switch-stub" :data-checked="checked" :data-disabled="disabled"></div>', props: ['checked', 'disabled', 'trueLabel', 'falseLabel', 'flip'] },
      },
    },
  });
};

describe('ToggleSwitchFormGroup — passthrough smoke test', () => {
  it('renders the ToggleSwitch when editable', () => {
    const wrapper = mountToggleSwitchFormGroup({ editable: true, value: true });
    const toggle = wrapper.find('.toggle-switch-stub');
    expect(toggle.exists()).toBe(true);
    expect(toggle.attributes('data-checked')).toBe('true');
  });

  it('renders the readonly label when not editable', () => {
    const wrapper = mountToggleSwitchFormGroup({ editable: false, value: true });
    expect(wrapper.find('.toggle-switch-stub').exists()).toBe(false);
    expect(wrapper.find('.toggle-value').exists()).toBe(true);
  });
});
