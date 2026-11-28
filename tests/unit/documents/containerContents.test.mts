import { containmentEffectType } from '@effects/containment/containmentEffectType.mjs';
import { ammoItemType, containerItemType } from '@items/itemTypes.mjs';
import { prepareContainerContents, validateContainerInsertion } from '@items/physical/container/logic/containerContents.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function contribution (uuid: string) {
  return {
    _id: 'effect',
    name: 'contribution',
    type: containmentEffectType,
    system: { sourceItemUuid: uuid, contributedCount: 20, contributedWeight: 3, contributedPrice: { stacks: [] } },
  };
}

function source (id: string, contents: string[] = [], type: string = containerItemType) {
  return {
    _id: id,
    type,
    name: id,
    folder: 'folder',
    ownership: { player: 3 },
    system: { containerUuid: null, isCarried: true, quantity: 20 },
    effects: contents.map(contribution),
  };
}

const documents = new Map<string, {
  uuid: string;
  pack: string | null;
  type: string;
  toObject: () => ReturnType<typeof source>;
}>();

function register (uuid: string, contents: string[] = [], type: string = containerItemType) {
  const data = source(uuid.split('.').at(-1)!, contents, type);
  const item = {
    uuid, type,
    pack: uuid.startsWith('Compendium.') ? 'source.templates' : null,
    toObject: () => structuredClone(data),
  };
  documents.set(uuid, item);
  return item;
}

