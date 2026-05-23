import {
  MASTERWORK_ARMOR_AE_UUID,
  MASTERWORK_WEAPON_AE_UUID,
} from '@constants/index.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

/**
 * Minimal structural type for items that can carry a Masterwork AE.
 * Avoids importing the concrete `PhysicalItem` class to keep this module
 * free of cycles with the class file or its sheet stores.
 */
type MasterworkAeTarget = ItemDnd35e<ItemType>;

/** Returns the compendium UUID for the Masterwork AE appropriate to the item type. */
export function getMasterworkAeUuid(itemType: string): string | null {
  if (itemType === 'weapon') return MASTERWORK_WEAPON_AE_UUID;
  if (itemType === 'equipment') return MASTERWORK_ARMOR_AE_UUID;
  return null;
}

/** Returns true if `effect` is any Masterwork material AE (system-managed or custom). */
export function isMasterworkAe(effect: ActiveEffect): boolean {
  return (
    effect.type === materialEffectType
    && (effect.system as { materialSubtype?: string } | undefined)?.materialSubtype === 'masterwork'
  );
}

/** Returns true if `effect` is the system-managed Masterwork material AE. */
export function isSystemManagedMasterworkAe(effect: ActiveEffect): boolean {
  return isMasterworkAe(effect) && effect.getFlag('dnd35e', 'systemManaged') === true;
}

/** Finds the first system-managed Masterwork AE on the item. */
export function findSystemManagedMasterworkAe(item: MasterworkAeTarget): ActiveEffect | undefined {
  return [...item.effects].find((e) => isSystemManagedMasterworkAe(e as unknown as ActiveEffect)) as
    | ActiveEffect
    | undefined;
}

/** Finds all Masterwork material AEs on the item (system-managed and custom). */
export function findAllMasterworkAes(item: MasterworkAeTarget): ActiveEffect[] {
  return [...item.effects].filter((e) => isMasterworkAe(e as unknown as ActiveEffect)) as unknown as ActiveEffect[];
}

/** Fetches the Masterwork AE from the compendium and attaches it to the item. */
export async function attachDefaultMasterworkAe(
  item: MasterworkAeTarget,
  options: { enabled?: boolean } = {}
): Promise<void> {
  const uuid = getMasterworkAeUuid(item.type);
  if (!uuid) return;
  const sourceAe = await fromUuid<ActiveEffect>(uuid);
  if (!sourceAe) {
    console.warn(`dnd35e | Could not find Masterwork AE at UUID: ${uuid}`);
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
 * Syncs all Masterwork material AEs on the item to match `isMasterwork`.
 * - If ANY masterwork AEs exist (system-managed or custom), flips ALL of them.
 * - If none exist and `isMasterwork` is true, attaches a fresh enabled default AE.
 * - If none exist and `isMasterwork` is false, no-op.
 */
export async function syncMasterworkAeState(item: MasterworkAeTarget, isMasterwork: boolean): Promise<void> {
  const masterworkAes = findAllMasterworkAes(item);
  if (masterworkAes.length > 0) {
    const updates = masterworkAes
      .filter((ae) => ae.disabled === isMasterwork)
      .map((ae) => ({ _id: ae.id, disabled: !isMasterwork }));
    if (updates.length > 0) {
      await item.updateEmbeddedDocuments('ActiveEffect', updates);
    }
    return;
  }
  if (isMasterwork) {
    await attachDefaultMasterworkAe(item, { enabled: true });
  }
}
