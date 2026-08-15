/**
 * run-e2e-foundry.mjs
 *
 * Playwright webServer wrapper used by VS Code Test Explorer and direct
 * `playwright test` runs. Ensures E2E preflight runs even when npm lifecycle
 * hooks (`pretest:e2e`) are bypassed.
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function readLocalConfig() {
  const localConfigPath = path.join(REPO_ROOT, 'local.config.json');
  if (!existsSync(localConfigPath)) return {};
  try {
    return JSON.parse(readFileSync(localConfigPath, 'utf8'));
  } catch {
    return {};
  }
}

function runStep(command, args, label) {
  console.log(`[e2e:webServer] ${label}...`);
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    console.error(`[e2e:webServer] Failed to run ${label}:`, result.error);
    process.exit(1);
  }
}

const localConfig = readLocalConfig();
const foundryRootPath = localConfig.foundryRootPath;
const foundryE2EDataDir = localConfig.foundryE2EDataDir
  ?? path.join(REPO_ROOT, 'tests', 'e2e', '.foundry-data');
const foundryE2EPort = localConfig.foundryE2EPort ?? 31000;
const foundryMainJs = foundryRootPath
  ? path.join(foundryRootPath, 'App', 'resources', 'app', 'main.js')
  : '';

if (!foundryMainJs || !existsSync(foundryMainJs)) {
  console.error('[e2e:webServer] Foundry app path not configured or missing.');
  console.error('[e2e:webServer] Set local.config.json -> foundryRootPath to your Foundry install root.');
  process.exit(1);
}

// Allow opting out for very fast local iteration if caller already ran preflight.
if (process.env.FOUNDRY_E2E_SKIP_PREFLIGHT !== '1') {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  runStep(npmCmd, ['run', 'build:dist'], 'Building dist for E2E');
  runStep('node', ['scripts/setup-e2e.mjs'], 'Provisioning E2E Foundry data');
} else {
  console.log('[e2e:webServer] Skipping preflight (FOUNDRY_E2E_SKIP_PREFLIGHT=1).');
}

// Belt-and-suspenders: if we've reached this point, `reuseExistingServer`
// already failed to find a live server on this port, so any lock file left
// in the data dir is necessarily stale (a prior process crashed or was
// force-killed without releasing it) - not a real conflict. The preflight
// above already wipes the whole data dir on a normal run, but this also
// covers FOUNDRY_E2E_SKIP_PREFLIGHT=1 and any future preflight changes.
const lockFile = path.join(foundryE2EDataDir, 'Config', 'options.json.lock');
if (existsSync(lockFile)) {
  console.log('[e2e:webServer] Removing stale options.json.lock...');
  // `recursive: true` is required because a force-killed Foundry process can leave this
  // path as a directory rather than a file; plain rmSync() throws EISDIR in that case.
  rmSync(lockFile, { force: true, recursive: true });
}

console.log('[e2e:webServer] Starting Foundry server...');
const foundryProcess = spawn(
  'node',
  [
    foundryMainJs,
    `--dataPath=${foundryE2EDataDir}`,
    '--world=dnd35e-e2e',
    `--port=${foundryE2EPort}`,
    '--noupdate',
  ],
  {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: false,
  },
);

const forwardSignal = (signal) => {
  if (!foundryProcess.killed) {
    foundryProcess.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

foundryProcess.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
