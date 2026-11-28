const mocks = vi.hoisted(() => ({
  physicalStore: vi.fn(),
  rowCache: vi.fn(),
  inject: vi.fn(),
  onError: vi.fn(),
}));

vi.mock('@items/physical/physicalItem/index.mjs', () => ({ usePhysicalItemStore: mocks.physicalStore }));
vi.mock('@actors/baseActor/sheet/components/itemRowStoreRegistry.mjs', () => ({
  createItemRowStoreCache: mocks.rowCache,
}));
vi.mock('@items/physical/physicalItem/sheet/tabs/index.mjs', () => ({ physicalItemEffectsTab: {} }));
vi.mock('@items/physical/container/sheet/index.mjs', () => ({
  containerDetailsTab: {},
  containerInventoryTab: {},
}));
vi.mock('@settings/shared/sheet/index.mjs', () => ({ SettingsStoreSymbol: Symbol('settings') }));
vi.mock('vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue')>(),
  inject: mocks.inject,
}));

import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import { useContainerStore } from '@items/physical/container/sheet/ContainerStore.mjs';
import { flushPromises } from '@vue/test-utils';
import type { VueApplicationConfiguration, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EffectScope } from 'vue';
import { effectScope, shallowRef, triggerRef } from 'vue';

let scope: EffectScope;

function makeStore(getContents: () => Promise<PHYSICAL_ITEMS[]>) {
  const getContentsSync = vi.fn(() => { throw new Error('Inventory must not resolve contents synchronously'); });
  const container = Object.assign(Object.create(null) as Container, { getContents, getContentsSync });
  const document = shallowRef(container);
  const refreshRows = vi.fn().mockResolvedValue(undefined);
  mocks.physicalStore.mockReturnValue({
    documentGetters: { getViewAwareFieldValue: vi.fn() },
    _storeUtils: {
      document,
      renderModeStore: {},
      refreshDocument: async () => { triggerRef(document); },
    },
  });
  mocks.rowCache.mockReturnValue({ getOrCreateItemRowStore: vi.fn(), refreshItemRowStores: refreshRows });
  const context: VueApplicationContext<Container> = {
    document: container,
    appConfigOptions: Object.assign(Object.create(null) as VueApplicationConfiguration<Container>, { document: container }),
    close: async () => {},
  };
  scope = effectScope();
  const store = scope.run(() => useContainerStore(
    context,
    { registerGlobally: false }
  ));
  if (!store) throw new Error('Container store scope did not initialize');
  return { store, refreshRows, getContentsSync };
}

describe('Container inventory document resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inject.mockReturnValue({ currency: { highestVisibleCoin: shallowRef('srd_gp') } });
    vi.stubGlobal('Hooks', { onError: mocks.onError });
  });

  afterEach(() => {
    scope?.stop();
    vi.unstubAllGlobals();
  });

  it('loads initial contents asynchronously before publishing documents to inventory rows', async () => {
    const item = Object.assign(Object.create(null) as PHYSICAL_ITEMS, { uuid: 'Compendium.world.ammunition.Item.arrows' });
    const getContents = vi.fn().mockResolvedValue([item]);
    const { store, refreshRows, getContentsSync } = makeStore(getContents);

    expect(store.documentGetters.contents.value).toEqual([]);
    await flushPromises();

    expect(store.documentGetters.contents.value).toEqual([item]);
    expect(refreshRows).toHaveBeenCalledExactlyOnceWith([item]);
    expect(getContentsSync).not.toHaveBeenCalled();
  });

  it('does not publish or refresh rows with superseded contents resolutions', async () => {
    let resolveInitial!: (items: PHYSICAL_ITEMS[]) => void;
    const initial = new Promise<PHYSICAL_ITEMS[]>((resolve) => { resolveInitial = resolve; });
    const stale = Object.assign(Object.create(null) as PHYSICAL_ITEMS, { uuid: 'Item.removed' });
    const current = Object.assign(Object.create(null) as PHYSICAL_ITEMS, { uuid: 'Item.current' });
    const getContents = vi.fn().mockReturnValueOnce(initial).mockResolvedValue([current]);
    const { store, refreshRows } = makeStore(getContents);

    await store._storeUtils.refreshDocument();
    resolveInitial([stale]);
    await flushPromises();

    expect(store.documentGetters.contents.value).toEqual([current]);
    expect(refreshRows).toHaveBeenCalledExactlyOnceWith([current]);
  });

  it('reports failed resolutions and rejects refresh instead of publishing an empty result', async () => {
    const item = Object.assign(Object.create(null) as PHYSICAL_ITEMS, { uuid: 'Item.current' });
    const getContents = vi.fn().mockResolvedValue([item]);
    const { store } = makeStore(getContents);
    await flushPromises();
    const error = new Error('Compendium document load failed');
    getContents.mockRejectedValueOnce(error);

    await expect(store._storeUtils.refreshDocument()).rejects.toThrow(error);

    expect(mocks.onError).toHaveBeenCalledWith('ContainerStore#refreshContents', error, {
      log: 'error',
      notify: 'error',
    });
    expect(store.documentGetters.contents.value).toEqual([item]);
  });
});
