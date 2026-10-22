// @vitest-environment happy-dom

import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { HP_ADJUSTMENT_TYPE } from '@actors/creature/sheet/components/constants.mjs';
import CreatureHP from '@actors/creature/sheet/components/CreatureHP.vue';
import { getHpAdjustmentPermissions } from '@actors/creature/sheet/components/hpAdjustmentPermissions.mjs';
import HpUpdater from '@actors/creature/sheet/components/HpUpdater.vue';
import { DocumentSheetStoreSymbol, useDocumentSheetStore } from '@documents/document/sheet/DocumentSheetStore.mjs';
import { RenderModeStoreSymbol, useRenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import { EDIT, PLAY } from '@helpers/formulae/types.mjs';
import { mount } from '@vue/test-utils';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, provide } from 'vue';

const mountHp = (editable: boolean) => {
  const hp = { current: 20, max: 30, temp: 5, nonlethal: 2 };
  const update = vi.fn();
  const adjustHp = vi.fn().mockResolvedValue(true);
  const actor = {
    documentName: 'Actor',
    type: 'character',
    effects: [],
    system: { hp },
    _source: { system: { hp } },
    getFlag: vi.fn(),
    update,
  } as unknown as ActorDnd35e;
  update.mockResolvedValue(actor);
  const renderModeStore = useRenderModeStore(true, false, EDIT, editable);
  let store!: ReturnType<typeof useDocumentSheetStore<ActorDnd35e>>;
  const Host = defineComponent({
    setup() {
      const context: VueApplicationContext<ActorDnd35e> = {
        document: actor,
        appConfigOptions: { document: actor } as VueApplicationContext<ActorDnd35e>['appConfigOptions'],
        close: async () => {},
      };
      store = useDocumentSheetStore(context, { renderModeStore, defaultTabs: [] });
      provide(RenderModeStoreSymbol, renderModeStore);
      provide(DocumentSheetStoreSymbol, {
        ...store,
        documentGetters: {
          ...store.documentGetters,
          currentHp: computed(() => hp.current),
          maxHp: computed(() => hp.max),
          tempHp: computed(() => hp.temp),
          nonlethalDamage: computed(() => hp.nonlethal),
        },
        documentActions: { ...store.documentActions, adjustHp },
      });
      return () => h(CreatureHP);
    },
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        FieldControls: { template: '<div><slot /></div>' },
        MeasureBar: true,
      },
    },
  });
  return { wrapper, store, renderModeStore, update, adjustHp };
};

describe('HP sheet editability', () => {
  beforeEach(() => {
    (game.user as { isGM: boolean }).isGM = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (game.user as { isGM: boolean }).isGM = false;
  });

  it('disables every HP mutation control on an initially read-only sheet without disabling drawer navigation', async () => {
    const { wrapper, store, renderModeStore, update, adjustHp } = mountHp(false);

    expect(renderModeStore.viewMode.value).toBe(PLAY);
    expect(store.documentGetters.getIsFieldEditable('system.hp.current', undefined, true).value).toBe(false);
    const inputs = wrapper.findAll('.hp-stats input');
    expect(inputs).toHaveLength(3);
    for (const input of inputs) expect(input.attributes('disabled')).toBeDefined();
    expect(wrapper.get('.hp-updater-amount').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.apply-btn').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.hp-adjust-btn').attributes('disabled')).toBeUndefined();
    await wrapper.get('.hp-adjust-btn').trigger('click');
    expect(wrapper.get('.hp-updater').classes()).toContain('open');
    expect(update).not.toHaveBeenCalled();
    expect(adjustHp).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps forced HP editing and adjustments available in editable Play mode', async () => {
    const { wrapper, store, renderModeStore, update, adjustHp } = mountHp(true);
    renderModeStore.setViewMode(PLAY);
    await nextTick();

    expect(store.documentGetters.getIsFieldEditable('system.hp.current').value).toBe(false);
    expect(store.documentGetters.getIsFieldEditable('system.hp.current', undefined, true).value).toBe(true);
    expect(wrapper.get('.hp-current input').attributes('disabled')).toBeUndefined();
    await wrapper.get('.hp-current input').setValue(18);
    expect(update).toHaveBeenCalledWith({ 'system.hp.current': 18 }, {});
    await wrapper.get('.hp-updater-amount').setValue(4);
    await wrapper.get('.apply-btn').trigger('click');
    expect(adjustHp).toHaveBeenCalledWith(4, HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT);
    wrapper.unmount();
  });

  it('reactively revokes editability and rejects stale input and Apply events', async () => {
    const { wrapper, renderModeStore, update, adjustHp } = mountHp(true);
    const input = wrapper.get('.hp-current input');
    const button = wrapper.get('.apply-btn');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderModeStore.setSheetEditable(false);
    // Dispatch before Vue patches the DOM to exercise the handlers, not native disabled behavior.
    input.element.dispatchEvent(new Event('change'));
    button.element.dispatchEvent(new MouseEvent('click'));
    await nextTick();

    expect(input.attributes('disabled')).toBeDefined();
    expect(button.attributes('disabled')).toBeDefined();
    expect(update).not.toHaveBeenCalled();
    expect(adjustHp).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(2);

    renderModeStore.setSheetEditable(true);
    await nextTick();
    expect(input.attributes('disabled')).toBeUndefined();
    expect(button.attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('honors the editable prop in non-compact usage too', async () => {
    const { wrapper, store } = mountHp(true);
    const updater = mount(HpUpdater, {
      props: { editable: true },
      global: { provide: { [DocumentSheetStoreSymbol]: store } },
    });
    await updater.setProps({ editable: false });
    expect(updater.get('.hp-updater-amount').attributes('disabled')).toBeDefined();
    expect(updater.get('.apply-btn').attributes('disabled')).toBeDefined();
    updater.unmount();
    wrapper.unmount();
  });

  it.each([true, false])('preserves compact Token HUD editable=%s without a sheet store', (editable) => {
    const permissions = getHpAdjustmentPermissions({ getFlag: () => undefined }, true);
    const wrapper = mount(HpUpdater, { props: { compact: true, editable, permissions } });
    expect(wrapper.get('.apply-btn').attributes('disabled') !== undefined).toBe(!editable);
    expect(wrapper.get('.apply-btn').attributes('data-action')).toBe(editable ? 'adjustHp' : undefined);
    wrapper.unmount();
  });

  it('fails closed for non-compact usage without a sheet store', () => {
    const wrapper = mount(HpUpdater);
    expect(wrapper.find('.hp-updater').exists()).toBe(false);
    wrapper.unmount();
  });

  it('updates editability even when a header is attached after store creation', () => {
    const store = useRenderModeStore(true, false, EDIT, true);
    const header = document.createElement('header');
    store.setHeaderElement(header, false);
    expect(store.isSheetEditable.value).toBe(false);
    expect(store.viewMode.value).toBe(PLAY);
    expect(header.querySelector('[aria-label="dnd35e.COMMON.SheetModeEdit"]')).toBeNull();
    store.setViewMode(EDIT);
    expect(store.viewMode.value).toBe(PLAY);
  });
});
