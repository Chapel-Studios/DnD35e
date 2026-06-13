import type { FlyManeuverability } from '@constants/index.mjs';
import type { DocumentSystemData } from '@documents/document/index.mjs';

interface SpeedEntrySource {
  base: number;
}

interface SpeedEntryData extends SpeedEntrySource {
  total: number;
}

type SpeedDataOf<TEntry extends SpeedEntrySource> = {
  land: TEntry;
  climb: TEntry;
  swim: TEntry;
  burrow: TEntry;
  fly: TEntry;
  flyManeuverability: FlyManeuverability | null;
};

interface ActorSystemSourceProperties extends DocumentSystemData {}

interface ActorSystemSource extends ActorSystemSourceProperties {
  speed: SpeedDataOf<SpeedEntrySource>;
}

interface ActorSystemData extends ActorSystemSourceProperties {
  speed: SpeedDataOf<SpeedEntryData>;
}

export type {
  ActorSystemData,
  ActorSystemSource,
  ActorSystemSourceProperties,
  SpeedDataOf,
  SpeedEntryData,
  SpeedEntrySource,
};
