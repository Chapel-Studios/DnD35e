<template>
  <section class="sheet-section saving-throws-section">
    <h2 class="section-header">Saving Throws</h2>
    <table class="saves-table">
      <thead>
        <tr>
          <th class="save-name-col">Save</th>
          <th class="save-num-col">Total</th>
          <th class="save-num-col">Base</th>
          <th class="save-num-col">Ability</th>
          <th class="save-num-col">Magic</th>
          <th class="save-num-col">Misc</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="save in saves" :key="save.key" class="save-row">
          <td class="save-name">{{ save.label }}</td>
          <td class="save-total placeholder">—</td>
          <td class="save-base placeholder">—</td>
          <td class="save-ability placeholder">—</td>
          <td class="save-magic placeholder">—</td>
          <td class="save-misc placeholder">—</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
  const saves = [
    { key: 'fort', label: 'Fortitude' },
    { key: 'ref',  label: 'Reflex' },
    { key: 'will', label: 'Will' },
  ] as const;
</script>
