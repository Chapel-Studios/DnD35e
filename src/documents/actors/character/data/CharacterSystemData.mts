import type { Size } from '@constants/sizes.mjs';

import type { CreatureSystemData, CreatureSystemSource } from '../../creature/data/CreatureSystemData.mjs';

type LawAxis = 'lawful' | 'neutral' | 'chaotic';
type MoralAxis = 'good' | 'neutral' | 'evil';

interface AlignmentData {
  law: LawAxis | null;
  moral: MoralAxis | null;
}

interface XpSource {
  value: number;
}

interface CharacterSystemSourceProperties {
  xp: XpSource;
  alignment: AlignmentData;
  size: Size;
  isPartyMember: boolean;
}

interface CharacterSystemSource extends CharacterSystemSourceProperties, CreatureSystemSource {}

interface CharacterSystemData extends CharacterSystemSourceProperties, CreatureSystemData {
  /** Derived from class items. Resets to 1 until the class system is implemented. Never stored. */
  level: number;
  /** Derived from race item. Null until the race system is implemented. Never stored. */
  race: string | null;
}

export type {
  AlignmentData,
  CharacterSystemData,
  CharacterSystemSource,
  LawAxis,
  MoralAxis,
  XpSource,
};
