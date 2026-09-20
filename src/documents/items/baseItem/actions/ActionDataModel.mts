/**
 * ActionDataModel — poc.10 §10.3 first cut.
 *
 * Embedded DataModel entries living on `Weapon.system.actions` (a
 * `TypedSchemaField`-discriminated `ArrayField`, see `WeaponSystemModel.mts`) — not
 * separate Foundry Documents. Weapon-only for poc.10; natural attacks/unarmed strike/
 * combat maneuvers are out of scope (see phase-10-basic-combat.md §10.3).
 *
 * The `type` field IS the `TypedSchemaField({ melee_weapon_attack, ranged_weapon_attack,
 * ... })` discriminant (see `WeaponSystemModel.mts`'s `schema.actions`) — leaf subtypes
 * (`MeleeWeaponAttack`, `RangedWeaponAttack`) lock it to their own concrete value, the
 * same way Foundry core's `Region.shapes` discriminates its shape subtypes.
 *
 * @module
 */
import { ACTION_ECONOMY, ACTION_ECONOMY_TYPES } from '@constants/actionEconomy.mjs';
import { EFFECT_CHANGE_PHASE, EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import { requiredStringField, requiredTypedStringField } from '@fields/fieldBuilders.mjs';
import { FormulaData, FormulaField } from '@helpers/formulae/index.mjs';
import type { ITEMS_DND35E } from '@items/itemTypes.mjs';

import { ACTION_TRIGGER, ACTION_TRIGGERS, ACTION_TYPE, ACTION_TYPES } from '../actions/constants.mjs';
import type { ActionResult, IAction, UseActionContext } from '../actions/types.mjs';
import type { ActionSourceData } from './ActionSourceData.mjs';

const {
  fields: {
    ArrayField,
    BooleanField,
    DocumentIdField,
    SchemaField,
    NumberField,
    StringField,
    HTMLField,
  },
} = foundry.data;

/**
 * Shared base schema/behavior for all weapon-attack action subtypes. Declares the public
 * `executeAction()`/`continue()` interface the execution engine (`useAction()`, Story D)
 * calls — never invoking attack-specific logic directly.
 *
 * Story C ships a functional-but-partial `executeAction()`: full signature, target-count
 * validation, and melee reach validation (self-contained, no Story D dependency). It
 * returns early with `cancelled: true` before any dialog/roll/chat-card work, which is
 * Story D's deliverable (Attack Roll Dialog + `useAction()`).
 */
abstract class ActionDataModel extends foundry.abstract.DataModel {
  declare name: FormulaData;
  declare abstract isTargetRequired: boolean;
  maxTargets: number | null = null;

  static override defineSchema(): Record<string, any> {
    return {
      // Stable per-entry key `Weapon.getContributedActorChanges()`/`system.actions`
      // target directly (`system.actions.<_id>.*`) — not a Foundry embedded
      // Document id, just a stable random string generated once at creation.
      _id: new DocumentIdField({ required: true, blank: false, initial: () => foundry.utils.randomID() }),
      name: new FormulaField({
        expectedType: 'string',
        contexts: [
          // 'self' aliases to the Item (not the Actor, unlike attackFormula/damageFormula
          // below) since an action's name is naturally described from its owning weapon's
          // perspective - "Longsword Attack", not "<actor name> Attack".
          { contextName: 'Item', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['self', 'weapon'] },
          { contextName: 'Actor', resolvePath: 'parent.parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['actor'] },
        ],
        initialFormula: '#self.name Attack',
      }),
      // Flips to false the moment a user edits any field — see weaponActionSync.mts.
      isSystemCreated: new BooleanField({ required: true, initial: true }),
      // Independently invokable (shown in its own top-level accordion row/actor-side
      // aggregation) vs. only reachable via a parent action's `chain` — see the Weapon
      // sheet Actions tab's "add to chain" authoring (poc.10 Story C follow-up).
      isTopLevel: new BooleanField({ required: true, initial: true }),
      // No fixed default — always locked to a concrete value by the leaf subtype
      // (MeleeWeaponAttack/RangedWeaponAttack/...), never instantiated on the abstract base.
      type: new StringField({
        required: true,
        blank: false,
        choices: [...ACTION_TYPES],
        initial: ACTION_TYPE.MELEE_WEAPON_ATTACK,
      }),
      activationCost: new StringField({
        choices: [...ACTION_ECONOMY_TYPES],
        initial: ACTION_ECONOMY.STANDARD,
        required: true,
      }),
      provokes: new BooleanField({ required: true, initial: false }),
      maxTargets: new NumberField({ required: true, initial: 1, integer: true, min: 1, nullable: true }),
      isTargetRequired: new BooleanField({ required: true, initial: true }),
      description: new HTMLField(),  
      // check: new SchemaField({
      //   formula: new FormulaField({
      //     expectedType: 'string',
      //     contexts: [
      //       { contextName: 'Actor', resolvePath: 'parent.parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['self'] },
      //       { contextName: 'Item', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['item', 'weapon'] },
      //     ],
      //   }),
      //   against: new StringField({
      //     choices: ['armorClass', 'touchAc', 'flatFootedAc'],
      //     initial: 'armorClass',
      //     required: true,
      //   }),
      // }, { required: false, nullable: true, initial: null }),

      // damage: new SchemaField({
      // }, { required: false, nullable: true, initial: null }),

      // // Present only on ranged/thrown actions — see §10.9.
      // range: new SchemaField({
      //   increment: new NumberField({ required: true, integer: true, initial: 0 }),
      //   ammoType: new StringField({ required: false, blank: true, initial: '' }),
      // }, { required: false, nullable: true, initial: null }),

      chain: new ArrayField(
        new SchemaField({
          actionId: requiredStringField(),
          trigger: requiredTypedStringField(ACTION_TRIGGERS, ACTION_TRIGGER.ALWAYS),
        }),
        { initial: [] }),
    };
  }

  /** The weapon this action is embedded on. */
  get item(): ITEMS_DND35E | undefined {
    return this.parent?.parent as ITEMS_DND35E | undefined;
  }

  /**
   * Live-merges a lightweight actor-side stub for this action onto `system.actions.<_id>`
   * (poc.10 §10.4's simplified aggregation — the actor only ever stores an `IAction`
   * pointer; resolved data is looked up live from the item via `itemUuid` rather than
   * duplicated onto the actor). Runs at `EFFECT_CHANGE_PHASE.POST` since it depends on
   * nothing else settling first. Generic on the base class since every action subtype
   * (weapon attack, future spell cast, ...) contributes the same stub shape.
   */
  createActionChange(): EffectChangeDataDnd35e {
    // not sure if we actually want this to be system or not, but for now it is
    const isSystem = true;
    const stub: IAction = {
      id: this._id,
      itemUuid: this.item!.uuid,
      type: this.type,
      isSystem,
    };
    return {
      key: `system.actions.${this._id}`,
      type: EFFECT_CHANGE_TYPE.OVERRIDE,
      value: stub,
      target: EFFECT_CHANGE_TARGET.ACTOR,
      isSystem,
      phase: EFFECT_CHANGE_PHASE.POST,
      priority: 1,
    };
  }

  protected _canExecute(context: UseActionContext): ActionResult {
    const result: ActionResult = {
      cancelled: false,
      warnings: [],
      reason: 'success',
    };

    // TODO: enforce target min/max requirements based on combat settings.
    // const { enforceActionTargetMinMax } = useCombatSettings();
    const enforceActionTargetMinMax = false; // Placeholder until combat settings are integrated

    // todo add toggle for enforcing target min/max requirements
    if (!context.target?.length && this.isTargetRequired) {
      if (enforceActionTargetMinMax) {
        result.cancelled = true;
        result.reason = 'noTargets';
        return result;
      }

      result.warnings!.push('noTargets');
    }

    if (
      this.maxTargets !== null
      && ((context.target?.length ?? 0) > this.maxTargets)
    ) {
      if (enforceActionTargetMinMax) {
        result.cancelled = true;
        result.reason = 'tooManyTargets';
        return result;
      }

      result.warnings!.push('tooManyTargets');
    }

    // Placeholder logic for determining if the action can be executed.
    return result;
  }

  protected abstract _executeCheck(context: UseActionContext): ActionResult;

  /**
   * Public entry point the execution engine calls — never attack-specific logic directly.
   * Story C: validates target count and (for melee actions with no `range` block) the
   * attacker/target reach, then returns early. Story D fills in the Attack Roll Dialog,
   * roll resolution, and chat card (see phase-10-basic-combat.md §10.7).
   */
  async executeAction(context: UseActionContext): Promise<ActionResult> {
    const preCheckResult = this._canExecute(context);
    if (preCheckResult.cancelled) return preCheckResult;

    const result = this._executeCheck(context);
    return result;
  }

  /**
   * Advances a previously-posted attack card's action chain (e.g. the `damage` chain
   * link after a successful hit). Story D scope — see §10.7's Roll Defense Dialog design.
   */
  async continue(_stepId: string, _message: unknown, _targetId: string): Promise<ActionResult> {
    console.warn('dnd35e | ActionDataModel#continue(): Story D scope — not yet implemented.');
    return { cancelled: true, reason: 'notImplemented', warnings: [] };
  }
}
interface ActionDataModel extends foundry.abstract.DataModel, ActionSourceData {}

export {
  ActionDataModel,
};
