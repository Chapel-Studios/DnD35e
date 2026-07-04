# Vue SFC types import resolution

- In `.vue` SFC `<script setup lang="ts">`, type-only imports from local `types` modules must target `.mts` (e.g. `import type { X } from './types.mts'`) for `@vue/compiler-sfc` to resolve props types.
- Keep runtime/value imports targeting `.mjs` in this repo (NodeNext module resolution + existing source convention).
- Mixed pattern is valid in the same file: value import from `.mjs`, type import from `.mts`.
