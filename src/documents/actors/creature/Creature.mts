import { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { BonusType } from '@constants/bonusTypes.mjs';
import { BONUS_TYPE_ARMOR, BONUS_TYPE_NATURAL, BONUS_TYPE_SHIELD, BONUS_TYPE_SIZE } from '@constants/bonusTypes.mjs';
import { getEncumberedSpeed } from '@constants/carryingCapacity.mjs';
import { DOCUMENT_UPDATE_TYPES } from '@constants/documentUpdateTypes.mjs';
import type { SaveKey } from '@constants/saves.mjs';
import { SAVE_ABILITY_MAP, SAVE_KEYS, SAVE_KEYS_LOCALIZED } from '@constants/saves.mjs';
import { SIZE_MODIFIERS } from '@constants/sizes.mjs';
import type { DocumentUpdateMetadata, DocumentUpdateOptions } from '@documents/document/DocumentDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
import {
  EFFECT_CHANGE_TYPE,
  FINAL_EFFECT_CHANGE_PHASE,
  POST_EFFECT_CHANGE_PHASE,
} from '@effects/baseActiveEffect/data/index.mjs';
import { parseNumericChangeValue, STACK_RESULT_IGNORED } from '@helpers/stacking.mjs';
import type { RollModifier } from '@source/dice/index.mjs';
import { buildD20Formula, buildSaveCard, D20Roll, D20RollDialogConfig } from '@source/dice/index.mjs';

import { _debugCreature, isCreatureDebugEnabled } from './_debug.mjs';
import type { CreatureSystemData, CreatureSystemSource } from './data/index.mjs';
import { CreatureLifeCycle } from './events/CreatureLifeCycle.mjs';
import { registerCreatureEventChecks } from './events/index.mjs';
import { registerCreatureEvents } from './events/registerCreatureEvents.mjs';
import { handleUpdateHpViaDamage } from './logic/updateHpViaDamage.mjs';
import { handleUpdateHpViaHealing } from './logic/updateHpViaHealing.mjs';
import { handleNonLethalDamageUpdate } from './logic/updateNonlethalDamage.mjs';
import { updateTempHp } from './logic/updateTempHp.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from './sheet/components/constants.mjs';
import type { HpUpdateMetadata } from './types.mjs';

type CreatureSource = Omit<foundry.documents.ActorSource, 'system'>
  & { system: CreatureSystemSource; };

interface HpAdjustmentMetadata extends DocumentUpdateMetadata {
  updateType: typeof DOCUMENT_UPDATE_TYPES.HP_ADJUSTMENT_UPDATE;
  adjustmentAmount: number;
  damageType?: string;
  hpAdjustmentType: HpAdjustmentType,
}

/**
 * Abstract base for all creature-type actors (characters, NPCs, etc.).
 * Provides creature-shared schema (abilities, HP, BAB, AC, saves, init,
 * alignment, size, bio, speed) and the lifecycle event surface that all
 * creatures share.
 */
abstract class Creature extends ActorDnd35e {
  constructor(data: PreCreate<CreatureSource>, context?: DocumentConstructionContext<null>) {
    super(data, context);
    
    // register built-in lifecycle events for this document type
    registerCreatureEventChecks(this);

    // todo: sometime in alpha remove these
    // Test event subscriptions
    if (isCreatureDebugEnabled) {
      _debugCreature(this);
    }
  }

  declare system: CreatureSystemData;

  /**
   * Stub: returns 'Human' until the Race item type is implemented.
   * Will be replaced with a getter that resolves a linked Race item.
   */
  get race(): string {
    return 'Human';
  }

  /**
   * Roll a saving throw: opens the D20 roll dialog (unless `skipDialog`) for a situational
   * modifier and roll mode, evaluates a `D20Roll`, and posts a chat card with the full
   * modifier breakdown. Returns `null` if the user cancels the dialog. See
   * poc/phase-07-roll-formulas.md §7.9.
   */
  async rollSave(saveKey: SaveKey, options: {
    situationalModifier?: number;
    rollMode?: string;
    dc?: number;
    skipDialog?: boolean;
  } = {}): Promise<D20Roll | null> {
    const saveTotal = this.system.saves[saveKey];
    const saveLabel = game.i18n.localize(SAVE_KEYS_LOCALIZED[saveKey]);

    let situationalModifier = options.situationalModifier ?? 0;
    // `core.rollMode` is deprecated since v14 (removed v16) in favor of `core.messageMode`,
    // whose value now matches the CONFIG.ChatMessage.modes keys used by the roll dialog.
    let rollMode = options.rollMode ?? game.settings.get('core', 'messageMode');

    if (!options.skipDialog) {
      const result = await D20RollDialogConfig.roll({
        title: game.i18n.format('dnd35e.ROLL.RollSaveTitle', { save: saveLabel }),
        baseLabel: saveLabel,
        baseTotal: saveTotal,
        actorName: this.name,
        situationalModifier,
        rollMode,
        actorImage: this.img,
      });
      if (!result) return null;
      situationalModifier = result.situationalModifier;
      rollMode = result.rollMode;
    }

    // Same per-effect stacking breakdown `HasActiveEffectsNotification` shows on the sheet
    // (`effectOverrides`, filtered to applied entries) instead of one lumped save-total entry.
    const appliedSaveOverrides = (this.effectOverrides[`system.saves.${saveKey}`] ?? [])
      .filter((override) => override.stackResult !== STACK_RESULT_IGNORED);
    const modifierList: RollModifier[] = appliedSaveOverrides.length > 0
      ? appliedSaveOverrides.map((override) => ({ label: override.effectName, value: parseNumericChangeValue(override.value) }))
      : [{ label: saveLabel, value: saveTotal }];
    if (situationalModifier !== 0) {
      modifierList.push({ label: game.i18n.localize('dnd35e.ROLL.SituationalModifier'), value: situationalModifier });
    }

    const roll = new D20Roll(buildD20Formula(saveTotal, situationalModifier), {}, { situationalModifiers: modifierList });
    await roll.evaluate();

    const content = await buildSaveCard(roll, modifierList, {
      actorName: this.name,
      actorImage: this.img,
      saveLabel,
      dc: options.dc,
    });

    // Roll#toMessage is the Foundry-sanctioned way to post a Roll to chat: it merges our
    // overrides onto the default message data, then assigns `messageData.rolls = [this]`
    // before constructing/creating the ChatMessage (see client/dice/roll.mjs `toMessage()`).
    // `messageMode` (not the deprecated `rollMode` option) - `rollMode` here already holds a
    // CONFIG.ChatMessage.modes key (see the settings lookup above), matching `messageMode`'s
    // expected shape directly.
    // Cast needed: the ambient `DeepPartial<ChatMessageSource>` param type resolves to a
    // fully-required shape because `DeepPartial`'s default `TNestedValue = {}` matches any
    // object type, so `ChatMessageSource extends TNestedValue` short-circuits to `T` unchanged.
    await roll.toMessage(
      {
        content,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      } as ChatMessageSource,
      { messageMode: rollMode }
    );

    return roll;
  }

  /**
   * Max Dexterity bonus imposed by carrying-capacity encumbrance (SRD: Table
   * Carrying Loads — moderate load caps Dex to +3, heavy load caps it to +1).
   * Returns `null` when unencumbered (no cap). Used by `_buildEncumberedChanges()` to
   * compute the 'final'-phase downgrade written onto `system.abilities.dex.mod` -
   * `_buildDefenseChanges()`/`_buildSaveAbilityChanges()` run in the later 'post' phase
   * and read that already-downgraded value directly instead of re-deriving the cap.
   */
  private get _encumbranceMaxDexBonus(): number | null {
    if (this.system.encumbrance.tier <= 0) return null;
    return this.system.encumbrance.tier === 1 ? 3 : 1;
  }

  protected _buildEncumberedChanges(): EffectChangeDataDnd35e[] {
    // Tier 0 (light) has no penalty at all. Tier 1 (medium) gets the moderate penalty;
    // tier 2+ (heavy and beyond) gets the severe penalty - SRD does not further intensify
    // max Dex/check penalty past heavy, only speed keeps degrading (see getEncumberedSpeed).
    const maxDexBonus = this._encumbranceMaxDexBonus;
    if (maxDexBonus === null) return [];

    const results: EffectChangeDataDnd35e[] = [];
    const encumbranceTier = this.system.encumbrance.tier;
    const effectLabel = game.i18n.localize(`dnd35e.CREATURE.FIELDS.encumbrance.tier.${encumbranceTier}`);

    const pushChange = (key: string, value: number, hideFromEffectsTab = false): void => {
      results.push({
        key,
        target: 'actor',
        isSystem: true,
        type: EFFECT_CHANGE_TYPE.DOWNGRADE,
        value: value,
        priority: 20,
        phase: FINAL_EFFECT_CHANGE_PHASE,
        label: effectLabel,
        hideFromEffectsTab,
      });
    };

    // `this.system.speed.land` is safe to read directly here: `getSelfContributedChanges()`
    // runs from `ActorDnd35e.applyActiveEffects('final')`, which fires after
    // `prepareDerivedData()` has fully settled and before this pass applies its own
    // downgrade - so the value is always fresh, never a stale downgrade from a prior pass.
    const landSpeed = this.system.speed.land;
    const encumberedSpeed = getEncumberedSpeed(landSpeed, encumbranceTier);
    const isModeratelyEncumbered = encumbranceTier === 1;
    const armorCheckPenalty = isModeratelyEncumbered
      ? -3
      : -6;


    pushChange('system.encumbrance.maxDexBonus', maxDexBonus);
    pushChange('system.abilities.dex.mod', maxDexBonus, true);
    pushChange('system.encumbrance.armorCheckPenalty', armorCheckPenalty);
    if (encumberedSpeed < landSpeed) {
      pushChange('system.speed.land', encumberedSpeed);
    }

    return results;
  }

  /**
   * Live, self-contributed AC changes (`system.defense.armorClass`/`.touchAC`).
   * Replaces the old `calculateAC()` live-getter with real 'post'-phase ADD changes so AC
   * flows through the same AE stacking/`effectOverrides` pipeline as saves/encumbrance —
   * showing up in `HasActiveEffectsNotification` and (future) chat card breakdowns.
   *
   * Runs in 'post' (after 'final' fully applies) because the Dex term reads
   * `system.abilities.dex.mod`, which `_buildEncumberedChanges()` may downgrade in that
   * same 'final' pass - reading it here directly is only safe once 'final' has settled.
   *
   * `armorBonus`/`shieldBonus` read `system.defense.*` fields that are always 0 today (no
   * Armor/Shield item type yet) but are real 'initial'-phase AE targets for those future
   * item classes — since item contributions land in the earlier 'initial' phase, they're
   * already settled well before this 'post'-phase method reads them.
   */
  protected _buildDefenseChanges(): EffectChangeDataDnd35e[] {
    const results: EffectChangeDataDnd35e[] = [];

    const pushChange = (
      key: string,
      value: number,
      label: string,
      bonusType?: BonusType,
      hideFromEffectsTab?: boolean
    ): void => {
      if (value === 0) return;
      results.push({
        key,
        target: 'actor',
        isSystem: true,
        type: EFFECT_CHANGE_TYPE.ADD,
        value,
        bonusType,
        priority: 20,
        phase: POST_EFFECT_CHANGE_PHASE,
        label,
        hideFromEffectsTab,
      });
    };

    const baseLabel = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.base.label');
    const dexLabel = game.i18n.localize('dnd35e.ABILITY.dex.label');
    const sizeLabel = game.i18n.localize(`dnd35e.SIZE.${this.system.size}`);
    const armorLabel = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.armorBonus.label');
    const shieldLabel = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.shieldBonus.label');
    const naturalLabel = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.naturalArmor.label');

    const dexMod = this.system.abilities.dex.mod;
    const sizeMod = SIZE_MODIFIERS[this.system.size] ?? 0;
    const armorBonus = this.system.defense.armorBonus;
    const shieldBonus = this.system.defense.shieldBonus;
    const naturalArmor = this.system.defense.naturalArmor;
    const denyDexToAC = this.system.defense.denyDexToAC;

    for (const key of ['armorClass', 'touchAC'] as const) {
      const fieldKey = `system.defense.${key}`;

      // Base/size/Dex are the always-present formula components of AC, not
      // meaningful "effects" on their own - keep them out of the Effects tab.
      pushChange(fieldKey, 10, baseLabel, undefined, true);
      pushChange(fieldKey, sizeMod, sizeLabel, BONUS_TYPE_SIZE, true);
      if (!denyDexToAC) pushChange(fieldKey, dexMod, dexLabel, undefined, true);

      if (key !== 'touchAC') {
        pushChange(fieldKey, armorBonus, armorLabel, BONUS_TYPE_ARMOR);
        pushChange(fieldKey, shieldBonus, shieldLabel, BONUS_TYPE_SHIELD);
        pushChange(fieldKey, naturalArmor, naturalLabel, BONUS_TYPE_NATURAL);
      }
    }

    return results;
  }

  /**
   * Live, actor-targeted encumbrance-penalty, save-ability-mod, and AC changes - see
   * `ActorDnd35e.getSelfContributedChanges()`. Recomputed fresh from this actor's
   * current state on every call; never persisted, so there is no AE document to
   * seed, toggle, or race against.
   */
  override getSelfContributedChanges(phase: string): EffectChangeDataDnd35e[] {
    return [
      ...this._buildEncumberedChanges(),
      ...this._buildSaveAbilityChanges(),
      ...this._buildDefenseChanges(),
    ]
      .filter((change) => change.phase === phase);
  }


  /**
   * Ability-mod contribution to each save (Fort/Con, Reflex/Dex, Will/Wis - SRD default,
   * no per-save override yet). Runs in 'post' (after 'final' fully applies) so it reads
   * the already-settled ability mods - e.g. `_buildEncumberedChanges()` may downgrade
   * `system.abilities.dex.mod` in that same 'final' pass, and reading it here directly
   * would otherwise see the pre-downgrade value. `system.saves.*` is reset to 0 in
   * `prepareBaseData()` specifically so 'initial'/'final'/'post'-phase changes like this
   * one (and future class-save-progression AEs) can add onto it without compounding
   * across passes.
   */
  protected _buildSaveAbilityChanges(): EffectChangeDataDnd35e[] {
    const labels = {
      dex: game.i18n.localize('dnd35e.ABILITY.dex.label'),
      con: game.i18n.localize('dnd35e.ABILITY.con.label'),
      wis: game.i18n.localize('dnd35e.ABILITY.wis.label'),
    };

    return SAVE_KEYS.map((saveKey) => ({
      key: `system.saves.${saveKey}`,
      target: 'actor',
      isSystem: true,
      type: EFFECT_CHANGE_TYPE.ADD,
      value: this.system.abilities[SAVE_ABILITY_MAP[saveKey]].mod,
      priority: 20,
      phase: POST_EFFECT_CHANGE_PHASE,
      label: game.i18n.localize(labels[SAVE_ABILITY_MAP[saveKey]]),
      // The ability-mod contribution is a baseline formula component of the save, not a
      // meaningful "effect" on its own - keep it out of the Effects tab.
      hideFromEffectsTab: true,
    }));
  }

  /**
   * Static registry of lifecycle event names for this class.
   * Subclasses extend via spread:
   *   `static override readonly LifeCycle = { ...Creature.LifeCycle, levelUp: 'levelUp' } as const`
   */
  static override readonly LifeCycle = {
    ...super.LifeCycle,
    ...CreatureLifeCycle,
  } as const;

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    // stub value to 100 for sheet building; replace with real HP calculation when progression is implemented
    this.system.hp.max = 100;
  }

  async updateHP(
    amount: number,
    adjustmentType: HpAdjustmentType,
    metadata?: HpUpdateMetadata
  ): Promise<boolean> {
    const updateObject: Record<string, number> = {};
    const updatedHp = {
      ...this.system.hp,
    };

    // todo: DR should live here too, likely also in updateHpViaDamage
    if (adjustmentType === HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT) {
      const { newNonLethal } = handleNonLethalDamageUpdate(this.system.hp, amount, updateObject);
      updatedHp.nonlethal = newNonLethal;
    }    
    else if (adjustmentType === HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT) {
      const { newTempHp } = updateTempHp(this.system.hp, amount, updateObject);
      updatedHp.temp = newTempHp;
    }
    else if (adjustmentType === HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT) {
      const { newHp, newNonlethal } = handleUpdateHpViaHealing(this.system.hp, amount, updateObject);
      updatedHp.current = newHp;
      updatedHp.nonlethal = newNonlethal;
    }
    else {
      const { newHp, newTempHp } = handleUpdateHpViaDamage(this.system.hp, amount, updateObject);
      updatedHp.current = newHp;
      updatedHp.temp = newTempHp;
    }

    const updateMetadata: HpAdjustmentMetadata = {
      updateType: DOCUMENT_UPDATE_TYPES.HP_ADJUSTMENT_UPDATE,
      sourceDocumentId: metadata?.attackerId,
      sourceMessage: metadata?.source,
      damageType: metadata?.damageType,
      hpAdjustmentType: adjustmentType,
      adjustmentAmount: amount,
    };

    return !!(await this.update(updateObject, { updateMetadata } as DocumentUpdateOptions));
  }
}

registerCreatureEvents();

type CreatureLike = ActorDnd35e & Creature;

export { Creature };
export type {
  CreatureLike,
  CreatureSource,
  HpAdjustmentMetadata,
};
