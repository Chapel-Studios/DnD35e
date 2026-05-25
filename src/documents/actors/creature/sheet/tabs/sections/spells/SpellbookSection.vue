<template>
  <section class="sheet-section spellbook-section">
    <h2 class="section-header">
      Spellbook
      <span class="spell-stats">DC: <span class="placeholder">—</span> &nbsp;|&nbsp; CL: <span class="placeholder">—</span></span>
    </h2>
    <div v-for="level in spellLevels" :key="level.level" class="spell-level-group">
      <div class="spell-level-header">
        <span class="spell-level-label">{{ level.label }}</span>
        <span class="spell-slots-summary placeholder">Slots: — / —</span>
      </div>
      <table class="spells-table">
        <tbody>
          <tr class="spell-row placeholder-row">
            <td class="empty-row">No spells prepared</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
  const spellLevels = [
    { level: 0, label: 'Cantrips (0)' },
    { level: 1, label: '1st Level' },
    { level: 2, label: '2nd Level' },
    { level: 3, label: '3rd Level' },
    { level: 4, label: '4th Level' },
    { level: 5, label: '5th Level' },
    { level: 6, label: '6th Level' },
    { level: 7, label: '7th Level' },
    { level: 8, label: '8th Level' },
    { level: 9, label: '9th Level' },
  ] as const;
</script>
