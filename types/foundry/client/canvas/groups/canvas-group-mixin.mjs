/**
 * A mixin which decorates any container with base canvas common properties.
 * @param {typeof PIXI.Container} ContainerClass  The parent Container class being mixed.
 * @returns A ContainerClass subclass mixed with CanvasGroupMixin features.
 */
export default function CanvasGroupMixin(ContainerClass) {
    class CanvasGroup extends ContainerClass {
        constructor(...args) {
            super(...args);
        }
        /**
         * The canonical name of the canvas group is the name of the constructor that is the immediate child of the
         * defined base class.
         */
        get name() {
            return "";
        }
        /**
         * The name used by hooks to construct their hook string.
         * Note: You should override this getter if hookName should not return the class constructor name.
         */
        get hookName() {
            return "";
        }
        /* -------------------------------------------- */
        /**
         * Create CanvasLayer instances which belong to the canvas group.
         */
        _createLayers() {
            return {};
        }
        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */
        /**
         * Draw the canvas group and all its components.
         * @returns A Promise which resolves once the group is fully drawn
         */
        async draw(options) {
            options;
            return this;
        }
        /**
         * Draw the canvas group and all its component layers.
         */
        async _draw(options) {
            options;
        }
        /* -------------------------------------------- */
        /*  Tear-Down                                   */
        /* -------------------------------------------- */
        /**
         * Remove and destroy all layers from the base canvas.
         */
        async tearDown(options) {
            options;
            return this;
        }
        /**
         * Remove and destroy all layers from the base canvas.
         */
        async _tearDown(options) {
            options;
        }
    }
    return CanvasGroup;
}
