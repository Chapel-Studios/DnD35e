# system.json.template — Document Type Registration

**Verified**: Phase 2, April 2026 — missed `general` and `secret` AE types, only `material` was registered
**Pattern**: Every document subtype MUST be registered in `system.json.template` under `documentTypes`
**Applies to**: All Item types, ActiveEffect types, Actor types (future)

## Why It Matters
Foundry uses `system.json` → `documentTypes` to:
- Enable the type picker in creation dialogs
- Recognize subtypes at runtime (unknown types may fail silently)
- Even types excluded from the creation dialog (e.g., `secret`) must be registered here

## Registration Locations
1. `system.json.template` → `documentTypes.[DocumentClass].[typeName]: {}`
2. `src/entities/.../registration.mts` → `Object.assign(CONFIG.Item.dataModels, ...)` etc.
3. `src/entities/.../effectTypes.mts` (or equivalent) → creation dialog config (can exclude types from picker)

## Checklist (Every New Subtype)
- [ ] Add to `system.json.template` → `documentTypes`
- [ ] Add DataModel registration in `registration.mts`
- [ ] Add/exclude from creation dialog type config
- [ ] Verify with `npm run build` (build:system-json step)

## Related
- `scripts/build-system-json.mjs` — template expansion script
- `src/entities/activeEffects/effectTypes.mts` — AE type picker config
- `src/entities/activeEffects/registration.mts` — AE DataModel registration
