import { escapeRegex } from '@helpers/stringHelpers.mjs';

import { CoinageDefinition, USER_COIN_PREFIX } from '../constants.mjs';

const AUTO_ID_PREFIX = '$!auto!$';

const isAutoId = (id: string): boolean => {
  return id.includes(AUTO_ID_PREFIX);
};

const getDisplayId = (coinage: CoinageDefinition): string => {
  if (coinage.isSystem) return coinage.id;
  const prefix = escapeRegex(USER_COIN_PREFIX);
  const suffix = escapeRegex(AUTO_ID_PREFIX);
  const pattern = new RegExp(`${prefix}(\\d+)${suffix}`);
  const match = coinage.id.match(pattern);
  if (match) {
    return coinage.id.slice(match[0].length);
  } else if (coinage.id.startsWith(USER_COIN_PREFIX)) {
    return coinage.id.slice(USER_COIN_PREFIX.length);
  }
  return coinage.id;
};

const extractAutoIdPrefix = (id: string): string | null => {
  const prefix = escapeRegex(USER_COIN_PREFIX);
  const suffix = escapeRegex(AUTO_ID_PREFIX);

  const pattern = new RegExp(`${prefix}(\\d+)${suffix}`);
  const match = id.match(pattern);

  return match ? match[0] : null;
};

export {
  AUTO_ID_PREFIX,
  extractAutoIdPrefix,
  getDisplayId,
  isAutoId,
};
