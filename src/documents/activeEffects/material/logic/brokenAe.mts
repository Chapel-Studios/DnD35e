import {
  BROKEN_ARMOR_AE_UUID,
  BROKEN_WEAPON_AE_UUID,
} from '@constants/compendiumUuids.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

/**
 * Minimal structural type for items that can carry a Broken AE.
 * Avoids importing the concrete `PhysicalItem` class to keep this module
 * free of cycles with the class file or its sheet stores.
 */
type BrokenAeTarget = ItemDnd35e<ItemType>;

/** Returns the compendium UUID for the Broken AE appropriate to the item type. */
export function getBrokenAeUuid(itemType: string): string | null {
  if (itemType === 'weapon') return BROKEN_WEAPON_AE_UUID;
  if (itemType === 'equipment') return BROKEN_ARMOR_AE_UUID;
  return null;
}

/** Returns true if `effect` is any Broken material AE (system-managed or custom). */
export function isBrokenAe(effect: ActiveEffect): boolean {
  return (
    effect.type === materialEffectType
    && (effect.system as { materialSubtype?: string } | undefined)?.materialSubtype === 'broken'
  );
}

/** Returns true if `effect` is the system-managed Broken material AE. */
export function isSystemManagedBrokenAe(effect: ActiveEffect): boolean {
  return isBrokenAe(effect) && effect.getFlag('dnd35e', 'systemManaged') === true;
}

/** Finds the first system-managed Broken AE on the item. */
export function findSystemManagedBrokenAe(item: BrokenAeTarget): ActiveEffect | undefined {
  return [...item.effects].find((e) => isSystemManagedBrokenAe(e as unknown as ActiveEffect)) as
    | ActiveEffect
    | undefined;
}

/** Finds all Broken material AEs on the item (system-managed and custom). */
export function findAllBrokenAes(item: BrokenAeTarget): ActiveEffect[] {
  return [...item.effects].filter((e) => isBrokenAe(e as unknown as ActiveEffect)) as unknown as ActiveEffect[];
}

/** Fetches the Broken AE from the compendium and attaches it to the item. */
export async function attachDefaultBrokenAe(
  item: BrokenAeTarget,
  options: { enabled?: boolean } = {}
): Promise<void> {
  const uuid = getBrokenAeUuid(item.type);
  if (!uuid) return;
  const sourceAe = await fromUuid<ActiveEffect>(uuid);
  if (!sourceAe) {
    console.warn(`dnd35e | Could not find Broken AE at UUID: ${uuid}`);
    return;
  }
  const data = sourceAe.toObject() as Record<string, unknown>;
  delete data._id;
  data.disabled = !options.enabled;
  data._stats = {
    ...(data._stats as Record<string, unknown>),
    compendiumSource: sourceAe.uuid,
    duplicateSource: null,
  };
  await item.createEmbeddedDocuments('ActiveEffect', [data]);
}

/**
 * Syncs all Broken material AEs on the item to match `isBroken`.
 * - If ANY broken AEs exist (system-managed or custom), flips ALL of them.
 * - If none exist and `isBroken` is true, attaches a fresh enabled default AE.
 * - If none exist and `isBroken` is false, no-op.
 */
export async function syncBrokenAeState(item: BrokenAeTarget, isBroken: boolean): Promise<void> {
  const brokenAes = findAllBrokenAes(item);
  if (brokenAes.length > 0) {
    const updates = brokenAes
      .filter((ae) => ae.disabled !== !isBroken)
      .map((ae) => ({ _id: ae.id, disabled: !isBroken }));
    if (updates.length > 0) {
      await item.updateEmbeddedDocuments('ActiveEffect', updates);
    }
    return;
  }
  if (isBroken) {
    await attachDefaultBrokenAe(item, { enabled: true });
  }
}
