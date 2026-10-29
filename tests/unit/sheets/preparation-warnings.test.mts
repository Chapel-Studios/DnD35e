// @vitest-environment happy-dom

import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
import { getPreparationWarningBannerState, preparationWarningKey, setPreparationWarningBanner } from '@documents/document/preparationWarningPreferences.mjs';
import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';
import { pushPreparationWarning, pushPreparationWarningToHosts } from '@documents/document/preparationWarnings.mjs';
import PreparationWarningsBanner from '@documents/document/sheet/components/PreparationWarningsBanner.vue';
import { dismissPreparationWarnings, isPreparationWarningsDismissed } from '@documents/document/sheet/components/preparationWarningsDismissal.mjs';
import PreparationWarningsTab from '@documents/document/sheet/components/PreparationWarningsTab.vue';
import { useDocumentSheetStore } from '@documents/document/sheet/DocumentSheetStore.mjs';
import { useRenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import type { ViewMode } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, ref } from 'vue';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol('documentSheet'),
}));

function makeSource(uuid = 'Actor.hero.Item.sword') {
  const flags: Record<string, unknown> = {};
  return {
    uuid,
    name: 'Sword',
    pack: undefined as string | undefined,
    _preparationWarnings: [] as PreparationWarning[],
    getFlag: (_scope: string, key: string): unknown => foundry.utils.getProperty(flags, key),
    update: vi.fn(async (changes: Record<string, unknown>) => {
      for (const [path, value] of Object.entries(changes)) {
        foundry.utils.setProperty(flags, path.replace('flags.dnd35e.', ''), value);
      }
      return true;
    }),
    flags,
  };
}

function makeWarning(sourceUuid = 'Actor.hero.Item.sword', id = 'action:one:formula:attackFormula'): PreparationWarning {
  return {
    id,
    sourceUuid,
    sourcePath: ['Hero', 'Sword'],
    field: 'system.actions.one.attackFormula.formula',
    message: 'Invalid formula',
    severity: 'error',
  };
}

