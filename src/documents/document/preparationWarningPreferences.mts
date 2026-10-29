import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

import type { PreparationWarningOverride } from './data/DocumentFlagsDnd35e.mjs';
import type { PreparationWarning } from './preparationWarnings.mjs';

type WarningSource = ActorDnd35e | ItemDnd35e | ActiveEffectDnd35e;

function resolveWarningSource(warning: PreparationWarning): WarningSource | null {
  if (!warning.sourceUuid) return null;
  const source = foundry.utils.fromUuidSync(warning.sourceUuid);
  if (!source || !('_preparationWarnings' in source)) return null;
  return source as WarningSource;
}

function preparationWarningKey(warning: PreparationWarning): string {
  return encodeURIComponent(warning.id ?? warning.field).replace(/\./g, '%2E');
}

function getPreparationWarningBannerState(warning: PreparationWarning): { banner: boolean; revision: string } {
  const source = resolveWarningSource(warning);
  const preference = source?.getFlag(
    'dnd35e', `preparationWarningOverrides.${preparationWarningKey(warning)}`
  ) as PreparationWarningOverride | undefined;
  return {
    banner: preference?.banner ?? warning.defaultBanner ?? true,
    revision: preference?.revision ?? '',
  };
}

async function setPreparationWarningBanner(warning: PreparationWarning, banner: boolean | null): Promise<void> {
  if (!game.user?.isGM) throw new Error(game.i18n.localize('dnd35e.COMMON.PreparationWarningGMOnly'));
  const source = resolveWarningSource(warning);
  if (!source) throw new Error(game.i18n.localize('dnd35e.COMMON.PreparationWarningSourceMissing'));
  if (source.pack && game.packs.get(source.pack)?.locked) {
    throw new Error(game.i18n.localize('dnd35e.COMMON.PreparationWarningSourceLocked'));
  }
  const preference: PreparationWarningOverride = { banner, revision: foundry.utils.randomID() };
  const updated = await source.update({
    [`flags.dnd35e.preparationWarningOverrides.${preparationWarningKey(warning)}`]: preference,
  });
  if (!updated) throw new Error(game.i18n.localize('dnd35e.COMMON.PreparationWarningUpdateFailed'));
}

export { getPreparationWarningBannerState, preparationWarningKey, setPreparationWarningBanner };
