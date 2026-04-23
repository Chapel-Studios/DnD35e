# Phase 3 — Sheet UI Text Audit (Task 3.2)

**Status**: Audit complete. Implementation (Tasks 3.4, 3.5) not started.

---

## CATEGORY 1: Raw English text in `label` props (not i18n keys)

These are passed to FormGroup/FormGroupSection via `label=` prop, which calls `game.i18n.localize()` on them — but since they're raw English, not keys, they just pass through unchanged.

The fix for most is to **remove the label prop** so schema auto-derivation kicks in (the field-path already exists, so FIELDS.*.label will be used). For schema fields without a FIELDS entry yet, the lang file needs a key first.

| File | Line | Raw label | Schema auto-derive? | Action |
|------|------|-----------|---------------------|--------|
| `src/entities/items/components/Physical/sheet/components/ItemHP.vue` | 3 | `label="HP"` (FormGroupSection) | ⚠️ `system.hp` is a compound — may not auto-derive | Add key `dnd35e.PHYSICAL_ITEM.FIELDS.hp.label` + remove prop |
| `src/entities/items/components/Physical/sheet/components/ItemHP.vue` | 10 | `label="Current"` | ✅ `system.hp.current` exists in schema | Remove prop (auto-derives) |
| `src/entities/items/components/Physical/sheet/components/ItemHP.vue` | 19 | `label="Max"` | ✅ `system.hp.max` exists in schema | Remove prop (auto-derives) |
| `src/entities/items/components/Equippable/sheet/components/ItemIsMelded.vue` | 3 | `label="Is Melded"` | ✅ `system.isMelded` exists | Remove prop (auto-derives) |
| `src/entities/items/components/Equippable/sheet/components/ItemIsWeightlessWhenEquipped.vue` | 3 | `label="Is Weightless When Equipped"` | ✅ `system.isWeightlessWhenEquipped` exists | Remove prop (auto-derives) |
| `src/entities/items/components/Equippable/sheet/components/ItemSlot.vue` | 3 | `label="Equipped Slots"` | ✅ `system.equippedSlotIds` exists | Remove prop (auto-derives) |
| `src/entities/items/components/Physical/sheet/components/ItemSheetIsCarriedCheckbox.vue` | 3 | `label="Is Carried"` | ✅ `system.isCarried` exists | Remove prop (auto-derives) |
| `src/entities/items/components/Physical/sheet/components/ItemSheetIsMeldedCheckbox.vue` | 3 | `label="Is Carried"` ⚠️ WRONG LABEL | ✅ `system.isCarried` exists | Remove prop — also note the label text appears wrong (probably should be field auto-derive anyway) |

### Possibly-non-FIELDS label key (non-standard format):
| File | Line | Current label prop | Issue | Action |
|------|------|--------------------|--------------------|--------|
| `src/entities/items/components/Equippable/sheet/components/DesignedForSize.vue` | 3 | `label="dnd35e.EQUIPPABLE.DesignedForSize"` | Uses non-FIELDS path (`dnd35e.EQUIPPABLE.DesignedForSize` not `.EQUIPPABLE.FIELDS.designedForSize.label`) | Remove prop if FIELDS path is in lang file; or migrate key to FIELDS pattern |

---

## CATEGORY 2: Hardcoded text in template HTML (not passing through localize)

| File | Line | Raw text | Action |
|------|------|----------|--------|
| `src/entities/items/components/Physical/sheet/components/PhysicalItemHeaderStatus.vue` | 5 | `Carried` (inline text in template) | Replace with `game.i18n.localize('dnd35e.EQUIPPABLE.FIELDS.isCarried.label')` or dedicated key |
| `src/entities/items/components/Equippable/sheet/components/EquippableHeaderStatus.vue` | 20 | `statusLabel` computed: `'Equipped'` / `'Carried'` (raw strings) | Replace computed return values with `game.i18n.localize(...)` calls |
| `src/entities/items/components/Equippable/sheet/components/EquippableItemWeight.vue` | 10 | `:title="'Is Weightless When Equipped'"` | Replace with `game.i18n.localize('dnd35e.EQUIPPABLE.FIELDS.isWeightlessWhenEquipped.label')` |

---

## CATEGORY 3: Already localized — no action needed

All of the following are confirmed clean:
- `Effects.vue` — all strings via `localize()` with proper keys ✓
- `EffectCategory.vue` — all strings via `createLocalizedComputed()` ✓
- `SecretsList.vue` — all strings via `localize()` ✓
- `MaterialsList.vue` — string via `localize()` ✓
- `SecretMasks.vue` — all strings via `game.i18n.localize()` ✓
- `EffectChangesList.vue` — all strings via `game.i18n.localize()` ✓
- `SecretSheet.vue` — player edit label via `game.i18n.localize()` ✓
- `SkillSettingsApp.vue` — all strings via `localize()` ✓
- `GameRulesSettingsApp.vue` — all strings via `localize()` ✓
- `CurrencySettingsApp.vue` — all strings via `localize()` ✓
- `HealthSettingsApp.vue` — all strings via explicit label keys ✓
- `IsIdentifiedToggle.vue` — all strings via `game.i18n.localize()` ✓
- `TabDivider.vue` — tab labels come from TabStore with keys ✓
- `DocumentHeader.vue` — type label from store getter ✓

---

## Required lang file additions

For Category 2, these keys need to exist (check if already in lang files):
- `dnd35e.EQUIPPABLE.FIELDS.isCarried.label` (for "Carried" / "Is Carried")
- `dnd35e.EQUIPPABLE.FIELDS.isEquipped.label` (for "Equipped")
- `dnd35e.EQUIPPABLE.FIELDS.isWeightlessWhenEquipped.label` (for title tooltip)
- `dnd35e.PHYSICAL_ITEM.FIELDS.hp.label` (for HP section header, if not present)

---

## Implementation Plan (Tasks 3.4 + 3.5)

### Step 1: Verify which lang keys already exist in `src/lang/en/items.json`
### Step 2: Add any missing keys to lang files
### Step 3: Remove raw English `label` props from Category 1 components (let schema auto-derive)
### Step 4: Fix Category 2 computed/inline text to use `game.i18n.localize()`
### Step 5: Verify `DesignedForSize.vue` key format — migrate to FIELDS pattern if needed
