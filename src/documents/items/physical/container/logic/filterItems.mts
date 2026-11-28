import { containerItemType, ITEM_TYPES_LOCALIZED, type ItemType,weaponItemType } from '@items/index.mjs';
import { ammoItemType } from '@items/itemTypes.mjs';
import type { Ammo } from '@items/physical/ammo/index.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';

const getItemAllowedMsg = (
  item: PhysicalItemLike,
  allowedItemTypes: Set<ItemType> | null,
  allowedSubtypes: Record<ItemType, Set<string> | null>
): string | null => {
  const itemTypeLabel = game.i18n.localize(ITEM_TYPES_LOCALIZED[item.type]);
  if (
    allowedItemTypes?.size
    && !allowedItemTypes.has(item.type)
  ) {
    return game.i18n.format('dnd35e.CONTAINER.warnings.notAllowed', {
      type: itemTypeLabel,
    });
  }

  const itemSubtypes = allowedSubtypes[item.type];
  if (!itemSubtypes?.size) {
    return null;
  }

  let subtype = null;
  if (item.type === weaponItemType) {
    const weapon = item as Weapon;
    subtype = weapon.system.isBaseWeaponType
      ? weapon._source.name
      : weapon.system.weaponBaseType;
  }
  else if (item.type === ammoItemType) {
    subtype = (item as Ammo).system.ammoType;
  }
  else if (item.type === containerItemType) {
    subtype = (item as Container).system.containerType;
  }

  if (
    subtype !== null
    && !itemSubtypes.has(subtype)
  ) {
    return game.i18n.format('dnd35e.CONTAINER.warnings.notAllowedSubtype', {
      type: itemTypeLabel,
      subtype,
    });
  }

  return null;
};

export { getItemAllowedMsg };
