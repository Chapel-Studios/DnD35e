// @vitest-environment happy-dom

import { effectDurationTab, getDefaultActiveEffectTabs } from '@effects/baseActiveEffect/sheet/tabs/index.mjs';
import { materialChangesTab, materialDetailsTab } from '@effects/material/sheet/tabs/index.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Structural parity check between the General AE sheet (a thin pass-through that uses
 * `getDefaultActiveEffectTabs()` unmodified — see `GeneralStore.mts`) and the Material AE
 * sheet (which replaces Details/Changes but keeps the base Duration tab — see
 * `MaterialStore.mts`'s `replaceTabs([materialDetailsTab, ...default.filter(...), materialChangesTab])`).
 *
 * Both sheets must expose the same Duration tab and an equivalently-positioned Changes tab,
 * even though Material swaps in its own tab components for Details/Changes.
 */
describe('General vs Material AE sheet — Duration/Changes tab parity', () => {
  const generalTabs = getDefaultActiveEffectTabs();
  // Mirrors MaterialStore.mts's actual `replaceTabs(...)` call.
  const materialTabs = [
    materialDetailsTab,
    ...getDefaultActiveEffectTabs().filter(tab => tab.id !== 'details' && tab.id !== 'changes'),
    materialChangesTab,
  ];

  it('General includes the base Duration tab unmodified', () => {
    const duration = generalTabs.find(tab => tab.id === 'duration');
    expect(duration).toEqual(effectDurationTab);
  });

  it('Material keeps the exact same Duration tab as General (not overridden)', () => {
    const duration = materialTabs.find(tab => tab.id === 'duration');
    expect(duration).toEqual(effectDurationTab);
    expect(duration).toEqual(generalTabs.find(tab => tab.id === 'duration'));
  });

  it('both sheets expose a Changes tab at the same order/label, even though Material uses its own component', () => {
    const generalChanges = generalTabs.find(tab => tab.id === 'changes')!;
    const materialChanges = materialTabs.find(tab => tab.id === 'changes')!;

    expect(generalChanges.order).toBe(materialChanges.order);
    expect(generalChanges.label).toBe(materialChanges.label);
    expect(generalChanges.icon).toBe(materialChanges.icon);
    // Deliberate divergence, not a parity violation: Material renders its own Changes component.
    expect(materialChanges).toBe(materialChangesTab);
    expect(materialChanges.component).not.toBe(generalChanges.component);
  });

  it('General has details/duration/changes tabs; Material has the same 3 tab ids', () => {
    expect(generalTabs.map(tab => tab.id).sort()).toEqual(['changes', 'details', 'duration']);
    expect(materialTabs.map(tab => tab.id).sort()).toEqual(['changes', 'details', 'duration']);
  });
});
