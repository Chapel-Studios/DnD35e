import type { EffectChangeData } from '@common/documents/active-effect.mjs';

/**
 * NullableCapNumberField — A NumberField representing an optional cap/floor value
 * (e.g. "max Dex bonus", where `null` means uncapped).
 *
 * Native `NumberField._applyChangeUpgrade`/`_applyChangeDowngrade` compare the current
 * value against the change delta with a plain numeric `<`/`>` operator
 * (`delta < value ? delta : value`). When `value` is `null` (uncapped), that comparison
 * coerces `null` to `0`, so any positive downgrade (or negative upgrade) is silently
 * rejected instead of being applied - the cap would never actually take effect from an
 * uncapped baseline. This field treats a `null` current value as unconstrained, so the
 * first upgrade/downgrade change against it always wins.
 */
const { NumberField } = foundry.data.fields;

class NullableCapNumberField extends NumberField<number, number, true, true, true> {
  override _applyChangeUpgrade(value: unknown, delta: unknown, model: foundry.abstract.DataModel, change: EffectChangeData): unknown {
    if (value === null) return delta;
    return super._applyChangeUpgrade(value, delta, model, change);
  }

  override _applyChangeDowngrade(value: unknown, delta: unknown, model: foundry.abstract.DataModel, change: EffectChangeData): unknown {
    if (value === null) return delta;
    return super._applyChangeDowngrade(value, delta, model, change);
  }
}

export { NullableCapNumberField };
