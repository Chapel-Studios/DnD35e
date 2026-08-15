import type { FlyManeuverability } from '@constants/index.mjs';
import type { SenseType } from '@constants/senses.mjs';
import type { Size } from '@constants/sizes.mjs';
import type { DocumentSystemData } from '@documents/document/index.mjs';
import type { CurrencyData } from '@fields/currency/CurrencyData.mjs';

/**
 * A single persisted number per speed type. There is no separate "total" slot —
 * the live value is mutated in place by ActiveEffect application during data
 * prep (e.g. the encumbrance DOWNGRADE), while `_source.speed.<key>` always
 * holds the true persisted/edited value. See `getSourceProperty` (edit mode)
 * vs. `getViewAwareFieldValue` (play/true mode) for how the sheet reads each.
 */
interface SpeedData {
  land: number;
  climb: number;
  swim: number;
  burrow: number;
  fly: number;
  flyManeuverability: FlyManeuverability | null;
}

interface SenseEntrySource {
  type: SenseType;
  distance: number;
}

interface ActorSystemSourceProperties extends DocumentSystemData {
  /** Every actor type has a size (creatures, objects, traps, etc.) — used for token dimensions. */
  size: Size;
  /** Every actor type has senses (creatures, objects, traps, etc.) — used for token vision sync. */
  senses: SenseEntrySource[];
}

interface ActorSystemSource extends ActorSystemSourceProperties {
  speed: SpeedData;
}

interface ActorSystemData extends ActorSystemSourceProperties {
  speed: SpeedData;
  // this is stored as an srd gp equivalent value, and is always
  // displayed via a consolidated currency format that follows currency settings
  inventoryValue: CurrencyData;
}

export type {
  ActorSystemData,
  ActorSystemSource,
  ActorSystemSourceProperties,
  SenseEntrySource,
  SpeedData,
};
