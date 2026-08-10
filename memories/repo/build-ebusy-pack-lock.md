# Build: EBUSY on packs/*.ldb during `npm run build`

If `npm run build` fails only at the very end, in the `compile-packs` vite plugin step,
with `EBUSY: resource busy or locked, unlink '...\packs\<name>\NNNNNN.ldb'` — this is
Foundry (running locally, e.g. `local.config.json`'s `foundrySystemDir` world) holding a
file lock on the compiled LevelDB pack output, not a real build failure.

**Rule**: if the current task did not edit anything under `packs/_source/**` (i.e. no pack
content changed), treat a clean `lint` + `typecheck` + successful `vite build` (JS/CSS
bundle) as sufficient verification and ignore/report this EBUSY error as a known
environment artifact rather than a real regression. Do not ask the user to stop Foundry
for it repeatedly — this has been confirmed several times to be benign when pack source
JSON is untouched.

Only chase this error for real if the current section's work actually modified pack
source content (`packs/_source/**`) and needs the recompiled pack to be tested.
