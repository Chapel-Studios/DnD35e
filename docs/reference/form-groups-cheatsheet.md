# Form Groups Cheat Sheet

Purpose: keep FormGroup variants behaviorally consistent across view modes, field permissions, and update paths.

Assume final target behavior is already implemented.

## Table of Contents

- [Quick Rules](#quick-rules)
- [Settings Contracts and Types Quick Reference](#settings-contracts-and-types-quick-reference)
- [Use Cases (Minimal Settings + Real Snippets)](#use-cases-minimal-settings--real-snippets)
- [Use Case A: Standard editable field](#use-case-a-standard-editable-field)
- [Use Case B: Delta-mirror masked state field (HP)](#use-case-b-delta-mirror-masked-state-field-hp)
- [Use Case C: Projected display + wrapped update pipeline](#use-case-c-projected-display--wrapped-update-pipeline)
- [Use Case D: Force readonly display](#use-case-d-force-readonly-display)
- [Use Case E: Play/true inline edit exception](#use-case-e-playtrue-inline-edit-exception)
- [Use Case F: Explicit callback-driven updates](#use-case-f-explicit-callback-driven-updates)
- [Use Case G: Explicit disable override](#use-case-g-explicit-disable-override)
- [Use Case H: Label/hint override](#use-case-h-labelhint-override)
- [Use Case I: Unmaskable field](#use-case-i-unmaskable-field)
- [File Pointers](#file-pointers)

## Quick Rules

1. Default path: use only `field-path`.
2. Transformed editor: use `:value` + `:on-update` (projection pair), and wrap `getViewAwareFieldUpdater(fieldPath)` in your updater.
3. Unmaskable fields: mark fields that should never participate in secret masking with schema metadata (`maskable: false`).
4. Masked stateful numeric fields: set schema metadata (`maskedEditStrategy: 'deltaMirror'`) and keep FormGroup usage simple.
5. Display-only values: use `read-only`.
6. `force-edit` changes presentation only; final enabled/disabled state still follows resolved field editability.
7. `:disabled` is a hard stop for the input surface.
8. Use `label`/`hint` overrides only when schema-derived copy is not the intended UX text.

## Settings Contracts and Types Quick Reference

### Core settings types

- `ValueType = string | number | boolean | Color`
  - Shared scalar value union used by `BaseFormGroupProps` and input-based variants.

- `fieldPath: string`
  - Document path used for default read/write routing and permissions.
- `value?: TValue | null`
  - Optional explicit display value. Required for projection-pair editors (Use Case C).
- `onUpdate?: (value: TValue | null) => void`
  - Optional custom updater. For Use Case C/F, wraps or extends view-aware update behavior.
- `disabled?: boolean`
  - Hard-stop UI disable for this input surface.
- `readOnly?: boolean`
  - Forces readonly rendering path.
- `forceEdit?: boolean`
  - Shows editor in play/true; authorization still follows resolved editability.
- `defaultVisibility?: FieldVisibility`
  - Permission default override for field visibility cascade.
- `defaultEditability?: FieldEditability`
  - Permission default override for field editability cascade.
- `label?: string`
  - Optional localization key override for displayed label.
- `hint?: string`
  - Optional localization key override for displayed hint/help text.

### Field permission types

- `FieldVisibility = 'everyone' | 'ownerPlus' | 'gmOnly'`
- `FieldEditability = 'normal' | 'gmOnly'`

### Schema masking metadata

- `maskable?: boolean`
  - When `false`, field never participates in secret masking.
  - Use for fields like `character.isPartyMember`, `xpValue`, and derived values.
- `maskedEditStrategy?: 'playerSecretRoute' | 'deltaMirror'`
  - Edit-routing strategy for maskable fields.
  - `deltaMirror` is for stateful numeric fields like HP that must preserve hidden offsets.

### FormGroup contract map (final target)

| FormGroup component | Value type | Required settings | Component-specific settings |
|---|---|---|---|
| `NumberFormGroup` | `number` | `fieldPath` | `unit?: string` |
| `TextFormGroup` | `string` | `fieldPath` | None |
| `SelectFormGroup<TValue>` | `string \| number` | `fieldPath`, `options` | `options: SelectOption<TValue>[]` |
| `CheckBoxFormGroup` | `boolean` | `fieldPath` | None |
| `ToggleSwitchFormGroup` | `boolean` | `fieldPath` | `trueLabel?: string`, `falseLabel?: string`, `flip?: boolean` |
| `ColorFormGroup` | `HexColorString \| Color` | `fieldPath` | None |
| `MultiSelectFormGroup<TValue>` | `TValue[]` | `fieldPath`, `options` | `options: SelectOption<TValue>[]` |
| `ListFormGroup<TItem, TUpdateData = TItem[]>` | `TItem[] \| null` | `fieldPath`, `onAddItem`, `addButtonTitle`, `removeButtonTitle` | `onUpdate?: (value: TUpdateData \| null) => void`, `maxItems?: number` |
| `CoinageFormGroup` | `PriceSource \| null` | `fieldPath`, `onAddItem`, `addButtonTitle`, `removeButtonTitle` | `onUpdate?: (value: PriceSource \| null) => void`, `maxStackValue?: number`, `minStackValue?: number`, `stackValueStep?: number` |
| `RichTextEditorFormGroup` | `string` | `fieldPath` | `showFieldControls?: boolean`, `placeholder?: string` |
| `FormulaFormGroup` | `string` | `fieldPath` | `contexts?: FamiliarSchema`, `formulaData?: FormulaData \| null`, `showFieldControls?: boolean`, `onUpdate?: (value: string) => void` |

Notes:
- `BaseFormGroupProps` declares `value?: TValue | null`, so nullable value handling applies across FormGroup variants unless a specialized interface overrides it.
- `MultiSelectFormGroup` keeps a non-null update callback: `onUpdate?: (value: TValue[]) => void`.

### Settings type references used above

- `SelectOption<TValue>`: `{ value: TValue; label: string }`
- `PriceSource`: `{ stacks: CoinStack[]; srdEquivalent: number }`
- `FamiliarSchema`: FormulaFamiliar context schema map for autocomplete/validation.
- `FormulaData`: Formula model payload used by `FormulaFormGroup`.

## Use Cases (Minimal Settings + Real Snippets)

Goal: examples use the fewest settings needed to achieve the behavior.

### Use Case A: Standard editable field

Intent: normal source-backed editing using default FormGroup/store behavior.

This use case does one thing:
1. Binds a field directly by `field-path` with no custom value or update pipeline.

Why this exists:
- Most fields should follow the standard source/edit/view-aware flow.
- Keeps components simple and predictable.

When to use:
- Plain authoring fields with no projection transform and no custom domain update logic.

When NOT to use:
- If display value is transformed and requires inverse save mapping, use Use Case C.
- If field should be display-only, use Use Case D.

Minimal settings: only `field-path`.

Real snippet: `src/documents/actors/creature/sheet/components/header/CreatureAge.vue`

```vue
<TextFormGroup field-path="system.bio.age" />
```

### Use Case B: Delta-mirror masked state field (HP)

Intent: allow inline player edits on masked stateful numbers while keeping true and visible values coherent.

Why this exists (HP view):
- HP has two realities in masked play: a GM true value and a player-visible value.
- If a player sets visible HP from 18 to 12, the system must preserve the same hidden gap instead of collapsing or drifting it.
- Delta-mirror solves this by applying the same change to both planes.

Delta rule:
- Compute $\Delta = newVisible - oldVisible$.
- Apply $\Delta$ to true value and visible/mask value.

Where this is configured (SystemModel schema):

Real snippet: `src/documents/actors/creature/data/CreatureSystemModel.mts`

```ts
schema.hp = new SchemaField({
  max: useDnd35eField(derivedNumberField(0)),
  current: useDnd35eField(requiredNumberField(0), {
    maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR, //'deltaMirror'
  }),
  temp: useDnd35eField(requiredNumberField(0), {
    maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
  }),
  nonlethal: useDnd35eField(requiredNumberField(0), {
    maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
  }),
  regeneration: useDnd35eField(derivedNumberField(0)),
  fastHealing: useDnd35eField(derivedNumberField(0)),
});
```

FormGroup usage after schema policy is in place:

Real snippet: `src/documents/actors/creature/sheet/components/CreatureHP.vue`

```vue
<NumberFormGroup
  field-path="system.hp.current"
  force-edit
/>
```

When to use:
- Stateful numeric fields that can be player-edited while masked and must preserve hidden offsets.
- Do not use for normal authored fields that should follow standard view-aware update routing.

Related rule:
- Fields like `character.isPartyMember`, `xpValue`, and derived values are not this use case; they should use Use Case I (`maskable: false`).

### Use Case C: Projected display + wrapped update pipeline

Intent: allow field-specific UX transforms while still writing through the standard view-aware updater.

This use case does two things:
1. Display a translated/projected value in the input by computing `:value` from `getViewAwareFieldValue(...)` plus local transform logic.
2. Pass `:on-update` that wraps `getViewAwareFieldUpdater(...)` with inverse transform logic before save.

Why this exists:
- Some editors intentionally show user-facing units or normalized values that differ from storage format.
- The form group should not bypass store policy; custom logic wraps the same view-aware updater path.

When to use:
- Use when you have a reversible UI transform (display transform + inverse save transform).
- Keep the final write routed through `getViewAwareFieldUpdater(fieldPath)`.

When NOT to use:
- If there is no inverse mapping, use `read-only`.
- If no transform is needed, use standard field-path binding without a custom callback.

Minimal settings: `:value` + `:on-update` (projection pair).

Real snippet: `src/vue/components/fields/formGroups/DistanceFormGroup.vue`

```ts
const distance = computed(() => {
  const value = getViewAwareFieldValue<number>(props.fieldPath);
  return convertToLocalizedDistance(value ?? 0) ?? 0;
});

const distanceUpdater = (value: number | null) => {
  const storedValue = convertToStoredDistance(value ?? 0);
  getViewAwareFieldUpdater(props.fieldPath)(storedValue);
};
```

```vue
<NumberFormGroup
  :value="distance"
  :on-update="distanceUpdater"
  :field-path="props.fieldPath"
  :unit="distanceDisplayShortLabel"
/>
```

### Use Case D: Force readonly display

Intent: render a field as display-only regardless of edit mode.

This use case does one thing:
1. Forces the FormGroup readonly slot/path (`read-only`) so no input editor is shown.

Why this exists:
- Some values are informative outputs and should never be edited from this surface.
- Use this when there is no valid inverse mapping from UI back to stored data.

When to use:
- Derived/computed outputs (for example totals in combat stat panels).
- Any value that is intentionally locked on this sheet even if source data exists elsewhere.

When NOT to use:
- If you need user edits with transformation logic, use Use Case C (`:value` + wrapped `:on-update`).
- If normal source editing is allowed, use standard editable field-path binding.

Minimal settings: `read-only`.

Real snippet: `src/documents/actors/creature/sheet/tabs/sections/attributes/CombatAttributes.vue`

```vue
<NumberFormGroup
  field-path="system.init.total"
  read-only
/>
```

### Use Case E: Play/true inline edit exception

Intent: keep the edit widget visible in play/true for selected fields while still honoring authorization limits.

This use case does one thing:
1. Allows edit UI rendering outside global edit mode (`force-edit`) for specific high-frequency fields.

Why this exists:
- Some gameplay fields (for example HP adjustments) are edited often during play.
- Showing the editor inline reduces mode switching while preserving policy checks.

Gotchas and precedence (target behavior):
- `read-only` wins over `force-edit` (display-only always stays display-only).
- Effective field editability wins over `force-edit`:
  - if field resolves to GM-only, non-GM users see a disabled editor.
  - GM users remain editable per resolved policy.
- Explicit `:disabled` wins over both and forces disabled state.
- `force-edit` changes presentation (show editor), not authorization.

When to use:
- Tactical in-play fields that should stay quickly editable for authorized users.
- Keep scope narrow; prefer normal mode gating for the rest of the sheet.

When NOT to use:
- Do not use to bypass field permissions.
- Do not use on values that should be display-only (use Use Case D).

Minimal settings for this case: `force-edit` plus field visibility/editability defaults.

Real snippet: `src/documents/actors/creature/sheet/components/CreatureHP.vue`

```vue
<NumberFormGroup
  :value="currentHp"
  :on-update="currentHpUpdater"
  field-path="system.hp.current"
  :default-visibility="ownerPlusVisibility"
  :default-editability="gmOnlyEditability"
  force-edit
/>
```

### Use Case F: Explicit callback-driven updates

Intent: caller adds field-specific logic around writes while preserving standard store routing.

This use case does one thing:
1. Supplies `:on-update` to run custom logic before delegating to store updater(s).

Why this exists:
- Some edits need normalization, routing, side effects, or multi-field coordination.
- Keeps these rules near the feature component instead of hardcoding them into generic FormGroups.

When to use:
- Domain-specific write behavior that cannot be expressed with plain field-path binding.
- Projection pair editors (Use Case C) where updater performs inverse mapping.

When NOT to use:
- Do not replace standard binding without a concrete behavior need.
- Do not bypass policy updater paths unless explicitly required by field strategy.

Minimal settings: `:on-update="..."`.

Real snippet: `src/vue/components/fields/formGroups/CoinageFormGroup.vue`

```ts
const updateCoinStacks = (stacks: CoinStack[] | null) => {
  // UI edits coin-stack rows; storage expects PriceSource shape.
  fieldUpdater(CurrencyData.toSource(stacks ?? []));
};
```

```vue
<ListFormGroup
  :value="editStacks"
  :field-path="fieldPath"
  :on-update="updateCoinStacks"
  :on-add-item="addCoinStack"
/>
```

### Use Case G: Explicit disable override

Intent: force input to disabled state from external component/business state.

This use case does one thing:
1. Applies `:disabled="..."` to temporarily or conditionally block edits.

Why this exists:
- Some interaction states must block editing even when field would otherwise be editable.
- Typical examples include lock toggles, immutable modes, or dependent field constraints.

Gotchas and precedence (target behavior):
- Explicit `:disabled` is a hard stop and wins over `force-edit` display behavior.
- `:disabled` does not change field permissions; it only blocks this input surface.

When to use:
- External UI state determines editability for a specific moment/workflow.

When NOT to use:
- Do not use as a substitute for permission policy or schema-level editability rules.

Minimal settings: `:disabled="..."`.

Real snippet: `src/documents/items/physical/physicalItem/sheet/components/ItemQuantity.vue`

```vue
<NumberFormGroup
  field-path="system.quantity"
  :disabled="isInfinite"
/>
```

### Use Case H: Label/hint override

Intent: override auto-derived schema label/hint text for deliberate UX wording.

This use case does one thing:
1. Supplies explicit `label` and/or `hint` when sheet copy intentionally differs from schema defaults.

Why this exists:
- Some surfaces need context-specific wording, abbreviations, or settings-language that differs from field metadata.

When to use:
- Non-schema settings UIs.
- Intentional copy differences for clarity in a specific context.

When NOT to use:
- If schema-derived label/hint already matches intent, do not override.

Minimal settings: `label` and/or `hint` only when truly needed.

Real snippet: `src/settings/health/sheet/HealthSettingsApp.vue`

```vue
<SelectFormGroup
  label="dnd35e.SETTINGS.Health.Rounding.Name"
  hint="dnd35e.SETTINGS.Health.Rounding.Hint"
  :value="context.data.rounding"
  :options="roundingOptions"
  :on-update="(v: unknown) => onUpdate('rounding', v)"
  field-path="rounding"
/>
```

### Use Case I: Unmaskable field

Intent: mark fields that must never participate in secret masking.

This use case does one thing:
1. Declares schema-level `maskable: false` so view-aware and secret-mask flows skip masking logic for the field.

Why this exists:
- Some fields are administrative, control-plane, or derived and should not have masked variants.
- Prevents unnecessary secret routing and mask state for values that should remain single-source.

When to use:
- Settings/control fields such as `system.settings.isPartyMember`.
- `xpValue` and derived values.

When NOT to use:
- Stateful numeric fields that need hidden-offset behavior (use Use Case B with `deltaMirror`).

Minimal settings: schema `maskable: false` + normal FormGroup binding.

Real schema snippet: `src/documents/actors/creature/data/CreatureSystemModel.mts`

```ts
schema.settings = new SchemaField({
  isPartyMember: useDnd35eField(new BooleanField({ initial: false }), {
    maskable: false,
  }),
});
```

Real form snippet: `src/documents/actors/creature/sheet/tabs/SettingsTab.vue`

```vue
<ToggleSwitchFormGroup
  field-path="system.settings.isPartyMember"
/>
```

## File Pointers

- `src/vue/components/fields/formGroups/FormGroup.vue`
- `src/vue/components/fields/formGroups/NumberFormGroup.vue`
- `src/vue/components/fields/formGroups/TextFormGroup.vue`
- `src/vue/components/fields/formGroups/SelectFormGroup.vue`
- `src/vue/components/fields/formGroups/CheckBoxFormGroup.vue`
- `src/vue/components/fields/formGroups/ToggleSwitchFormGroup.vue`
- `src/vue/components/fields/formGroups/ColorFormGroup.vue`
- `src/vue/components/fields/formGroups/MultiSelectFormGroup.vue`
- `src/vue/components/fields/formGroups/ListFormGroup.vue`
- `src/vue/components/fields/formGroups/RichTextEditorFormGroup.vue`
- `src/helpers/formulae/FormulaFormGroup.vue`
