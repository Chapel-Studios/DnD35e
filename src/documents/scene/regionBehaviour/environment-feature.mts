import { RegionBehaviorDnd35e } from './RegionBehaviorDnd35e.mjs';
import fields = foundry.data.fields;
import type { ZeroToTwo } from '@constants/numericTypes.mjs';

type EnvironmentFeatureTypeSchema = {
    terrain: fields.SchemaField<{
        difficult: fields.NumberField<ZeroToTwo, ZeroToTwo, true, false, true>;
    }>;
};

class EnvironmentFeatureBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType<
    EnvironmentFeatureTypeSchema,
    RegionBehaviorDnd35e | null
> {
}

export { EnvironmentFeatureBehaviorType };
