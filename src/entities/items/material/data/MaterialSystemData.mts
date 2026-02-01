import { IdentifiableItemSystemData } from "@items/components/Identifiable/index.mjs";
import { ItemSystemData } from "@items/baseItem/index.mjs";

interface MaterialSystemSource {
  priceDifference: number;
  magicEquivalent: number;
  bonusHardness: number;
  bonusHpPerInch: number;
  isAlchemicalSilverEquivalent: boolean;
  isAdamantineEquivalent: boolean;
  isColdIronEquivalent: boolean;
};

interface MaterialSystemData extends MaterialSystemSource, IdentifiableItemSystemData, ItemSystemData {};

export {
  MaterialSystemSource,
  MaterialSystemData,
};
