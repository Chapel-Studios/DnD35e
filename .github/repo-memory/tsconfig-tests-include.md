# tsconfig Must Include `tests/`

**Verified**: 2026-05-16 (Phase 4 Story 2)
**Pattern**: Without `"tests/**/*"` in `tsconfig.json` `include`, test files type-check against an implicit-any view of the codebase. Path-aliased imports like `@helpers/stacking.mjs` resolve to `any`, which silently swallows real type errors (e.g. literal `'material'` passes where `BonusType` is a localization-key union).
**Rule**:
1. Keep `"tests/**/*"` in `tsconfig.json` `include`.
2. `package.json` script `test:ci` MUST run `npm run typecheck && vitest run` — never just `vitest run`. Typecheck has to gate the runner so that strict-mode regressions in tests fail CI.
**Symptom**: Tests pass locally and in CI, but `npm run build` (or a later `vue-tsc`) explodes on the same test file. Or worse, the runtime accepts garbage values because the test layer never enforced the real types.
**Why it matters**: `BonusType` is a union of full localization keys (`'dnd35e.BONUS_TYPES.Material'`), not short literals. Hand-written test fixtures must import the exported constants (`MATERIAL`, `UNTYPED`, etc.). Without typecheck in CI, this drift is invisible.

## Related

- `type-safe-constants.md` — why we have exported constants in the first place
- `powershell-pitfalls.md` — when batch-rewriting test fixtures on Windows, prefer constants over regex-replacing literal strings
