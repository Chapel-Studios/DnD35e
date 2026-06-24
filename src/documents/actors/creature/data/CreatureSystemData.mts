import type { AbilityKey } from '@constants/abilities.mjs';
import type { LawAxis, MoralAxis } from '@constants/alignment.mjs';
import type { SenseType } from '@constants/senses.mjs';
import type { Size } from '@constants/sizes.mjs';
import type { CurrencyData } from '@fields/CurrencyData.mjs';
import type { FormulaDataSource } from '@helpers/formulae/index.mjs';
import type { PriceSource } from '@settings/currency/index.mjs';

import type { ActorSystemData, ActorSystemSource } from '../../baseActor/data/ActorSystemData.mjs';

// ─── Ability Scores ──────────────────────────────────────────────────────────

interface AbilityScoreSource {
  base: number;
}

interface AbilityScoreData extends AbilityScoreSource {
  /** Derived: floor((base - 10) / 2). Never stored. */
  mod: number;
}

type AbilityScoresOf<TEntry extends AbilityScoreSource> = Record<AbilityKey, TEntry>;

// ─── HP ──────────────────────────────────────────────────────────────────────

interface HpSource {
  current: number;
  temp: number;
  nonlethal: number;
}

interface HpData extends HpSource {
  /** Derived: class HD × level + CON mod + bonuses. Never stored. */
  max: number;
  regeneration: number;
  fastHealing: number;
}

// ─── Saves ───────────────────────────────────────────────────────────────────

interface SaveSource {
  // base save progression comes from class levels (alpha.2)
}

interface SaveData extends SaveSource {
  /** Derived: class save progression + ability mod + bonuses. Never stored. */
  total: number;
}

type SavesOf<TEntry extends SaveSource> = {
  fort: TEntry; ref: TEntry; will: TEntry;
};

// ─── Encumbrance ─────────────────────────────────────────────────────────────

interface EncumbranceData {
  carriedWeight: number;
  light: number;
  medium: number;
  heavy: number;
  carry: number;
  drag: number;
  /** Encumbrance tier: 0 = unencumbered, 1 = light, 2 = medium, 3 = heavy, 4 = overloaded. */
  level: number;
  /** AE target: flat bonus to effective STR for carry capacity (e.g. Muleback Cords). Never stored. */
  carryBonus: number;
  /** AE target: multiplier on carry thresholds (e.g. Ant Haul). Never stored. */
  carryMultiplier: number;
}

// ─── Alignment ───────────────────────────────────────────────────────────────

interface AlignmentData {
  law:   LawAxis | null;
  moral: MoralAxis | null;
}

// ─── Bio ─────────────────────────────────────────────────────────────────────

interface SenseEntrySource {
  type: SenseType;
  distance: number;
}

interface BioSource {
  gender:    string | null;
  deity:     string | null;
  age:       string | null;
  height:    string | null;
  weight:    string | null;
  alignment: AlignmentData;
  languages: string[];
  senses:    SenseEntrySource[];
}

// ─── Settings ────────────────────────────────────────────────────────────────

interface SettingsData {
  isPartyMember: boolean;
}

// ─── Creature source / data ───────────────────────────────────────────────────

interface CreatureSystemSourceProperties {
  bio:          BioSource;
  size:         Size;
  notes:        string;
  settings:     SettingsData;
}

interface CreatureSystemSource extends CreatureSystemSourceProperties, ActorSystemSource {
  abilities:  AbilityScoresOf<AbilityScoreSource>;
  hp:         HpSource;
  saves:      SavesOf<SaveSource>;
  currency:   PriceSource;
  defense: {
    spellResistance: FormulaDataSource;
  }
}

interface CreatureSystemData extends CreatureSystemSourceProperties, ActorSystemData {
  abilities: AbilityScoresOf<AbilityScoreData>;
  hp: HpData;
  /** Entirely derived — not stored in source. */
  bab: { total: number };
  /** Entirely derived — not stored in source. */
  defense: {
    armorClass: number;
    touchAC: number;
    flatFootedAC: number;
    naturalArmor: number;
    fortification: number;
    concealment: number;
    spellResistance: FormulaDataSource;
  };
  saves: SavesOf<SaveData>;
  /** Entirely derived — not stored in source. */
  init: { total: number };
  /** Derived from class items. Resets to 1 until class system is implemented. Never stored. */
  level: number;
  currency: CurrencyData;
  encumbrance: EncumbranceData;
  isIncorporeal: boolean;
  isQuadraped: boolean;
  creatureType: string;
  aooCount: number;
}

export type {
  AbilityScoreData,
  AbilityScoresOf,
  AbilityScoreSource,
  AlignmentData,
  BioSource,
  CreatureSystemData,
  CreatureSystemSource,
  CreatureSystemSourceProperties,
  EncumbranceData,
  HpData,
  HpSource,
  SaveData,
  SavesOf,
  SaveSource,
  SenseEntrySource,
  SettingsData,
};
