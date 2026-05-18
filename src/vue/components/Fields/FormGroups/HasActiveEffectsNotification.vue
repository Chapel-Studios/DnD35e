<template>
  <div v-if="hasActiveEffects" class="effect-tooltip">
    <i class="fas fa-sparkles"></i>
    <div class="effect-tooltip-popup">
      <div
        v-for="(effect, index) in typedEffects"
        :key="index"
        class="effect-tooltip-entry"
        :class="{ 'is-ignored': effect.stackResult === STACK_RESULT_IGNORED }"
      >
        <span class="effect-name">{{ effect.effectName }}</span>
        <span class="effect-detail">{{ formatMode(effect.type) }} {{ effect.value }}</span>
        <span v-if="effect.bonusTypeLabel" class="effect-bonus-type">[{{ effect.bonusTypeLabel }}]</span>
        <span v-if="effect.stackResult === STACK_RESULT_IGNORED" class="effect-rejected">
          {{ effect.stackReason ?? ignoredLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // TODO: Dual-stack awareness — when viewing as unidentified (non-GM), this component
  // must filter out effect overrides from unidentified sources. Currently shows ALL overrides.
  // The sparkle icon should not appear if the only modifiers come from hidden effects.
  // See Phase 2 §2.5.3 for the design. Blocked on RenderModeStore injection + getEffectsForField filtering.
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/data/constants.mjs';
  import type { Override } from '@helpers/stacking.mjs';
  import { STACK_RESULT_IGNORED } from '@helpers/stacking.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    fieldPath: string;
  }>();

  const {
    documentGetters: { getEffectsForField, hasEffectsForField },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const activeEffects = getEffectsForField(props.fieldPath);
  const hasActiveEffects = hasEffectsForField(props.fieldPath);

  const formatBonusType = (bonusType?: string): string | undefined => {
    const trimmed = bonusType?.trim();
    return trimmed ? game.i18n.localize(trimmed) : undefined;
  };

  const typedEffects = computed(() =>
    (activeEffects.value as Override[]).map((effect) => ({
      ...effect,
      bonusTypeLabel: formatBonusType(effect.bonusType),
    }))
  );

  const ignoredLabel = game.i18n.localize('dnd35e.EFFECT.StackResult.Ignored');

  const formatMode = (mode: string): string => {
    switch (mode) {
    case EFFECT_CHANGE_TYPE.ADD: return '+';
    case EFFECT_CHANGE_TYPE.MULTIPLY: return '×';
    case EFFECT_CHANGE_TYPE.OVERRIDE: return '=';
    case EFFECT_CHANGE_TYPE.UPGRADE: return '↑';
    case EFFECT_CHANGE_TYPE.DOWNGRADE: return '↓';
    default: return mode;
    }
  };
</script>

<style lang="scss" scoped>
  .effect-tooltip {
    position: relative;
    cursor: help;

    .effect-tooltip-popup {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-cool-5, #1a1a2e);
      color: var(--color-text-light-highlight, #f0f0f0);
      border: 1px solid var(--color-border-highlight, #7a7971);
      border-radius: 4px;
      padding: 0.375rem 0.5rem;
      white-space: nowrap;
      z-index: 100;
      font-size: var(--font-size-11);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      margin-bottom: 4px;
    }

    &:hover .effect-tooltip-popup {
      display: block;
    }
  }

  .effect-tooltip-entry {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.125rem 0;

    .effect-name {
      font-weight: bold;
    }

    .effect-detail {
      opacity: 0.85;
    }

    .effect-bonus-type {
      opacity: 0.65;
      font-size: var(--font-size-10);
      font-style: italic;
    }

    .effect-rejected {
      color: var(--color-level-error, #cc3333);
      font-size: var(--font-size-10);
    }

    &.is-ignored {
      opacity: 0.5;
      text-decoration: line-through;
    }
  }
</style>
