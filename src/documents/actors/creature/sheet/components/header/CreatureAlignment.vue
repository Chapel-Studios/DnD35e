<template>
  <FormGroup
    field-path="system.bio.alignment"
    :value="alignmentLabel ?? ''"
  >
    <div class="alignment-selects">
      <select :value="alignmentLaw ?? ''" @change="onLawChange">
        <option value="">—</option>
        <option v-for="opt in LAW_OPTIONS"   :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select :value="alignmentMoral ?? ''" @change="onMoralChange">
        <option value="">—</option>
        <option v-for="opt in MORAL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <template #readonly>
      <span>{{ alignmentLabel ?? '—' }}</span>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { LAW_AXIS_SELECT_OPTIONS, MORAL_AXIS_SELECT_OPTIONS } from '@constants/alignment.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { FormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);

  const LAW_OPTIONS   = LAW_AXIS_SELECT_OPTIONS.map(o => ({ value: o.value, label: localize(o.label) }));
  const MORAL_OPTIONS = MORAL_AXIS_SELECT_OPTIONS.map(o => ({ value: o.value, label: localize(o.label) }));

  const {
    documentGetters: { alignmentLaw, alignmentMoral, alignmentLabel },
    documentActions: { getViewAwareFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const updateLaw   = getViewAwareFieldUpdater('system.bio.alignment.law');
  const updateMoral = getViewAwareFieldUpdater('system.bio.alignment.moral');

  const onLawChange   = (e: Event) => updateLaw((e.target  as HTMLSelectElement).value || null);
  const onMoralChange = (e: Event) => updateMoral((e.target as HTMLSelectElement).value || null);
</script>

<style scoped lang="scss">
  .alignment-selects {
    display: flex;
    gap: 0.15rem;
    flex: 1 1 auto;
    min-width: 0;

    select { flex: 1 1 0; min-width: 0; }
  }
</style>
