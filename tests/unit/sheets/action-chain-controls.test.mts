// @vitest-environment happy-dom

import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
import { ACTION_TRIGGER } from '@items/baseItem/actions/constants.mjs';
import ActionChainBox from '@items/baseItem/sheet/components/actions/ActionChainBox.vue';
import ActionLinkHeader from '@items/baseItem/sheet/components/actions/ActionLinkHeader.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, nextTick, ref } from 'vue';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol('documentSheet'),
}));

vi.mock('@items/baseItem/actions/ActionEditorStore.mjs', () => ({
  ActionEditorStoreSymbol: Symbol('actionEditor'),
}));

vi.mock('@items/baseItem/sheet/components/actions/ActionAccordionRow.vue', () => ({
  default: { template: '<div class="chain-navigation" />' },
}));

vi.mock('@vc/fields/index.mjs', () => ({
  SelectFormGroup: {
    name: 'SelectFormGroup',
    props: ['readOnly'],
    template: '<div class="trigger-field" />',
  },
}));

const SelectStub = defineComponent({
  props: ['readOnly'],
  template: '<div class="trigger-field" />',
});

function mountControls() {
  const editable = ref(true);
  const restrictedPaths = ref<string[]>([]);
  const addChainLink = vi.fn();
  const updateLink = vi.fn();
  const getIsFieldEditable = vi.fn((path: string) => computed(() =>
    editable.value && !restrictedPaths.value.includes(path)
  ));
  const actionStore = {
    getters: {
      chain: ref([{ actionId: 'child', trigger: ACTION_TRIGGER.ALWAYS }]),
      actionId: ref('parent'),
      actionType: ref('weaponAttack'),
      chainOwnerFieldPath: ref('system.actions.parent.chain'),
      link: ref({ actionId: 'child', trigger: ACTION_TRIGGER.ALWAYS }),
    },
    actions: {
      addChainLink,
      updateLink,
      updateTrigger: vi.fn(),
      getFieldPath: (field: string) => `system.actions.parent.${field}`,
    },
  };
  const global = {
    provide: {
      [DocumentSheetStoreSymbol]: { documentGetters: { getIsFieldEditable } },
      [ActionEditorStoreSymbol]: actionStore,
    },
    stubs: { SelectFormGroup: SelectStub },
  };
  const chain = mount(ActionChainBox, { global });
  const header = mount(ActionLinkHeader, {
    global: {
      ...global,
      provide: {
        ...global.provide,
        [ActionEditorStoreSymbol]: {
          ...actionStore,
          getters: { ...actionStore.getters, actionId: ref('child') },
          actions: {
            ...actionStore.actions,
            getFieldPath: (field: string) => `system.actions.child.${field}`,
          },
        },
      },
    },
  });
  return { chain, header, editable, restrictedPaths, addChainLink, updateLink, getIsFieldEditable };
}

describe('action chain mutation controls', () => {
  it('hides mutation buttons and makes the trigger read-only without disabling chain navigation', async () => {
    const { chain, header, editable, addChainLink, updateLink } = mountControls();
    editable.value = false;
    await nextTick();

    expect(chain.find('.add-chain-controls').exists()).toBe(false);
    expect(header.find('.chain-remove-btn').exists()).toBe(false);
    expect(header.findComponent(SelectStub).props('readOnly')).toBe(true);
    expect(chain.find('.chain-navigation').exists()).toBe(true);
    expect(addChainLink).not.toHaveBeenCalled();
    expect(updateLink).not.toHaveBeenCalled();
  });

  it('allows adding and removing links on an editable chain', async () => {
    const { chain, header, addChainLink, updateLink } = mountControls();
    expect(header.findComponent(SelectStub).props('readOnly')).toBe(false);

    await chain.get('.add-chain-btn').trigger('click');
    await chain.get('.add-chain-picker button').trigger('click');
    expect(addChainLink).toHaveBeenCalledOnce();

    await header.get('.chain-remove-btn').trigger('click');
    expect(updateLink).toHaveBeenCalledWith(
      { actionId: 'child', trigger: ACTION_TRIGGER.ALWAYS },
      true
    );
  });

  it('removes an open picker and link mutations when the owning chain becomes restricted', async () => {
    const { chain, header, restrictedPaths, getIsFieldEditable } = mountControls();
    await chain.get('.add-chain-btn').trigger('click');
    expect(chain.find('.add-chain-picker').exists()).toBe(true);

    restrictedPaths.value = ['system.actions.parent.chain'];
    await nextTick();

    expect(getIsFieldEditable).toHaveBeenCalledWith('system.actions.parent.chain');
    expect(chain.find('.add-chain-picker').exists()).toBe(false);
    expect(header.find('.chain-remove-btn').exists()).toBe(false);
    expect(header.findComponent(SelectStub).props('readOnly')).toBe(true);
  });
});
