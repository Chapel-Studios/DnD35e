# E2E formula commit — use Tab, not blur()

**Verified**: Phase 4 Story 6 cycle G
**Applies to**: `tests/e2e/**` specs that drive `FormulaFormGroup` inputs

- `input.blur()` via JS does NOT fire the focus events Vue's `@blur`
  handlers expect. Formula commits silently never happen.
- Correct: `await page.keyboard.press('Tab')`.
- Follow with `expect.poll` against the document (`fromUuid → doc.name`),
  not against the DOM — Foundry needs to round-trip the update before the
  DOM reflects it.

**Cost of relearning this**: Five test runs spent diagnosing it in
`tests/e2e/formula-familiar-weapon-name.spec.ts`. Do not redo.

**Related**: `.github/instructions/e2e-testing.instructions.md`
