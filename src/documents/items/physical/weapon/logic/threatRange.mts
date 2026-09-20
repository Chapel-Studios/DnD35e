/**
 * formatThreatRange — display helper for a weapon's numeric crit range (poc.10 §10.4).
 * `weaponDamage.critRange` is stored as the *low* end of the threat range (e.g. `19` for
 * a 19-20 threat range weapon), matching the SRD's own "threatens a critical hit on a roll
 * of 19-20" phrasing.
 *
 * @module
 */

/**
 * @param critRange The low end of the threat range (2-20). `20` means "crits only on a
 * natural 20" (the common case — no range to display).
 */
function formatThreatRange(critRange: number): string {
  if (critRange >= 20) return '20';
  return `${critRange}-20`;
}

export { formatThreatRange };
