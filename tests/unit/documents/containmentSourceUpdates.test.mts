vi.mock('@effects/containment/logic/containmentAe.mjs', async importOriginal => ({
  ...await importOriginal<typeof import('@effects/containment/logic/containmentAe.mjs')>(),
  findContainmentAeByItemUuid: vi.fn(() => Object.create(null)),
  syncContainmentAe: vi.fn(),
  removeContainmentReference: vi.fn(),
}));
vi.mock('@items/physical/container/logic/containerContents.mjs', () => ({
  requireWritableContainerPack: vi.fn(),
}));

import type { Containment } from '@effects/containment/Containment.mjs';
import { removeContainmentReference, syncContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import { registerContainmentReference } from '@effects/containment/logic/containmentReferences.mjs';
import { ammoItemType, containerItemType, type PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import { requireWritableContainerPack } from '@items/physical/container/logic/containerContents.mjs';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Map<number, Handler>>();
const documents = new Map<string, PHYSICAL_ITEMS>();
const subscriptions: { cancel: () => void }[] = [];
let nextId = 0;

async function emit (hook: string, ...args: unknown[]) {
  for (const handler of [...(handlers.get(hook)?.values() ?? [])]) handler(...args);
  await flushPromises();
}

function source (type = ammoItemType): PHYSICAL_ITEMS {
  const item: PHYSICAL_ITEMS = Object.assign(Object.create(null), {
    uuid: 'Compendium.source.items.Item.contents', pack: 'source.items', type, update: vi.fn(),
  });
  documents.set(item.uuid, item);
  return item;
}

function reference (sourceUuid: string, uuid: string, pack: string | null = null) {
  const bag: Container = Object.assign(Object.create(null), { uuid, pack, documentName: 'Item' });
  documents.set(uuid, bag);
  const effect: Containment = Object.assign(Object.create(foundry.documents.ActiveEffect.prototype), {
    uuid: `${uuid}.ActiveEffect.reference`, parent: bag, system: { sourceItemUuid: sourceUuid },
  });
  subscriptions.push(registerContainmentReference(effect));
  return { bag, effect };
}

describe('referenced source contribution updates', () => {
  beforeEach(() => {
    handlers.clear();
    documents.clear();
    vi.clearAllMocks();
    vi.mocked(requireWritableContainerPack).mockReset();
    vi.mocked(syncContainmentAe).mockReset().mockImplementation(async (_item, bag) => {
      if (bag?.pack) requireWritableContainerPack(bag.pack);
    });
    vi.stubGlobal('game', { user: { id: 'writer', isGM: true } });
    vi.stubGlobal('fromUuid', vi.fn(async uuid => documents.get(uuid) ?? null));
    vi.stubGlobal('Hooks', {
      on: vi.fn((hook: string, handler: Handler) => {
        const id = ++nextId;
        const entries = handlers.get(hook) ?? new Map();
        handlers.set(hook, entries);
        entries.set(id, handler);
        return id;
      }),
      off: vi.fn((hook: string, id: number) => handlers.get(hook)?.delete(id)),
      onError: vi.fn(),
    });
  });
  afterEach(async () => {
    await flushPromises();
    for (const subscription of subscriptions.splice(0)) subscription.cancel();
    vi.unstubAllGlobals();
  });

  it('refreshes every referencing bag using the current source instance after cache eviction', async () => {
    const original = source();
    const first = reference(original.uuid, 'Item.first');
    const second = reference(original.uuid, 'Item.second');
    const reloaded = source();
    expect(reloaded).not.toBe(original);
    await emit('updateItem', reloaded, { system: { quantity: 30 } }, {}, 'writer');
    expect(syncContainmentAe).toHaveBeenCalledWith(reloaded, first.bag);
    expect(syncContainmentAe).toHaveBeenCalledWith(reloaded, second.bag);
    expect(syncContainmentAe).toHaveBeenCalledTimes(2);
    expect(reloaded.update).not.toHaveBeenCalled();
  });

  it.each(['weight', 'quantity', 'price', 'allowsCurrency', 'containerType', 'containedCurrency'])(
    'refreshes container source references when %s changes', async key => {
      const item = source(containerItemType);
      const { bag } = reference(item.uuid, 'Item.bag');
      await emit('updateItem', item, { system: { [key]: 1 } }, {}, 'writer');
      expect(syncContainmentAe).toHaveBeenCalledWith(item, bag);
    }
  );

  it('ignores unrelated edits and updates received on non-initiating clients', async () => {
    const item = source();
    reference(item.uuid, 'Item.bag');
    await flushPromises();
    vi.mocked(syncContainmentAe).mockClear();
    await emit('updateItem', item, { name: 'New name' }, {}, 'writer');
    await emit('updateItem', item, { system: { quantity: 30 } }, {}, 'other-user');
    expect(syncContainmentAe).not.toHaveBeenCalled();
  });

  it.each(['createActiveEffect', 'updateActiveEffect', 'deleteActiveEffect'])(
    'refreshes reference-only ancestors after %s changes a pack container contribution', async hook => {
      const item = source();
      const inner = reference(item.uuid, 'Compendium.destination.items.Item.inner', 'destination.items');
      const outer = reference(inner.bag.uuid, 'Item.outer');
      const args = hook === 'updateActiveEffect' ? [inner.effect, {}, {}, 'writer'] : [inner.effect, {}, 'writer'];
      await emit(hook, ...args);
      expect(syncContainmentAe).toHaveBeenCalledWith(inner.bag, outer.bag);
    }
  );

  it('reports locked destinations and still refreshes writable references', async () => {
    const item = source();
    reference(item.uuid, 'Compendium.locked.items.Item.bag', 'locked.items');
    const writable = reference(item.uuid, 'Item.writable');
    vi.mocked(requireWritableContainerPack).mockImplementation(() => { throw new Error('Destination is locked'); });
    await emit('updateItem', item, { system: { weight: 2 } }, {}, 'writer');
    expect(syncContainmentAe).toHaveBeenCalledTimes(2);
    expect(syncContainmentAe).toHaveBeenCalledWith(item, writable.bag);
    expect(Hooks.onError).toHaveBeenCalledWith('Containment#syncReferences',
      expect.objectContaining({ message: expect.stringContaining('Destination is locked') }),
      { log: 'error', notify: 'error' });
  });

  it('removes pack-source references on destruction without writing to the deleted template', async () => {
    const item = source();
    const { bag } = reference(item.uuid, 'Item.bag');
    await emit('deleteItem', item, {}, 'writer');
    expect(removeContainmentReference).toHaveBeenCalledWith(item, bag);
    expect(syncContainmentAe).not.toHaveBeenCalled();
    expect(item.update).not.toHaveBeenCalled();
    expect([...handlers.values()].every(entries => entries.size === 0)).toBe(true);
  });

  it.each(['effect', 'container'])('cancels subscriptions when the %s is deleted', async target => {
    const item = source();
    const { bag, effect } = reference(item.uuid, 'Item.bag');
    await emit(target === 'effect' ? 'deleteActiveEffect' : 'deleteItem', target === 'effect' ? effect : bag, {}, 'writer');
    await emit('updateItem', item, { system: { quantity: 30 } }, {}, 'writer');
    expect(syncContainmentAe).not.toHaveBeenCalled();
    expect([...handlers.values()].every(entries => entries.size === 0)).toBe(true);
  });

  it('replaces duplicate UUID registrations without letting stale cancellation remove the current subscription', async () => {
    const item = source();
    const { bag, effect } = reference(item.uuid, 'Item.bag');
    const stale = subscriptions[0];
    subscriptions.push(registerContainmentReference(effect));
    stale.cancel();
    await emit('updateItem', item, { system: { quantity: 30 } }, {}, 'writer');
    expect(syncContainmentAe).toHaveBeenCalledOnce();
    expect(syncContainmentAe).toHaveBeenCalledWith(item, bag);
  });

  it('catches up a newly loaded referencing bag without waiting for another source edit', async () => {
    const item = source();
    const { bag } = reference(item.uuid, 'Item.later-loaded');
    await flushPromises();
    expect(syncContainmentAe).toHaveBeenCalledWith(item, bag);
  });

  it('does not write when a reference is cancelled while its target is resolving', async () => {
    const item = source();
    const { bag } = reference(item.uuid, 'Item.bag');
    let resolveTarget!: (bag: Container) => void;
    const target = new Promise<Container>(resolve => { resolveTarget = resolve; });
    vi.stubGlobal('fromUuid', vi.fn(async uuid => uuid === bag.uuid ? target : item));
    await flushPromises();
    subscriptions[0].cancel();
    resolveTarget(bag);
    await flushPromises();
    expect(syncContainmentAe).not.toHaveBeenCalled();
    expect(Hooks.onError).not.toHaveBeenCalled();
  });
});
