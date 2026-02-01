import type { ModelPropsFromSchema, SetField, SourceFromSchema, StringField } from '@common/data/fields.mjs';
import { RegionBehaviorDnd35e } from './RegionBehaviorDnd35e.mjs';

type EnvironmentTypeSchema = {
    environmentTypes: SetField<StringField<string, string, true>>;
    mode: StringField<'add' | 'remove' | 'override', 'add' | 'remove' | 'override', true>;
};

type EnvironmentTypeData = ModelPropsFromSchema<EnvironmentTypeSchema>;
type EnvironmentTypeSource = SourceFromSchema<EnvironmentTypeSchema>;

class EnvironmentBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType<
    EnvironmentTypeSchema,
    RegionBehaviorDnd35e | null
> {
}

export { EnvironmentBehaviorType };
export type { EnvironmentTypeData, EnvironmentTypeSource };
