# Phase 16: Breath Weapon & Area Templates

> **Status**: 📋 Outlined
> **Milestone**: POC (Layer 5 — Combat Loop)
> **Dependencies**: Phase 9 (Action System), Phase 12 (Combat Tracker)

---

## Goal

Implement the minimum area-of-effect template system needed for the Black Dragon's breath weapon and similar creature abilities. This is **not** the full aura/region system — just MeasuredTemplate placement with save prompts and area damage.

---

## 15.1 — Scope

**In scope**:
- Line and cone MeasuredTemplate shapes
- Template placement UI (player/GM places on the grid)
- Reflex save prompt for all tokens in the affected area
- Area damage application (full or half based on save)
- Breath weapon recharge mechanic (1d4 rounds cooldown or per-encounter)
- Integration with Action System for breath weapon as an action
- Chat card showing template shape, save DC, and per-target results

**Not in scope (deferred to Phase 22 — Area Effects & Auras Full)**:
- Foundry V14 Region behaviors
- Persistent auras attached to tokens
- AE delivery to tokens entering/leaving regions
- Duration tracking on area effects
- Damage-on-event (DoT)
- Burst, spread, emanation, scatter shapes
- Disposition filtering

---

## 15.2 — Black Dragon Breath Weapon

The Young Adult Black Dragon has:
- **Shape**: 80 ft. line
- **Damage**: 12d4 acid
- **Save**: Reflex DC 20, half damage
- **Recharge**: Usable once, then 1d4 rounds cooldown (standard 3.5e breath weapon rule)

### Breath Weapon as Action
The breath weapon is an action on the Dragon's race item (granted by the monster class progression at the appropriate level). It uses:
- `activation: "standard"` (standard action)
- `type: "save"` (prompts a saving throw)
- `template: { shape: "line", size: 80, units: "ft" }` (MeasuredTemplate config)
- `damage: { formula: "12d4", type: "acid" }` (damage on failed/partial save)
- `save: { type: "reflex", dc: { formula: "10 + floor(@details.hd.total / 2) + @abilities.con.mod" } }`
- `recharge: { type: "rounds", formula: "1d4" }` (rounds until next use)

### Template Placement Workflow
1. Dragon's controller activates breath weapon action
2. System enters template placement mode — a line template appears on the cursor, anchored to the Dragon's token
3. Player rotates to aim, then clicks to confirm
4. System identifies all tokens within the template area
5. For each token: prompt Reflex save (auto-roll for NPCs, manual for PCs based on setting)
6. Apply full damage (failed save) or half damage (successful save)
7. Post chat card showing: shape, damage rolled, per-target save result and damage taken
8. Mark breath weapon as recharging, roll 1d4 for cooldown duration
9. On each subsequent turn start, decrement cooldown. When 0, breath weapon available again.

---

## 15.3 — MeasuredTemplate Integration

Foundry VTT already has `MeasuredTemplateDocument` and canvas `MeasuredTemplate` objects. This phase wraps them for system use:

### TemplatePlacement Utility
```typescript
interface TemplatePlacementConfig {
  shape: 'line' | 'cone';
  size: number;          // Length in grid units
  width?: number;        // For line width (default: 5ft / 1 square)
  angle?: number;        // For cone angle (default: 90° per SRD)
  origin: Token;         // Token the template originates from
}

interface TemplatePlacementResult {
  templateDoc: MeasuredTemplateDocument;
  affectedTokens: TokenDocument[];
}
```

- Line: originates from token edge, extends `size` feet in aimed direction, 5ft wide
- Cone: originates from token corner, `size` length, 90° spread (default per 3.5e)
- Token-in-area detection: use Foundry's built-in `template.object.containsPoint()` or grid-based check

### Save Workflow
After template placement, the Action System's ExecutionEngine handles:
1. Roll damage once (area damage is rolled once, applied to all)
2. For each affected token's actor: request Reflex save vs DC
3. Compare save result to DC: success → half damage, failure → full damage
4. Apply damage to each actor
5. Collect results for chat card

---

## 15.4 — Recharge Mechanic

Breath weapons use a simple recharge tracker on the action:
- `system.recharge.current: number` — rounds remaining (0 = available)
- `system.recharge.formula: string` — rolled on use to set cooldown (e.g., "1d4")

On use: roll formula, set `current` to result.
On turn start (Phase 12 hook): if `current > 0`, decrement by 1. When reaching 0, breath weapon is available.

The Action System checks `recharge.current === 0` as a prerequisite for activation. If not yet available, the action is grayed out in the action list with "(Recharging: X rounds)" tooltip.

---

## 15.5 — Cone Template (Future-Proofing)

While the Black Dragon uses a line breath weapon, other dragons use cones. The cone template is trivially similar:
- Red/Gold/Brass Dragon: 30/40/50ft cone of fire
- White/Silver Dragon: 30/40ft cone of cold

Implementing cone alongside line ensures the template system works for all standard dragon types, not just Black. No additional architectural work — just add `cone` to the shape enum and set the default angle to 90° per SRD.

---

## 15.6 — Files Modified/Created

| File | Action | Notes |
|------|--------|-------|
| `src/module/actions/template-placement.mts` | Create | TemplatePlacement utility |
| `src/module/actions/execution-engine.mts` | Modify | Add area-save action resolution |
| `src/module/data/item/action-data.mts` | Modify | Add `template` and `recharge` fields to ActionDataModel |
| `src/module/data/item/race-system-model.mts` | Modify | Breath weapon action on Dragon race |
| `src/vue/components/chat/AreaSaveCard.vue` | Create | Chat card for area-save results |
| `lang/en/actions.json` | Modify | Breath weapon strings |

---

## 15.7 — Completion Checklist

- [ ] Line template placement from token origin
- [ ] Cone template placement from token corner
- [ ] Token-in-area detection identifies all affected tokens
- [ ] Reflex save prompted for each affected token
- [ ] Damage applied: full on fail, half on success
- [ ] Chat card shows template shape, damage roll, per-target results
- [ ] Recharge mechanic: cooldown set on use, decrements each turn
- [ ] Action grayed out during recharge
- [ ] Black Dragon breath weapon works end-to-end (80ft line, 12d4 acid, DC 20 Reflex)
- [ ] Cone template works for alternate dragon types
- [ ] No persistent template — removed from canvas after resolution

---

## 15.8 — Not in This Phase

- Persistent area effects (Phase 22)
- Aura regions that follow tokens (Phase 22)
- Duration-tracked templates (Phase 22)
- AE delivery on entering/leaving (Phase 22)
- Burst, spread, emanation shapes (Phase 22)
- Spell templates (Phase 17 uses this infrastructure, Phase 22 extends it)
