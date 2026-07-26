import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import type { Component } from 'vue';

import EffectRow from './EffectRow.vue';
import SecretEffectRow from './SecretEffectRow.vue';

/**
 * Per-category row component overrides for the effects table. Categories not listed
 * here fall back to the generic `EffectRow`. Extend this map as new categories need
 * their own columns/controls (e.g. armor-specific rows during the inventory pass) -
 * only add an entry when a category actually needs something the generic row can't do.
 */
const EFFECT_ROW_COMPONENTS: Partial<Record<string, Component>> = {
  [secretEffectType]: SecretEffectRow,
};

function resolveEffectRowComponent(categoryId: string): Component {
  return EFFECT_ROW_COMPONENTS[categoryId] ?? EffectRow;
}

export { resolveEffectRowComponent };
