// @vitest-environment happy-dom

import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { useActorSheetStore } from '@actors/baseActor/sheet/ActorSheetStore.mjs';
import { RenderModeStoreSymbol } from '@documents/document/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import { mount } from '@vue/test-utils';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h } from 'vue';

/**
 * Tests for `useActorSheetStore`'s three Actor Effects tab getters
 * (`conditions`, `transferredEffects`, `selfContributedEffect`).
 *
 * The composable is not designed to be called outside a component's `setup()`
 * (it calls Vue's `provide`/`inject`), so we mount a tiny host component that
 * calls it and exposes the getters for assertion, rather than invoking it as a
 * plain function. `RenderModeStoreSymbol` is the real, module-scoped symbol
 * (not a test double) since it's cheap to satisfy directly with a mock store.
 */

const mkRenderModeStore = () => ({
  isPlayMode: computed(() => false),
  isEditMode: computed(() => true),
  isTrueMode: computed(() => false),
  isOwnerOrGM: computed(() => true),
  isGM: computed(() => false),
});

// `game.user.isGM` is a readonly getter in the ambient Foundry types; tests still need
// to flip it to exercise GM-only branches (the getters under test read `game.user.isGM`
// directly rather than an injected store).
const setIsGM = (value: boolean): void => {
  (game.user as unknown as { isGM: boolean }).isGM = value;
};

const mkItem = (name: string, effects: ActiveEffectDnd35e[] = []): ItemDnd35e =>
  ({ name, type: 'weapon', effects } as unknown as ItemDnd35e);

const mkTransferredEffect = (overrides: Record<string, unknown> = {}): ActiveEffectDnd35e => ({
  id: 'ae-1',
  name: 'Bull\'s Strength',
  transfer: true,
  system: { isHidden: false },
  ...overrides,
} as unknown as ActiveEffectDnd35e);

const mkDocument = (overrides: Record<string, unknown> = {}): ActorDnd35e => ({
  type: 'character',
  documentName: 'Actor',
  effects: [],
  items: [],
  statuses: new Set<string>(),
  getFlag: vi.fn(() => undefined),
  getSelfContributedChanges: vi.fn(() => []),
  toggleStatusEffect: vi.fn(),
  ...overrides,
} as unknown as ActorDnd35e);

const mountStore = (document: ActorDnd35e) => {
  let exposedStore!: ReturnType<typeof useActorSheetStore>;

  const Host = defineComponent({
    setup () {
      const context: VueApplicationContext<ActorDnd35e> = {
        document,
        appConfigOptions: { document } as VueApplicationContext<ActorDnd35e>['appConfigOptions'],
        close: async () => {},
      };
      exposedStore = useActorSheetStore(context, { defaultTabs: [] });
      return () => h('div');
    },
  });

  mount(Host, {
    global: { provide: { [RenderModeStoreSymbol as symbol]: mkRenderModeStore() } },
  });

  return exposedStore;
};

describe('useActorSheetStore — Actor Effects tab getters', () => {
  beforeEach(() => {
    setIsGM(false);
  });

  it('conditions lists every SRD condition, marking active ones from actor.statuses', () => {
    const document = mkDocument({ statuses: new Set(['entangled']) });
    const store = mountStore(document);

    const conditions = store.documentGetters.conditions.value;
    expect(conditions.length).toBeGreaterThan(0);

    const entangled = conditions.find((c) => c.id === 'entangled');
    expect(entangled?.active).toBe(true);

    const blinded = conditions.find((c) => c.id === 'blinded');
    expect(blinded?.active).toBe(false);
  });

  it('transferredEffects collects transfer:true effects from owned items, tagged with the source item name', () => {
    const document = mkDocument({
      items: [
        mkItem('Belt of Giant Strength', [mkTransferredEffect({ id: 'ae-1' })]),
        mkItem('Dagger', [mkTransferredEffect({ id: 'ae-2', transfer: false })]),
      ],
    });
    const store = mountStore(document);

    const rows = store.documentGetters.transferredEffects.value;
    expect(rows).toHaveLength(1);
    expect(rows[0].effect.id).toBe('ae-1');
    expect(rows[0].sourceItemName).toBe('Belt of Giant Strength');
  });

  it('transferredEffects hides isHidden effects from non-GM users but shows them to GMs', () => {
    const document = mkDocument({
      items: [mkItem('Cloak', [mkTransferredEffect({ id: 'ae-3', system: { isHidden: true } })])],
    });

    const nonGmStore = mountStore(document);
    expect(nonGmStore.documentGetters.transferredEffects.value).toHaveLength(0);

    setIsGM(true);
    const gmStore = mountStore(document);
    expect(gmStore.documentGetters.transferredEffects.value).toHaveLength(1);
  });

  it('selfContributedEffect is null when getSelfContributedChanges returns no changes', () => {
    const document = mkDocument({ getSelfContributedChanges: vi.fn(() => []) });
    const store = mountStore(document);
    expect(store.documentGetters.selfContributedEffect.value).toBeNull();
  });

  it('selfContributedEffect summarizes the changes under the first change\'s label', () => {
    const changes = [
      { key: 'system.encumbrance.maxDexBonus', value: 3, type: 'downgrade', phase: 'final', target: 'actor', isSystem: true, label: 'Moderately Loaded' },
      { key: 'system.abilities.dex.mod', value: 3, type: 'downgrade', phase: 'final', target: 'actor', isSystem: true, label: 'Moderately Loaded' },
    ];
    const document = mkDocument({ getSelfContributedChanges: vi.fn(() => changes) });
    const store = mountStore(document);

    const row = store.documentGetters.selfContributedEffect.value;
    expect(row).not.toBeNull();
    expect(row?.label).toBe('Moderately Loaded');
    expect(row?.icon).toBe('icons/svg/downgrade.svg');
    expect(row?.changes).toHaveLength(2);
  });
});
