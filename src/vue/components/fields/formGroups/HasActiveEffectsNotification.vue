<template>
  <div
    v-if="hasActiveEffects"
    ref="iconRef"
    class="effect-tooltip"
    @pointerenter="openTooltip"
    @pointerleave="closeTooltip"
  >
    <i class="fas fa-sparkles"></i>
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popupRef"
        class="effect-tooltip-popup"
        :style="popupStyle"
      >
        <div
          v-for="(effect, index) in typedEffects"
          :key="index"
          class="effect-tooltip-entry"
          :class="{ 'is-ignored': effect.stackResult === STACK_RESULT_IGNORED }"
        >
          <span class="effect-name">{{ effect.effectName }}</span>
          <span class="effect-detail">{{ formatChangeTypeSymbol(effect.type) }} {{ effect.displayValue }}</span>
          <span v-if="effect.bonusTypeLabel" class="effect-bonus-type">[{{ effect.bonusTypeLabel }}]</span>
          <span v-if="effect.stackResult === STACK_RESULT_IGNORED" class="effect-rejected">
            {{ effect.stackReason ?? ignoredLabel }}
          </span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  // TODO: Dual-stack awareness — when viewing as unidentified (non-GM), this component
  // must filter out effect overrides from unidentified sources. Currently shows ALL overrides.
  // The sparkle icon should not appear if the only modifiers come from hidden effects.
  // See poc Phase 2 §2.5.3 for the design. Blocked on RenderModeStore injection + getEffectsForField filtering.
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { formatChangeTypeSymbol } from '@effects/baseActiveEffect/logic/index.mjs';
  import { roundToDecimal } from '@helpers/math.mjs';
  import type { Override } from '@helpers/stacking.mjs';
  import { parseNumericChangeValue, STACK_RESULT_IGNORED } from '@helpers/stacking.mjs';
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, inject, nextTick, ref } from 'vue';

  const props = defineProps<{
    fieldPath: string;
  }>();

  const {
    documentGetters: { getEffectsForField, hasEffectsForField },
    _storeUtils: { getFieldMeasurementUnit },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const {
    measurement: { convertToLocalizedDistance, convertToLocalizedWeight },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const activeEffects = getEffectsForField(props.fieldPath);
  const hasActiveEffects = hasEffectsForField(props.fieldPath);

  const formatBonusType = (bonusType?: string): string | undefined => {
    const trimmed = bonusType?.trim();
    return trimmed ? game.i18n.localize(trimmed) : undefined;
  };

  // AE change values are stored in canonical units (squares/lbs); the tooltip must show
  // them in the world's configured display unit, same as the field's own input does.
  const measurementUnit = computed(() => getFieldMeasurementUnit(props.fieldPath));

  const localizeDisplayValue = (value: unknown): unknown => {
    // change.value comes off the raw AE change (often a numeric string), not just a number.
    const numericValue = parseNumericChangeValue(value);
    if (Number.isNaN(numericValue)) return value;
    if (measurementUnit.value === 'distance') return roundToDecimal(convertToLocalizedDistance(numericValue), 2);
    if (measurementUnit.value === 'weight') return roundToDecimal(convertToLocalizedWeight(numericValue), 2);
    return numericValue;
  };

  const typedEffects = computed(() =>
    (activeEffects.value as Override[]).map((effect) => ({
      ...effect,
      displayValue: localizeDisplayValue(effect.value),
      bonusTypeLabel: formatBonusType(effect.bonusType),
    }))
  );

  const ignoredLabel = game.i18n.localize('dnd35e.EFFECT.StackResult.Ignored');

  // Own popup instead of Foundry's `data-tooltip-html` - that API only accepts an HTML
  // string (or a raw HTML element), which would force hand-building markup instead of a
  // normal Vue template. `<Teleport to="body">` gets the same "escape any ancestor
  // overflow/stacking-context clipping" benefit Foundry's tooltip manager provides, while
  // keeping this a real, reactively-rendered template - scoped styles still apply, since
  // Vue keeps the component's `data-v-xxx` attribute on teleported nodes regardless of
  // where in the DOM they end up.
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

    // Prefer opening above the icon; flip below it if there isn't room.
    const openAbove = iconRect.top - popupRect.height - TOOLTIP_MARGIN_PX >= 0;
    const top = openAbove
      ? iconRect.top - popupRect.height - TOOLTIP_MARGIN_PX
      : iconRect.bottom + TOOLTIP_MARGIN_PX;

    // Center under/over the icon, then clamp horizontally so the popup never spills past
    // either edge of the viewport - this is the actual fix for the clipping bug.
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
  .effect-tooltip {
    display: inline-flex;
    cursor: help;
  }

  .effect-tooltip-popup {
    position: fixed;
    // Must render above any focused sheet window - `ApplicationV2` windows start at
    // `--z-index-window` (100) and get `++ApplicationV2._maxZ` (unbounded growth) every
    // time one is brought to front, so a static low z-index here would render this
    // Teleported popup BEHIND the sheet itself (invisible - only the `cursor: help`
    // native OS cursor icon would be visible on hover). `--z-index-tooltip` (9999) is
    // Foundry's own reserved layer for exactly this purpose.
    z-index: var(--z-index-tooltip, 9999);
    background: var(--color-cool-5, #1a1a2e);
    color: var(--color-text-light-highlight, #f0f0f0);
    border: 1px solid var(--color-border-highlight, #7a7971);
    border-radius: 4px;
    padding: 0.375rem 0.5rem;
    white-space: nowrap;
    font-size: var(--font-size-11);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    pointer-events: none;
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

