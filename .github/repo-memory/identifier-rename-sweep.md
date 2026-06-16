# Identifier Rename Sweep — PowerShell Recipe

**Verified**: refactor PRs 9, 11, 13, 14, 15 (May 2026)
**Pattern**: Use `-creplace` (case-sensitive) with `\b` word boundaries across `src,tests` for symbol renames; pre-check the target name for collisions before sweeping.
**Applies to**: Any cross-file symbol rename (class, type, interface, const, function name) — NOT file or folder renames (use `git mv`).
**Why it matters**: A naïve `replace` will mangle substrings (e.g. renaming `Item` matches `ItemDnd35e`); a case-insensitive replace will mangle comments and string literals; renaming to a name that already exists creates silent collisions.

## Pre-flight: collision check

**Always grep the target name first.** If anything outside the symbols being renamed already uses the target name, you have a collision.

```powershell
# Before renaming X → Y, check what currently claims Y
Get-ChildItem -Path src,tests -Recurse -Include *.mts,*.mjs,*.ts,*.js,*.vue `
  | Select-String -Pattern '\bY\b' -CaseSensitive `
  | Group-Object Path | Select-Object Name, Count
```

If hits exist, decide:
- Rename the *new* symbol to a more descriptive name (e.g. `SchemaFieldMeta` not `FieldMeta`).
- Rename the *existing* symbol first in its own commit.
- Abort the sweep.

## The sweep

```powershell
$old = 'Dnd35eFieldMeta'
$new = 'SchemaFieldMeta'
Get-ChildItem -Path src,tests -Recurse -Include *.mts,*.mjs,*.ts,*.js,*.vue `
  | ForEach-Object {
    $content = Get-Content -Raw -LiteralPath $_.FullName
    $updated = $content -creplace "\b$old\b", $new
    if ($content -ne $updated) {
      [System.IO.File]::WriteAllText($_.FullName, $updated, (New-Object System.Text.UTF8Encoding $false))
    }
  }
```

Key details:
- **`-creplace`** is case-sensitive. `-replace` is not — never use it for code.
- **`\b...\b`** word boundaries prevent substring corruption.
- **UTF-8 no-BOM** preserves existing file encoding; `Set-Content` adds a BOM on some PowerShell versions.
- **Scope to `src,tests`** — never include `.github/`, `docs/`, `_old_lang/` (those have their own concerns; sweep them separately if needed).

## Per-PR gate after sweep

```powershell
npx tsc --noEmit 2>&1 | Select-Object -Last 5
Write-Host "---"
npm run build 2>&1 | Select-Object -Last 5
```

Then `npx vitest run` for a non-interactive unit gate (the package's `npm test` script runs vitest in watch mode and won't exit; `npm run test:ci` wraps `typecheck + vitest run` if you want both in one step). In a cross-cutting refactor sweep, also run `npm run test:e2e` per PR — it triggers `pretest:e2e` which rebuilds, regenerates the test-world JSON, and runs `setup:e2e` before Playwright. Calling `npx playwright test` directly will skip that setup and the run will fail on a stale or missing world. Mechanical renames only surface their regressions in E2E. See `cross-cutting-refactor-strategy.md` for the rationale.

## Common pitfalls

- **`-replace` instead of `-creplace`**: mangles comments, doc-strings, and case-different identifiers in the same file.
- **Missing `\b`**: renaming `Item` matches `ItemDnd35e`, `FormItem`, `CoinageFormGroup`, etc. Devastating.
- **Renaming into a collision**: see pre-flight above. The PR 15 `FieldMeta` collision was missed at planning time and caught only after the sweep; fixup commit + amended push + force-with-lease was needed.
- **Trusting `git push --force-with-lease` exit code**: it can return 1 on a successful push (verified the push succeeded by reading the remote refs in stdout). Read the output, not the exit code.

## Type-export split

If the renamed symbol is exported as both a value and a type from the same barrel, the post-rename re-export may need splitting:

```ts
// Before
export { SchemaFieldMeta, requiredNumberField, optionalStringField };

// After (when SchemaFieldMeta is type-only)
export type { SchemaFieldMeta };
export { requiredNumberField, optionalStringField };
```

`tsc` will flag this with `TS1205` / `TS1448` (re-exporting a type when `isolatedModules` is on).

## Related

- `cross-cutting-refactor-strategy.md` — The PR-sequencing pattern this lives inside
- `powershell-pitfalls.md` — `&` separator, `&&` not allowed, Unix-utility avoidance
- `untracked-workflow-files.md` — Don't sweep these in with `git add -A`
