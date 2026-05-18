# CONFIG Pre-Localization + Live-Merge Pattern

**Verified**: Session April 22, 2026 — Phase 3 Deliverable 1
**Pattern**: Two-step pattern for CONFIG enum localization: register at module scope, localize in `i18nInit` hook
**Applies to**: All CONFIG enum maps (`item.enums.sizes`, `item.enums.weaponTypes`, `gameRules.damageReductionTypes`, etc.)
**Why it matters**: Enables language switching without DB migration; prevents stale i18n keys in UI

## Pre-Localization Registration

```typescript
// In src/constants/config/system.mts (module scope, before export)
registerConfigPreLocalization('item.enums.sizes', { key: 'label' });
registerConfigPreLocalization('gameRules.damageReductionTypes', { key: 'label' });

// In src/main.mts (already wired — do NOT add a duplicate)
Hooks.once('i18nInit', () => { preLocalizeConfig(CONFIG.dnd35e as unknown as Record<string, unknown>); });
```

Utility lives in `src/helpers/localization/preLocalizeConfig.mts`. Always builds a fresh key array (never mutates the `keys` argument):
```typescript
const keysToStore = key
  ? [key, ...keys]
  : [...keys];
```

## Live-Merge Pattern

Stores and settings UI merge CONFIG pre-localized labels at read-time. System entries use CONFIG; custom entries fall back to stored label:

```typescript
const systemDefaults = CONFIG.dnd35e.gameRules.damageReductionTypes as Record<string, { label: string }>;
.map(([key, entry]) => ({
  value: key,
  label: systemDefaults[key]?.label ?? entry.label,
}));
```

Used in: `MaterialStore.mts`, `PhysicalItemStore.mts`, `DamageReductionTable.vue`

## Registration Spread Merge (Critical)

Always spread-merge when writing into CONFIG. Bare assignment wipes anything registered before this file runs:

```typescript
// ✅ Correct
CONFIG.dnd35e.item = { ...CONFIG.dnd35e.item, ...ItemConfig };

// ❌ Wrong — wipes pre-registered enums
CONFIG.dnd35e.item = ItemConfig;
```

Both `src/documents/items/registration.mts` and `src/documents/activeEffects/registration.mts` use spread merge.

## i18n Key Naming Convention

Default entries use `dnd35e.DOMAIN_UPPER.EntryName` keys in `src/lang/en/*.json`:
```
dnd35e.DAMAGE_REDUCTION_TYPES.Acid
dnd35e.SIZES.Medium
dnd35e.WEAPON_TYPES.Simple
```

**Related**: `dnd35e-patterns.instructions.md` → Localization Architecture section
