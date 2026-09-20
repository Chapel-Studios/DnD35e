---
name: e2e-timeout-triage
description: 'Use when Playwright E2E tests against Foundry are timing out, hanging on webServer boot, failing with ERR_CONNECTION_REFUSED, or flaking intermittently. Diagnoses stale port 31000 processes, LevelDB LOCK files, cold build:dist preflight exceeding the 240s webServer timeout, individual 60s test-timeout anti-patterns (missing expect.poll, input.blur() vs Tab commit, overlay interception), and known dual-browser flakiness. Produces a root cause and targeted fix, not just a blind rerun.'
---

# E2E Timeout Triage

Root-cause Playwright/Foundry E2E timeouts instead of just re-running. Pair with [`e2e-testing.instructions.md`](../../instructions/e2e-testing.instructions.md) for selector/idiom fixes once the root cause is a test-authoring issue.

## Step 1 — Classify the Symptom

Read the actual Playwright error first; it tells you which tier to jump to.

| Error message contains | Tier |
|---|---|
| `Timed out waiting 240000ms from config.webServer` | **A — webServer never came up** |
| `page.waitForFunction: Timeout 30000ms exceeded` at `gotoGame`/`performJoin` in `session.mts` | **A2 — page loaded, but `game.ready` never fires** |
| `Test timeout of 60000ms exceeded` (single spec, otherwise fine) | **B — test-level timeout** |
| `ERR_CONNECTION_REFUSED` mid-suite, or `page.goto` retries exhausted | **D — stale/degraded server** |
| Failure only in `field-permissions.spec.ts`, `secret-ae.spec.ts`, `view-mode-bar.spec.ts`, `permission-override-cascade.spec.ts` (dual-browser specs), with `[warn] Failed to parse URL from undefined` in `[WebServer]` logs | **C — known pre-existing flake** |
| Everything hangs, no output at all for minutes | **A** (check preflight) or **E — debugger injection** |

## Tier A — webServer Never Becomes Ready

`playwright.config.ts`'s `webServer.timeout` is 240s specifically to cover a cold-cache `npm run build:dist` (lint+typecheck+vite build) inside `run-e2e-foundry.mjs`. If it still times out:

1. **Run the preflight manually and time it**:
   ```powershell
   npm run build:dist
   ```
   If this alone takes >200s, the 240s budget is too tight on this machine — either warm the caches first (run it once outside the timed webServer window) or bump `timeout` in [`playwright.config.ts`](../../../playwright.config.ts).

2. **Check for a stale process already squatting on port 31000** — `reuseExistingServer: true` means Playwright happily attaches to a degraded leftover instead of spawning fresh:
   ```powershell
   Get-NetTCPConnection -LocalPort 31000 -State Listen -ErrorAction SilentlyContinue |
     Select-Object -ExpandProperty OwningProcess -Unique
   ```
   If a PID comes back, kill it (`taskkill /F /PID <pid>`) and rerun. This is exactly what [`global-teardown.ts`](../../../tests/e2e/global-teardown.ts) does automatically after every run — if a prior run was hard-killed (Ctrl+C, Test Explorer cancel, crash) before teardown ran, the port stays held.

3. **Check for stale lock files** left by a force-killed Foundry:
   - `tests/e2e/.foundry-data/Config/options.json.lock` — `run-e2e-foundry.mjs` already auto-removes this, but confirm it isn't a directory (`EISDIR` breaks the auto-cleanup).
   - `packs/*/LOCK` (compiled compendium LevelDB) — see [`build-ebusy-pack-lock.md`](../../repo-memory/build-ebusy-pack-lock.md). Delete stale `LOCK` files under `packs/<name>/` if `build:dist` itself is hanging on pack compilation.

4. **Confirm `local.config.json` paths are still valid** — `foundryRootPath` must point at an install with `App/resources/app/main.js`. A moved/uninstalled Foundry install silently produces "Foundry app path not configured or missing" (fast-fail, not a timeout) — but a *version mismatch* (e.g. install was upgraded) can cause the server to boot then error out, which reads as a hang. Check the raw Foundry stdout: `webServer: { stdout: 'pipe' }` means it's echoed inline in the terminal output — read it, don't assume it's silent.

