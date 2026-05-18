# Verify Phase Status Against Code Before Trusting Checkboxes

**Verified**: May 2026 session — Phase 2's §2.7.10 Player Edit Secrets checklist showed every sub-item as `[ ]` even though the feature was fully shipped (`playerEditSecret.mts` exists, `viewModeAwareUpdateDocument()` intercepts non-GM writes, `_buildMasks()` resolves priority correctly, `SecretSheet.vue` displays the badge, etc.).

**Pattern**: When resuming work after a break, **do not trust the checklist state**. Verify against code before declaring items open or proposing implementation.

## Verification recipe
For any checklist item that names a symbol, file, or behavior:
1. `grep_search` the symbol name across `src/**`.
2. If symbol exists: read the file, confirm the behavior matches the checklist description, then flip the checkbox.
3. If symbol doesn't exist: it's genuinely open.

For behavioral items without a clear symbol (e.g. "GM can delete X"), spot-check the UI component or relevant store.

## Why it happens
- Checkboxes are manual; easy to forget to flip them mid-implementation.
- Multi-track phases (Phase 2 had 12+ tracks) get partially closed without the doc being swept.
- Process rule in `planning-doc-commit-pairing.md` is the prevention; this memory is the **detection / recovery** rule for legacy drift.

## Related
- `planning-doc-commit-pairing.md` — going-forward prevention rule
