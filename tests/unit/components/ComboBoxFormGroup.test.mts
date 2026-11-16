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

import ComboBoxFormGroup from '@vc/fields/formGroups/ComboBoxFormGroup.vue';

import { makeGlobalProvide } from './setup';

const mountComboBoxFormGroup = (allowCustom?: boolean) => {
  const onUpdate = vi.fn();
  const wrapper = mount(ComboBoxFormGroup, {
    props: {
      fieldPath: 'system.ammoType',
      value: 'arrow',
      options: [{ value: 'arrow', label: 'Arrow' }],
      onUpdate,
      ...(allowCustom === undefined ? {} : { allowCustom }),
    },
    global: {
      provide: makeGlobalProvide({}),
      stubs: {
        FieldControls: { template: '<div><slot /></div>' },
      },
    },
  });
  return { wrapper, onUpdate };
};

describe('ComboBoxFormGroup', () => {
  it('accepts custom text with suggestions when allowCustom is omitted', async () => {
    const { wrapper, onUpdate } = mountComboBoxFormGroup();
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.find('datalist option').attributes('value')).toBe('Arrow');

    await wrapper.get('input[type="text"]').setValue('custom ammunition');
    expect(onUpdate).toHaveBeenCalledWith('custom ammunition');
  });

  it('preserves select mode when allowCustom is explicitly false', () => {
    const { wrapper } = mountComboBoxFormGroup(false);
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.find('input[type="text"]').exists()).toBe(false);
  });
});
