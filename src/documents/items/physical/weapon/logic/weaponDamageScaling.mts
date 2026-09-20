/**
 * scaleDamageDie — weapon damage-die scaling by size (poc.10 §10.4 "Weapon damage
 * scaling"). Transcribed from D35E's `sizeDie()` (`module/lib.js`) against its own
 * `D35E.sizeDie` step table (`module/config.js`) — verified against the real D35E
 * v14-compatible source, not reproduced from memory.
 *
 * The entered `weaponDamage.damageRoll` is always the Medium-creature baseline (the SRD's
 * own equipment-table convention); this walks the shared step table up/down from that
 * baseline to the weapon's `designedForSize`.
 *
 * @module
 */
import type { Size } from '@constants/sizes.mjs';
import { SIZES } from '@constants/sizes.mjs';

/** D35E's `D35E.sizeDie` step table (`module/config.js`), transcribed verbatim. */
const SIZE_DIE_TABLE = [
  '1', '1d2', '1d3', '1d4', '1d6', '1d8', '1d10',
  '2d6', '2d8', '3d6', '3d8', '4d6', '4d8',
  '6d6', '6d8', '8d6', '8d8', '12d6', '12d8', '16d6', '16d8',
];

const MEDIUM_INDEX = SIZES.indexOf('medium');
const SMALL_INDEX = SIZES.indexOf('small');

/**
 * Scales a plain `NdM` damage-die formula (e.g. `1d8`) from its Medium-baseline entry to
 * the equivalent die for `size`. Any formula that doesn't start with a plain die term (no
 * `\d+d\d+` prefix) is returned unchanged — nothing to scale. A trailing suffix on the
 * input (e.g. a stray `+2`, not expected for `weaponDamage.damageRoll` but handled
 * defensively) is preserved verbatim;
 */
function scaleDamageDie(dieFormula: string, size: Size): string {
  const trimmed = dieFormula.trim();
  const match = /^(\d+)d(\d+)/.exec(trimmed);
  if (!match) return dieFormula;

  const origCount = Number(match[1]);
  const origSides = Number(match[2]);
  const suffix = trimmed.slice(match[0].length);

  const targetIndex = SIZES.indexOf(size);
  if (targetIndex === -1) return dieFormula;

  const mediumDie = `${origCount}d${origSides}`;
  const mediumMax = origCount * origSides;

  let table = [...SIZE_DIE_TABLE];
  if (!table.includes(mediumDie)) {
    // The entered die doesn't literally appear in the table (e.g. "2d4") — remap
    // whichever table entry shares its max value to stand in for it, same as D35E.
    table = table.map((entry) => {
      const entryMatch = /^(\d+)d(\d+)$/.exec(entry);
      if (!entryMatch) return entry;
      const entryMax = Number(entryMatch[1]) * Number(entryMatch[2]);
      return entryMax === mediumMax ? mediumDie : entry;
    });
  }

  let index = table.indexOf(mediumDie);
  if (index === -1) return dieFormula;

  const d6Index = table.indexOf('1d6');
  const d8Index = table.indexOf('1d8');
  let curSize = MEDIUM_INDEX;

  // Decreasing (e.g. Medium -> Small): single-step below/at Medium, since the SRD's
  // die-step table has no alternating double-step quirk below 1d8.
  while (curSize > targetIndex) {
    if (curSize <= MEDIUM_INDEX || index <= d8Index) {
      index -= 1;
      curSize -= 1;
    } else {
      index -= 2;
      curSize -= 1;
    }
  }
  // Increasing (e.g. Medium -> Large): double-steps once past Small/1d6, matching the
  // SRD table's "2d6, 2d8, 3d6, 3d8, ..." alternation above that point.
  while (curSize < targetIndex) {
    if (curSize <= SMALL_INDEX || index <= d6Index) {
      index += 1;
      curSize += 1;
    } else {
      index += 2;
      curSize += 1;
    }
  }

  index = Math.max(0, Math.min(table.length - 1, index));
  return `${table[index]}${suffix}`;
}

export { scaleDamageDie };
