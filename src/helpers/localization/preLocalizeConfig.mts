type PreLocalizationRegistration = {
  keys: string[];
};

const preLocalizationRegistrations: Record<string, PreLocalizationRegistration> = {};

/**
 * Register a CONFIG path for pre-localization at i18n initialization time.
 *
 * Paths are resolved relative to CONFIG.dnd35e and should point to enum-like
 * maps where each entry is either:
 * - a localization key string, or
 * - an object containing localization-key properties such as `label`.
 */
function registerConfigPreLocalization(
  configKeyPath: string,
  { key, keys = [] }: { key?: string; keys?: string[] } = {}
): void {
  const keysToStore = key ? [key, ...keys] : [...keys];
  preLocalizationRegistrations[configKeyPath] = { keys: keysToStore };
}

/**
 * Pre-localize registered CONFIG enums in place.
 *
 * Must run in the `i18nInit` hook so game.i18n is available.
 * For enum entries with string values, this utility normalizes them to
 * object entries with a localized `.label` while preserving the original key
 * under `.key`.
 */
function preLocalizeConfig(config: Record<string, unknown>): void {
  for (const [keyPath, registration] of Object.entries(preLocalizationRegistrations)) {
    const target = foundry.utils.getProperty(config, keyPath);
    if (!target) continue;

    localizeRegisteredTarget(target as Record<string, unknown>, registration.keys);
  }
}

function localizeRegisteredTarget(target: Record<string, unknown>, keys: string[]): void {
  for (const [entryKey, entryValue] of Object.entries(target)) {
    if (typeof entryValue === 'string') {
      // Normalize shorthand enum entries into explicit objects with `.label`.
      target[entryKey] = {
        key: entryValue,
        label: game.i18n.localize(entryValue),
      };
      continue;
    }

    if (Array.isArray(entryValue)) {
      localizeArrayEntries(entryValue, keys);
      continue;
    }

    if (typeof entryValue === 'object' && entryValue !== null) {
      localizeObjectEntry(entryValue as Record<string, unknown>, keys);
    }
  }
}

function localizeArrayEntries(entries: unknown[], keys: string[]): void {
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (typeof entry === 'string') {
      entries[i] = game.i18n.localize(entry);
      continue;
    }

    if (entry && typeof entry === 'object') {
      localizeObjectEntry(entry as Record<string, unknown>, keys);
    }
  }
}

function localizeObjectEntry(entry: Record<string, unknown>, keys: string[]): void {
  const keysToLocalize = keys.length > 0 ? keys : ['label'];

  for (const key of keysToLocalize) {
    const raw = foundry.utils.getProperty(entry, key);
    if (typeof raw !== 'string') continue;
    foundry.utils.setProperty(entry, key, game.i18n.localize(raw));
  }

  for (const [childKey, childValue] of Object.entries(entry)) {
    if (keysToLocalize.includes(childKey)) continue;

    if (Array.isArray(childValue)) {
      localizeArrayEntries(childValue, keys);
      continue;
    }

    if (childValue && typeof childValue === 'object') {
      localizeObjectEntry(childValue as Record<string, unknown>, keys);
    }
  }
}

export {
  preLocalizeConfig,
  registerConfigPreLocalization,
};
