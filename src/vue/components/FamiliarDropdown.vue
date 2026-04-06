<template>
  <div
    v-if="show && options.length > 0"
    ref="menuRef"
    class="familiar-dropdown"
    :style="{
      top: `${position.top}px`,
      left: `${position.left}px`,
    }"
    @mousedown.prevent
  >
    <div
      v-for="(option, index) in options"
      :key="`${option.fullPath}-${index}`"
      class="familiar-item"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="$emit('select', option)"
      :title="option.accessPath ?? option.fullPath"
    >
      <span class="option-path">{{ option.display }}</span>
      <template v-if="option.isLeaf && option.value != null">
        <span class="option-value">=</span>
        <span class="option-value">{{ option.value }}</span>
      </template>
      <span v-else-if="!option.isLeaf" class="option-type">[Group]</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { AutocompleteOption } from '@helpers/formulae/types.mjs';
  import type { PropType } from 'vue';
  import { ref } from 'vue';

  defineProps({
    show: { type: Boolean, required: true },
    options: { type: Array as PropType<AutocompleteOption[]>, required: true },
    selectedIndex: { type: Number, required: true },
    position: { type: Object as PropType<{ top: number; left: number }>, required: true },
  });

  defineEmits<{
    select: [option: AutocompleteOption];
  }>();

  const menuRef = ref<HTMLElement>();

  defineExpose({ menuRef });
</script>

<style scoped lang="scss">
  .familiar-dropdown {
    position: absolute;
    max-height: 180px;
    min-width: 140px;
    max-width: 320px;
    overflow-y: auto;
    border: 1px solid rgba(102, 166, 255, 0.3);
    background: rgba(30, 30, 30, 0.98);
    border-radius: 3px;
    backdrop-filter: blur(8px);
    z-index: 1000;
    font-size: 0.78rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    animation: familiarSlideUp 0.15s ease-out;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(102, 166, 255, 0.2);
      border-radius: 3px;

      &:hover {
        background: rgba(102, 166, 255, 0.4);
      }
    }

    .familiar-item {
      padding: 0.15rem 0.4rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background-color 0.1s ease;
      line-height: 1.3;
      white-space: nowrap;

      &:last-child {
        border-bottom: none;
      }

      &:hover,
      &.is-selected {
        background: rgba(102, 166, 255, 0.15);
      }

      .option-path {
        font-weight: 500;
        color: #66b3ff;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .option-value {
        font-family: 'Courier New', monospace;
        font-size: 0.72rem;
        color: #b3b3b3;
        white-space: nowrap;

        &:first-of-type {
          color: #888;
          margin: 0 -0.5rem;
        }
      }

      .option-type {
        font-size: 0.68rem;
        color: #888;
        font-style: italic;
        white-space: nowrap;
      }
    }
  }

  @keyframes familiarSlideUp {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
