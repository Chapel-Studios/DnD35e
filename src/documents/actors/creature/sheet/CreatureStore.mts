import type { ActorDocumentStore, ActorStore, UseActorSheetStoreOptions } from '@actors/baseActor/sheet/index.mjs';
import { useActorSheetStore } from '@actors/baseActor/sheet/index.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import type { LawAxis, MoralAxis } from '@constants/alignment.mjs';
import { ALIGNMENT_I18N, NEUTRAL } from '@constants/alignment.mjs';
import type { Size } from '@constants/sizes.mjs';
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

type UseCreatureStoreOptions = UseActorSheetStoreOptions;

/**
 * Creature layer of the actor inheritance chain. Builds the actor store internally,
 * and adds creature-level named getters.
 */
const useCreatureStore = <TDocument extends Creature>(
  context: VueApplicationContext<TDocument>,
  options?: UseCreatureStoreOptions
): CreatureDocumentStore<TDocument> => {
  const actorStore = useActorSheetStore<TDocument>(context, options);
  const { getViewAwareFieldValue } = actorStore.documentGetters;
  const { document } = actorStore._storeUtils;

  const alignmentLaw   = computed(() => getViewAwareFieldValue<LawAxis | null>('system.alignment.law')   ?? null);
  const alignmentMoral = computed(() => getViewAwareFieldValue<MoralAxis | null>('system.alignment.moral') ?? null);

  const documentGetters = {
    ...actorStore.documentGetters,
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

  const store: CreatureDocumentStore<TDocument> = {
    ...actorStore,
    documentGetters,
  };

  return store;
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
  ActorDocumentStore<TDocument> & {
    documentGetters: ActorDocumentStore<TDocument>['documentGetters'] & CreatureGetters;
  };

// Re-export ActorStore for downstream consumers that previously imported it from here.
export type { ActorStore };

export { useCreatureStore };
export type {
  CreatureActions,
  CreatureDocumentStore,
  CreatureGetters,
  CreatureStore,
  CreatureStoreUtils,
  UseCreatureStoreOptions,
};
