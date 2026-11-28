vi.mock('@items/physical/physicalItem/PhysicalItem.mjs', () => ({
  PhysicalItem: class {
    static LifeCycle = {};
    _prepareDerivedItemData() {}
  },
}));
vi.mock('@items/physical/physicalItem/data/PhysicalItemSystemModel.mjs', () => ({
  PhysicalItemSystemModel: class {
    static LOCALIZATION_PREFIXES = [];
    prepareBaseData() {}
    prepareDerivedData() {}
  },
}));
vi.mock('@effects/containment/logic/containmentAe.mjs', async importOriginal => ({
  ...await importOriginal<typeof import('@effects/containment/logic/containmentAe.mjs')>(),
  findAllContainmentAe: vi.fn(() => []),
  findContainmentAeByItemUuid: vi.fn(),
}));

import type { Containment } from '@effects/containment/Containment.mjs';
import { findAllContainmentAe, findContainmentAeByItemUuid } from '@effects/containment/logic/containmentAe.mjs';
import { CurrencyData } from '@fields/index.mjs';
import { ammoItemType, containerItemType, weaponItemType } from '@items/itemTypes.mjs';
import { Container } from '@items/physical/container/Container.mjs';
import { CONTAINER_TYPE } from '@items/physical/container/data/constants.mjs';
import { ContainerSystemModel } from '@items/physical/container/data/ContainerSystemModel.mjs';
import { PhysicalItem, type PhysicalItemLike } from '@items/physical/physicalItem/PhysicalItem.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class TestContainer extends Container {
  prepareContents() {
    this._prepareDerivedItemData();
  }
}

const makeCurrency = () => Object.assign(new CurrencyData(), { stacks: [] });

const makeContainer = () => {
  const currency = makeCurrency();
  vi.spyOn(currency, 'getWeightInLbs').mockReturnValue(0.02);
  vi.spyOn(CurrencyData, 'fromStacks').mockReturnValue(currency);
  const model: ContainerSystemModel = Object.assign(Object.create(ContainerSystemModel.prototype) as ContainerSystemModel, {
    containerType: CONTAINER_TYPE.BAG,
    allowsCurrency: true,
    containedCurrency: currency,
    maxContentWeight: 10,
    contentsWeight: 0,
    allowedItemTypes: null,
    allowedItemSubtypes: { weapon: null, ammo: null, container: null },
  });
  const container = Object.create(TestContainer.prototype) as TestContainer;
  container.system = model;
  return { container, model, currency };
};

const makeItem = (): PhysicalItemLike => Object.assign(Object.create(PhysicalItem.prototype) as PhysicalItemLike, {
  type: weaponItemType,
  system: { weight: 5, quantity: 1, price: makeCurrency(), isBaseWeaponType: false, weaponBaseType: 'Battle Axe' },
});

