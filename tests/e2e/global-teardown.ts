/**
 * Playwright global teardown — runs once after all tests finish (pass, fail,
 * or interrupted).
 *
 * Foundry's `webServer` process is normally torn down automatically by
 * Playwright when it owns the spawn (i.e. `reuseExistingServer` didn't attach
 * to something already running). That guarantee breaks down in two ways that
 * have repeatedly caused "test host stuck" failures (`ERR_CONNECTION_REFUSED`
 * mid-suite, or a stale `Game Paused` state bleeding into a fresh run):
 *
 *   1. A developer manually starts a Foundry process against the same
 *      `--dataPath`/`--port` for debugging and forgets to stop it. The next
 *      run's `reuseExistingServer: true` check silently attaches to that
 *      long-lived process instead of a freshly-provisioned one (see
 *      `setup-e2e.mjs`, which wipes the data dir on every real spawn but is
 *      skipped entirely whenever an existing server is reused).
 *   2. A prior run is cancelled ungracefully (Ctrl+C mid-suite, VS Code Test
 *      Explorer cancellation, a crash) and Playwright never gets to run its
 *      own webServer shutdown, leaving an orphaned process bound to the port
 *      for every subsequent run to inherit.
 *
 * Either way, whatever is left listening on the E2E port after a run
 * accumulates state (paused game, stale documents, memory pressure) across
 * runs and eventually stops responding — surfacing as a connection-refused
 * failure in an unrelated later test. Unconditionally killing whatever owns
 * the dedicated E2E port (31000 by default — reserved specifically so it
 * never collides with a dev's own Foundry instance, see
 * `playwright.config.ts`) guarantees every run starts the next one from a
 * clean slate, regardless of how this run ended.
 */

import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readLocalConfig (): { foundryE2EPort?: number } {
  const p = path.join(REPO_ROOT, 'local.config.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function killProcessesOnPort (port: number): void {
  try {
    if (process.platform === 'win32') {
      const psScript = `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue `
        + '| Select-Object -ExpandProperty OwningProcess -Unique';
      const output = execFileSync('powershell', ['-NoProfile', '-Command', psScript], { encoding: 'utf8' });
      for (const pid of output.split(/\s+/).map((s) => s.trim()).filter(Boolean)) {
        try {
          execFileSync('taskkill', ['/F', '/PID', pid]);
          console.log(`[global-teardown] Killed stale Foundry process (PID ${pid}) on port ${port}.`);
        } catch {
          // Already exited between the lookup and the kill — fine.
        }
      }
    } else {
      const output = execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
      for (const pid of output.split(/\s+/).map((s) => s.trim()).filter(Boolean)) {
        try {
          execFileSync('kill', ['-9', pid]);
          console.log(`[global-teardown] Killed stale Foundry process (PID ${pid}) on port ${port}.`);
        } catch {
          // Already exited between the lookup and the kill — fine.
        }
      }
    }
  } catch {
    // Nothing listening on the port — nothing to clean up.
  }
}

export default async function globalTeardown (): Promise<void> {
  const config = readLocalConfig();
  const port = config.foundryE2EPort ?? 31000;
  killProcessesOnPort(port);
}
