import type { AvailableLanguagesConfig } from '@settings/gameRules/types.mjs';

const COMMON_LANGUAGE = 'common';
const ELVEN_LANGUAGE = 'elven';
const DWARVEN_LANGUAGE = 'dwarven';
const GNOMISH_LANGUAGE = 'gnomish';
const ABYSSAL_LANGUAGE = 'abyssal';
const AQUAN_LANGUAGE = 'aquan';
const AURAN_LANGUAGE = 'auran';
const CELESTIAL_LANGUAGE = 'celestial';
const DRACONIC_LANGUAGE = 'draconic';
const DRUIDIC_LANGUAGE = 'druidic';
const GIANT_LANGUAGE = 'giant';
const GOBLIN_LANGUAGE = 'goblin';
const GNOLL_LANGUAGE = 'gnoll';
const HALFLING_LANGUAGE = 'halfling';
const IGNAN_LANGUAGE = 'ignan';
const INFERNAL_LANGUAGE = 'infernal';
const ORC_LANGUAGE = 'orc';
const SYLVAN_LANGUAGE = 'sylvan';
const TERRAN_LANGUAGE = 'terran';
const UNDERCOMMON_LANGUAGE = 'undercommon';
const DEFAULT_AVAILABLE_LANGUAGES = [
  COMMON_LANGUAGE,
  ELVEN_LANGUAGE,
  DWARVEN_LANGUAGE,
  GNOMISH_LANGUAGE,
  ABYSSAL_LANGUAGE,
  AQUAN_LANGUAGE,
  AURAN_LANGUAGE,
  CELESTIAL_LANGUAGE,
  DRACONIC_LANGUAGE,
  DRUIDIC_LANGUAGE,
  GIANT_LANGUAGE,
  GOBLIN_LANGUAGE,
  GNOLL_LANGUAGE,
  HALFLING_LANGUAGE,
  IGNAN_LANGUAGE,
  INFERNAL_LANGUAGE,
  ORC_LANGUAGE,
  SYLVAN_LANGUAGE,
  TERRAN_LANGUAGE,
  UNDERCOMMON_LANGUAGE,
];
const DEFAULT_AVAILABLE_LANGUAGE = {
  COMMON_LANGUAGE,
  ELVEN_LANGUAGE,
  DWARVEN_LANGUAGE,
  GNOMISH_LANGUAGE,
  ABYSSAL_LANGUAGE,
  AQUAN_LANGUAGE,
  AURAN_LANGUAGE,
  CELESTIAL_LANGUAGE,
  DRACONIC_LANGUAGE,
  DRUIDIC_LANGUAGE,
  GIANT_LANGUAGE,
  GOBLIN_LANGUAGE,
  GNOLL_LANGUAGE,
  HALFLING_LANGUAGE,
  IGNAN_LANGUAGE,
  INFERNAL_LANGUAGE,
  ORC_LANGUAGE,
  SYLVAN_LANGUAGE,
  TERRAN_LANGUAGE,
  UNDERCOMMON_LANGUAGE,
} as const;
type DefaultAvailableLanguage = (typeof DEFAULT_AVAILABLE_LANGUAGES)[number];
const DEFAULT_AVAILABLE_LANGUAGES_OPTIONS: AvailableLanguagesConfig = {
  [COMMON_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Common', enabled: true, isSystem: true },
  [ELVEN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Elven', enabled: true, isSystem: true },
  [DWARVEN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Dwarven', enabled: true, isSystem: true },
  [GNOMISH_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Gnomish', enabled: true, isSystem: true },
  [ABYSSAL_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Abyssal', enabled: true, isSystem: true },
  [AQUAN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Aquan', enabled: true, isSystem: true },
  [AURAN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Auran', enabled: true, isSystem: true },
  [CELESTIAL_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Celestial', enabled: true, isSystem: true },
  [DRACONIC_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Draconic', enabled: true, isSystem: true },
  [DRUIDIC_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Druidic', enabled: true, isSystem: true },
  [GIANT_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Giant', enabled: true, isSystem: true },
  [GOBLIN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Goblin', enabled: true, isSystem: true },
  [GNOLL_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Gnoll', enabled: true, isSystem: true },
  [HALFLING_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Halfling', enabled: true, isSystem: true },
  [IGNAN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Ignan', enabled: true, isSystem: true },
  [INFERNAL_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Infernal', enabled: true, isSystem: true },
  [ORC_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Orc', enabled: true, isSystem: true },
  [SYLVAN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Sylvan', enabled: true, isSystem: true },
  [TERRAN_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Terran', enabled: true, isSystem: true },
  [UNDERCOMMON_LANGUAGE]: { label: 'dnd35e.LANGUAGE_OPTIONS.Undercommon', enabled: true, isSystem: true },
};

export type {
  DefaultAvailableLanguage,
};

export {
  DEFAULT_AVAILABLE_LANGUAGE,
  DEFAULT_AVAILABLE_LANGUAGES,
  DEFAULT_AVAILABLE_LANGUAGES_OPTIONS,
};