## Tier A2 — `game.ready` Never Fires (page loaded, `gotoGame` still times out)

This is distinct from Tier A: the webServer healthcheck already passed (Foundry is up and `/join` responds), and `gotoWithRetry` successfully navigated to `/game` — the failure is `session.mts`'s own `page.waitForFunction(() => game.ready === true, ..., { timeout: 30_000 })` at the end of `gotoGame`/`performJoin`. Every test in a `describe` block calls this fresh (each `test()` gets a new `page`/context by default), so this is a **per-test full world boot**, not a one-time cost.

**Prime suspect: world state left dirty by a previous test's `clearWorld`.** [`clearWorld`](../../../tests/e2e/helpers/documents.mts) deletes actors/items/messages **sequentially, not atomically** — if a delete throws partway through (server-side validation error, a hook rejecting the delete, a race from a container's own cleanup `update`), the `afterEach` for that test fails, but the **next test still calls `gotoGame` against a world that never got fully cleared**. A world that has accumulated actors/items/effects across several failed cleanups takes measurably longer to fully initialize client-side on each subsequent full navigation, and can eventually blow through the fixed 30s budget. Unlike `closeAllSheets` in most spec `afterEach` blocks, `clearWorld` itself is **not wrapped in `.catch()`** — a mid-loop failure surfaces as a real test failure, so check the run's history for an earlier failed test in the same file/run before this one.

Diagnostics, cheapest first:
1. **Run just the failing file in isolation**: `npx playwright test tests/e2e/<spec>.spec.ts`. If it passes alone but fails in the full suite, this is cross-test world-state bleed, not a bug in that spec.
2. **Scan the run's own output for an earlier failed `afterEach`** in the same file — a `clearWorld` throw upstream is the leading suspect for a bloated world on the next test.
3. **Check the piped Foundry stdout/stderr** (`webServer: { stdout: 'pipe' }`) around the failure timestamp for a server-side exception during world/document load — a genuine client-side JS error during boot also prevents `game.ready` from ever being set.
4. **Bisect, don't just paper over**: temporarily bump the `timeout` in `gotoGame`'s/`performJoin`'s `waitForFunction` call (30_000 → 60_000) to confirm it's "slow-but-eventually-works" vs. a true hang. If bumping the timeout fixes it, the real fix is tightening `clearWorld`'s error handling (or making the previous test's cleanup actually succeed) — not permanently raising this timeout, which just masks a growing per-test cost.

## Tier B — Single Test Exceeds the 60s Timeout

The global `timeout: 60_000` in `playwright.config.ts` is per-test. When only one spec times out, it's almost always one of these authored anti-patterns — check the failing spec for:

1. **`page.waitForTimeout(N)` instead of `expect.poll(...)`** — a fixed sleep that's too short for a slow CI box, or masking a race that never resolves. Replace with:
   ```ts
   await expect.poll(async () =>
     page.evaluate(async (uuid) => (await (globalThis as any).fromUuid(uuid))?.name, uuid)
   ).toBe('expected');
   ```

2. **`input.blur()` instead of `page.keyboard.press('Tab')`** — JS `.blur()` doesn't fire the same events Vue's `@blur` handler expects, so the commit never happens and a subsequent `expect.poll` spins until timeout. See [`e2e-blur-commit-tab.md`](../../repo-memory/e2e-blur-commit-tab.md).

3. **Missing `dismissOverlays(page)` before a click near the sheet header** — the `#notifications` overlay intercepts the pointer event, Playwright's actionability check retries silently for the full test timeout with no error until it finally gives up. See [`e2e-overlay-interception.md`](../../repo-memory/e2e-overlay-interception.md).

4. **Asserting a surface that isn't rendered in the current view mode** — e.g. asserting `.item-name` in `edit` mode, where `HeaderNameField.vue` swaps in a formula input instead. `waitFor`/`toBeVisible` spins for the full timeout on an element that will never appear. Check the mode-conditional matrix in `e2e-testing.instructions.md` before assuming a locator bug.

