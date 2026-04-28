/**
 * generate-labels.mjs
 *
 * Regenerates the phase labels section of .github/labels.yml
 * from docs/migration-plan/phases.json.
 *
 * The section between sentinel comments is replaced in-place.
 * All other labels (type:, status:, etc.) are left untouched.
 *
 * Usage:
 *   node scripts/generate-labels.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LABELS_PATH = path.join(ROOT, ".github/labels.yml");
const PHASES_PATH = path.join(ROOT, "docs/migration-plan/phases.json");

const SENTINEL_START =
  "# BEGIN GENERATED PHASE LABELS — do not edit manually, run: node scripts/generate-labels.mjs";
const SENTINEL_END = "# END GENERATED PHASE LABELS";

// ─── Generator ───────────────────────────────────────────────────────────────

function generatePhaseSection(data) {
  const lines = [];
  lines.push(SENTINEL_START);
  lines.push("");

  let currentWave = null;

  for (const phase of data.phases) {
    if (phase.wave !== currentWave) {
      currentWave = phase.wave;
      const wave = data.waves[phase.wave];
      lines.push(`# ${wave.name} — ${wave.description} (${phase.wave}.${parseInt(data.phases.find((p) => p.wave === phase.wave).number, 10)}–${phase.wave}.${parseInt(data.phases.filter((p) => p.wave === currentWave).at(-1).number, 10)})`);
    }

    const name = `${phase.wave}: ${phase.number} — ${phase.title}`;
    const desc = `${phase.wave}.${parseInt(phase.number, 10)} — ${phase.title}`;
    const color = data.waves[phase.wave].color;

    lines.push(`- name: "${name}"`);
    lines.push(`  color: "${color}"`);
    lines.push(`  description: "${desc}"`);
    lines.push("");
  }

  lines.push(SENTINEL_END);
  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const data = JSON.parse(fs.readFileSync(PHASES_PATH, "utf8"));
  const labelsRaw = fs.readFileSync(LABELS_PATH, "utf8");

  const startIdx = labelsRaw.indexOf(SENTINEL_START);
  const endIdx = labelsRaw.indexOf(SENTINEL_END);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Sentinel comments not found in .github/labels.yml.\n` +
        `Add these lines to mark the generated section:\n  ${SENTINEL_START}\n  ${SENTINEL_END}`,
    );
  }

  const before = labelsRaw.slice(0, startIdx);
  const after = labelsRaw.slice(endIdx + SENTINEL_END.length);
  const generated = generatePhaseSection(data);

  fs.writeFileSync(LABELS_PATH, before + generated + after, "utf8");
  console.log(`✓ Generated ${data.phases.length} phase labels in .github/labels.yml`);
}

main();
