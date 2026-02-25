<template>
  <section
    class="flexcol material-details"
    v-show="isActiveTab"
    data-group="primary"
    :data-tab="tabName"
  >
    <div class="form-container">

      <!-- Hardness -->
      <TextFormGroup
        label="D35E.Hardness"
        :value="bonusHardness"
        :editable="isEditable"
        :on-update="getFieldUpdater('system.bonusHardness')"
      />

      <!-- HP per Inch -->
      <TextFormGroup
        label="D35E.HpPerInch"
        :value="bonusHpPerInch"
        :editable="isEditable"
        :on-update="getFieldUpdater('system.bonusHpPerInch')"
      />

      <!-- Magic Equivalent -->
      <h3 class="form-header">{{ localize("D35E.MagicEquivalent") }}</h3>

      <TextFormGroup
        label="D35E.MagicEquivalent"
        :value="magicEquivalent"
        :editable="isEditable"
        :on-update="getFieldUpdater('system.magicEquivalent')"
      />

      <span class="notes">
        <em>{{ localize("D35E.MagicEquivalentDescription") }}</em>
      </span>

      <!-- Material Equivalents -->
      <CheckBoxFormGroup
        label="D35E.MaterialAlchemicalSilverEquivalent"
        :value="isAlchemicalSilverEquivalent"
        :editable="isEditable"
        :on-update="getFieldUpdater('system.isAlchemicalSilverEquivalent')"
      />

      <CheckBoxFormGroup
        label="D35E.MaterialAdamantineEquivalent"
        :value="isAdamantineEquivalent"
        :editable="isEditable"
        :on-update="getFieldUpdater('system.isAdamantineEquivalent')"
      />

      <CheckBoxFormGroup
        label="D35E.MaterialColdIronEquivalent"
        :value="isColdIronEquivalent"
        :editable="isEditable"
        :on-update="getFieldUpdater('system.isColdIronEquivalent')"
      />

      <!-- GM‑Only Section -->
      <template v-if="userIsGM">
        <h3 class="form-header">{{ localize("D35E.SystemProperties") }}</h3>
        <IdentifiableConfig />
        <UniqueId />
      </template>

    </div>
  </section>
</template>

<script setup lang="ts">
  import { IdentifiableConfig } from '@ec/Identifiable/index.mjs';
  import type { MaterialStore } from '@effects/material/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { TextFormGroup } from '@vc/Fields/index.mjs';
  import { UniqueId } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    materialGetters: {
      bonusHardness,
      bonusHpPerInch,
      magicEquivalent,
      isAlchemicalSilverEquivalent,
      isAdamantineEquivalent,
      isColdIronEquivalent,
    },
    documentActions: {
      getFieldUpdater,
    },
    isEditable,
    localize,
  } = inject('documentSheetStore') as MaterialStore;

  const tabName = 'material-details';
  const isActiveTab = getIsTabOpen(tabName);
  const userIsGM = game.user.isGM;
</script>

<style scoped>
.form-container {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 1rem 3rem;
  align-items: center;
}

.form-header {
  grid-column: span 2;
  margin: 1rem 0 0.25rem;
  text-decoration: underline;
}

.notes {
  margin: -0.75rem 0 0.125rem;
  grid-column: span 2;
}

.form-group {
  display: contents;
}
</style>
