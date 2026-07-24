// @vitest-environment happy-dom

import MeasureBar from '@vc/MeasureBar.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for `MeasureBar.vue`'s `percentOf` scaling logic, exercised indirectly
 * through marker/segment positioning (percentOf itself isn't exposed).
 *
 * Covers the default single-slope linear scale plus the piecewise `scalePivots` scale
 * (used by the creature encumbrance bar to compress the heavy-drag "overloaded" range
 * into fixed trailing slices of the bar instead of scaling it linearly against `max`).
 */

/** Reads the `left` percent of the single marker mounted by each test below. */
function markerLeft (wrapper: ReturnType<typeof mount>): number {
  const target = wrapper.find('.measure-bar-marker');
  return parseFloat((target.attributes('style') ?? '').match(/left:\s*([\d.]+)%/)?.[1] ?? 'NaN');
}

describe('MeasureBar linear scaling (no scalePivots)', () => {
  it('positions a marker proportionally to max', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 100,
        markers: [{ key: 'mid', value: 50 }],
      },
    });
    expect(markerLeft(wrapper)).toBeCloseTo(50, 5);
  });

  it('clamps values above max to 100%', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 100,
        markers: [{ key: 'over', value: 150 }],
      },
    });
    expect(markerLeft(wrapper)).toBeCloseTo(100, 5);
  });

  it('returns 0% for all values when max is 0', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 0,
        markers: [{ key: 'any', value: 50 }],
      },
    });
    expect(markerLeft(wrapper)).toBeCloseTo(0, 5);
  });
});

describe('MeasureBar piecewise scaling (scalePivots)', () => {
  const pivot = { value: 100, percent: 80 };

  it('maps the pivot value itself to the pivot percent', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 500,
        scalePivots: [pivot],
        markers: [{ key: 'pivot', value: 100 }],
      },
    });
    expect(markerLeft(wrapper)).toBeCloseTo(80, 5);
  });

  it('scales values below the pivot linearly within 0-pivot.percent', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 500,
        scalePivots: [pivot],
        markers: [{ key: 'half', value: 50 }],
      },
    });
    // 50 is halfway to the pivot value (100) -> half of the pivot percent (80) = 40
    expect(markerLeft(wrapper)).toBeCloseTo(40, 5);
  });

  it('scales values above the pivot linearly within pivot.percent-100', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 500, // heavy=100, drag=500 -> remaining range is 400, remaining percent is 20
        scalePivots: [pivot],
        markers: [{ key: 'quarter-over', value: 200 }], // 100 into the 400-wide remaining range -> 25% of the way
      },
    });
    // 80 + (100/400) * 20 = 80 + 5 = 85
    expect(markerLeft(wrapper)).toBeCloseTo(85, 5);
  });

  it('maps max to exactly 100%', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 500,
        scalePivots: [pivot],
        markers: [{ key: 'max', value: 500 }],
      },
    });
    expect(markerLeft(wrapper)).toBeCloseTo(100, 5);
  });

  it('ignores an out-of-range pivot (>= max) and falls back to linear scaling', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 100,
        scalePivots: [{ value: 100, percent: 80 }], // pivot.value === max -> ignored
        markers: [{ key: 'mid', value: 50 }],
      },
    });
    expect(markerLeft(wrapper)).toBeCloseTo(50, 5);
  });

  it('supports two pivots, mapping each breakpoint to its own percent', () => {
    // heavy=100@80%, maxLift=200@90%, drag(max)=500@100%
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 500,
        scalePivots: [{ value: 100, percent: 80 }, { value: 200, percent: 90 }],
        markers: [
          { key: 'heavy', value: 100 },
          { key: 'maxLift', value: 200 },
          { key: 'between', value: 150 },
          { key: 'drag', value: 500 },
        ],
      },
    });
    const lefts = wrapper.findAll('.measure-bar-marker').map(marker =>
      parseFloat((marker.attributes('style') ?? '').match(/left:\s*([\d.]+)%/)?.[1] ?? 'NaN'));
    expect(lefts[0]).toBeCloseTo(80, 5);
    expect(lefts[1]).toBeCloseTo(90, 5);
    expect(lefts[2]).toBeCloseTo(85, 5); // halfway between the two pivots -> halfway between 80 and 90
    expect(lefts[3]).toBeCloseTo(100, 5);
  });
});

describe('MeasureBar valueLabel', () => {
  it('renders the value label text', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 100,
        valueLabel: { value: 33, text: '5 / 33' },
      },
    });
    expect(wrapper.find('.measure-bar-text.positioned').text()).toBe('5 / 33');
  });

  it('positions the value label at its anchor value, respecting scalePivots', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 500,
        scalePivots: [{ value: 100, percent: 80 }],
        valueLabel: { value: 100, text: '100 / 100' },
      },
    });
    const style = wrapper.find('.measure-bar-text.positioned').attributes('style') ?? '';
    expect(parseFloat(style.match(/left:\s*([\d.]+)%/)?.[1] ?? 'NaN')).toBeCloseTo(80, 5);
  });

  it('does not render a value label when the prop is omitted', () => {
    const wrapper = mount(MeasureBar, {
      props: {
        segments: [],
        max: 100,
      },
    });
    expect(wrapper.find('.measure-bar-text.positioned').exists()).toBe(false);
  });
});
