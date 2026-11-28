// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
}));
vi.mock('@effects/containment/index.mjs', () => ({
  syncContainmentAe: vi.fn(),
}));
vi.mock('@items/physical/equippableItem/EquippableItem.mjs', () => ({
  EquippableItem: class {},
}));
vi.mock('@actors/baseActor/sheet/components/itemRowStoreRegistry.mjs', () => ({
  InventoryListStoreSymbol: Symbol.for('test.InventoryListStore'),
}));
vi.mock('@items/physical/ammo/sheet/components/AmmoInventoryRow.vue', () => ({ default: {} }));
vi.mock('@items/physical/container/sheet/components/ContainerInventoryRow.vue', () => ({ default: {} }));
vi.mock('@items/physical/weapon/sheet/components/WeaponInventoryRow.vue', () => ({ default: {} }));

import InventoryListTable from '@actors/baseActor/sheet/components/InventoryListTable.vue';
import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
import { syncContainmentAe } from '@effects/containment/index.mjs';
import type { ItemType, PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import { containerItemType, weaponItemType } from '@items/itemTypes.mjs';
import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

class DroppedItem {
  static implementation = { fromDropData: vi.fn() };
  id = 'axe';
  name = 'Battle Axe';
  uuid = 'Item.axe';
  type: ItemType = weaponItemType;
  parent: { uuid: string } | null = null;
  system = { isCarried: false, containerUuid: null as string | null };
  update = vi.fn();
  toObject = vi.fn(() => ({ name: 'Battle Axe', type: this.type, system: this.system }));
}

const makeContainer = () => ({
  uuid: 'Item.bag',
  actor: null as { uuid: string; createEmbeddedDocuments: ReturnType<typeof vi.fn> } | null,
  canAddItemToContents: vi.fn(() => true),
});

function mountTable(ownerUuid?: string | null, physicalItems: PHYSICAL_ITEMS[] = []) {
  return shallowMount(InventoryListTable, {
    props: {
      variant: 'contained',
      containerUuid: 'Item.bag',
      ownerUuid,
      items: [],
      emptyLabel: 'empty',
    },
    global: {
      provide: {
        [DocumentSheetStoreSymbol]: {
          documentGetters: {
            documentUuid: computed(() => 'Item.bag'),
            physicalItems: computed(() => physicalItems),
            getIsFieldEditable: () => computed(() => true),
            getOrCreateItemRowStore: vi.fn(),
          },
        },
      },
    },
  });
}

describe('InventoryListTable container drops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Item', DroppedItem);
    vi.stubGlobal('foundry', {
      ...foundry,
      applications: {
        ux: { TextEditor: { getDragEventData: () => ({ type: 'Item' }) } },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['parent', 'grandparent'])('rejects dropping a %s bag into its descendant without an ancestor in the contents list', async (relationship) => {
    const dropped = new DroppedItem();
    dropped.type = containerItemType;
    dropped.uuid = 'Item.ancestor';
    const container = {
      ...makeContainer(),
      system: {
        containerUuid: relationship === 'parent'
          ? dropped.uuid
          : 'Item.middle',
      },
    };
    const middle = { system: { containerUuid: dropped.uuid } };
    const resolve = vi.fn((uuid: string) => {
      if (uuid === container.uuid) return container;
      if (uuid === 'Item.middle') return middle;
      return null;
    });
    vi.stubGlobal('fromUuidSync', resolve);
    DroppedItem.implementation.fromDropData.mockResolvedValue(dropped);
    const cycleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountTable(null);

    await wrapper.get('.inventory-drop-zone').trigger('drop');
    await flushPromises();

    expect(cycleError).toHaveBeenCalledWith('[inventory-drop] Prevented cyclic container nesting.', {
      droppedUuid: dropped.uuid,
      targetContainerUuid: container.uuid,
    });
    expect(container.canAddItemToContents).not.toHaveBeenCalled();
    expect(syncContainmentAe).not.toHaveBeenCalled();
    expect(dropped.update).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('permits an unrelated bag when the target has a non-cyclic ancestor chain', async () => {
    const dropped = new DroppedItem();
    dropped.type = containerItemType;
    dropped.uuid = 'Item.unrelated';
    const container = { ...makeContainer(), system: { containerUuid: 'Item.outer' } };
    const outer = { system: { containerUuid: null } };
    vi.stubGlobal('fromUuidSync', vi.fn((uuid: string) =>
      uuid === container.uuid
        ? container
        : outer));
    DroppedItem.implementation.fromDropData.mockResolvedValue(dropped);
    const wrapper = mountTable(null);

    await wrapper.get('.inventory-drop-zone').trigger('drop');
    await flushPromises();

    expect(container.canAddItemToContents).toHaveBeenCalledWith(dropped);
    expect(syncContainmentAe).toHaveBeenCalledWith(dropped, container);
    wrapper.unmount();
  });

  it('displays supplied containment contents before the source item link update finishes', async () => {
    const item = new DroppedItem();
    const wrapper = mountTable(null);

    await wrapper.setProps({ items: [item as unknown as PHYSICAL_ITEMS] });

    expect(wrapper.getComponent({ name: 'CategorizedListTable' }).props('rows')).toMatchObject([
      { id: item.id, item: { uuid: item.uuid } },
    ]);

    await wrapper.setProps({ items: [] });
    expect(wrapper.getComponent({ name: 'CategorizedListTable' }).props('rows')).toEqual([]);
    wrapper.unmount();
  });

  it('still filters the actor item pool when no explicit contents list is supplied', async () => {
    const contained = new DroppedItem();
    contained.system.containerUuid = 'Item.bag';
    const outside = new DroppedItem();
    outside.id = 'outside';
    outside.uuid = 'Item.outside';
    const wrapper = mountTable(null, [contained, outside] as unknown as PHYSICAL_ITEMS[]);

    await wrapper.setProps({ items: undefined });

    expect(wrapper.getComponent({ name: 'CategorizedListTable' }).props('rows')).toMatchObject([
      { id: contained.id, item: { uuid: contained.uuid } },
    ]);
    wrapper.unmount();
  });

  it('validates a rejected item before attempting to resolve an owner or mutate it', async () => {
    const item = new DroppedItem();
    const container = makeContainer();
    container.canAddItemToContents.mockReturnValue(false);
    const resolveOwner = vi.fn();
    vi.stubGlobal('fromUuid', resolveOwner);
    vi.stubGlobal('fromUuidSync', vi.fn(() => container));
    DroppedItem.implementation.fromDropData.mockResolvedValue(item);
    const wrapper = mountTable();

    await wrapper.get('.inventory-drop-zone').trigger('drop');
    await flushPromises();

    expect(container.canAddItemToContents).toHaveBeenCalledWith(item);
    expect(resolveOwner).not.toHaveBeenCalled();
    expect(syncContainmentAe).not.toHaveBeenCalled();
    expect(item.update).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each([undefined, null])('stows an item in a standalone bag with ownerUuid %s', async (ownerUuid) => {
    const item = new DroppedItem();
    const container = makeContainer();
    vi.stubGlobal('fromUuidSync', vi.fn(() => container));
    DroppedItem.implementation.fromDropData.mockResolvedValue(item);
    const wrapper = mountTable(ownerUuid);

    await wrapper.get('.inventory-drop-zone').trigger('drop');
    await flushPromises();

    expect(container.canAddItemToContents).toHaveBeenCalledWith(item);
    expect(syncContainmentAe).toHaveBeenCalledWith(item, container);
    wrapper.unmount();
  });

  it('links an actor-owned source directly when the target bag has no actor', async () => {
    const item = new DroppedItem();
    item.parent = { uuid: 'Actor.source' };
    const container = makeContainer();
    vi.stubGlobal('fromUuidSync', vi.fn(() => container));
    DroppedItem.implementation.fromDropData.mockResolvedValue(item);
    const wrapper = mountTable(null);

    await wrapper.get('.inventory-drop-zone').trigger('drop');
    await flushPromises();

    expect(syncContainmentAe).toHaveBeenCalledWith(item, container);
    wrapper.unmount();
  });

  it('copies an external item onto the bag actor rather than using the table owner prop', async () => {
    const item = new DroppedItem();
    const copiedItem = new DroppedItem();
    copiedItem.uuid = 'Actor.owner.Item.copy';
    const container = makeContainer();
    container.actor = {
      uuid: 'Actor.owner',
      createEmbeddedDocuments: vi.fn().mockResolvedValue([copiedItem]),
    };
    vi.stubGlobal('fromUuidSync', vi.fn(() => container));
    DroppedItem.implementation.fromDropData.mockResolvedValue(item);
    const wrapper = mountTable('Item.bag');

    await wrapper.get('.inventory-drop-zone').trigger('drop');
    await flushPromises();

    expect(container.actor.createEmbeddedDocuments).toHaveBeenCalledOnce();
    expect(syncContainmentAe).toHaveBeenCalledWith(copiedItem, container);
    wrapper.unmount();
  });
});