describe('Container contents preparation and acceptance', () => {
  const warn = vi.fn();

  beforeEach(() => {
    warn.mockClear();
    vi.mocked(findAllContainmentAe).mockReturnValue([]);
    vi.mocked(findContainmentAeByItemUuid).mockReset();
    vi.stubGlobal('ui', { notifications: { warn } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects compendium index entries in synchronous contents but preserves cached document lookup', () => {
    const { container } = makeContainer();
    const uuid = 'Compendium.world.ammunition.Item.arrows';
    vi.mocked(findAllContainmentAe).mockReturnValue([
      { system: { sourceItemUuid: uuid } } as Containment,
    ]);
    const item = makeItem();
    vi.stubGlobal('fromUuidSync', vi.fn()
      .mockReturnValueOnce({ _id: 'arrows', type: ammoItemType })
      .mockReturnValue(item));

    expect(() => container.getContentsSync()).toThrow(`Container contents ${uuid} are not loaded; use getContents().`);
    expect(container.getContentsSync()).toEqual([item]);
  });

  it('preserves held currency across preparation and includes it in rollups', () => {
    const { container, model, currency } = makeContainer();
    model.prepareBaseData();
    model.prepareDerivedData();
    container.prepareContents();

    expect(model.containedCurrency).toBe(currency);
    expect(model.contentsWeight).toBe(0.02);
    expect(model.contentsValue).toBe(currency);
  });

  it('excludes disabled currency without clearing it, and always enables purses', () => {
    const { container, model, currency } = makeContainer();
    model.allowsCurrency = false;
    model.prepareDerivedData();
    container.prepareContents();

    expect(model.containedCurrency).toBe(currency);
    expect(model.contentsWeight).toBe(0);

    model.containerType = CONTAINER_TYPE.PURSE;
    model.prepareDerivedData();
    container.prepareContents();
    expect(model.allowsCurrency).toBe(true);
    expect(model.contentsWeight).toBe(0.02);
    expect(container.canAddItemToContents(makeItem())).toBe(false);
    expect(warn).toHaveBeenCalledWith('dnd35e.CONTAINER.warnings.noItemsInPurse');
  });

  it('rejects disallowed types and weapon base names before weight acceptance', () => {
    const { container, model } = makeContainer();
    model.allowedItemTypes = new Set([ammoItemType]);
    expect(container.canAddItemToContents(makeItem())).toBe(false);
    expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.CONTAINER.warnings.notAllowed', {
      type: 'TYPES.Item.weapon',
    });

    model.allowedItemTypes = new Set([weaponItemType]);
    model.allowedItemSubtypes.weapon = new Set(['Javelin']);
    expect(container.canAddItemToContents(makeItem())).toBe(false);
    expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.CONTAINER.warnings.notAllowedSubtype', {
      type: 'TYPES.Item.weapon',
      subtype: 'Battle Axe',
    });
  });

  it('fills the weight limit in the warning and accepts unrestricted items within capacity', () => {
    const { container, model } = makeContainer();
    model.contentsWeight = 6;
    expect(container.canAddItemToContents(makeItem())).toBe(false);
    expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.CONTAINER.warnings.tooHeavy', { limit: 10 });

    model.contentsWeight = 5;
    expect(container.canAddItemToContents(makeItem())).toBe(true);
  });

  it('keeps identically named weapon and container subtypes independent', () => {
    const { container, model } = makeContainer();
    model.allowedItemSubtypes = {
      weapon: new Set(['bag']), ammo: null, container: new Set(['quiver']),
    };
    const weapon = Object.assign(makeItem(), {
      system: { ...makeItem().system, weaponBaseType: 'bag' },
    });
    const bag = Object.assign(makeItem(), {
      type: containerItemType,
      _source: { system: { weight: 1 } },
      system: { ...makeItem().system, containerType: 'bag', contentsWeight: 0 },
    });
    expect(container.canAddItemToContents(weapon)).toBe(true);
    expect(container.canAddItemToContents(bag)).toBe(false);
  });

  it.each([null, new Set<string>()])('does not apply weapon restrictions to unrestricted ammunition (%s)', ammoSubtypes => {
    const { container, model } = makeContainer();
    model.allowedItemSubtypes = {
      weapon: new Set(['Deleted base weapon']), ammo: ammoSubtypes, container: null,
    };
    const ammo = Object.assign(makeItem(), {
      type: ammoItemType,
      system: { ...makeItem().system, ammoType: 'arrow' },
    });
    expect(container.canAddItemToContents(ammo)).toBe(true);
  });

  it('checks ammunition only against its own subtype selections', () => {
    const { container, model } = makeContainer();
    model.allowedItemSubtypes = {
      weapon: new Set(['bolt']), ammo: new Set(['arrow']), container: null,
    };
    const ammo = Object.assign(makeItem(), {
      type: ammoItemType,
      system: { ...makeItem().system, ammoType: 'bolt' },
    });
    expect(container.canAddItemToContents(ammo)).toBe(false);
    ammo.system.ammoType = 'arrow';
    expect(container.canAddItemToContents(ammo)).toBe(true);
  });

  it('does not count an already-contained item twice when checking capacity', () => {
    const { container, model } = makeContainer();
    model.contentsWeight = 10;
    vi.mocked(findContainmentAeByItemUuid).mockReturnValue({
      system: { contributedWeight: 5 },
    } as Containment);

    expect(container.canAddItemToContents(makeItem())).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'incoming coins', quantity: 1, displayedWeight: 1, contentsWeight: 1, parentWeight: 1, existingWeight: 0, limit: 2.5, accepted: false },
    { name: 'already-contained coins', quantity: 1, displayedWeight: 1, contentsWeight: 1, parentWeight: 3, existingWeight: 2, limit: 2.5, accepted: false },
    { name: 'already-contained weightless contents', quantity: 1, displayedWeight: 1, contentsWeight: 8, parentWeight: 10, existingWeight: 9, limit: 9.5, accepted: false },
    { name: 'stacked container at capacity', quantity: 2, displayedWeight: 3, contentsWeight: 2, parentWeight: 4, existingWeight: 4, limit: 4, accepted: true },
  ])('uses the complete nested contribution for $name', ({ quantity, displayedWeight, contentsWeight, parentWeight, existingWeight, limit, accepted }) => {
    const { container, model } = makeContainer();
    model.contentsWeight = parentWeight;
    model.maxContentWeight = limit;
    const item: PhysicalItemLike = Object.assign(Object.create(PhysicalItem.prototype), {
      uuid: 'Item.nested', type: containerItemType,
      _source: { system: { weight: 1 } },
      system: {
        weight: displayedWeight, quantity, contentsWeight,
        price: makeCurrency(), contentsValue: makeCurrency(),
      },
    });
    if (existingWeight) {
      vi.mocked(findContainmentAeByItemUuid).mockReturnValue({
        system: { contributedWeight: existingWeight },
      } as Containment);
    }
    expect(container.canAddItemToContents(item)).toBe(accepted);
    if (accepted) expect(warn).not.toHaveBeenCalled();
    else expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.CONTAINER.warnings.tooHeavy', { limit });
  });
});
