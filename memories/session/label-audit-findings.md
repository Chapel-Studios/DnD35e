# Label Audit — WeaponDetails & MaterialDetails

## Problem
Many components in WeaponDetails tab are missing their labels. We transitioned from explicit label props to auto-deriving labels from schema via `fieldPath` + `LOCALIZATION_PREFIXES`. Labels were removed but auto-derivation isn't working for all components.

## How Label Auto-Derivation Works
- `FormGroup.vue` line ~97: `getSchemaField(props.fieldPath)` → `schemaField?.options?.label ?? ''`
- `getSchemaField` strips `system.` prefix, calls `schema._getField(path.split('.'))`
- Foundry's `localizeSchema()` populates `field.options.label` from `LOCALIZATION_PREFIXES` + lang JSON
- Weapon prefix chain: `['dnd35e.DOCUMENT', 'dnd35e.ITEM', 'dnd35e.IDENTIFIABLE', 'dnd35e.PHYSICAL_ITEM', 'dnd35e.EQUIPPABLE', 'dnd35e.WEAPON']`
- Lang JSON at `src/lang/en/items.json` has all `PHYSICAL_ITEM.FIELDS.*` and `EQUIPPABLE.FIELDS.*` entries

## Key Distinction
- `FormGroup.vue` — auto-derives label from schema field. No label prop needed if fieldPath resolves.
- `FormGroupSection.vue` — does NOT auto-derive. Always uses `localize(props.label)`. Label prop is REQUIRED and treated as a localization key.

## Audit Results per Component

### Working Correctly (auto-derivation) ✓
| Component | fieldPath | Schema label source |
|-----------|-----------|-------------------|
| ItemQuantity | `system.quantity` | `PHYSICAL_ITEM.FIELDS.quantity.label = "Quantity"` |
| EquippableItemWeight → ItemWeight | `system.weight` | `PHYSICAL_ITEM.FIELDS.weight.label = "Weight"` |
| ItemHardness | `system.hardness` | `PHYSICAL_ITEM.FIELDS.hardness.label = "Hardness"` |

### Working via Explicit Label ✓ (but could be cleaned up)
| Component | Explicit label | fieldPath | Schema label |
|-----------|---------------|-----------|-------------|
| ItemPrice | `"Price"` (raw string) | `system.price` | `"Price"` (same — could remove prop) |
| ItemSize | `"dnd35e.SIZE.Size"` (i18n key) | `system.size` | `PHYSICAL_ITEM.FIELDS.size.label = "Size"` |
| DesignedForSize | `"dnd35e.EQUIPPABLE.DesignedForSize"` (i18n key) | `system.designedForSize` | `EQUIPPABLE.FIELDS.designedForSize.label = "Designed For Size"` |
| ItemSheetIsCarriedCheckbox | `"Is Carried"` (raw string) | `system.isCarried` | `"Is Carried"` (same — could remove prop) |
| UniqueId | `"UID"` (raw string) | `system.slug` | `DOCUMENT.FIELDS.slug.label = "Unique ID"` |
| DamageReductionTypes | `"dnd35e.SETTINGS.DamageReductionTypes.Label"` (i18n key) | `system.damageReductionTypes` | NO schema field on Weapon (derived prop) — explicit label saves it |
| ItemHP section | `"HP"` (raw string to FormGroupSection) | `system.hp` | `PHYSICAL_ITEM.FIELDS.hp.label = "Hit Points"` — FormGroupSection doesn't auto-derive |
| ItemHP current | `"Current"` (raw string) | `system.hp.value` | WRONG PATH — should be `system.hp.current` |
| ItemHP max | `"Max"` (raw string) | `system.hp.max` | `PHYSICAL_ITEM.FIELDS.hp.max.label = "Max HP"` |

### BROKEN — Missing Label on Weapon Sheet
| Component | fieldPath | Root Cause |
|-----------|-----------|------------|
| **MagicEquivalency** | `system.magicEquivalency` | No schema field on Weapon — it's a derived property from `prepareDerivedData()`. Only exists as schema field on Material model. |

### Other Issues Found
- `ItemHP` uses fieldPath `system.hp.value` but schema defines `system.hp.current` — wrong path breaks field overrides/permissions (label present only because explicit)
- `ItemSheetContainerSelector` — entirely commented out, no issue
- `magicEquivalency` and `damageReductionTypes` are set in `PhysicalItemSystemModel.prepareDerivedData()` but NOT in `defineSchema()` — they're runtime-only on physical items

## MaterialDetails Tab
- `ItemHardness` on Material: works (schema field exists on Material)
- `NumberFormGroup` for `bonusHp`: works (`MATERIAL.FIELDS.bonusHp.label = "Bonus HP"`)
- `MagicEquivalency` on Material: works (schema field exists on Material)
- `DamageReductionTypes` on Material: works (explicit label)
- No label issues on Material tab

## TODO — Still Need to Investigate
- The user said "many" labels are missing. Only MagicEquivalency is provably broken via auto-derivation failure. Need to **test in Foundry** to confirm which labels are actually missing visually.
- Possible that Foundry's `localizeSchema()` isn't running or the prefixes aren't chaining correctly at runtime — would cause ALL auto-derived labels to be empty. This would explain "many" missing.
- Check if `_getField()` on Dnd35eField-wrapped fields returns the inner field or the wrapper — label might be on the wrong level.
- The `useDnd35eField()` function in `fieldBuilders.mts` decorates `field.options` but doesn't touch `label` — label comes from `localizeSchema()` at Foundry boot time.

## Next Steps
1. Check if `localizeSchema()` is being called for weapon models (maybe missing from registration?)
2. Or test in Foundry: open weapon sheet, check which specific labels are empty
3. Fix confirmed issues:
   - MagicEquivalency needs explicit label when used outside Material context
   - ItemHP fieldPath `system.hp.value` → `system.hp.current`
   - Clean up raw string labels that duplicate schema labels

## Resolution Implemented
- `FieldOverridesStore.getSchemaField()` now prefers the DataModel class static schema (`document.value.system.constructor.schema`) and falls back to the instance schema only if needed.
- `FormGroup.vue` now falls back to deriving label/hint localization keys from the current model's `LOCALIZATION_PREFIXES` when `schemaField.options.label` / `.hint` are blank.
- `MagicEquivalency.vue` now has an explicit label override: `dnd35e.ITEM.MagicEquivalent`.
- `ItemHP.vue` current HP path corrected from `system.hp.value` to `system.hp.current` in the field component, updater, and active-effect notification.

## Current Working Theory
- Foundry schema localization is either not mutating the schema instance used by the sheet store, or it is happening on the static model schema while the sheet store was reading the instance schema.
- Using the static schema plus explicit `LOCALIZATION_PREFIXES` fallback makes label resolution robust regardless of where Foundry applied localization.
