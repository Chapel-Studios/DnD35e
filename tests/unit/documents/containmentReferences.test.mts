import { containmentEffectType } from '@effects/containment/containmentEffectType.mjs';
import { removeItemFromContainer, syncContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import { ammoItemType } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

function template () {
  return {
    id: 'arrows', name: 'Arrows', uuid: 'Compendium.source.items.Item.arrows', pack: 'source.items', type: ammoItemType,
    system: { quantity: 20, weight: 0.1, price: { stacks: [] }, containerUuid: null },
    update: vi.fn(),
  };
}

function container () {
  return {
    uuid: 'Item.bag', system: { containerUuid: null },
    effects: [] as { id: string; type: string; system: { sourceItemUuid: string }; update: ReturnType<typeof vi.fn> }[],
    canAddItemToContents: vi.fn(() => true),
    createEmbeddedDocuments: vi.fn(),
    deleteEmbeddedDocuments: vi.fn(),
  };
}

describe('reference-only compendium containment', () => {
  afterEach(() => vi.restoreAllMocks());

  function initializeCurrencyStub () {
    vi.spyOn(CurrencyData, 'fromStacks').mockImplementation(stacks => ({ stacks }) as CurrencyData);
  }

  it.each(['world', 'compendium'])('adds a reference to a %s bag without writing source backlinks', async (destination) => {
    initializeCurrencyStub();
    const item = template();
    const bag = { ...container(), pack: destination === 'compendium' ? 'target.items' : null };
    await syncContainmentAe(item as unknown as PhysicalItemLike, bag as unknown as Container);
    expect(bag.createEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [expect.objectContaining({
      system: expect.objectContaining({ sourceItemUuid: item.uuid, contributedCount: 20, contributedWeight: 2 }),
    })]);
    expect(item.update).not.toHaveBeenCalled();
  });

  it('updates an existing reference in place rather than adding another AE', async () => {
    initializeCurrencyStub();
    const item = template();
    const bag = container();
    const effect = { id: 'effect', type: containmentEffectType, system: { sourceItemUuid: item.uuid }, update: vi.fn() };
    bag.effects.push(effect);
    await syncContainmentAe(item as unknown as PhysicalItemLike, bag as unknown as Container);
    expect(effect.update).toHaveBeenCalledOnce();
    expect(bag.createEmbeddedDocuments).not.toHaveBeenCalled();
    expect(item.update).not.toHaveBeenCalled();
  });

  it('removes just the selected bag reference, preserving the template and other bags', async () => {
    const item = template();
    const bag = container();
    bag.effects.push({ id: 'effect', type: containmentEffectType, system: { sourceItemUuid: item.uuid }, update: vi.fn() });
    await removeItemFromContainer(item as unknown as PhysicalItemLike, bag as unknown as Container);
    expect(bag.deleteEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', ['effect']);
    expect(item.update).not.toHaveBeenCalled();
  });

  it('does not attempt to write a locked target when its stored contribution is already current', async () => {
    initializeCurrencyStub();
    const item = template();
    const bag = { ...container(), pack: 'locked.items' };
    const effect = {
      id: 'effect', type: containmentEffectType,
      system: {
        sourceItemUuid: item.uuid, contributedCount: 20, contributedWeight: 2,
        contributedPrice: { stacks: [] },
      },
      update: vi.fn(),
    };
    bag.effects.push(effect);
    await syncContainmentAe(item as unknown as PhysicalItemLike, bag as unknown as Container);
    expect(effect.update).not.toHaveBeenCalled();
    expect(bag.createEmbeddedDocuments).not.toHaveBeenCalled();
  });
});
