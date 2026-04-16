# PR: `feature/app_settings` — Local config-driven build pipeline

## Summary

Replaces the hardcoded `dist/` build output with a per-developer `local.config.json` that points Vite directly at the Foundry systems directory. This eliminates the manual copy step after each build — output goes straight to `<foundrySystemDir>/dnd35e/`.

## Changes

### New: `local.config.json` config system
- Added `local.config.json.example` — template with `foundrySystemDir` setting
- `local.config.json` is git-ignored so each developer configures their own Foundry path
- Build fails fast with a clear error if the config is missing or incomplete

### New: `system.json` build script (`scripts/build-system-json.mjs`)
- Generates `system.json` from `system.json.template` by substituting `{{VERSION}}` from `version.yaml`
- Copies the generated file into the Foundry system directory
- `system.json` is now git-ignored (generated artifact); the template is the source of truth

### Vite config overhaul (`vite.config.ts`)
- `outDir` now resolves to `<foundrySystemDir>/dnd35e/` from `local.config.json`
- Removed dead commented-out code and unused `PluginOptions` parameters
- Build timestamp log now prints the resolved output path
- Lang file bundling targets the new output directory

### `tsconfig.json` cleanup
- Stripped ~100 lines of commented-out defaults, keeping only active settings
- Updated `target` from `es2020` → `ESNext`, added `noEmit: true`, `resolveJsonModule: true`
- Set `verbatimModuleSyntax: true`
- Removed trailing commas in arrays

### Build scripts (`package.json`)
- Added `build:system-json` and `typecheck` scripts
- `prebuild` now runs lint → typecheck → system.json generation
- `dev:watch` generates `system.json` before starting Vite watcher
- Moved `handlebars`, `pixi.js`, `socket.io`, `socket.io-client` from `dependencies` to `devDependencies`

### README
- Rewrote setup instructions with the new `local.config.json` workflow

### Import fixes
- Minor `type` import adjustments across ~80 source files to satisfy `verbatimModuleSyntax: true`
