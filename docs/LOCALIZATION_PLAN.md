# dnd35e Localization Architecture Plan

## Executive Summary

This document defines the localization patterns for the dnd35e system, informed by a thorough review of:

- **Foundry v14 core** localization architecture (`Localization.localizeSchema()`, `LOCALIZATION_PREFIXES`, field auto-localization)
- **dnd5e** system patterns (extensive `LOCALIZATION_PREFIXES` usage, `{PREFIX}.FIELDS` structure, prefix inheritance)
- **pf2e** system patterns (massive deeply nested `PF2E.*` hierarchy, flat trait keys, deeply nested actor/item structures)
- **Current dnd35e** state (mixed patterns, no `LOCALIZATION_PREFIXES`, flat key structure, inconsistent label sources)

---

## Architecture Decisions

### 1. Adopt Foundry's `LOCALIZATION_PREFIXES` + `FIELDS` Pattern

**Why:** This is the canonical Foundry v14 mechanism. At startup, Foundry calls `Localization.localizeSchema()` which walks every DataModel's schema and **mutates** each field's `.label`, `.hint`, and `.placeholder` from the language file. This happens once, automatically—no manual `game.i18n.localize()` calls needed for field labels.

**How it works:**
1. Your DataModel declares `static LOCALIZATION_PREFIXES = ["dnd35e.WEAPON"]`
2. Your language file has a `dnd35e.WEAPON.FIELDS` section with nested objects matching field paths
3. Foundry walks the schema, matches field paths to FIELDS entries, and sets `field.label` / `field.hint`
4. When rendering forms, `field.toFormGroup()` automatically uses the localized label/hint

### 2. Standardize on `dnd35e` Namespace

**Decision:** All system keys use the `dnd35e` prefix. Drop the inconsistent `DND35E.` and bare `SETTINGS.` prefixes from the old system.

**Reasoning:**
- `dnd35e`: Matches the system ID, clean and distinctive
- Old `D35E.*` keys: Legacy — migrate to `dnd35e.*`
- Old `DND35E.*` keys: Inconsistent variant — migrate to `dnd35e.*`
- Old `SETTINGS.D35E*` keys: Non-standard — migrate to `dnd35e.SETTINGS.*`

### 3. Nested Hierarchical Language Files (Not Flat)

**Decision:** Switch from flat keys (`"D35E.IsMasterwork": "Is Masterwork"`) to nested objects (`dnd35e.WEAPON.FIELDS.isMasterwork.label`).

**Why:**
- Required for `LOCALIZATION_PREFIXES` / `FIELDS` auto-localization
- Mirrors DataModel schema structure — easy to keep in sync
- dnd5e does this extensively and it works well
- Scales better as we add hundreds of fields

### 4. Keep Split Source Files, Upgrade Merge to Deep Merge

