<template>
  <section class="sheet-section weapons-section">
    <h2 class="section-header">
      Weapons
      <button type="button" class="section-add-btn" disabled>
        <i class="fas fa-plus" />
      </button>
    </h2>
    <table class="weapons-table">
      <thead>
        <tr>
          <th class="weapon-name-col">Weapon</th>
          <th class="weapon-num-col">Attack</th>
          <th class="weapon-num-col">Damage</th>
          <th class="weapon-num-col">Crit</th>
          <th class="weapon-range-col">Range</th>
          <th class="weapon-type-col">Type</th>
          <th class="weapon-actions-col" />
        </tr>
      </thead>
      <tbody>
        <tr class="weapon-row placeholder-row">
          <td colspan="7" class="empty-row">
            <i class="fas fa-shield-halved" />
            No weapons equipped
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
