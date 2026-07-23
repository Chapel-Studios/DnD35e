<template>
  <div class="measure-bar" :class="barClass">
    <div class="measure-bar-track">
      <div
        v-for="segment in positionedSegments"
        :key="segment.key"
        class="measure-bar-segment"
        :class="segment.colorClass"
        :style="{ left: segment.offsetPercent + '%', width: segment.widthPercent + '%' }"
        :data-tooltip="segment.tooltip"
      >
        <span v-if="segment.label !== undefined && segment.label !== null" class="measure-bar-text">{{ segment.label }}</span>
      </div>
      <div
        v-for="marker in markers"
        :key="marker.key"
        class="measure-bar-marker"
        :class="marker.colorClass"
        :style="{ left: percentOf(marker.value) + '%' }"
        :data-tooltip="marker.tooltip"
      />
      <span v-if="trailingLabel !== undefined && trailingLabel !== null" class="measure-bar-text total">{{ trailingLabel }}</span>
      <span
        v-if="valueLabel"
        class="measure-bar-text positioned"
        :style="{ left: labelLeftPercent(valueLabel.value) + '%' }"
      >{{ valueLabel.text }}</span>
    </div>
    <div v-if="markers && markers.length" class="measure-bar-marker-labels">
      <span
        v-for="marker in markers"
        :key="`${marker.key}-label`"
        class="measure-bar-marker-label"
        :style="{ left: labelLeftPercent(marker.value) + '%' }"
        :data-tooltip="marker.tooltip"
      >{{ marker.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';

  /**
   * A single stacked segment of the bar. `value` is a cumulative amount (not a raw
   * width) - each segment's width is the percentage difference between the running
   * total before and after adding its `value`. This lets bars like HP (nonlethal,
   * then current-above-nonlethal, then temp) stack visually without gaps/overlaps.
   */
  interface MeasureBarSegment {
    key: string;
    value: number;
    colorClass?: string;
    tooltip?: string;
    label?: string | number;
  }

  /** A single vertical breakpoint marker, positioned by absolute value (not cumulative). */
  interface MeasureBarMarker {
    key: string;
    value: number;
    colorClass?: string;
    tooltip?: string;
    /** Short text shown under the marker line at all times (e.g. "Light", "Medium"). */
    label?: string;
  }

  /**
   * A text label positioned inside the track at a specific value (e.g. "5 / 33",
   * floated above whichever breakpoint the current value is progressing toward),
   * rather than pinned to the bar's right edge like `trailingLabel`.
   */
  interface MeasureBarValueLabel {
    value: number;
    text: string | number;
  }

  /**
   * Bends the value->percent scale at one or more `value` breakpoints, so each
   * range between breakpoints (0 -> pivot1 -> pivot2 -> ... -> max) is mapped to
   * its own percent slice instead of scaling linearly across the whole 0-max
   * range. Lets a bar reserve fixed-width slices for values beyond a breakpoint
   * (e.g. a rarely-reached "overloaded" zone that would otherwise dwarf the
   * normal range). Pivots must be provided in ascending `value` order.
   */
  interface MeasureBarScalePivot {
    value: number;
    percent: number;
  }

  const props = defineProps<{
    segments: MeasureBarSegment[];
    max: number;
    markers?: MeasureBarMarker[];
    trailingLabel?: string | number;
    valueLabel?: MeasureBarValueLabel;
    barClass?: string;
    scalePivots?: MeasureBarScalePivot[];
  }>();

  const percentOf = (value: number): number => {
    if (!props.max || props.max <= 0) return 0;
    const clamped = Math.max(0, Math.min(props.max, value));

    // Pivots at/beyond max would collapse their trailing range to zero width - drop
    // them and fall back to plain linear scaling across the whole range instead.
    const pivots = (props.scalePivots ?? []).filter(pivot => pivot.value > 0 && pivot.value < props.max);
    if (!pivots.length) {
      return Math.max(0, Math.min(100, (clamped / props.max) * 100));
    }

    const breakpoints = [{ value: 0, percent: 0 }, ...pivots, { value: props.max, percent: 100 }];
    for (let i = 1; i < breakpoints.length; i++) {
      const prev = breakpoints[i - 1];
      const next = breakpoints[i];
      if (clamped > next.value && i < breakpoints.length - 1) continue;
      const range = next.value - prev.value;
      if (range <= 0) return next.percent;
      return prev.percent + ((clamped - prev.value) / range) * (next.percent - prev.percent);
    }
    return 100;
  };

  // Marker labels are horizontally centered on their marker's position; clamp near the
  // right edge so labels for edge-adjacent breakpoints (e.g. the heavy/max load line,
  // which sits at the bar's max) don't overflow past the bar's bounding box.
  const labelLeftPercent = (value: number): number => Math.min(percentOf(value), 96);

  const positionedSegments = computed(() => {
    let cumulative = 0;
    return props.segments.map(segment => {
      const offsetPercent = percentOf(cumulative);
      const widthPercent = Math.max(0, percentOf(cumulative + segment.value) - offsetPercent);
      cumulative += segment.value;
      return {
        ...segment,
        offsetPercent,
        widthPercent,
      };
    });
  });
</script>

<style lang="scss" scoped>
  .measure-bar {
    justify-self: stretch;

    .measure-bar-track {
      display: block;
      position: relative;
      width: 100%;
      height: 1.5rem;
      background: var(--color-bg-option, rgba(0, 0, 0, 0.08));
      border: 1px solid var(--color-border-light-2, #ccc);
      border-radius: 4px;
      overflow: hidden;
    }

    .measure-bar-segment {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: width 0.3s ease, left 0.3s ease;
      color: rgba(255, 255, 255, 0.6);

      &:hover {
        color: rgba(255, 255, 255, 1);
        filter: brightness(1.1);
      }
    }

    .measure-bar-marker {
      position: absolute;
      top: 0;
      height: 100%;
      width: 2px;
      background: rgba(0, 0, 0, 0.4);
      z-index: 3;
      transform: translateX(-1px);
    }

    .measure-bar-marker-labels {
      position: relative;
      width: 100%;
      height: 1rem;
      margin-top: 0.15rem;
    }

    .measure-bar-marker-label {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      font-size: 0.7rem;
      line-height: 1;
      white-space: nowrap;
      color: var(--color-text-dark-secondary, #666);
      cursor: help;
      padding: 0.1rem 0.3rem;
      border-radius: 2px;

      // A solid, high-contrast pill (rather than a text-color swap) so the label stays
      // readable regardless of the surrounding sheet theme or an overlapping tooltip.
      &:hover {
        color: var(--color-text-light-highlight, #f0f0f0);
        background: rgba(0, 0, 0, 0.75);
      }
    }

    .measure-bar-text {
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
      padding: 0 0.25rem;

      &.total {
        position: absolute;
        right: 0.25rem;
        transform: translateY(-50%);
        top: 50%;
      }

      // Anchored to a specific value (e.g. the breakpoint the current value is
      // progressing toward) via an inline `left: X%` style, rather than pinned to
      // the bar's right edge like `.total`.
      &.positioned {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    }

    .color-green  { background: #4CAF50; }
    .color-orange { background: #FF9800; }
    .color-blue   { background: #2196F3; }
    .color-yellow { background: #FFC107; }
    .color-red    { background: #F44336; }
  }
</style>
