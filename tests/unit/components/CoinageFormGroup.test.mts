// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h } from 'vue';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import CoinageFormGroup from '@vc/fields/formGroups/CoinageFormGroup.vue';

const DocumentSheetStoreSymbol = Symbol.for('test.DocumentSheetStore');
const RenderModeStoreSymbol = Symbol.for('test.RenderModeStore');

const FIELD_PATH = 'system.price';

const listFormGroupStub = defineComponent({
  name: 'ListFormGroup',
  props: {
    value: { type: Array, required: false },
    onUpdate: { type: Function, required: false },
  },
  setup(props) {
    return () => h('div', {
      class: 'list-stub',
      'data-value': JSON.stringify(props.value ?? []),
    }, [
      h('button', {
        class: 'emit-update',
        onClick: () => (props.onUpdate as ((v: unknown) => void) | undefined)?.([
          { coinId: 'srd_gp', count: 3 },
        ]),
      }, 'emit'),
    ]);
  },
});

function makeRenderModeStore(options: { isEditMode?: boolean }) {
  const { isEditMode = true } = options;
  return {
    isEditMode: computed(() => isEditMode),
  };
}

function mountCoinage(options: {
  isGM: boolean;
  isEditMode: boolean;
  isMasked: boolean;
  projected: { stacks: Array<{ coinId: string; count: number }> };
  source: { stacks: Array<{ coinId: string; count: number }> };
  onUpdate?: (v: unknown) => void;
}) {
  const updater = vi.fn();
  const getViewAwareFieldUpdater = vi.fn(() => updater);
  const getViewAwareFieldValue = vi.fn((path: string, fromSource?: boolean) => {
    if (path !== FIELD_PATH) return undefined;
    return fromSource ? options.source : options.projected;
  });

  const wrapper = mount(CoinageFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      onUpdate: options.onUpdate,
    },
    global: {
      provide: {
        [DocumentSheetStoreSymbol]: {
          documentGetters: {
            getViewAwareFieldValue,
            getIsFieldEditable: vi.fn(() => computed(() => true)),
            hasMaskForField: vi.fn(() => computed(() => options.isMasked)),
          },
          isGM: computed(() => options.isGM),
          documentActions: {
            getViewAwareFieldUpdater,
          },
          _storeUtils: {
            getSourceProperty: vi.fn((_path: string) => computed(() => options.source)),
          },
        },
        [RenderModeStoreSymbol]: makeRenderModeStore({ isEditMode: options.isEditMode }),
      },
      stubs: {
        ListFormGroup: listFormGroupStub,
      },
    },
  });

  return { wrapper, updater, getViewAwareFieldValue, getViewAwareFieldUpdater };
}

describe('CoinageFormGroup', () => {
  it('uses source stacks in edit mode when field is not masked', () => {
    const projected = { stacks: [{ coinId: 'srd_sp', count: 1 }] };
    const source = { stacks: [{ coinId: 'srd_gp', count: 2 }] };

    const { wrapper } = mountCoinage({
      isGM: true,
      isEditMode: true,
      isMasked: false,
      projected,
      source,
    });

    const stub = wrapper.find('.list-stub');
    expect(stub.attributes('data-value')).toContain('srd_gp');
  });

  it('uses projected stacks for non-GM masked edit mode', () => {
    const projected = { stacks: [{ coinId: 'srd_sp', count: 1 }] };
    const source = { stacks: [{ coinId: 'srd_gp', count: 2 }] };

    const { wrapper, getViewAwareFieldValue } = mountCoinage({
      isGM: false,
      isEditMode: true,
      isMasked: true,
      projected,
      source,
    });

    const stub = wrapper.find('.list-stub');
    expect(stub.attributes('data-value')).toContain('srd_sp');
    expect(getViewAwareFieldValue).toHaveBeenCalledWith(FIELD_PATH);
  });

  it('maps stack updates to PriceSource and writes via getViewAwareFieldUpdater by default', async () => {
    const projected = { stacks: [] };
    const source = { stacks: [] };

    const { wrapper, updater, getViewAwareFieldUpdater } = mountCoinage({
      isGM: true,
      isEditMode: true,
      isMasked: false,
      projected,
      source,
    });

    await wrapper.find('button.emit-update').trigger('click');

    expect(getViewAwareFieldUpdater).toHaveBeenCalledWith(FIELD_PATH);
    expect(updater).toHaveBeenCalledWith({
      stacks: [{ coinId: 'srd_gp', count: 3 }],
      srdEquivalent: 3,
    });
  });
});
