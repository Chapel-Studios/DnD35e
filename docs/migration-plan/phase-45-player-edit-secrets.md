# Phase 45 — Player Edit Secrets for Masked Fields

> **Status**: Stub  
> **Dependencies**: Phase 2 (Active Effects on Items), Phase 31 (Community Hardening)  
> **Section numbering**: 45.x

---

## 45.1 Overview

When a player with edit permission modifies a field that has been **masked** by the identification system (i.e. the field has a hidden value behind a `Dnd35eField.unidentifiedValue`), the edit must not obliterate the GM's mask. Instead, the system intercepts the edit and routes it into a **Player Edit Secret** — a system-managed Active Effect that sits at a **higher priority** than the identification mask.

---

## 45.2 Why This Exists

Without this feature, a player editing a masked field would overwrite `value` directly, destroying the GM's carefully arranged "real" data. With Player Edit Secrets, the player's change is preserved as an AE override that "wins" in dual-stack resolution, while the underlying masked data remains intact for the GM.

---

## 45.3 Design Constraints

1. **System-managed**: The Player Edit Secret AE is created and updated automatically by the system when a player edits a masked field. Players never interact with it as an AE — they just edit the field normally.
2. **Higher priority than mask**: The Player Edit Secret sits above the identification mask in the AE priority stack. In the player's view (masked stack), the edit "wins" over both the unidentified value and any hidden bonuses.
3. **GM-deletable**: Despite being system-managed, the GM can delete a Player Edit Secret. This is an intentional exception to the normal "system secrets can't be touched" rule — it lets the GM reset the player's override if needed (e.g., the player typed nonsense, or the item was re-identified).
4. **Single AE per item**: All player edits to masked fields on a single item accumulate as changes on **one** Player Edit Secret AE, not one AE per field.
5. **No match-checking**: We do **not** check whether the player's edit happens to match the real masked value. It would be possible to detect "player typed +2 and the mask is already +2, so delete the override" — but the complexity isn't worth the marginal benefit. The override just stays.

---

## 45.4 Interaction with Dual-Stack Resolution

When a Player Edit Secret exists:
- **Real stack** (GM / die roll): The Player Edit Secret is **ignored**. The real values and hidden bonuses determine the outcome.
- **Masked stack** (player chat card): The Player Edit Secret participates as the **highest-priority** change. It overrides both the unidentified placeholder and any mask-hidden bonuses for that field.

```
Example: +2 Keen Longsword, unidentified

GM mask:     enhancement +2 (hidden), keen (hidden)
Player edits name field to "My Cool Sword"

Player Edit Secret AE:
  changes:
    - { key: "system.name.unidentifiedValue", mode: OVERRIDE, value: "My Cool Sword" }
  priority: MASK_PRIORITY + 1
  system.isPlayerEditSecret: true  // SecretSystemModel schema field
  flags.dnd35e.isDeletableByGM: true

Real stack:    ignores Player Edit Secret → name = "Longsword +2 Keen"
Masked stack:  Player Edit Secret wins   → name = "My Cool Sword"
```

---

## 45.5 Implementation Notes

- **Intercept point**: The item's `_preUpdate()` hook (or the sheet store's save handler) detects when a non-GM user is writing to a field that has a mask. Instead of writing to `system.fieldPath.value`, it creates/updates the Player Edit Secret AE.
- **Schema field**: `system.isPlayerEditSecret: true` (boolean on SecretSystemModel) marks the AE for identification by the system. `flags.dnd35e.isDeletableByGM: true` enables the GM delete exception.
- **UI**: The GM's effect list shows the Player Edit Secret with a distinct icon/label (e.g., "Player Override" with a pencil icon). Players never see it as an AE.
- **Deletion cascade**: If the item is fully identified (mask removed), Player Edit Secrets could optionally be cleaned up — but this is a stretch goal, not required.

---

## 45.6 Completion Checklist

- [ ] Detect masked-field edits from non-GM users in `_preUpdate()` or sheet store save
- [ ] Create/update Player Edit Secret AE with `system.isPlayerEditSecret: true`
- [ ] Assign priority above identification mask
- [ ] Accumulate all masked-field edits into a single AE per item
- [ ] Ensure real stack ignores Player Edit Secret (filter by flag)
- [ ] Ensure masked stack includes Player Edit Secret at highest priority
- [ ] Allow GM to delete Player Edit Secret from effect list
- [ ] Show Player Edit Secret in GM's effect list with distinct icon/label
- [ ] Test: Player edits masked field → override visible to player, real value untouched
- [ ] Test: GM deletes Player Edit Secret → field reverts to unidentified placeholder
- [ ] Test: Multiple masked-field edits accumulate on single AE
