import { RegionDocumentDnd35e } from '../region-document/RegionDocumentDnd35e.mjs';
import coreBehaviors = foundry.data.regionBehaviors;
import { RegionBehaviorDnd35e } from './RegionBehaviorDnd35e.mjs';
import { EnvironmentBehaviorType } from './environment.mjs';
import { EnvironmentFeatureBehaviorType } from './environment-feature.mjs';
import { DIFFICULT_TERRAIN_GRADES } from './constants.mjs';
import { type RegionEvent } from '@client/documents/region.mjs';

interface AdjustDarknessLevelRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'adjustDarknessLevel';
    system: coreBehaviors.AdjustDarknessLevelRegionBehaviorType;
}

interface ExecuteMacroRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'executeMacro';
    system: coreBehaviors.ExecuteMacroRegionBehaviorType;
}

interface ExecuteScriptRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'executeScript';
    system: coreBehaviors.ExecuteScriptRegionBehaviorType;
}

interface PauseGameRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'pauseGame';
    system: coreBehaviors.PauseGameRegionBehaviorType;
}

interface SuppressWeatherRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'suppressWeather';
    system: coreBehaviors.SuppressWeatherRegionBehaviorType;
}

interface TeleportTokenRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'teleportToken';
    system: coreBehaviors.TeleportTokenRegionBehaviorType;
}

interface ToggleBehaviorRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'toggleBehavior';
    system: coreBehaviors.ToggleBehaviorRegionBehaviorType;
}

interface EnvironmentRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'environment';
    system: EnvironmentBehaviorType;
}

interface EnvironmentFeatureRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null>
    extends RegionBehaviorDnd35e<TParent> {
    type: 'environmentFeature';
    system: EnvironmentFeatureBehaviorType;
}

type SpecificRegionBehavior<TParent extends RegionDocumentDnd35e | null = RegionDocumentDnd35e | null> =
    | AdjustDarknessLevelRegionBehavior<TParent>
    | ExecuteMacroRegionBehavior<TParent>
    | ExecuteScriptRegionBehavior<TParent>
    | PauseGameRegionBehavior<TParent>
    | SuppressWeatherRegionBehavior<TParent>
    | TeleportTokenRegionBehavior<TParent>
    | ToggleBehaviorRegionBehavior<TParent>
    | EnvironmentRegionBehavior<TParent>
    | EnvironmentFeatureRegionBehavior<TParent>;

type DifficultTerrainGrade = (typeof DIFFICULT_TERRAIN_GRADES)[keyof typeof DIFFICULT_TERRAIN_GRADES];

type RegionEventDnd35e = RegionEvent<RegionDocumentDnd35e, User>;

export type {
  DifficultTerrainGrade,
  EnvironmentFeatureRegionBehavior,
  EnvironmentRegionBehavior,
  RegionEventDnd35e,
  SpecificRegionBehavior,
};
