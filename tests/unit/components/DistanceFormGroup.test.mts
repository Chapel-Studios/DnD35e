// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
}));

vi.mock('@settings/index.mjs', () => ({
  SettingsStoreSymbol: Symbol.for('test.SettingsStore'),
}));

import DistanceFormGroup from '@vc/fields/formGroups/DistanceFormGroup.vue';

const DocumentSheetStoreSymbol = Symbol.for('test.DocumentSheetStore');
const SettingsStoreSymbol = Symbol.for('test.SettingsStore');

describe('DistanceFormGroup projection-pair behavior', () => {
  it('renders localized projected value and maps updates back through getViewAwareFieldUpdater', () => {
    const baseValue = 10;
    const toLocalized = vi.fn((v: number) => v * 2);
    const toStored = vi.fn((v: number) => v / 2);
    const updateSpy = vi.fn();
    const getViewAwareFieldUpdater = vi.fn(() => updateSpy);

    const numberFormGroupStub = defineComponent({
      name: 'NumberFormGroup',
      props: {
        value: { type: Number, required: false },
        onUpdate: { type: Function, required: false },
        fieldPath: { type: String, required: true },
        unit: { type: String, required: false },
        label: { type: String, required: false },
        hint: { type: String, required: false },
      },
      setup(props) {
        return () => h('div', {
          class: 'number-stub',
          'data-value': String(props.value ?? ''),
          onClick: () => (props.onUpdate as ((v: number) => void) | undefined)?.(26),
        });
      },
    });

    const wrapper = mount(DistanceFormGroup, {
      props: {
        fieldPath: 'system.speed.land',
      },
      global: {
        stubs: {
          NumberFormGroup: numberFormGroupStub,
        },
        provide: {
          [DocumentSheetStoreSymbol]: {
            documentGetters: {
              getViewAwareFieldValue: vi.fn(() => baseValue),
            },
            documentActions: {
              getViewAwareFieldUpdater,
            },
          },
          [SettingsStoreSymbol]: {
            measurement: {
              distanceDisplayShortLabel: 'ft',
              convertToStoredDistance: toStored,
              convertToLocalizedDistance: toLocalized,
            },
          },
        },
      },
    });

    const stub = wrapper.find('.number-stub');
    expect(stub.exists()).toBe(true);
    expect(stub.attributes('data-value')).toBe('20');
    expect(toLocalized).toHaveBeenCalledWith(baseValue);

    stub.trigger('click');

    expect(toStored).toHaveBeenCalledWith(26);
    expect(getViewAwareFieldUpdater).toHaveBeenCalledWith('system.speed.land');
    expect(updateSpy).toHaveBeenCalledWith(13);
  });
});