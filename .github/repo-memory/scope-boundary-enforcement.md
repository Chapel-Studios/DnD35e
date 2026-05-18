# Scope Boundary Enforcement

**Verified**: Phase 1, Session 4c (localization labels)  
**Pattern**: Active rejection of out-of-scope work when it triggers dependencies on unplanned phases  
**Applies to**: All phases; especially when later phases would require rework

## The Incident

**Session 4c**: Fixed missing localization labels for Phase 1 fields (isBaseWeaponType, noAmmoRequired).

**Problem discovered**: FormGroups should auto-label from schema, but labels were missing because Phase 3 (localization infrastructure) hasn't been planned yet.

**Agent action**: Started implementing `i18nInit` hooks to call `Localization.localizeDataModel()`, adding missing FIELDS entries.

**User intervention**: 
> "this is scope creep. we should stop and wait for phase 3 and it's tied with heavy lifting in phase 2"

**Decision**: Reverted all localization changes. Deferred to Phase 3.

## Why It Mattered

**The trap**: Fixing localization labels requires comprehensive localization framework (Phase 3) and active effect redesign (Phase 2). Doing it piecemeal in Phase 1 would:
1. Create code that Phase 2 and 3 would both modify
2. Force rework when the actual frameworks land
3. Lock team into a specific design before collaborative design happens

**The lesson**: Scope boundaries exist to prevent rework, not just to save time. Breaking them creates architectural debt.

## Pattern for Future Phases

When tempted to implement something out-of-scope:
1. **Identify the architectural trigger** — What system would be designed to handle this?
2. **Check if it's in the target phase spec** — Is the infrastructure planned?
3. **Assess rework risk** — Would Phase N redesign this anyway?
4. **Make the deferral explicit** — Document exactly which phase handles it and why

**Good deferral**:
> "Phase 1 fields missing labels. Phase 3 (Localization Infrastructure) adds i18nInit hook system. Defer to Phase 3 where comprehensive audit happens."

**Bad deferral**:
> "Add labels. TODO for Phase 3."

## Related

- Deferral policy: documented per phase in `docs/migration-plan/`
- Phase docs: Ensure all Phase N specs include their infrastructure bits (don't leave them for later)
- Phase 2 planning: Verify Secret AE (§2.7) doesn't break Phase 1's Dnd35eField before committing to Dnd35eField refactor in Phase 2
