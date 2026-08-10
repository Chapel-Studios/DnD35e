import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

import type { SecretSystemData } from './data/SecretSystemData.mjs';
import { PLAYER_EDIT_MASK_PRIORITY } from './data/SecretSystemModel.mjs';
import type { Secret } from './Secret.mjs';
import { secretEffectType } from './secretEffectType.mjs';

type PlayerEditMaskHostDocument = ItemDnd35e | ActorDnd35e;

/**
 * Find an existing Player Edit Secret on the host document, or create one.
 * There is exactly one Player Edit Secret per host — it accumulates all player field edits.
 */
async function findOrCreatePlayerEditSecret (host: PlayerEditMaskHostDocument): Promise<Secret> {
  const existing = [...host.effects].find(
    e => e.type === secretEffectType && (e.system as SecretSystemData).isPlayerEditSecret
  );
  if (existing) return existing as unknown as Secret;

  const created = await host.createEmbeddedDocuments('ActiveEffect', [{
    name: game.i18n.localize('dnd35e.EFFECT.Secret.PlayerEdit'),
    img: 'icons/svg/eye.svg',
    type: secretEffectType,
    origin: host.uuid,
    disabled: false,
    system: {
      isPlayerEditSecret: true,
    },
  }]);
  return created[0] as unknown as Secret;
}

/**
 * Add or update a MASK change on a Player Edit Secret for the given field path.
 * If a MASK change for that field already exists, update its value.
 * Otherwise, append a new MASK change at Player Edit priority.
 */
async function addOrUpdatePlayerEditMask (
  secret: Secret,
  fieldPath: string,
  value: unknown
): Promise<void> {
  const changes = [...secret.system.changes];
  const existingIndex = changes.findIndex(
    c => c.type === SYSTEM_CHANGE_TYPE.MASK && c.key === fieldPath
  );

  if (existingIndex >= 0) {
    changes[existingIndex] = { ...changes[existingIndex], value };
  } else {
    const target = secret.parent?.documentName === 'Actor'
      ? EFFECT_CHANGE_TARGET.ACTOR
      : EFFECT_CHANGE_TARGET.ITEM;
    changes.push({
      key: fieldPath,
      type: SYSTEM_CHANGE_TYPE.MASK,
      value,
      priority: PLAYER_EDIT_MASK_PRIORITY,
      phase: 'initial',
      target,
      isSystem: false,
      bonusType: undefined,
      condition: undefined,
    });
  }

  await secret.update({ 'system.changes': changes });
}

export { addOrUpdatePlayerEditMask, findOrCreatePlayerEditSecret };
