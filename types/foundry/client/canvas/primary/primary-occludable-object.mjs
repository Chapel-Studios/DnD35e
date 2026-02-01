import PrimaryCanvasObjectMixin from "./primary-canvas-object.mjs";
/**
 * A mixin which decorates a DisplayObject with depth and/or occlusion properties.
 * @category - Mixins
 * @param DisplayObject The parent DisplayObject class being mixed
 * @returns A DisplayObject subclass mixed with OccludableObject features
 * @mixin
 */
/* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function PrimaryOccludableObjectMixin(DisplayObject) {
    class PrimaryOccludableObject extends PrimaryCanvasObjectMixin(DisplayObject) {
        /**
         * Fade this object on hover?
         * @defaultValue true
         */
        get hoverFade() {
            return true;
        }
        set hoverFade(value) {
            value;
        }
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */
        /** Get the blocking option bitmask value. */
        get _restrictionState() {
            return 1;
        }
        /** Is this object blocking light? */
        get restrictsLight() {
            return true;
        }
        set restrictsLight(enabled) {
            enabled;
        }
        /** Is this object blocking weather? */
        get restrictsWeather() {
            return true;
        }
        set restrictsWeather(enabled) {
            enabled;
        }
        /** Is this occludable object... occludable? */
        get isOccludable() {
            return true;
        }
        updateCanvasTransform() { }
        /* -------------------------------------------- */
        /*  Depth Rendering                             */
        /* -------------------------------------------- */
        /**
         * Test whether a specific Token occludes this PCO.
         * Occlusion is tested against 9 points, the center, the four corners-, and the four cardinal directions
         * @param token     The Token to test
         * @param [options] Additional options that affect testing
         * @param [options.corners=true] Test corners of the hit-box in addition to the token center?
         * @returns Is the Token occluded by the PCO?
         */
        testOcclusion(token, options) {
            token;
            options;
            return true;
        }
    }
    return PrimaryOccludableObject;
}
