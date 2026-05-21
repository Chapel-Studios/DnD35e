/**
 * DEV ONLY — Import documents into a compendium pack from pasted CSV.
 *
 * Works with any pack type: Item, ActiveEffect, JournalEntry, Macro, etc.
 * Uses `pack.documentClass.create()` so no hardcoded type assumptions.
 *
 * Required CSV columns:
 *   name   — document name
 *   type   — document subtype (e.g. "weapon", "armor", "script")
 *   pack   — short pack name (e.g. "materials") or full id ("dnd35e.materials")
 *
 * Reserved columns (not written to the document):
 *   pack   — routed to creation context options
 *
 * Top-level document fields (not written to system.*):
 *   name, type, img, folder
 *
 * All other columns → system.* exactly as named.
 *   e.g. "slug"    → system.slug
 *        "subtype" → system.subtype
 *
 * Descriptions and complex nested data (AE changes arrays, journal pages, etc.)
 * are NOT suited for CSV. Use this macro to generate documents with valid
 * Foundry-assigned _ids, then add rich data afterwards:
 *   - Edit the JSON directly after `npm run unpack:<packName>`
 *   - Or use a transformation script (scripts/transform-*.mjs)
 *
 * Note: simple comma-split parser — quoted fields containing commas are not supported.
 */

async function importFromCSV(csvText) {
  const TOP_LEVEL = new Set(['name', 'type', 'img', 'folder']);
  const RESERVED  = new Set(['pack']);

  const lines = csvText.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    ui.notifications.warn('CSV must have a header row and at least one data row.');
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim());
  for (const col of ['name', 'type', 'pack']) {
    if (!headers.includes(col)) {
      ui.notifications.error(`CSV is missing required column: "${col}"`);
      return;
    }
  }

  let created = 0;
  let skipped = 0;

  // Track per-pack original lock states so we can restore them afterwards.
  const lockStates = new Map(); // packId → wasLocked (boolean)

  async function ensureUnlocked(pack) {
    if (lockStates.has(pack.collection)) return;
    const wasLocked = pack.locked;
    lockStates.set(pack.collection, wasLocked);
    if (wasLocked) await pack.configure({ locked: false });
  }

  async function restoreLocks() {
    for (const [packId, wasLocked] of lockStates) {
      if (wasLocked) await game.packs.get(packId)?.configure({ locked: true });
    }
  }

  try {
    for (const line of lines.slice(1)) {
      const values = line.split(',').map(v => v.trim());
      const row = Object.fromEntries(
        headers
          .map((h, i) => [h, values[i] ?? ''])
          .filter(([, v]) => v !== '')
      );

      if (!row.name || !row.type || !row.pack) { skipped++; continue; }

      const packId = row.pack.includes('.') ? row.pack : `${game.system.id}.${row.pack}`;
      const pack   = game.packs.get(packId);
      if (!pack) {
        ui.notifications.error(`Pack not found: "${packId}" (row: ${row.name})`);
        skipped++;
        continue;
      }

      await ensureUnlocked(pack);

      const docData = { system: {} };
      for (const [key, val] of Object.entries(row)) {
        if (RESERVED.has(key)) continue;
        if (TOP_LEVEL.has(key)) docData[key] = val;
        else docData.system[key] = val;
      }

      await pack.documentClass.create(docData, { pack: packId });
      created++;
    }
  } finally {
    await restoreLocks();
  }

  ui.notifications.info(
    `Imported ${created} document(s).` +
    (skipped > 0 ? ` ${skipped} row(s) skipped (missing name, type, or pack).` : '')
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

new Dialog({
  title: 'Import Documents from CSV',
  content: `
    <p>Required columns: <strong>name</strong>, <strong>type</strong>, <strong>pack</strong>.</p>
    <p style="font-size:0.85em;color:var(--color-text-dark-secondary)">
      <code>pack</code> accepts short name (<em>materials</em>) or full id (<em>dnd35e.materials</em>).<br>
      Top-level fields: <code>name</code>, <code>type</code>, <code>img</code>, <code>folder</code> — everything else → <code>system.*</code>.<br>
      For long descriptions or complex fields (AE changes, journal pages), edit the unpacked JSON after import.
    </p>
    <textarea
      id="dnd35e-csv"
      style="width:100%;height:240px;font-family:monospace;font-size:0.82em"
      placeholder="name,type,pack,slug&#10;Broken Weapon,base,materials,broken-weapon"
    ></textarea>
  `,
  buttons: {
    import: {
      icon:     '<i class="fas fa-file-import"></i>',
      label:    'Import',
      callback: html => importFromCSV(html.find('#dnd35e-csv').val()),
    },
    cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' },
  },
  default: 'import',
}).render(true);
