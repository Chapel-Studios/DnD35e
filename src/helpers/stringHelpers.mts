/**
 * Creates a tag from a string.
 * For example, if you input the string "Wizard of Oz 2", you will get "wizardOfOz2"
 */
export const createTag = function (str: string): string {
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

/**
 * Pretty sure this is just lifted from the UUID library since we can't include them at runtime
 * credit them, not me
 */
export const uuidv4 = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
