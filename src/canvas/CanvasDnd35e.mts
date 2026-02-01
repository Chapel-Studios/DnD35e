import type { documents } from '@client/_module.mjs';
import type AmbientLight from '@client/canvas/placeables/light.mjs';
import type MeasuredTemplate from '@client/canvas/placeables/template.mjs';
import type EffectsCanvasGroup from '@client/canvas/groups/effects.mjs';
import type { tokenDnd35e } from './token/tokenDnd35e.mjs';
import type { RegionDnd35e } from './RegionDnd35e.mjs';
import type { SceneDnd35e } from '@scene/SceneDnd35e.mjs';
import type { TokenDocumentDnd35e } from '@scene/token-document/index.mjs';
import type { RegionDocumentDnd35e } from '@scene/region-document/RegionDocumentDnd35e.mjs';

export type CanvasDnd35e = foundry.canvas.Canvas<
    SceneDnd35e,
    AmbientLight<documents.AmbientLightDocument<SceneDnd35e>>,
    MeasuredTemplate<MeasuredTemplateDocument<SceneDnd35e>>,
    tokenDnd35e<TokenDocumentDnd35e<SceneDnd35e>>,
    EffectsCanvasGroup,
    RegionDnd35e<RegionDocumentDnd35e<SceneDnd35e>>
>;
