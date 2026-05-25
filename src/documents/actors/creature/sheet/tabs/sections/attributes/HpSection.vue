<template>
  <section class="sheet-section hp-section">
    <h2 class="section-header">Hit Points</h2>
    <div class="hp-grid">
      <div class="hp-primary">
        <div class="hp-block current">
          <label>Current</label>
          <span class="hp-value placeholder">—</span>
        </div>
        <div class="hp-separator">/</div>
        <div class="hp-block max">
          <label>Max</label>
          <span class="hp-value placeholder">—</span>
        </div>
        <div class="hp-block temp">
          <label>Temp</label>
          <span class="hp-value placeholder">—</span>
        </div>
      </div>
      <div class="hp-secondary">
        <div class="field-row">
          <label>Nonlethal Damage</label>
          <span class="field-value placeholder">0</span>
        </div>
      </div>
    </div>
  </section>
</template>