**Decision:** Keep the `src/lang/en/*.json` split-file approach (it's great for development), but upgrade the vite plugin to do **deep merge** instead of shallow spread.

**Why:** Nested FIELDS objects would be clobbered by shallow spread if multiple files contributed to the same top-level key. Deep merge lets `weapons.json` contribute `dnd35e.WEAPON.FIELDS.*` while `common.json` contributes `dnd35e.COMMON.*` without conflict.

### 5. Remove Labels/Hints from Schema Definitions

**Decision:** Stop passing label/hint strings to field constructors. Let `LOCALIZATION_PREFIXES` handle it.

**Current (wrong):**
```typescript
schema.weaponType = new Dnd35eField(StringField,
  { choices: [...WEAPON_TYPES], initial: 'simple' },
  { label: 'Weapon Type', hint: 'The general type...' }  // ❌ Hardcoded!
);
```

**New (correct):**
```typescript
schema.weaponType = new Dnd35eField(StringField,
  { choices: [...WEAPON_TYPES], initial: 'simple' },
  { /* no label/hint - comes from LOCALIZATION_PREFIXES */ }
);
```

**Exception:** The `Dnd35eField` wrapper needs to propagate localization to its inner `.value` field correctly. This may require making `Dnd35eField` properly participate in the schema walk (see Implementation section).

---

## Language File Structure

### Key Hierarchy Convention

```
dnd35e
├── COMMON          — Shared UI strings (Yes, No, Save, Cancel, etc.)
├── SETTINGS        — System settings (names & hints)
├── ITEM            — Base item model fields
│   └── FIELDS      — Auto-localized field labels/hints for ItemSystemModelBase
├── PHYSICAL_ITEM   — Physical item fields
│   └── FIELDS      — Auto-localized for PhysicalItemSystemModel
├── EQUIPPABLE      — Equippable item fields
│   └── FIELDS      — Auto-localized for EquippableItemSystemModel
├── WEAPON          — Weapon-specific
│   ├── FIELDS      — Auto-localized for WeaponSystemModel
│   ├── Type        — Enum labels (Simple, Martial, Exotic)
│   ├── Subtype     — Enum labels (Light, One-handed, Two-handed)
│   └── Property    — Weapon properties (Reach, Trip, Finesse)
├── ATTACK          — Attack & damage types
│   └── DamageType  — DR types (Slashing, Bludgeoning, etc.)
├── EFFECT          — Active effects UI
│   └── FIELDS      — Auto-localized for ActiveEffectSystemModel
├── SIZE            — Size categories
└── TABS            — Tab labels (if using labelPrefix)
```

### Example: Weapon Language File (`src/lang/en/weapons.json`)

```json
{
  "dnd35e": {
    "WEAPON": {
      "FIELDS": {
        "isMasterwork": {
          "label": "Is Masterwork",
          "hint": "Whether this weapon is of masterwork quality, providing a +1 bonus to attack rolls."
        },
        "weaponType": {
          "label": "Weapon Type",
          "hint": "The general type of this weapon (simple, martial, or exotic)."
        },
        "weaponSubtype": {
          "label": "Weapon Subtype",
          "hint": "The specific subtype of this weapon (light, one-handed, two-handed, or ranged)."
        },
        "weaponDamage": {
          "label": "Weapon Damage",
          "damageRoll": {
            "label": "Damage Roll",
            "hint": "The roll used to determine the damage dealt by this weapon."
          },
          "damageType": {
            "label": "Damage Type",
            "hint": "The type of damage this weapon deals."
          },
          "critRange": {
            "label": "Critical Range",
            "hint": "The range of dice rolls that result in a critical threat (e.g., 19-20)."
          },
          "critMultiplier": {
            "label": "Critical Multiplier",
            "hint": "The multiplier applied to damage on a confirmed critical hit."
          },
          "rangeIncrement": {
            "label": "Range Increment",
            "hint": "The distance increment for ranged attacks, in feet."
          },
          "attackFormula": {
            "label": "Attack Formula Override",
            "hint": "Optional override formula for the attack roll of this weapon."
          },
          "damageFormula": {
            "label": "Damage Formula Override",
            "hint": "Optional override formula for the damage roll of this weapon."
          }
        },
        "attackNotes": {
          "label": "Attack Notes",
          "hint": "Notes or flavor text related to attacks with this weapon."
        },
        "damageNotes": {
          "label": "Damage Notes",
          "hint": "Notes or flavor text related to damage from this weapon."
        }
      },
      "Type": {
        "simple": "Simple",
        "martial": "Martial",
        "exotic": "Exotic",
        "splash": "Splash"
      },
      "Subtype": {
        "light": "Light",
        "oneHanded": "One-handed",
        "twoHanded": "Two-handed",
        "ranged": "Ranged"
      },
      "Property": {
        "blocking": "Blocking",
        "brace": "Brace",
        "double": "Double",
        "disarm": "Disarm",
        "finesse": "Finesse",
        "fragile": "Fragile",
        "grapple": "Grapple",
        "improvised": "Improvised",
        "monk": "Monk",
        "nonLethal": "Non-lethal",
        "nonLethalNoPenalty": "No Penalty Non-lethal Attacks",
        "performance": "Performance",
        "reach": "Reach",
        "sunder": "Sunder",
        "thrown": "Thrown",
        "trip": "Trip"
      }
    }
  }
}
```

### Example: Items Base File (`src/lang/en/items.json`)

```json
{
  "TYPES": {
    "Item": {
      "weapon": "Weapon",
      "equipment": "Equipment",
      "loot": "Loot",
      "consumable": "Consumable",
      "class": "Class",
      "buff": "Buff",
      "spell": "Spell",
      "feat": "Feat",
      "attack": "Attack",
      "material": "Material"
    }
  },
  "dnd35e": {
    "ITEM": {
      "FIELDS": {
        "origin": {
          "label": "Origin",
          "originId": {
            "label": "Origin ID",
            "hint": "The ID of the compendium source this item originated from."
          },
          "originPack": {
            "label": "Origin Pack",
            "hint": "The compendium pack this item was imported from."
          }
        },
        "isPsionic": {
          "label": "Is Psionic",
          "hint": "Whether this item is psionic in nature."
        },
        "isEpic": {
          "label": "Is Epic",
          "hint": "Whether this item is of epic level."
        }
      },
      "Identified": "Identified",
      "Unidentified": "Unidentified"
    },
    "PHYSICAL_ITEM": {
      "FIELDS": {
        "hp": {
          "label": "Hit Points",
          "value": {
            "label": "Current HP",
            "hint": "The current hit points of this item."
          },
          "max": {
            "label": "Max HP",
            "hint": "The maximum hit points of this item."
          }
        },
        "hardness": {
          "label": "Hardness",
          "hint": "How resistant this item is to damage."
        },
        "quantity": {
          "label": "Quantity",
          "hint": "The number of this item in the stack."
        },
        "weight": {
          "label": "Weight",
          "hint": "The weight of a single unit of this item, in pounds."
        },
        "price": {
          "label": "Price",
          "hint": "The purchase price of this item."
        }
      }
    },
    "EQUIPPABLE": {
      "FIELDS": {
        "isEquipped": {
          "label": "Is Equipped",
          "hint": "Whether this item is currently equipped."
        },
        "isMelded": {
          "label": "Is Melded",
          "hint": "Whether this item is currently melded into the body."
        },
        "designedForSize": {
          "label": "Designed For Size",
          "hint": "The size category this item was designed for."
        }
      }
    },
    "SIZE": {
      "fine": "Fine",
      "diminutive": "Diminutive",
      "tiny": "Tiny",
      "small": "Small",
      "medium": "Medium",
      "large": "Large",
      "huge": "Huge",
      "gargantuan": "Gargantuan",
      "colossal": "Colossal"
    }
  }
}
```

---

## DataModel Pattern

### Adding `LOCALIZATION_PREFIXES` to Every DataModel

```typescript
// Base item model - all items inherit these labels
class ItemSystemModelBase extends Dnd35eDocumentSystemModel {
  static LOCALIZATION_PREFIXES = ["dnd35e.ITEM"];

  static defineSchema() {
    const schema = super.defineSchema();
    schema.origin = new SchemaField({
      originId: new StringField({ required: true }),
      originPack: new StringField({ required: true }),
    });
    schema.isPsionic = new BooleanField({ required: true, initial: false });
    schema.isEpic = new BooleanField({ required: true, initial: false });
    return schema;
  }
}

// Physical items extend base, ADD their own prefix
class PhysicalItemSystemModel extends ItemSystemModelBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "dnd35e.PHYSICAL_ITEM"
  ];
  // fields localized from dnd35e.PHYSICAL_ITEM.FIELDS.*
}

// Equippable items extend physical, ADD their own prefix
class EquippableItemSystemModel extends PhysicalItemSystemModel {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "dnd35e.EQUIPPABLE"
  ];
  // fields localized from dnd35e.EQUIPPABLE.FIELDS.*
}

// Weapon is the final layer
class WeaponSystemModel extends EquippableItemSystemModel {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "dnd35e.WEAPON"
  ];
  // fields localized from dnd35e.WEAPON.FIELDS.*
}
```

**Prefix resolution order:** Foundry processes prefixes left-to-right. Later prefixes override earlier ones for the same field path. This means weapon-specific labels override generic item labels.

### Field Definition Pattern (No Labels in Code)

```typescript
static defineSchema() {
  const schema = super.defineSchema();

  // Simple fields - NO label/hint, Foundry gets them from lang files
  schema.isMasterwork = new BooleanField({ required: true, initial: false });

  // Dnd35eField wrapping - NO label/hint in wrapper options
  schema.weaponType = new Dnd35eField(StringField,
    { choices: [...WEAPON_TYPES], initial: 'simple', required: true },
    { familiar: { aliases: ['type'] } }  // Only non-localization options
  );

  // Nested SchemaField - field paths auto-resolve
  // e.g. "weaponDamage.damageRoll" matches FIELDS.weaponDamage.damageRoll
  schema.weaponDamage = new SchemaField({
    damageRoll: new Dnd35eField(StringField,
      { initial: '', required: true, blank: true },
      { familiar: { aliases: ['roll', 'dice'] } }
    ),
    damageType: new Dnd35eField(StringField,
      { choices: [...DAMAGE_TYPES], initial: 'slashing', required: true },
      {}
    ),
    critRange: new Dnd35eField(StringField, { required: true, initial: '20' }, {}),
    critMultiplier: new Dnd35eField(NumberField, { required: true, initial: 2 }, {}),
    rangeIncrement: new Dnd35eField(NumberField, { required: true, nullable: true }, {}),
  });

  return schema;
}
```

---

## Dnd35eField Integration

The custom `Dnd35eField` class creates a compound schema (`{ value, unidentifiedValue }`). For `LOCALIZATION_PREFIXES` to work, Foundry's schema walker needs to see the inner fields. Since `Dnd35eField` extends `SchemaField`, the walker should traverse into it automatically. The FIELDS entry at `weaponType` will match the `Dnd35eField` at that path, and Foundry will set the label/hint on the `Dnd35eField` instance itself.

**Verify:** The `Dnd35eField` class should accept `label` and `hint` properties (inherited from `DataField._defaults`). If it overrides `_defaults`, ensure `label` and `hint` are preserved.

**If Dnd35eField doesn't participate in localization correctly,** add this to the class:

```typescript
class Dnd35eField extends SchemaField {
  // Ensure LOCALIZATION_PREFIXES can set our label/hint
  // The parent SchemaField handles apply() traversal, which is what
  // Localization.localizeSchema() uses.
}
```

---

## Handling Non-Field Strings

Not everything is a DataModel field. UI chrome, button labels, messages, enum display values, etc. still need manual localization. The patterns:

### 1. Enum/Choice Labels (Language File)

```json
{
  "dnd35e": {
    "WEAPON": {
      "Type": {
        "simple": "Simple",
        "martial": "Martial",
        "exotic": "Exotic"
      }
    }
  }
}
```

**Usage in code:**
```typescript
game.i18n.localize(`dnd35e.WEAPON.Type.${weaponType}`);
```

### 2. UI Chrome in Vue Components

Use `createLocalizedComputed` for reactive labels:

```typescript
const { _storeUtils: { createLocalizedComputed } } = inject(DocumentSheetStoreSymbol);
const title = createLocalizedComputed('dnd35e.WEAPON.Property.reach');
```

For template-only usage, use a simple localize helper or Foundry's built-in localize:

```vue
<h3>{{ game.i18n.localize('dnd35e.COMMON.Details') }}</h3>
```

### 3. Notification/Chat Messages

```typescript
ui.notifications.info(game.i18n.format('dnd35e.COMMON.ChangesSaved', { name: item.name }));
```

### 4. Settings

```typescript
game.settings.register('dnd35e', 'diagonalMovement', {
  name: 'dnd35e.SETTINGS.DiagonalMovement.Name',
  hint: 'dnd35e.SETTINGS.DiagonalMovement.Hint',
  // Foundry auto-localizes setting name/hint
});
```

---

## Vite Build Changes

### Upgrade to Deep Merge

Replace the shallow spread merge with `deepmerge` or manual recursive merge:

```typescript
import deepmerge from 'deepmerge';

// In bundleLangFiles:
let merged: Record<string, any> = {};
for (const file of files) {
  const json = await fs.readJSON(file);
  merged = deepmerge(merged, json);
}
```

**Add** `deepmerge` to devDependencies, or implement a simple recursive merge:

```typescript
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
```

### File Organization

```
src/lang/en/
├── common.json        — dnd35e.COMMON.*, general UI strings
├── items.json         — dnd35e.ITEM.FIELDS.*, dnd35e.PHYSICAL_ITEM.FIELDS.*, TYPES.*
├── equippable.json    — dnd35e.EQUIPPABLE.FIELDS.*
├── weapons.json       — dnd35e.WEAPON.FIELDS.*, dnd35e.WEAPON.Type.*, dnd35e.WEAPON.Property.*
├── attacks.json       — dnd35e.ATTACK.*, damage types
├── effects.json       — dnd35e.EFFECT.FIELDS.*, effect UI
├── settings.json      — dnd35e.SETTINGS.*
├── sizes.json         — dnd35e.SIZE.*
└── (future files as domains are added: spells.json, feats.json, classes.json, etc.)
```

Each file contributes its own branch of the nested tree. The deep merge combines them.

---

## Migration Checklist (PoC: Basic Items + Weapons)

### Phase 1: Infrastructure

- [ ] Upgrade vite lang merge to deep merge
- [ ] Switch lang file type from `Record<string, string>` to `Record<string, any>`
- [ ] Verify `Dnd35eField` participates correctly in `Localization.localizeSchema()` traversal
- [ ] Add `LOCALIZATION_PREFIXES` to base `Dnd35eDocumentSystemModel` (if it has localizable fields)

### Phase 2: Restructure Language Files

- [ ] Convert `items.json` from flat keys to nested `dnd35e.ITEM.FIELDS` structure
- [ ] Convert `weapons.json` from flat keys to nested `dnd35e.WEAPON.FIELDS` + enum sections
- [ ] Convert `common.json` to nested `dnd35e.COMMON` structure
- [ ] Convert `effects.json` to nested `dnd35e.EFFECT.FIELDS` structure
- [ ] Convert `settings.json` — settings name/hint keys use `dnd35e.SETTINGS`
- [ ] Convert `attacks.json` to nested `dnd35e.ATTACK` structure

### Phase 3: Update DataModels

- [ ] Add `static LOCALIZATION_PREFIXES` to `ItemSystemModelBase` → `["dnd35e.ITEM"]`
- [ ] Add to `PhysicalItemSystemModel` → `[...super, "dnd35e.PHYSICAL_ITEM"]`
- [ ] Add to `EquippableItemSystemModel` → `[...super, "dnd35e.EQUIPPABLE"]`
- [ ] Add to `WeaponSystemModel` → `[...super, "dnd35e.WEAPON"]`
- [ ] Remove label/hint from field builder calls for auto-localized fields
- [ ] Remove label/hint from `Dnd35eField` constructor calls
- [ ] Update `fieldBuilders.mts` — make label/hint optional (they were required params)

### Phase 4: Update Components/Templates

- [ ] Replace `createLocalizedComputed('D35E.IsMasterwork')` with field's auto-localized `.label`
- [ ] Update any template `{{ localize('D35E.flat.key') }}` to new nested paths
- [ ] For enum display, use `game.i18n.localize('dnd35e.WEAPON.Type.simple')` pattern

### Phase 5: Clean Up

- [ ] Remove old flat keys from lang files that are now in FIELDS sections
- [ ] Standardize all remaining `D35E.*` / `DND35E.*` / `SETTINGS.D35E*` keys to `dnd35e.*`
- [ ] Validate: build, load game, verify all labels appear correctly
- [ ] Verify FormGroup rendering uses auto-localized labels

---

## What We're Taking From Each System

### From Foundry Core ✓
- `LOCALIZATION_PREFIXES` + `FIELDS` auto-localization (the foundation)
- `field.label` / `field.hint` / `field.placeholder` auto-population
- `toFormGroup()` automatically using localized field properties
- `labelPrefix` for tab groups (evaluate later)

### From dnd5e ✓
- Prefix inheritance with `[...super.LOCALIZATION_PREFIXES, "NEW_PREFIX"]`
- Hierarchical FIELDS structure mirroring schema paths
- Multiple prefixes per model for composition (e.g., activity = activation + consumption + duration)
- Keeping enum labels adjacent to FIELDS in the same prefix namespace

### From pf2e ✓
- Deep nesting for complex domains (Actor.Character.*, Item.Weapon.*, etc.)
- Keeping FIELDS sections close to their display context
- Comprehensive trait/property coverage from the start

### What We're Avoiding ✗
- **pf2e's monolithic file** — too large (~100K+ lines), we keep split files
- **pf2e's flat trait keys** (`TraitSlashing`, `TraitReach`) — we use nested (`dnd35e.WEAPON.Property.reach`)
- **dnd5e's single file** — manageable for them but we benefit from domain splitting
- **Old flat pattern** (`D35E.IsMasterwork`) — doesn't work with auto-localization
- **Hardcoded English labels** in field definitions — breaks i18n entirely
- **Mixed namespace prefixes** (`D35E` vs `DND35E` vs `SETTINGS`) — one namespace: `dnd35e`

---

## Quick Reference: Localization Decision Tree

```
Need to localize something?
│
├─ DataModel field label/hint?
│  └─ Use LOCALIZATION_PREFIXES + FIELDS in lang file
│     (DO NOT put label/hint in code)
│
├─ Enum/choice display value?
│  └─ Put under the relevant prefix namespace: dnd35e.WEAPON.Type.simple
│     Use game.i18n.localize() at render time
│
├─ UI chrome (headings, buttons, section titles)?
│  └─ Put under dnd35e.COMMON or relevant domain prefix
│     Use createLocalizedComputed() in Vue components
│
├─ System setting name/hint?
│  └─ Put under dnd35e.SETTINGS.{settingId}.Name / .Hint
│     Foundry auto-localizes settings
│
├─ Notification/chat message?
│  └─ Put under dnd35e.MESSAGES or relevant domain
│     Use game.i18n.format() for interpolation
│
└─ Tab labels?
   └─ Either use labelPrefix on tab group config
      OR put under dnd35e.TABS.{tabId}
```
