vi.mock('@effects/containment/index.mjs', () => ({ syncContainmentAe: vi.fn() }));
vi.mock('@items/physical/equippableItem/EquippableItem.mjs', () => ({ EquippableItem: class {} }));
vi.mock('@items/physical/container/logic/containerContents.mjs', () => ({
  validateContainerInsertion: vi.fn(),
  requireWritableContainerPack: vi.fn(),
  confirmWorldContentsCopy: vi.fn(),
}));

import { syncContainmentAe } from '@effects/containment/index.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import { addItemToContainer } from '@items/physical/container/logic/addItemToContainer.mjs';
import { EquippableItem } from '@items/physical/equippableItem/EquippableItem.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function fixture (external = false, limit = 5) {
  const sourceActor = { uuid: 'Actor.source', createEmbeddedDocuments: vi.fn().mockResolvedValue([]) };
  const targetActor = external
    ? { uuid: 'Actor.target', createEmbeddedDocuments: vi.fn().mockResolvedValue([]) }
    : sourceActor;
  const projection = Object.assign(Object.create(EquippableItem.prototype) as Weapon, {
    uuid: 'Actor.source.Item.weapon',
    system: { weight: 6, equippedSlotIds: [], isEquipped: false, isCarried: true },
  });
  const item = Object.assign(Object.create(EquippableItem.prototype) as Weapon, {
    uuid: 'Actor.source.Item.weapon', parent: sourceActor, pack: null,
    system: { weight: 0, equippedSlotIds: ['mainHand'], isEquipped: true, isCarried: true },
    clone: vi.fn(() => projection),
    performUnequip: vi.fn(async () => {
      item.system.equippedSlotIds = [];
      item.system.isEquipped = false;
      item.system.weight = 6;
      return true;
    }),
    update: vi.fn(),
    toObject: vi.fn(() => ({ _id: 'weapon', type: 'weapon', system: {}, effects: [] })),
  });
  const container = Object.assign(Object.create(null) as Container, {
    uuid: `${targetActor.uuid}.Item.bag`, actor: targetActor, pack: null,
    _source: { folder: null }, system: { isCarried: true },
    canAddItemToContents: vi.fn((candidate: PhysicalItemLike) => candidate.system.weight <= limit),
  });
  return { item, projection, container, sourceActor, targetActor };
}

describe('containment validation before unequipping or copying', () => {
  const confirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
    vi.stubGlobal('foundry', {
      ...foundry,
      applications: { ...foundry.applications, api: { ...foundry.applications.api, DialogV2: { confirm } } },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([false, true])('rejects an overweight equipped weapon without mutating or copying it (external=%s)', async external => {
    const { item, projection, container, targetActor } = fixture(external);
    await addItemToContainer(item, container);
    expect(container.canAddItemToContents).toHaveBeenCalledWith(projection);
    expect(item.system.isEquipped).toBe(true);
    expect(item.system.equippedSlotIds).toEqual(['mainHand']);
    expect(item.performUnequip).not.toHaveBeenCalled();
    expect(item.update).not.toHaveBeenCalled();
    expect(targetActor.createEmbeddedDocuments).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(syncContainmentAe).not.toHaveBeenCalled();
  });

  it('prepares copied weapons in the destination actor without retaining a colliding source ID', async () => {
    const { item, targetActor, container } = fixture(true);
    await addItemToContainer(item, container);
    expect(item.clone).toHaveBeenCalledWith(
      { 'system.equippedSlotIds': [], 'system.isCarried': true },
      { keepId: false, parent: targetActor, pack: null }
    );
  });

  it('preserves a fitting equipped weapon when the unequip confirmation is cancelled', async () => {
    const { item, container } = fixture(false, 6);
    confirm.mockResolvedValue(false);
    await addItemToContainer(item, container);
    expect(confirm).toHaveBeenCalledOnce();
    expect(item.performUnequip).not.toHaveBeenCalled();
    expect(syncContainmentAe).not.toHaveBeenCalled();
  });

  it('unequips a fitting weapon only after validation and confirmation', async () => {
    const { item, projection, container } = fixture(false, 6);
    await addItemToContainer(item, container);
    expect(container.canAddItemToContents).toHaveBeenCalledWith(projection);
    expect(item.performUnequip).toHaveBeenCalledOnce();
    expect(item.system.equippedSlotIds).toEqual([]);
    expect(syncContainmentAe).toHaveBeenCalledWith(item, container);
  });

  it('clears inactive equipment slots before carrying and containing the item', async () => {
    const { item, container } = fixture(false, 6);
    item.system.isEquipped = false;
    item.system.isCarried = false;
    await addItemToContainer(item, container);
    expect(confirm).not.toHaveBeenCalled();
    expect(item.performUnequip).toHaveBeenCalledOnce();
    expect(item.system.equippedSlotIds).toEqual([]);
    expect(item.update).toHaveBeenCalledWith({ 'system.isCarried': true });
  });
});
