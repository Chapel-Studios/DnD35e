vi.mock('@effects/baseActiveEffect/ActiveEffectDnd35e.mjs', () => ({
  ActiveEffectDnd35e: class {
    system: unknown;
    parent: unknown;
    events = new Events();
    constructor (source: { system: unknown }, context: { parent: unknown }) {
      this.system = source.system;
      this.parent = context.parent;
    }
  },
}));
vi.mock('@items/physical/container/Container.mjs', () => ({
  Container: class { static LifeCycle = { destroyed: 'destroyed' }; },
}));
vi.mock('@effects/containment/logic/containmentAe.mjs', () => ({
  removeContainmentReference: vi.fn(),
}));

import { Containment, type ContainmentSource } from '@effects/containment/Containment.mjs';
import { removeContainmentReference } from '@effects/containment/logic/containmentAe.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

class Events {
  handlers = new Map<string, Set<() => void | Promise<void>>>();
  once (event: string, handler: () => void | Promise<void>) {
    const handlers = this.handlers.get(event) ?? new Set();
    this.handlers.set(event, handlers);
    handlers.add(handler);
    return { cancel: () => { handlers.delete(handler); } };
  }
  async emit (event: string) {
    const handlers = [...(this.handlers.get(event) ?? [])];
    this.handlers.delete(event);
    for (const handler of handlers) await handler();
  }
}

async function fixture (pack: string | null) {
  const bag = { uuid: 'Item.bag', events: new Events() };
  const item = { pack, events: new Events(), system: { containerUuid: bag.uuid }, update: vi.fn() };
  vi.stubGlobal('fromUuid', vi.fn().mockResolvedValue(item));
  const effect = new Containment({
    type: 'containment', system: { sourceItemUuid: 'Item.contents' },
  } as PreCreate<ContainmentSource>, { parent: bag as unknown as Containment['parent'] });
  await Promise.resolve();
  return { bag, item, effect };
}

describe('containment subscription cleanup', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([null, 'source.items'])('bag destruction clears only mutable backlinks for source pack %s', async pack => {
    const { bag, item } = await fixture(pack);
    await bag.events.emit('destroyed');
    if (pack) expect(item.update).not.toHaveBeenCalled();
    else expect(item.update).toHaveBeenCalledWith({ 'system.containerUuid': null });
    await item.events.emit('destroyed');
    expect(removeContainmentReference).not.toHaveBeenCalled();
  });

  it('source destruction removes its contribution without updating the deleted source', async () => {
    const { bag, item } = await fixture('source.items');
    await item.events.emit('destroyed');
    expect(removeContainmentReference).toHaveBeenCalledWith(item, bag);
    expect(item.update).not.toHaveBeenCalled();
  });

  it('removing an AE cancels its source and container subscriptions', async () => {
    const { bag, item, effect } = await fixture(null);
    await effect.events.emit('destroyed', {});
    await bag.events.emit('destroyed');
    await item.events.emit('destroyed');
    expect(item.update).not.toHaveBeenCalled();
    expect(removeContainmentReference).not.toHaveBeenCalled();
  });
});
