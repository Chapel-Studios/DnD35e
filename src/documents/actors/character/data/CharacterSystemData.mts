import type { CreatureSystemData, CreatureSystemSource } from '../../creature/data/CreatureSystemData.mjs';

interface XpSource {
  value: number;
}

interface CharacterSystemSourceProperties {
  xp:            XpSource;
  isPartyMember: boolean;
}

interface CharacterSystemSource extends CharacterSystemSourceProperties, CreatureSystemSource {}

interface CharacterSystemData extends CharacterSystemSourceProperties, CreatureSystemData {}

export type {
  CharacterSystemData,
  CharacterSystemSource,
  XpSource,
};
