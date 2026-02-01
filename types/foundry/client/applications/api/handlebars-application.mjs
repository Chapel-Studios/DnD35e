/** Augment an Application class with [Handlebars](https://handlebarsjs.com) template rendering behavior. */
/* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function HandlebarsApplicationMixin(BaseApplication) {
    class HandlebarsApplication extends BaseApplication {
        /** A record of all rendered template parts. */
        get parts() {
            return {};
        }
        _configureRenderOptions(options) {
            options;
        }
        /** Allow subclasses to dynamically configure render parts. */
        _configureRenderParts(options) {
            options;
            return {};
        }
        /**
         * Render each configured application part using Handlebars templates.
         * @param context        Context data for the render operation
         * @param options        Options which configure application rendering behavior
         * @returns A single rendered HTMLElement for each requested part
         */
        async _renderHTML(context, options) {
            context;
            options;
            return {};
        }
        /**
         * Prepare context that is specific to only a single rendered part.
         *
         * It is recommended to augment or mutate the shared context so that downstream methods like _onRender have
         * visibility into the data that was used for rendering. It is acceptable to return a different context object
         * rather than mutating the shared context at the expense of this transparency.
         *
         * @param partId       The part being rendered
         * @param context      Shared context provided by _prepareContext
         * @returns Context data for a specific part
         */
        async _preparePartContext(partId, context, options) {
            partId;
            context;
            options;
            return {};
        }
        /**
         * Replace the HTML of the application with the result provided by Handlebars rendering.
         * @param result  The result from Handlebars template rendering
         * @param content The content element into which the rendered result must be inserted
         * @param options     Options which configure application rendering behavior
         */
        _replaceHTML(result, content, options) {
            result;
            content;
            options;
        }
        /**
         * Prepare data used to synchronize the state of a template part.
         * @param partId       The id of the part being rendered
         * @param newElement   The new rendered HTML element for the part
         * @param priorElement The prior rendered HTML element for the part
         * @param state        A state object which is used to synchronize after replacement
         */
        _preSyncPartState(partId, newElement, priorElement, state) {
            partId;
            newElement;
            priorElement;
            state;
        }
        /**
         * Synchronize the state of a template part after it has been rendered and replaced in the DOM.
         * @param partId                  The id of the part being rendered
         * @param newElement              The new rendered HTML element for the part
         * @param priorElement            The prior rendered HTML element for the part
         * @param state                   A state object which is used to synchronize after replacement
         */
        _syncPartState(partId, newElement, priorElement, state) {
            partId;
            newElement;
            priorElement;
            state;
        }
        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */
        /**
         * Attach event listeners to rendered template parts.
         * @param partId       The id of the part being rendered
         * @param htmlElement  The rendered HTML element for the part
         * @param options       Rendering options passed to the render method
         */
        _attachPartListeners(partId, htmlElement, options) {
            partId;
            htmlElement;
            options;
        }
    }
    return HandlebarsApplication;
}
