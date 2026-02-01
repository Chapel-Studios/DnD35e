/**
 * A mixin which decorates a DisplayObject with additional properties expected for rendering in the PrimaryCanvasGroup.
 * @category - Mixins
 * @param DisplayObject The parent DisplayObject class being mixed
 * @returns A DisplayObject subclass mixed with PrimaryCanvasObject features
 * @mixin
 */
/* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function PrimaryCanvasObjectMixin(DisplayObject) {
    /**
     * A display object rendered in the PrimaryCanvasGroup.
     * @param args The arguments passed to the base class constructor
     */
    class PrimaryCanvasObject extends CanvasTransformMixin(DisplayObject) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super();
            args;
        }
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */
        /** The elevation of this object. */
        get elevation() {
            return 1;
        }
        set elevation(value) {
            value;
        }
        /** A key which resolves ties amongst objects at the same elevation within the same layer. */
        get sort() {
            return 1;
        }
        set sort(value) {
            value;
        }
        /** A key which resolves ties amongst objects at the same elevation of different layers. */
        get sortLayer() {
            return 1;
        }
        set sortLayer(value) {
            value;
        }
        /** A key which resolves ties amongst objects at the same elevation within the same layer and same sort. */
        get zIndex() {
            return 1;
        }
        set zIndex(value) {
            value;
        }
        /* -------------------------------------------- */
        /*  PIXI Events                                 */
        /* -------------------------------------------- */
        /**
         * Event fired when this display object is added to a parent.
         * @param parent The new parent container.
         */
        _onAdded(parent) {
            parent;
        }
        /**
         * Event fired when this display object is removed from its parent.
         * @param parent Parent from which the PCO is removed.
         */
        _onRemoved(parent) {
            parent;
        }
        /* -------------------------------------------- */
        /*  Canvas Transform & Quadtree                 */
        /* -------------------------------------------- */
        updateCanvasTransform() { }
        _onCanvasBoundsUpdate() { }
        /* -------------------------------------------- */
        /*  PCO Properties                              */
        /* -------------------------------------------- */
        /** Does this object render to the depth buffer? */
        get shouldRenderDepth() {
            return true;
        }
        /* -------------------------------------------- */
        /*  Depth Rendering                             */
        /* -------------------------------------------- */
        /** Render the depth of this object. */
        renderDepthData(renderer) {
            renderer;
        }
    }
    return PrimaryCanvasObject;
}
/**
 * A mixin which decorates a DisplayObject with additional properties for canvas transforms and bounds.
 * @category - Mixins
 * @param DisplayObject The parent DisplayObject class being mixed
 * @mixin
 */
export function CanvasTransformMixin(DisplayObject) {
    class CanvasTransformObject extends DisplayObject {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super();
            args;
        }
        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */
        /** Calculate the canvas bounds of this object. */
        _calculateCanvasBounds() { }
        /** Recalculate the canvas transform and bounds of this object and its children, if necessary. */
        updateCanvasTransform() { }
        /** Called when the canvas transform changed. */
        _onCanvasTransformUpdate() { }
        /** Called when the canvas bounds changed. */
        _onCanvasBoundsUpdate() { }
        /**
         * Is the given point in canvas space contained in this object?
         * @param point The point in canvas space.
         */
        containsCanvasPoint(point) {
            point;
            return false;
        }
    }
    return CanvasTransformObject;
}
