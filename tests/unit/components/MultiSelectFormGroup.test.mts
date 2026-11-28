// @vitest-environment happy-dom

import type { DocumentSheetStore } from '@documents/document/index.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
  defaultDetailsTab: {},
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import MultiSelectFormGroup from '@vc/fields/formGroups/MultiSelectFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.properties';

const OPTIONS = [
  { value: 'reach', label: 'Reach' },
  { value: 'trip', label: 'Trip' },
  { value: 'disarm', label: 'Disarm' },
];

const mountMultiSelectFormGroup = (options: { editable: boolean }) => {
  return mount(MultiSelectFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Properties',
      value: ['reach', 'trip'],
      options: OPTIONS,
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: ['reach', 'trip'] },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

const mountStoreSelection = (isGM = true, masked = false) => {
  type Selection = string[] | Set<string> | null;
  const mode = ref<'edit' | 'play' | 'true'>('edit');
  const source = ref<Selection>(['reach', 'trip']);
  const effective = ref<Selection>(new Set(['disarm']));
  const update = vi.fn();
  const store = createMockDocumentStore() as DocumentSheetStore;
  store._storeUtils.getSourceProperty = <T,>() => computed(() => source.value as T);
  store.documentGetters.getViewAwareFieldValue = <T,>() => effective.value as T;
  store.documentGetters.hasMaskForField = () => computed(() => masked);
  store.documentGetters.getIsFieldEditable = () => computed(() => true);
  store.documentActions.getViewAwareFieldUpdater = () => update;
  const wrapper = mount(MultiSelectFormGroup, {
    props: { fieldPath: FIELD_PATH, options: OPTIONS },
    global: {
      provide: makeGlobalProvide({
        documentStore: store,
        renderModeStore: {
          isGM: computed(() => isGM),
          isEditMode: computed(() => mode.value === 'edit'),
          isPlayMode: computed(() => mode.value === 'play'),
          isTrueMode: computed(() => mode.value === 'true'),
        },
      }),
      stubs: { FieldControls: { template: '<div class="fc-stub" />' } },
    },
  });
  const checkedValues = () => wrapper.findAll('input:checked').map(input => (input.element as HTMLInputElement).value);
  return { wrapper, mode, source, effective, update, checkedValues };
};

describe('MultiSelectFormGroup — passthrough smoke test', () => {
  it('renders an editable checkbox per option', () => {
    const wrapper = mountMultiSelectFormGroup({ editable: true });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(OPTIONS.length);
    // First two are selected
    expect((checkboxes[0]!.element as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[2]!.element as HTMLInputElement).checked).toBe(false);
  });

  describe('MultiSelectFormGroup store selections', () => {
    it.each(['play', 'true'] as const)('renders a store-derived Set in the %s readonly view', async mode => {
      const state = mountStoreSelection();
      state.mode.value = mode;
      await state.wrapper.setProps({ readOnly: true });
      expect(state.wrapper.findAll('.readonly .multi-select-option').map(option => option.text())).toEqual(['Disarm']);
      state.wrapper.unmount();
    });

    it('normalizes source Sets for toggles and uses effective selections outside Edit mode', async () => {
      const state = mountStoreSelection();
      state.source.value = new Set(['reach', 'trip']);
      await state.wrapper.vm.$nextTick();
      expect(state.checkedValues()).toEqual(['reach', 'trip']);
      await state.wrapper.get('input[value="disarm"]').setValue(true);
      expect(state.update).toHaveBeenLastCalledWith(['reach', 'trip', 'disarm']);
      await state.wrapper.get('input[value="reach"]').setValue(false);
      expect(state.update).toHaveBeenLastCalledWith(['trip']);

      state.mode.value = 'play';
      await state.wrapper.vm.$nextTick();
      expect(state.checkedValues()).toEqual(['disarm']);
      state.effective.value = new Set(['trip']);
      state.mode.value = 'true';
      await state.wrapper.vm.$nextTick();
      expect(state.checkedValues()).toEqual(['trip']);
      state.wrapper.unmount();
    });

    it('keeps masked player Edit selections instead of exposing the source Set', async () => {
      const state = mountStoreSelection(false, true);
      state.source.value = new Set(['reach', 'trip']);
      await state.wrapper.vm.$nextTick();
      expect(state.checkedValues()).toEqual(['disarm']);
      await state.wrapper.get('input[value="trip"]').setValue(true);
      expect(state.update).toHaveBeenCalledWith(['disarm', 'trip']);
      state.wrapper.unmount();
    });

    it('preserves explicit Set values and handles empty store selections', async () => {
      const state = mountStoreSelection();
      await state.wrapper.setProps({ value: new Set(['trip']) });
      expect(state.checkedValues()).toEqual(['trip']);
      state.source.value = null;
      state.effective.value = null;
      await state.wrapper.setProps({ value: undefined });
      expect(state.checkedValues()).toEqual([]);
      state.wrapper.unmount();
    });
  });

  it('renders the readonly variant (no editable inputs) when not editable', () => {
    const wrapper = mountMultiSelectFormGroup({ editable: false });
    // Readonly slot renders a `.multi-select-checkboxes.readonly` block; verify the
    // editable variant is not rendered.
    expect(wrapper.find('.multi-select-checkboxes.readonly').exists()).toBe(true);
    // The editable variant has its own non-readonly checkboxes container; not rendered.
    const editableContainers = wrapper.findAll('.multi-select-checkboxes').filter(el => !el.classes('readonly'));
    expect(editableContainers.length).toBe(0);
  });
});