describe('preparation diagnostic prominence', () => {
  let source: ReturnType<typeof makeSource>;
  let user: { isGM: boolean };
  let packs: Map<string, { locked: boolean }>;
  const hosts: Array<ReturnType<typeof mount>> = [];
  function makeStore(mode: ViewMode = 'edit', editable = true) {
    const item = Object.assign(source, {
      documentName: 'Item', type: 'weapon', system: {}, effects: [],
    }) as unknown as ItemDnd35e;
    let store!: ReturnType<typeof useDocumentSheetStore<ItemDnd35e>>;
    const host = mount(defineComponent({
      setup() {
        const context: VueApplicationContext<ItemDnd35e> = {
          document: item,
          appConfigOptions: { document: item } as VueApplicationContext<ItemDnd35e>['appConfigOptions'],
          close: async () => {},
        };
        store = useDocumentSheetStore(context, { renderModeStore: useRenderModeStore(true, true, mode, editable), defaultTabs: [] });
        store._storeUtils.setGetFreshDocument(async () => item);
        return () => h('div');
      },
    }));
    hosts.push(host);
    return store;
  }
  afterEach(() => {
    for (const host of hosts.splice(0)) host.unmount();
  });
  beforeEach(() => {
    source = makeSource();
    user = { isGM: true };
    packs = new Map();
    vi.stubGlobal('game', {
      user,
      packs,
      i18n: { localize: (key: string) => key, format: (key: string) => key },
    });
    Object.assign(foundry.utils, {
      fromUuidSync: vi.fn((uuid: string) => uuid === source.uuid ? source : null),
      fromUuid: vi.fn(async (uuid: string) => uuid === source.uuid ? source : null),
      parseUuid: vi.fn(() => ({ embedded: [] })),
      randomID: vi.fn().mockReturnValueOnce('revision-one').mockReturnValueOnce('revision-two').mockReturnValue('revision-three'),
    });
  });

  it('preserves legacy warning/error defaults and multi-host origin metadata', () => {
    const actor = { name: 'Hero', uuid: 'Actor.hero', _preparationWarnings: [] as PreparationWarning[] };
    const item = { ...source, parent: actor };
    pushPreparationWarning(item, 'system.price', 'Legacy warning');
    pushPreparationWarningToHosts([actor, item], 'system.weight', 'Legacy error', 'error');
    expect(item._preparationWarnings.map(warning => warning.severity)).toEqual(['warning', 'error']);
    expect(actor._preparationWarnings[0].sourceUuid).toBe(source.uuid);
    for (const warning of item._preparationWarnings) expect(getPreparationWarningBannerState(warning).banner).toBe(true);
  });

  it('persists source-owned preferences shared by aggregate and source diagnostics across regeneration', async () => {
    const warning = makeWarning();
    await setPreparationWarningBanner(warning, false);
    const regenerated = { ...warning, message: 'A different formula failed', field: 'system.actions.3.attackFormula.formula' };
    expect(getPreparationWarningBannerState(regenerated).banner).toBe(false);
    expect(warning.severity).toBe('error');
    expect(source.update).toHaveBeenCalledWith({
      [`flags.dnd35e.preparationWarningOverrides.${preparationWarningKey(warning)}`]: { banner: false, revision: 'revision-one' },
    });
    expect(getPreparationWarningBannerState(makeWarning(source.uuid, 'action:two:formula:attackFormula')).banner).toBe(true);
    expect(preparationWarningKey({ ...warning, id: 'action.one' })).not.toContain('.');
  });

  it('reads loaded compendium documents and asynchronously loads indexed sources for writes', async () => {
    source.uuid = 'Compendium.dnd35e.weapons.Item.sword';
    source.pack = 'dnd35e.weapons';
    packs.set(source.pack, { locked: false });
    const warning = makeWarning(source.uuid);
    vi.mocked(foundry.utils.fromUuidSync).mockReturnValueOnce({
      _id: 'sword', name: 'Sword', type: 'weapon', img: 'icons/svg/sword.svg', uuid: 'Compendium.dnd35e.weapons.Item.sword',
    });
    expect(getPreparationWarningBannerState(warning).banner).toBe(true);
    await setPreparationWarningBanner(warning, false);
    expect(foundry.utils.fromUuid).toHaveBeenCalledWith(source.uuid);
    expect(getPreparationWarningBannerState(warning).banner).toBe(false);
    await setPreparationWarningBanner(warning, null);
    expect(getPreparationWarningBannerState(warning).banner).toBe(true);
  });

  it('reads embedded compendium sources from the loaded root and writes through their full UUID', async () => {
    const rootUuid = 'Compendium.dnd35e.weapons.Item.sword';
    source.uuid = `${rootUuid}.ActiveEffect.effect`;
    source.pack = 'dnd35e.weapons';
    packs.set(source.pack, { locked: false });
    const getEmbeddedDocument = vi.fn(() => source);
    vi.mocked(foundry.utils.parseUuid).mockReturnValue({
      type: 'ActiveEffect', embedded: ['ActiveEffect', 'effect'],
    });
    Object.assign(foundry.utils, {
      fromUuidSync: vi.fn((uuid: string) => {
        if (uuid !== rootUuid) throw new Error('Embedded compendium UUID cannot resolve synchronously');
        return { getEmbeddedDocument };
      }),
    });
    const warning = makeWarning(source.uuid);
    await setPreparationWarningBanner(warning, false);
    expect(foundry.utils.fromUuid).toHaveBeenCalledWith(source.uuid);
    expect(getPreparationWarningBannerState(warning).banner).toBe(false);
    expect(getEmbeddedDocument).toHaveBeenCalledWith('ActiveEffect', 'effect');
    packs.set(source.pack, { locked: true });
    await expect(setPreparationWarningBanner(warning, true)).rejects.toThrow('SourceLocked');
  });

  it('keeps preferences independent for changes sharing a target and for rules on one change', async () => {
    const actor = { name: 'Hero', uuid: 'Actor.hero', _preparationWarnings: [] as PreparationWarning[] };
    const effect = { ...source, parent: actor };
    for (const id of ['change:first:value:formula', 'change:second:value:formula', 'change:first:condition:formula']) {
      pushPreparationWarningToHosts([actor, effect], 'system.hardness', 'Failed', 'warning', { id, defaultBanner: true });
    }
    const [first, second, condition] = actor._preparationWarnings;
    await setPreparationWarningBanner(first, false);
    expect(getPreparationWarningBannerState(first).banner).toBe(false);
    expect(getPreparationWarningBannerState(second).banner).toBe(true);
    expect(getPreparationWarningBannerState(condition).banner).toBe(true);
    expect(effect._preparationWarnings).toEqual(actor._preparationWarnings);
  });
  it('reopens dismissed banners on promotion and reset, but not on tab-only changes', async () => {
    const warning = makeWarning();
    dismissPreparationWarnings('sheet-promote', [warning]);
    await setPreparationWarningBanner(warning, false);
    expect(isPreparationWarningsDismissed('sheet-promote', [warning])).toBe(false);
    dismissPreparationWarnings('sheet-promote', [warning]);
    const advisory = { ...makeWarning(source.uuid, 'advisory'), defaultBanner: false };
    expect(isPreparationWarningsDismissed('sheet-promote', [warning, advisory])).toBe(true);
    await setPreparationWarningBanner(warning, true);
    expect(isPreparationWarningsDismissed('sheet-promote', [warning])).toBe(false);
    dismissPreparationWarnings('sheet-promote', [warning]);
    await setPreparationWarningBanner(warning, null);
    expect(getPreparationWarningBannerState(warning).banner).toBe(true);
    expect(isPreparationWarningsDismissed('sheet-promote', [warning])).toBe(false);
    await setPreparationWarningBanner(advisory, true);
    await setPreparationWarningBanner(advisory, null);
    expect(getPreparationWarningBannerState(advisory).banner).toBe(false);
  });

  it('rejects non-GMs at execution, missing sources, locked packs and cancelled updates', async () => {
    user.isGM = false;
    await expect(setPreparationWarningBanner(makeWarning(), false)).rejects.toThrow('GMOnly');
    expect(source.update).not.toHaveBeenCalled();
    user.isGM = true;
    await expect(setPreparationWarningBanner(makeWarning('Item.deleted'), false)).rejects.toThrow('SourceMissing');
    source.pack = 'dnd35e.weapons';
    packs.set(source.pack, { locked: true });
    await expect(setPreparationWarningBanner(makeWarning(), false)).rejects.toThrow('SourceLocked');
    source.pack = undefined;
    source.update.mockResolvedValueOnce(false);
    await expect(setPreparationWarningBanner(makeWarning(), false)).rejects.toThrow('UpdateFailed');
  });

  it.each<ViewMode>(['edit', 'play', 'true'])('allows GM management in %s mode and keeps the entry after demotion', async (mode) => {
    source.uuid = `Actor.hero.Item.${mode}`;
    source._preparationWarnings = [makeWarning(source.uuid)];
    const store = makeStore(mode);
    const global = { provide: { [DocumentSheetStoreSymbol]: store } };
    const tab = mount(PreparationWarningsTab, { global });
    const banner = mount(PreparationWarningsBanner, { global });
    expect(tab.find('summary .fa-ellipsis-vertical').exists()).toBe(true);
    expect(banner.find('.preparation-warnings-banner').exists()).toBe(true);
    await tab.findAll('button')[1].trigger('click');
    await flushPromises();
    expect(banner.find('.preparation-warnings-banner').exists()).toBe(false);
    expect(tab.find('.preparation-warning-row.error').exists()).toBe(true);
    expect(tab.text()).toContain('PreparationWarningTabOnly');
    await tab.findAll('button')[0].trigger('click');
    await flushPromises();
    expect(banner.find('.preparation-warnings-banner').exists()).toBe(true);
    await banner.get('button').trigger('click');
    expect(banner.find('.preparation-warnings-banner').exists()).toBe(false);
    await tab.findAll('button')[2].trigger('click');
    await flushPromises();
    expect(banner.find('.preparation-warnings-banner').exists()).toBe(true);
    tab.unmount();
    banner.unmount();
  });

  it('does not expose management to non-GMs and rechecks permission after rendering', async () => {
    source._preparationWarnings = [makeWarning()];
    const isGM = ref(false);
    const store = makeStore();
    const tab = mount(PreparationWarningsTab, {
      global: { provide: { [DocumentSheetStoreSymbol]: {
        ...store,
        documentGetters: {
          ...store.documentGetters,
          canManagePreparationWarnings: computed(() => isGM.value),
        },
      } } },
    });
    expect(tab.find('details').exists()).toBe(false);
    isGM.value = true;
    await flushPromises();
    user.isGM = false;
    const onError = vi.fn();
    vi.stubGlobal('Hooks', { onError });
    await tab.findAll('button')[1].trigger('click');
    await flushPromises();
    expect(onError).toHaveBeenCalledOnce();
    expect(source.update).not.toHaveBeenCalled();
    tab.unmount();
  });

  it('owns pending state, rejects concurrent writes, refreshes the store and clears pending after failure', async () => {
    const store = makeStore();
    const freshDocument = vi.fn(async () => source as unknown as ItemDnd35e);
    store._storeUtils.setGetFreshDocument(freshDocument);
    let finish!: (value: boolean) => void;
    source.update.mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const mutation = store.documentActions.setPreparationWarningBanner(makeWarning(), false);
    expect(store.documentGetters.isPreparationWarningUpdatePending.value).toBe(true);
    expect(await store.documentActions.setPreparationWarningBanner(makeWarning(), true)).toBe(false);
    expect(source.update).toHaveBeenCalledOnce();
    finish(true);
    expect(await mutation).toBe(true);
    expect(freshDocument).toHaveBeenCalledWith(source.uuid);
    expect(store.documentGetters.isPreparationWarningUpdatePending.value).toBe(false);

    const onError = vi.fn();
    vi.stubGlobal('Hooks', { onError });
    source.update.mockRejectedValueOnce(new Error('Cannot save'));
    expect(await store.documentActions.setPreparationWarningBanner(makeWarning(), false)).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'DocumentSheetStore#setPreparationWarningBanner', expect.any(Error), { log: 'error', notify: 'error' }
    );
    expect(store.documentGetters.isPreparationWarningUpdatePending.value).toBe(false);
  });

  it.each<ViewMode>(['edit', 'play', 'true'])('rejects read-only sheets independently of %s mode and reacts to permission changes', async mode => {
    source._preparationWarnings = [makeWarning()];
    const store = makeStore(mode, false);
    const tab = mount(PreparationWarningsTab, {
      global: { provide: { [DocumentSheetStoreSymbol]: store } },
    });
    const onError = vi.fn();
    vi.stubGlobal('Hooks', { onError });
    expect(store.documentGetters.canManagePreparationWarnings.value).toBe(false);
    expect(tab.find('details').exists()).toBe(false);
    expect(await store.documentActions.setPreparationWarningBanner(makeWarning(), false)).toBe(false);
    expect(source.update).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(store.documentGetters.isPreparationWarningUpdatePending.value).toBe(false);

    store._storeUtils.renderModeStore.setSheetEditable(true);
    await flushPromises();
    expect(tab.find('details').exists()).toBe(true);
    store._storeUtils.renderModeStore.setSheetEditable(false);
    expect(await store.documentActions.setPreparationWarningBanner(makeWarning(), false)).toBe(false);
    await flushPromises();
    expect(tab.find('details').exists()).toBe(false);
    expect(source.update).not.toHaveBeenCalled();
    tab.unmount();
  });
});