describe('container contents creation planning', () => {
  let nextId: number;
  const confirm = vi.fn();
  const pack = { title: 'Destination', locked: false, getDocument: vi.fn() };

  beforeEach(() => {
    nextId = 0;
    documents.clear();
    confirm.mockResolvedValue(true);
    pack.locked = false;
    pack.getDocument.mockResolvedValue(null);
    vi.stubGlobal('fromUuid', vi.fn(async (uuid: string) => documents.get(uuid) ?? null));
    vi.stubGlobal('game', { ...game, packs: new Map([['target.items', pack]]) });
    vi.stubGlobal('ui', { notifications: { error: vi.fn() } });
    vi.stubGlobal('foundry', {
      ...foundry,
      utils: { ...foundry.utils, randomID: () => `copy${++nextId}` },
      applications: { ...foundry.applications, api: { ...foundry.applications.api, DialogV2: { confirm } } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['world', 'actor'])('instantiates nested template contents independently into the %s destination', async (destination) => {
    const ammo = register('Compendium.source.templates.Item.arrows', [], ammoItemType);
    register('Compendium.source.templates.Item.inner', [ammo.uuid]);
    const root = source('quiver', ['Compendium.source.templates.Item.inner']);
    const prepared = await prepareContainerContents([root], destination === 'actor'
      ? { parent: { uuid: 'Actor.hero' } }
      : { fromCompendium: true });
    expect(prepared?.rootCount).toBe(1);
    expect(prepared?.sources).toHaveLength(3);
    const [quiver, inner, arrows] = prepared!.sources;
    const prefix = destination === 'actor' ? 'Actor.hero.Item.' : 'Item.';
    expect(foundry.utils.getProperty(quiver, 'effects.0.system.sourceItemUuid')).toBe(`${prefix}${inner._id}`);
    expect(foundry.utils.getProperty(inner, 'system.containerUuid')).toBe(`${prefix}${quiver._id}`);
    expect(foundry.utils.getProperty(inner, 'effects.0.system.sourceItemUuid')).toBe(`${prefix}${arrows._id}`);
    expect(foundry.utils.getProperty(arrows, 'system.containerUuid')).toBe(`${prefix}${inner._id}`);
    expect(foundry.utils.getProperty(arrows, 'system.quantity')).toBe(20);
    expect(arrows.folder).toBe(destination === 'actor' ? null : 'folder');
    expect(root.effects[0].system.sourceItemUuid).toBe('Compendium.source.templates.Item.inner');
    expect(ammo.toObject().system.containerUuid).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('retains references while composing a world container rather than instantiating them', async () => {
    register('Compendium.source.templates.Item.arrows', [], ammoItemType);
    expect(await prepareContainerContents([source('bag', ['Compendium.source.templates.Item.arrows'])], {})).toBeUndefined();
  });

  it('exports world contents beside the destination and retains existing locked-pack references', async () => {
    const template = register('Compendium.source.templates.Item.arrows', [], ammoItemType);
    register('Item.inner', ['Item.coins', template.uuid]);
    register('Item.coins', [], ammoItemType);
    const root = source('bag', ['Item.inner', template.uuid]);
    const prepared = await prepareContainerContents([root], { pack: 'target.items', keepId: true });
    expect(confirm).toHaveBeenCalledOnce();
    expect(prepared?.sources).toHaveLength(3);
    const [bag, inner, coins] = prepared!.sources;
    expect(bag._id).toBe('bag');
    expect(foundry.utils.getProperty(bag, 'effects.0.system.sourceItemUuid')).toBe(`Compendium.target.items.Item.${inner._id}`);
    expect(foundry.utils.getProperty(bag, 'effects.1.system.sourceItemUuid')).toBe(template.uuid);
    expect(foundry.utils.getProperty(inner, 'effects.1.system.sourceItemUuid')).toBe(template.uuid);
    for (const item of [inner, coins]) {
      expect(item.folder).toBe('folder');
      expect(foundry.utils.getProperty(item, 'system.containerUuid')).toBeNull();
    }
    expect(root.effects[0].system.sourceItemUuid).toBe('Item.inner');
  });

  it('preserves the existing destination folder on compendium replacement', async () => {
    register('Item.arrows', [], ammoItemType);
    pack.getDocument.mockResolvedValue({ toObject: () => ({ folder: 'destinationFolder' }) });
    const root: Record<string, unknown> = source('bag', ['Item.arrows']);
    delete root.folder;
    const prepared = await prepareContainerContents([root], { pack: 'target.items', keepId: true });
    expect(prepared?.sources[1].folder).toBe('destinationFolder');
  });

  it('cancels export without changing the source or generating copy IDs', async () => {
    register('Item.arrows', [], ammoItemType);
    const root = source('bag', ['Item.arrows']);
    confirm.mockResolvedValue(false);
    expect(await prepareContainerContents([root], { pack: 'target.items' })).toBeNull();
    expect(nextId).toBe(0);
    expect(root.effects[0].system.sourceItemUuid).toBe('Item.arrows');
  });

  it('rejects a locked destination before presenting a copy dialog', async () => {
    register('Item.arrows', [], ammoItemType);
    pack.locked = true;
    await expect(prepareContainerContents([source('bag', ['Item.arrows'])], { pack: 'target.items' }))
      .rejects.toThrow('lockedDestination');
    expect(confirm).not.toHaveBeenCalled();
    expect(nextId).toBe(0);
  });

  it.each(['cycle', 'missing'])('rejects %s references before generating IDs or presenting a dialog', async (failure) => {
    if (failure === 'cycle') register('Item.inner', ['Item.inner']);
    await expect(prepareContainerContents([source('bag', ['Item.inner'])], { pack: 'target.items' }))
      .rejects.toThrow(failure === 'cycle' ? 'cyclicContents' : 'missingContents');
    expect(confirm).not.toHaveBeenCalled();
    expect(nextId).toBe(0);
  });

  it('rejects cycles through template references even without containerUuid backlinks', async () => {
    const parent = register('Compendium.source.templates.Item.parent', ['Compendium.source.templates.Item.child']);
    register('Compendium.source.templates.Item.child');
    await expect(validateContainerInsertion(parent as unknown as PhysicalItemLike, 'Compendium.source.templates.Item.child'))
      .rejects.toThrow('cyclicContents');
  });

  it('rejects replacement that would make an existing pack container reference itself', async () => {
    register('Compendium.target.items.Item.bag');
    await expect(prepareContainerContents([source('bag', ['Compendium.target.items.Item.bag'])], { pack: 'target.items', keepId: true }))
      .rejects.toThrow('cyclicContents');
  });
});
