import type { AbilityKey } from '@constants/abilities.mjs';
import type { LawAxis, MoralAxis } from '@constants/alignment.mjs';
import type { SenseType } from '@constants/senses.mjs';
import type { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import type { FormulaDataSource } from '@helpers/formulae/index.mjs';
import type { WeaponDamage } from '@items/physical/weapon/data/index.mjs';
import type { PriceSource } from '@settings/currency/index.mjs';

import type { ActorSystemData, ActorSystemSource } from '../../baseActor/data/ActorSystemData.mjs';

// ─── Ability Scores ──────────────────────────────────────────────────────────

interface AbilityScoreSource {
  score: number;
}

interface AbilityScoreData extends AbilityScoreSource {
  /** Derived: floor((score - 10) / 2). Never stored. */
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
  /**
   * Derived alias for `current`. Foundry's default `TokenDocument#getBarAttribute`
   * only recognizes bar objects with `.value`/`.max` keys; this system stores HP as
   * `.current`/`.max`, so this mirror keeps the token HP bar (`prototypeToken.bar1`,
   * see `buildPrototypeTokenDefaults.mts`) resolvable. Never stored, set every
   * `prepareDerivedData()` pass in `CreatureSystemModel`.
   */
  value: number;
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
  maxLift: number;
  drag: number;
  /** Encumbrance tier: 0=light, 1=medium, 2=heavy, 3=maxLift, 4=drag/overloaded, 5=beyond drag limit (cannot move). */
  tier: number;
  /** AE target: flat bonus to effective STR for carry capacity (e.g. Muleback Cords). Never stored. */
  carryBonus: number;
  /** AE target: multiplier on carry thresholds (e.g. Ant Haul). Never stored. */
  carryMultiplier: number;
  /** Derived: max dex bonus from armor and other sources. `null` when uncapped. Never stored. */
  maxDexBonus: number | null;
  /** Derived: armor check penalty from armor and other sources. Never stored. */
  armorCheckPenalty: number;
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
  /** Derived list of equipped weapon attacks contributed by equipped weapons. Never stored. */
  attacks: WeaponDamage[];
  encumbrance: EncumbranceData;
  isIncorporeal: boolean;
  isQuadruped: boolean;
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
