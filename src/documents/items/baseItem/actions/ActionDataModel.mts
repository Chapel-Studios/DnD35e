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
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { CombatDnd35e } from '@documents/combat/CombatDnd35e.mjs';
import { pushPreparationWarning } from '@documents/document/preparationWarnings.mjs';
import { EFFECT_CHANGE_PHASE, EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import { requiredStringField, requiredTypedStringField } from '@fields/fieldBuilders.mjs';
import type { DocumentContext, FormulaContextDeclaration, FormulaDataSource } from '@helpers/formulae/index.mjs';
import { FormulaData, FormulaField, FormulaResolver } from '@helpers/formulae/index.mjs';
import type { ITEMS_DND35E } from '@items/itemTypes.mjs';

import { ACTION_TRIGGER, ACTION_TRIGGERS, ACTION_TYPE, ACTION_TYPES } from '../actions/constants.mjs';
import type { ActionResult, IAction, UseActionContext } from '../actions/types.mjs';
import type { ActionData, ActionSourceData } from './ActionSourceData.mjs';
import { participantToken } from './logic/actionParticipant.mjs';

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
 * `executeAction()`/`continueAction()` interface the execution engine (`useAction()`, Story D)
 * calls — never invoking attack-specific logic directly.
 *
 * Story C ships a functional-but-partial `executeAction()`: full signature, target-count
 * validation, and melee reach validation (self-contained, no Story D dependency). It
 * returns early with `cancelled: true` before any dialog/roll/chat-card work, which is
 * Story D's deliverable (Attack Roll Dialog + `useAction()`).
 *
 * Generic over `TResult` so each concrete action kind (weapon attacks today, future spell
 * casts, etc.) can declare its own `executeAction()`/`continueAction()` result shape instead
 * of every kind's fields piling onto one shared `ActionResult`.
 */
abstract class ActionDataModel<TResult extends ActionResult = ActionResult> extends foundry.abstract.DataModel {
  declare readonly _source: ActionSourceData;
  declare abstract isTargetRequired: boolean;
  declare maxTargets: number | null;

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
          // perspective - "Longsword Attack", not "<actor name> Attack". Resolved relative
          // to the embedded action itself (`this.item`/`this.item.actor`), not the owning
          // system model — see `_buildFormulaContext()`.
          { contextName: 'Item', resolvePath: 'item', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['self', 'weapon'] },
          { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['actor'] },
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
        initial: ACTION_TYPE.MELEE,
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

  protected getCombatant(context: UseActionContext): CombatantDnd35e<CombatDnd35e> | undefined {
    const token = participantToken(context.actor);
    
    return token
      ? game.combat?.getCombatantsByToken(token.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined
      : undefined;
  }

  /**
   * Resets every `FormulaField`'s authored `formula` leaf back to its `_source` value before this
   * cycle's active effects apply. AE `add`/`subtract` changes now target the `.formula` leaf
   * directly (see `RollFormulaStringField`), so without this reset their deltas would compound
   * across every `prepareData()` pass (the "Lucky Lucky Lucky" accumulation bug). Mirrors
   * `ItemDnd35e.prepareBaseData()`'s own `nameFormula.formula` reset. Called explicitly by the
   * owning system model (see `WeaponSystemModel.prepareBaseData()`).
   */
  resetFormulaFields(): void {
    const item = this.item;
    const liveActions = (item?.system as { actions?: Array<{ _id: string }> } | undefined)?.actions;
    const index = Array.isArray(liveActions) ? liveActions.findIndex((action) => action._id === this._id) : -1;
    const sourceAction = index >= 0
      ? (item?._source as { system?: { actions?: Array<Record<string, { formula?: string } | undefined>> } } | undefined)?.system?.actions?.[index]
      : undefined;
    const fields = (this.constructor as typeof ActionDataModel).schema.fields as Record<string, foundry.data.fields.DataField>;
    for (const [key, field] of Object.entries(fields)) {
      if (!(field instanceof FormulaField)) continue;
      const formulaSource = (this as unknown as Record<string, FormulaDataSource | undefined>)[key];
      if (!formulaSource) continue;
      const sourceFormula = sourceAction?.[key]?.formula;
      if (typeof sourceFormula === 'string') formulaSource.formula = sourceFormula;
      // Realign `expectedType` with the field's declared type — stored data can carry a stale
      // `'string'` (pre-rollFormula authoring), which would make the leaf's AE add/subtract fall
      // back to plain concatenation (`$scaleDamage(1d8)` + `2` -> `$scaleDamage(1d8)2`).
      formulaSource.expectedType = field.expectedType;
    }
  }

  protected get preparationRollFormulaFields(): readonly string[] {
    const fields = (this.constructor as typeof ActionDataModel).schema.fields as Record<string, foundry.data.fields.DataField>;
    return Object.entries(fields)
      .filter(([, field]) => field instanceof FormulaField && field.expectedType === 'rollFormula')
      .map(([key]) => key);
  }

  /**
   * Resolves every `FormulaField` declared on this action's own schema, anchored to the
   * action itself rather than the owning system model — `DocumentSystemModel`'s generic
   * `prepareDerivedData()`/`_buildFormulaDataMap()` never recurses into `system.actions`
   * (an `ArrayField`), so it can't do this on the action's behalf. Not auto-invoked by
   * Foundry for embedded (non-Document) DataModels — called explicitly by the owning
   * system model (see `WeaponSystemModel.resolveDeferredFormulaFields()`) *after* the
   * owning item's own FINAL/POST active-effect phases, since Group Change Target AE
   * changes targeting `attackFormula`/`damageFormula` apply in the `'final'` phase —
   * resolving any earlier would read a not-yet-AE-settled formula.
   *
   * Uses the static `FormulaData.resolveSource()` (not the instance `.resolve()` method):
   * core's `ActiveEffect.applyChangeField()` writes an AE's returned value back via a raw
   * `foundry.utils.setProperty()`, which replaces the live `FormulaData` instance with a
   * plain POJO (no re-casting) — so a field touched by a `'final'`-phase AE is no longer
   * a real `FormulaData` by the time this runs, and `.resolve()` wouldn't exist on it.
   */
  resolveFormulaFields(): void {
    const fields = (this.constructor as typeof ActionDataModel).schema.fields as Record<string, foundry.data.fields.DataField>;
    const rollFormulaFields = this.preparationRollFormulaFields;
    for (const [key, field] of Object.entries(fields)) {
      if (!(field instanceof FormulaField)) continue;
      const formulaSource = (this as unknown as Record<string, FormulaDataSource | undefined>)[key];
      const validateRoll = rollFormulaFields.includes(key);
      const report = (message: string): void => pushPreparationWarning(
        this.item,
        `system.actions.${this._id}.${key}.formula`,
        message,
        validateRoll ? 'error' : 'warning',
        { id: `action:${this._id}:formula:${key}` }
      );
      if (validateRoll && !formulaSource?.formula.trim()) {
        report(game.i18n.localize('dnd35e.COMMON.PreparationWarningMissingFormula'));
        if (formulaSource) formulaSource.resolvedValue = null;
        continue;
      }
      if (!formulaSource) continue;
      const dataMap = this._buildFormulaContext(field.formulaContexts);
      // Actor-dependent formulas cannot be validated fully on an unowned weapon.
      const unavailableContexts = field.formulaContexts
        .filter(declaration => !dataMap[declaration.contextName])
        .flatMap(declaration => [declaration.contextName, ...declaration.aliases ?? []])
        .map(name => name.toLowerCase());
      const deferred = validateRoll && FormulaResolver.extractVariables(formulaSource.formula).some(variable =>
        unavailableContexts.includes(variable.context.toLowerCase())
      );
      const resolved = FormulaData.resolveSource(
        formulaSource, dataMap, '', field.excludedFields, deferred ? undefined : report
      );
      if (validateRoll && !deferred && resolved !== null && !Roll.validate(String(resolved))) {
        report(game.i18n.localize('dnd35e.COMMON.PreparationWarningInvalidFormula'));
      }
      // `resolvedValue` is a StringField — stringify number/boolean results before storing (see ItemDnd35e._maskedNameFormula for the same convention).
      formulaSource.resolvedValue = resolved === null ? null : String(resolved);
    }
  }

  /**
   * Builds the formula data map for one of this action's own `FormulaField`s —
   * `thisAttack` (this action) is always present; each declared context's `resolvePath`
   * is walked from the action itself (e.g. `item`/`item.actor`, via the `item` getter
   * above), and registered under both its `contextName` and every declared `alias` so
   * `#self`/`#weapon`/`#actor`/etc. all resolve by direct key lookup.
   */
  private _buildFormulaContext(declarations: FormulaContextDeclaration[]): Record<string, DocumentContext> {
    const map: Record<string, DocumentContext> = { thisAttack: this as unknown as DocumentContext };
    for (const decl of declarations) {
      if (!decl.resolvePath) continue;
      let current: unknown = this;
      for (const segment of decl.resolvePath.split('.')) {
        if (!current) break;
        current = (current as Record<string, unknown>)[segment];
      }
      const resolved = current as { documentName?: string } | undefined;
      if (!resolved?.documentName) continue;
      map[decl.contextName] = resolved as DocumentContext;
      for (const alias of decl.aliases ?? []) map[alias] = resolved as DocumentContext;
    }
    return map;
  }

  /**
   * Live-merges a lightweight actor-side stub for this action onto `system.actions.<_id>`
   * (poc.10 §10.4's simplified aggregation — the actor only ever stores an `IAction`
   * pointer; resolved data is looked up live from the item via `itemUuid` rather than
   * duplicated onto the actor). `phase: FINAL` matches the phase `Weapon.getContributedActorChanges()`
   * actually emits these during — it only computes/returns action stubs once `phase ===
   * FINAL`, so all of a weapon's actions are known to exist first. Generic on the base
   * class since every action subtype (weapon attack, future spell cast, ...) contributes
   * the same stub shape.
   *
   * Returns `null` when `item.uuid` isn't resolvable yet — `Document#uuid` falls back to
   * `foundry.utils.buildUuid()`, which returns `null` (not an empty/malformed string)
   * whenever any ancestor in the parent chain (including this item's own owning Actor)
   * doesn't have an assigned `_id` yet. This happens transiently during the very first
   * `prepareData()` pass of a brand-new, not-yet-persisted Actor — e.g. dragging a
   * compendium actor into the world or onto a token — before the optimistic client-side
   * `_id` has propagated through the whole parent chain. Emitting a change with
   * `itemUuid: null` would fail the actor-side `system.actions.<id>` schema's
   * `required/blank: false` validation (`SchemaField#_validateRecursive`); skipping the
   * contribution for this cycle is safe since `prepareData()` reruns on every subsequent
   * render/update and will pick it up once the uuid is known.
   */
  createActionChange(): EffectChangeDataDnd35e | null {
    const itemUuid = this.item?.uuid;
    if (!itemUuid) return null;

    // not sure if we actually want this to be system or not, but for now it is
    const isSystem = true;
    const stub: IAction = {
      id: this._id,
      itemUuid,
      type: this.type,
      isSystem,
    };
    return {
      key: `system.actions.${this._id}`,
      type: EFFECT_CHANGE_TYPE.OVERRIDE,
      value: stub,
      target: EFFECT_CHANGE_TARGET.ACTOR,
      isSystem,
      phase: EFFECT_CHANGE_PHASE.FINAL,
      priority: 1,
    };
  }

  protected _canExecute(context: UseActionContext): TResult {
    const result = {
      cancelled: false,
      warnings: [],
      reason: 'success',
    } as unknown as TResult;

    // TODO: enforce target min/max requirements based on combat settings.
    // const { enforceActionTargetMinMax } = useCombatSettings();
    const enforceActionTargetMinMax = false; // Placeholder until combat settings are integrated

    if (!context.target?.length && this.isTargetRequired) {
      if (enforceActionTargetMinMax) {
        result.cancelled = true;
        result.reason = 'noTargets';
        return result;
      }

      result.warnings!.push(game.i18n.localize('dnd35e.COMBAT.NoTargets'));
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

      result.warnings!.push(game.i18n.format('dnd35e.COMBAT.TooManyTargets', { max: this.maxTargets }));
    }
    
    return result;
  }

  protected abstract _executeCheck(context: UseActionContext): Promise<TResult>;

  /**
   * Public entry point the execution engine calls — should never be overwritten by subclasses.
   */
  async executeAction(context: UseActionContext): Promise<TResult> {
    const preCheckResult = this._canExecute(context);
    if (preCheckResult.cancelled) return preCheckResult;

    const result = await this._executeCheck(context);
    result.warnings = [
      ...preCheckResult.warnings,
      ...result.warnings,
    ];

    await this._postExecute(context, result);
        
    return result;
  }

  protected abstract _postExecute(context: UseActionContext, result: TResult): Promise<void>;

  protected abstract _continue(stepId: string, message: unknown, targetId: string): Promise<TResult>;

  /**
   * Sealed entry point for advancing a previously-posted attack card's action chain (e.g.
   * the `damage` chain link after a successful hit) — leaf actions override `_continue()`,
   * never this. Unlike `executeAction()`, there's no shared post-step hook here: a chain
   * step (e.g. Story E's Roll Defense Dialog + Resolution card) is fully self-contained,
   * so `_continue()`'s own return value is the final result.
   */
  async continueAction(stepId: string, message: ChatMessage, targetId: string): Promise<TResult> {
    return this._continue(stepId, message, targetId);
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TResult must match the class's type param for declaration merging.
interface ActionDataModel<TResult extends ActionResult = ActionResult> extends foundry.abstract.DataModel, ActionData {}

export {
  ActionDataModel,
};
