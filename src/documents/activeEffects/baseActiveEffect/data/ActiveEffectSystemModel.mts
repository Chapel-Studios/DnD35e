import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import { EFFECT_TARGET } from '@effects/effectTypes.mjs';
import { requiredBooleanField } from '@fields/fieldBuilders.mjs';
import type { TargetContexts } from '@helpers/formulae/registry.mjs';
import { ensureNameFormula } from '@helpers/formulae/utils.mjs';

import type { ActiveEffectSystemData } from './ActiveEffectSystemData.mjs';
import {
  ACTIVE_EFFECT_TARGETS,
  ALL_CHANGE_TYPES,
  EFFECT_CHANGE_PHASES,
  EFFECT_CHANGE_TARGET,
  EFFECT_CHANGE_TARGETS,
  EFFECT_CHANGE_TYPE,
  FINAL_EFFECT_CHANGE_PHASE,
} from './constants.mjs';

const {
  ArrayField,
  SchemaField,
  StringField,
  NumberField,
  AnyField,
} = foundry.data.fields;

class ActiveEffectSystemModel extends DocumentSystemModel<foundry.documents.ActiveEffect> {
  /**
   * Declares which item/actor subtypes this effect type can target.
   * Used by AspectPicker to build autocomplete contexts.
   * Override in subclasses to declare specific subtypes.
   */
  static targetContexts: TargetContexts = {};
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT'];

  static override defineSchema(): Record<string, any> {
    const superSchema = super.defineSchema();
    const schema = {
      target: new StringField({
        required: true,
        choices: ACTIVE_EFFECT_TARGETS,
        initial: EFFECT_TARGET,
      }),
      isHidden: requiredBooleanField(false),
      label: new StringField({ required: false, nullable: true, initial: null }),
      // ─── Future: triggers ──────────────────────────────────────────────────
      // AEs will be able to subscribe to document lifecycle events on their
      // owning item/actor. When a lifecycle event fires (e.g. Weapon.LifeCycle.onHit),
      // matching triggers here activate — applying additional changes, rolling
      // dice, or running a formula.
      //
      // Planned schema shape (not yet implemented — alpha Phase 3 / Action System):
      //   triggers: ArrayField(SchemaField({
      //     event: StringField          — e.g. 'onHit', 'broken', 'death'
      //     target: StringField         — 'owner' | 'actor' | 'any'
      //     condition: StringField|null — formula expression, null = always
      //     action: StringField         — what to do when triggered
      //   }), { initial: [] })
      //
      // Design constraint: do NOT use the `changes` array for trigger-based
      // effects. Keep changes (passive modifiers) and triggers (event reactions)
      // as separate top-level fields so each can evolve independently.
      // ───────────────────────────────────────────────────────────────────────
      changes: new ArrayField(
        new SchemaField({
          // Stable per-row identifier (not a Foundry document id) — lets the sheet's
          // changes-table target a specific row by identity instead of array position,
          // so a delayed field commit (e.g. a formula's blur-commit) can't land on the
          // wrong row after another row has been deleted out from under it.
          id: new StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() }),
          label: new StringField({ required: false, nullable: true, initial: null }),
          key: new StringField({ required: true }),
          type: new StringField({ required: true, choices: ALL_CHANGE_TYPES, initial: EFFECT_CHANGE_TYPE.ADD }),
          value: new AnyField({ required: true }),
          priority: new NumberField({ required: true, initial: 10 }),
          phase: new StringField({
            required: true,
            choices: EFFECT_CHANGE_PHASES,
            // 'core' is a documented-but-not-yet-applied phase (see active-effect-lifecycle.md);
            // 'final' is the safest default for authored changes since it settles before the
            // 'post' phase reads it - see EffectChangesList.vue's `createChange()` for the
            // matching UI default.
            initial: FINAL_EFFECT_CHANGE_PHASE,
          }),
          target: new StringField({
            required: true,
            choices: EFFECT_CHANGE_TARGETS,
            initial: EFFECT_CHANGE_TARGET.ITEM,
          }),
          isSystem: requiredBooleanField(false),
          bonusType: new StringField({ required: false, nullable: true, initial: null }),
          condition: new StringField({ required: false, nullable: true, initial: null }),
        }),
        { initial: [] }
      ),
    };
    
    return foundry.utils.mergeObject(superSchema, schema);
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
    const parentName = this.parent?.name;
    if (!parentName) {
      console.warn('ActiveEffectSystemModel.prepareBaseData: ActiveEffect parent has no name; skipping ensureNameFormula.', {
        effect: this,
        parent: this.parent,
      });
      return;
    }
    ensureNameFormula(this, parentName);
  }
}

interface ActiveEffectSystemModel extends ActiveEffectSystemData {}

export {
  ActiveEffectSystemModel,
};
