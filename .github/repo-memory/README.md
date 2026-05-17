# Repo Memory

Short, durable notes capturing **verified codebase facts, conventions, and process rules** that don't have a natural home in `docs/architecture/`, `docs/reference/`, or `.github/instructions/`.

These files were promoted out of the per-user Copilot memory so all contributors (and any AI tooling configured to read this directory) share the same context.

## When to add a file here

- You verified "this is how our codebase does X" and the next person to touch the area will trip over it otherwise.
- A process rule emerged from a real incident (commit hygiene, branching, doc/code drift).
- A short architectural contract that's too small for a `docs/architecture/` doc but too important to live only in a PR description.

If a note grows past ~50 lines or sprouts diagrams, promote it to `docs/architecture/` and leave a one-line stub here pointing at the new home.

## File index

### Architecture & runtime contracts
- [stacking-engine-rules.md](stacking-engine-rules.md) — Bonus stacking algorithm, untyped alias rule, group-key format
- [masks-system-architecture.md](masks-system-architecture.md) — Secret AE → `_masks` dictionary → view-aware getters
- [effect-change-optional-normalization.md](effect-change-optional-normalization.md) — Persisted `null`/`''` → `undefined`/UNTYPED at the stacking boundary
- [familiar-field-patterns.md](familiar-field-patterns.md) — FormulaFamiliar opt-out, static markers, targetContexts
- [config-prelocalization-pattern.md](config-prelocalization-pattern.md) — Two-step CONFIG enum localization + live-merge

### Conventions
- [dnd35e-naming-convention.md](dnd35e-naming-convention.md) — `Dnd35e` prefix for our system, `System` reserved for Foundry
- [type-safe-constants.md](type-safe-constants.md) — Individual `const` exports + combined array
- [foundry-type-augmentation.md](foundry-type-augmentation.md) — Extending Foundry's closed unions via `declare module`
- [vue-boolean-prop-defaults.md](vue-boolean-prop-defaults.md) — `withDefaults` for boolean props that default true
- [system-json-registration.md](system-json-registration.md) — Every document subtype must be registered

### Testing & types
- [tsconfig-tests-include.md](tsconfig-tests-include.md) — `tests/**/*` must be in `tsconfig.json` `include`; `test:ci` must gate on typecheck
- [test-decomposition-pattern.md](test-decomposition-pattern.md) — Three-layer (pure / narrow / round-trip) test split

### Process & workflow
- [branching-convention.md](branching-convention.md) — Branch = phase, commit = story
- [planning-doc-commit-pairing.md](planning-doc-commit-pairing.md) — Planning doc updates ship in the motivating commit
- [phase-status-drift.md](phase-status-drift.md) — Verify checklist state against code, don't trust checkboxes
- [phase-renumbering.md](phase-renumbering.md) — Renumber phase files highest-first with `git mv`
- [scope-boundary-enforcement.md](scope-boundary-enforcement.md) — Reject out-of-scope work that triggers dependencies on unplanned phases
- [srd-reference-source.md](srd-reference-source.md) — `docs/reference/fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json` is the canonical RAW citation source
- [powershell-pitfalls.md](powershell-pitfalls.md) — `&` is a command separator; avoid Unix utilities

## Format

Each file is a short markdown note with this rough shape:

```markdown
# Topic

**Verified**: <date / phase / session>
**Pattern**: <one-line summary>
**Applies to**: <files / features / systems>
**Why it matters**: <what bug or rework this prevents>
**Example**: <code or recipe>

## Related
- Cross-links to sibling notes / `docs/` / `src/` paths
```

Keep entries concise. The point is fast recall, not long-form documentation.
