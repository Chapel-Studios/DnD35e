<template>
  <div v-if="hasActiveEffects" class="effect-tooltip">
    <i class="fas fa-sparkles"></i>
    <div class="effect-tooltip-popup">
      <div v-for="(effect, index) in typedEffects" :key="index" class="effect-tooltip-entry">
        <span class="effect-name">{{ effect.effectName }}</span>
        <span class="effect-detail">{{ formatMode(effect.type) }} {{ effect.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    fieldPath: string;
  }>();

  const {
    documentGetters: { getEffectsForField, hasEffectsForField },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const activeEffects = getEffectsForField(props.fieldPath);
  const hasActiveEffects = hasEffectsForField(props.fieldPath);

  type EffectOverride = { fieldPath: string; value: unknown; effectName: string; type: string };
  const typedEffects = computed(() => activeEffects.value as EffectOverride[]);

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
  }
</style>
