<template>
  <div
    v-if="displayModifiers.length"
    ref="iconRef"
    class="roll-modifier-tooltip"
    @pointerenter="openTooltip"
    @pointerleave="closeTooltip"
  >
    <i class="fas fa-circle-info" />
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popupRef"
        class="roll-modifier-tooltip-popup"
        :style="popupStyle"
      >
        <div
          v-for="(modifier, index) in displayModifiers"
          :key="index"
          class="roll-modifier-entry"
          :class="{ 'is-ignored': modifier.isIgnored }"
        >
          <div class="roll-modifier-row">
            <span class="modifier-label">
              {{ modifier.label }}
              <span v-if="modifier.bonusTypeLabel" class="modifier-bonus-type">[{{ modifier.bonusTypeLabel }}]</span>
            </span>
            <span class="modifier-value">{{ modifier.formula ?? formatBonus(modifier.value) }}</span>
          </div>
          <div v-if="modifier.isIgnored" class="modifier-ignored-reason">{{ modifier.ignoredReason }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import type { RollModifier } from '@source/dice/index.mjs';
  import { getDisplayModifiers } from '@source/dice/rollModifiers.mjs';
  import { computed, nextTick, ref } from 'vue';

  import { formatBonus } from './RollDialogStore.mjs';

  const props = defineProps<{
    modifiers: RollModifier[];
  }>();
  const displayModifiers = computed(() => getDisplayModifiers(props.modifiers));

  // Same Teleport-to-body popup pattern as `HasActiveEffectsNotification` (see that
  // component's doc) — escapes the dialog window's own stacking context/overflow clipping.
  const TOOLTIP_MARGIN_PX = 8;

  const iconRef = ref<HTMLElement | null>(null);
  const popupRef = ref<HTMLElement | null>(null);
  const isOpen = ref(false);
  const popupStyle = ref<{ top: string; left: string; }>({ top: '0px', left: '0px' });

  const positionPopup = async (): Promise<void> => {
    await nextTick();
    const icon = iconRef.value;
    const popup = popupRef.value;
    if (!icon || !popup) return;

    const iconRect = icon.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    const openAbove = iconRect.top - popupRect.height - TOOLTIP_MARGIN_PX >= 0;
    const top = openAbove
      ? iconRect.top - popupRect.height - TOOLTIP_MARGIN_PX
      : iconRect.bottom + TOOLTIP_MARGIN_PX;

    const idealLeft = iconRect.left + (iconRect.width / 2) - (popupRect.width / 2);
    const maxLeft = Math.max(window.innerWidth - popupRect.width - TOOLTIP_MARGIN_PX, TOOLTIP_MARGIN_PX);
    const left = Math.min(Math.max(idealLeft, TOOLTIP_MARGIN_PX), maxLeft);

    popupStyle.value = { top: `${top}px`, left: `${left}px` };
  };

  const openTooltip = (): void => {
    isOpen.value = true;
    void positionPopup();
  };

  const closeTooltip = (): void => {
    isOpen.value = false;
  };
</script>

<style lang="scss" scoped>
  .roll-modifier-tooltip {
    display: inline-flex;
    cursor: help;
    font-size: 0.8rem;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }

  .roll-modifier-tooltip-popup {
    position: fixed;
    // See HasActiveEffectsNotification.vue's doc on this z-index: must render above a
    // focused ApplicationV2 window (roll dialogs are ApplicationV2 too).
    z-index: var(--z-index-tooltip, 9999);
    background: var(--color-cool-5, #1a1a2e);
    color: var(--color-text-light-highlight, #f0f0f0);
    border: 1px solid var(--color-border-highlight, #7a7971);
    border-radius: 4px;
    padding: 0.375rem 0.5rem;
    white-space: nowrap;
    font-size: 1rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }

  .roll-modifier-entry {
    padding: 0.125rem 0;

    .roll-modifier-row {
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
    }

    .modifier-label {
      font-weight: 500;
    }

    .modifier-bonus-type {
      font-weight: 400;
      font-style: italic;
      opacity: 0.65;
    }

    .modifier-ignored-reason {
      font-size: 0.8rem;
      opacity: 0.8;
    }

    &.is-ignored {
      opacity: 0.5;

      .modifier-label,
      .modifier-value {
        text-decoration: line-through;
      }
    }
  }
</style>
