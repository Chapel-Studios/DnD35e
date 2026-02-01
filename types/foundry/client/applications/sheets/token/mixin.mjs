import HandlebarsApplicationMixin from "../../api/handlebars-application.mjs";
/**
 * A mixin for UI shared between TokenDocument and PrototypeToken sheets
 */
export default function TokenApplicationMixin(Base) {
    class TokenApplication extends HandlebarsApplicationMixin(Base) {
        constructor() {
            super(...arguments);
            /**
             * Maintain a copy of the original to show a real-time preview of changes.
             */
            this._preview = null;
        }
        /**
         * Localized Token Display Modes
         */
        static get DISPLAY_MODES() {
            return {};
        }
        /**
         * Localized Token Dispositions
         */
        static get TOKEN_DISPOSITIONS() {
            return {};
        }
        /**
         * Localized Token Turn Marker modes
         */
        static get TURN_MARKER_MODES() {
            return {};
        }
        /**
         * Localized Token Shapes
         */
        static get TOKEN_SHAPES() {
            return {};
        }
        async _preFirstRender(context, options) {
            context;
            options;
        }
        /**
         * Mimic changes to the Token document as if they were true document updates.
         * @param The changes to preview.
         */
        _previewChanges(changes) {
            changes;
        }
        async _prepareContext(options) {
            options;
            return {};
        }
        async _preparePartContext(partId, context, options) {
            context = await super._preparePartContext(partId, context, options);
            return context;
        }
        /**
         * Prepare data to be displayed in the Identity tab.
         */
        _prepareIdentityTab() {
            return {};
        }
        /**
         * Prepare data to be displayed in the Appearance tab.
         */
        async _prepareAppearanceTab() {
            return {};
        }
        /**
         * Prepare data to be displayed in the Vision tab.
         */
        async _prepareVisionTab() {
            return {};
        }
        /**
         * Prepare data to be displayed in the Vision tab.
         */
        async _prepareLightTab() {
            return {};
        }
        /**
         * Prepare data to be displayed in the Resources tab.
         */
        async _prepareResourcesTab() {
            return {};
        }
        /**
         * Prepare form submission buttons.
         */
        _prepareButtons() {
            return [];
        }
        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */
        _onChangeForm(formConfig, event) {
            formConfig;
            event;
        }
        /* -------------------------------------------- */
        /*  Form Submission                             */
        /* -------------------------------------------- */
        /**
         * Process several fields from form submission data into proper model changes.
         * @param submitData Form submission data passed through {@link foundry.applications.ux.FormDataExtended}
         */
        _processChanges(submitData) {
            submitData;
        }
    }
    TokenApplication.DEFAULT_OPTIONS = {};
    TokenApplication.PARTS = {};
    TokenApplication.TABS = {};
    return TokenApplication;
}
