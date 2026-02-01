import { requiredBooleanField, requiredNumberField } from "@helpers/fieldBuilders.mjs";
import { ItemSystemModelBase } from "@items/baseItem/index.mjs";
import { applyIdentifiableSchema } from "@items/components/Identifiable/index.mjs";

class MaterialSystemModel extends ItemSystemModelBase {
  static override defineSchema() {
    const schema = super.defineSchema();
    
    applyIdentifiableSchema(schema);
    
    schema.priceDifference = requiredNumberField(0);
    schema.magicEquivalent = requiredNumberField(0);
    schema.bonusHardness = requiredNumberField(0);
    schema.bonusHpPerInch = requiredNumberField(0);
    schema.isAlchemicalSilverEquivalent = requiredBooleanField(false);
    schema.isAdamantineEquivalent = requiredBooleanField(false);
    schema.isColdIronEquivalent = requiredBooleanField(false);
    
    return schema;
  }
}

export { MaterialSystemModel };