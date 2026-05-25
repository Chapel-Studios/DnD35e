<template>
  <section class="sheet-section buff-list-section">
    <h2 class="section-header">
      Active Buffs
      <button type="button" class="section-add-btn" disabled>
        <i class="fas fa-plus" />
      </button>
    </h2>
    <table class="buffs-table">
      <thead>
        <tr>
          <th class="buff-active-col" title="Active" />
          <th class="buff-name-col">Name</th>
          <th class="buff-source-col">Source</th>
          <th class="buff-duration-col">Duration</th>
          <th class="buff-actions-col" />
        </tr>
      </thead>
      <tbody>
        <tr class="buff-row placeholder-row">
          <td colspan="5" class="empty-row">
            <i class="fas fa-bolt" />
            No active buffs
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
