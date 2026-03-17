/**
 * Creates a tag from a string.
 * For example, if you input the string "Wizard of Oz 2", you will get "wizardOfOz2"
 */
const createTag = function (str: string): string {
  if (str.length === 0) str = 'tag';
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((s, a) => {
      s = s.toLowerCase();
      if (a > 0) s = s.substring(0, 1).toUpperCase() + s.substring(1);
      return s;
    })
    .join('');
};

const stripSpecialCharacters = function (str: string): string {
  const result = str
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s+/g, '_')                              // spaces → _
    .replace(/[^a-z0-9_]/g, '')                        // remove non‑safe chars
    .replace(/_+/g, '_')                               // collapse __
    .replace(/^_+|_+$/g, '')                           // trim _
    ?? '';

  return result;
};

const escapeRegex = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export {
  createTag,
  escapeRegex,
  stripSpecialCharacters,
};

