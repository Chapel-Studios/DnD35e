import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import type { ActiveEffectSource } from '@common/documents/active-effect.mjs';
import type { DocumentFlagsDnd35e } from '@documents/document/index.mjs';
import { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import { LogHelper } from '@helpers/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import { COMBAT_KEYS } from '@settings/combat/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { MaterialSystemData, MaterialSystemSource } from './data/index.mjs';
import type { MaterialEffectType } from './materialEffectType.mjs';
import { materialEffectType } from './materialEffectType.mjs';

type MaterialSource = ActiveEffectSource<MaterialEffectType, MaterialSystemSource>;

interface MaterialEffectFlags {
  // Add material-specific flags here as needed
}

class Material extends ActiveEffectDnd35e {
  declare type: MaterialEffectType;
  declare system: MaterialSystemData;
  declare flags: DocumentFlagsDnd35e<MaterialEffectFlags>;

  override get transfer (): boolean {
    return false;
  }

  override get isTemporary () {
    return false;
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
  }

  override get localizedType (): string {
    return game.i18n.localize('dnd35e.COMMON.Material');
  }

  protected override async _preCreate(
    _updateData: DeepPartial<this['_source']>,
    _options: DatabaseCreateCallbackOptions,
    _user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const superResult = await super._preCreate(_updateData, _options, _user);
    return superResult && validateSingleMaterial(this) !== false;
  }
}

type MaterialType = Material;

/**
 * Validates whether a new Material AE should be allowed on its parent.
 * Returns false to block creation when the enforce-single-material setting is on
 * and the parent already has a Material AE of the same subtype (`standard`,
 * `broken`, or `masterwork`). Subtypes are evaluated independently — a parent
 * may carry at most one of each.
 */
function validateSingleMaterial(document: Material): false | void {
  if (document.type !== materialEffectType || !document.parent) return;

  // System-managed AEs are created by game logic, not user action. They
  // handle their own deduplication and must bypass this user-facing check.
  if (document.getFlag('dnd35e', 'systemManaged') === true) return;

  const incomingSubtype = document.system.materialSubtype;
  if (typeof incomingSubtype !== 'string') return;

  // dnd35e type-fix: `document.parent` is typed as core `Actor | Item` (ActiveEffectDnd35e's
  // extends clause uses a fixed core union to break circularity — see ActiveEffectDnd35e.mts).
  // Cast to the actual dnd35e-narrowed parent type so `.effects` resolves to
  // `ACTIVE_EFFECTS_DND35E` instead of core's wider `ActiveEffect<Actor | Item>`.
  const parent = document.parent as ActorDnd35e | ItemDnd35e;
  const existingSameSubtype = [
    ...(parent.effects ?? []),
  ].find(
    (e: ActiveEffectDnd35e) =>
      e.type === materialEffectType
      && (e.system as MaterialSystemData)?.materialSubtype === incomingSubtype
  );
  if (!existingSameSubtype) return;

  const enforce = game.settings.get(SYSTEM_ID, COMBAT_KEYS.ENFORCE_SINGLE_MATERIAL) as boolean;
  if (enforce) {
    foundry.ui.notifications?.error('dnd35e.EFFECT.EnforceSingleMaterialError', { localize: true });
    return false;
  }
  LogHelper.warn(`Multiple ${incomingSubtype} Material effects on a single item. This may cause unexpected stacking behavior.`);
}

export {
  Material,
  materialEffectType,
  validateSingleMaterial,
};

export type {
  MaterialEffectFlags,
  MaterialEffectType,
  MaterialSource,
  MaterialType,
};
