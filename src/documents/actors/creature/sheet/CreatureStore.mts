import type { ActorStore } from '@actors/baseActor/sheet/index.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import type { LawAxis, MoralAxis } from '@constants/alignment.mjs';
import { ALIGNMENT_I18N, NEUTRAL } from '@constants/alignment.mjs';
import type { Size } from '@constants/sizes.mjs';
import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const buildAlignmentLabel = (law: LawAxis | null, moral: MoralAxis | null): string | null => {
  if (!law && !moral) return null;
  if (law === NEUTRAL && moral === NEUTRAL) {
    return game.i18n.localize(ALIGNMENT_I18N.trueNeutral);
  }

  const lawLabel   = law   ? game.i18n.localize(ALIGNMENT_I18N.law(law))     : null;
  const moralLabel = moral ? game.i18n.localize(ALIGNMENT_I18N.moral(moral)) : null;

  return [lawLabel, moralLabel].filter((p): p is string => Boolean(p)).join(' ') || null;
};

/**
 * Overlay that adds creature-level named getters on top of a base document sheet store.
 * Mirrors the IdentifiableStore / EquippableItemStore pattern: returns a partial overlay
 * that callers spread into the final leaf store.
 */
const useCreatureStore = <TDocument extends Creature>(
  _context: VueApplicationContext<TDocument>,
  baseStore: DocumentSheetStore<TDocument>
): CreatureStore => {
  const {
    documentGetters: { getViewAwareFieldValue },
    _storeUtils: { document },
  } = baseStore;

  const alignmentLaw   = computed(() => getViewAwareFieldValue<LawAxis | null>('system.alignment.law')   ?? null);
  const alignmentMoral = computed(() => getViewAwareFieldValue<MoralAxis | null>('system.alignment.moral') ?? null);

  const documentGetters: CreatureGetters = {
    gender: computed(() => getViewAwareFieldValue<string | null>('system.bio.gender') ?? ''),
    deity:  computed(() => getViewAwareFieldValue<string | null>('system.bio.deity')  ?? ''),
    age:    computed(() => getViewAwareFieldValue<string | null>('system.bio.age')    ?? ''),
    height: computed(() => getViewAwareFieldValue<string | null>('system.bio.height') ?? ''),
    weight: computed(() => getViewAwareFieldValue<string | null>('system.bio.weight') ?? ''),

    alignmentLaw,
    alignmentMoral,
    alignmentLabel: computed(() => buildAlignmentLabel(alignmentLaw.value, alignmentMoral.value)),

    size:  computed(() => getViewAwareFieldValue<Size>('system.size') ?? 'medium'),
    notes: computed(() => getViewAwareFieldValue<string>('system.notes') ?? ''),
    level: computed(() => (document.value as unknown as { system: { level?: number } }).system.level ?? 1),
  };

  return {
    documentGetters,
    documentActions: {},
    _storeUtils: {},
  };
};

interface CreatureGetters {
  gender:         ComputedRef<string>;
  deity:          ComputedRef<string>;
  age:            ComputedRef<string>;
  height:         ComputedRef<string>;
  weight:         ComputedRef<string>;
  alignmentLaw:   ComputedRef<LawAxis | null>;
  alignmentMoral: ComputedRef<MoralAxis | null>;
  alignmentLabel: ComputedRef<string | null>;
  size:           ComputedRef<Size>;
  notes:          ComputedRef<string>;
  level:          ComputedRef<number>;
}

type CreatureActions = Record<string, unknown>;
type CreatureStoreUtils = Record<string, unknown>;

interface CreatureStore {
  documentGetters: CreatureGetters;
  documentActions: CreatureActions;
  _storeUtils: CreatureStoreUtils;
}

type CreatureDocumentStore<TDocument extends Creature = Creature> =
  DocumentSheetStore<TDocument> & ActorStore & CreatureStore;

export { useCreatureStore };
export type {
  CreatureActions,
  CreatureDocumentStore,
  CreatureGetters,
  CreatureStore,
  CreatureStoreUtils,
};