5. **Unscoped locator matching multiple open sheets** — if `closeAllSheets`/`clearWorld` didn't run in a previous test's `afterEach` (e.g. it threw before reaching cleanup), a stray sheet from an earlier test can make a locator strict-mode-fail or match the wrong element. Confirm `sheetSelector` scoping and that `afterEach` isn't silently swallowing an error before cleanup runs.

**Fast bisection**: run the one spec headed with tracing to see exactly where it stalls, rather than guessing:
```powershell
npx playwright test tests/e2e/<spec>.spec.ts --headed --trace on
```

## Tier C — Known Dual-Browser Flakiness

`field-permissions.spec.ts`, `secret-ae.spec.ts`, `view-mode-bar.spec.ts`, `permission-override-cascade.spec.ts` open a second browser context and are known to flake on Foundry/Playwright timing instability unrelated to your change. Confirm by grepping the webServer log for:

```
[WebServer] FoundryVTT | ... | [warn] Failed to parse URL from undefined
```

If clustered around the failure, treat as pre-existing flake — rerun, and note it in the PR rather than chasing it as a regression. Do not "fix" this by adding `waitForTimeout` padding; it doesn't address the underlying instability and just slows every run.

## Tier D — Stale/Degraded Server Mid-Suite (`ERR_CONNECTION_REFUSED`)

`session.mts`'s `gotoWithRetry` already retries connection-refused errors up to 8 times with backoff — if it still fails, the server is genuinely down or wedged, not just slow to answer one request. Root causes:

- Same as Tier A #2 — a previous run's process is still holding the port but has stopped responding (not just idle).
- Foundry crashed mid-suite (check the piped `stdout`/`stderr` for a stack trace around the failure timestamp).

Fix: kill whatever holds port 31000 (Tier A #2 command) and rerun the full suite — a mid-suite crash invalidates world state for every subsequent test anyway, since `workers: 1` means all tests share one Foundry process.

## Tier E — Debugger Injection Hang (No Output At All)

If VS Code's debug auto-attach is active, `NODE_OPTIONS`/`VSCODE_INSPECTOR_OPTIONS` get inherited by every spawned child — including Foundry's own `main.js` — which can pause waiting for a debugger that never attaches, hanging the webServer readiness probe indefinitely with zero output. `run-e2e-foundry.mjs`'s `childEnv()` already strips both vars from its own children, but if you're invoking `playwright test` directly from a VS Code debug launch config (bypassing `run-e2e-foundry.mjs`'s wrapper), that stripping never happens. Run from a plain terminal instead of a debug session to rule this out.

## Escalation

If none of the above resolves it:
1. Bump `timeout` (test) or `webServer.timeout` (boot) temporarily in `playwright.config.ts` to confirm it's actually a slow-but-working path vs. a true hang — a test that passes at 120s but not 60s is a performance/environment issue, not a logic bug.
2. Run with `--trace on` and inspect the trace viewer for the exact stalled action.
3. Check `docs/migration-plan/` / recent commits for changes to sheet rendering, view-mode gating, or the webServer/setup scripts that could shift timing assumptions.

## Related
- [`e2e-testing.instructions.md`](../../instructions/e2e-testing.instructions.md) — selector strategy, view-mode gating, "When Tests Fail" checklist
- Skill: `/e2e-testing` — workflow for authoring a new spec correctly the first time
- [`build-ebusy-pack-lock.md`](../../repo-memory/build-ebusy-pack-lock.md), [`e2e-blur-commit-tab.md`](../../repo-memory/e2e-blur-commit-tab.md), [`e2e-overlay-interception.md`](../../repo-memory/e2e-overlay-interception.md), [`powershell-pitfalls.md`](../../repo-memory/powershell-pitfalls.md)
- [`playwright.config.ts`](../../../playwright.config.ts), [`global-teardown.ts`](../../../tests/e2e/global-teardown.ts), [`run-e2e-foundry.mjs`](../../../scripts/run-e2e-foundry.mjs)
