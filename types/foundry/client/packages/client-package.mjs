/**
 * A client-side mixin used for all Package types.
 */
export default function ClientPackageMixin(BasePackage) {
    class ClientPackage extends BasePackage {
        /**
         * Associate package availability with certain badge for client-side display.
         */
        getVersionBadge() {
            return null;
        }
        /**
         * Retrieve a Package of this type from its collection.
         * @param id The package ID to retrieve
         * @returns The retrieved package instance, or undefined
         */
        static get(id) {
            id;
            return undefined;
        }
        /* -------------------------------------------- */
        /**
         * Determine a version badge for the provided compatibility data.
         * @param {number} availability                The availability level.
         * @param {Partial<PackageManifestData>} data  The compatibility data.
         * @param {object} [options]
         * @param {Collection<string, Module>} [options.modules]  A specific collection of modules to test availability
         *                                                        against. Tests against the currently installed modules by
         *                                                        default.
         * @param {Collection<string, System>} [options.systems]  A specific collection of systems to test availability
         *                                                        against. Tests against the currently installed systems by
         *                                                        default.
         */
        static getVersionBadge(availability, data, options) {
            availability;
            data;
            options;
            return null;
        }
        /**
         * List missing dependencies and format them for display.
         * @param {number} availability                The availability value.
         * @param {Partial<PackageManifestData>} data  The compatibility data.
         * @param {Iterable<RelatedPackage>} deps      The dependencies to format.
         * @param {object} [options]
         * @param {Collection<string, Module>} [options.modules]  A specific collection of modules to test availability
         *                                                        against. Tests against the currently installed modules by
         *                                                        default.
         * @param {Collection<string, System>} [options.systems]  A specific collection of systems to test availability
         *                                                        against. Tests against the currently installed systems by
         *                                                        default.
         * @returns {string}
         * @protected
         */
        static _formatBadDependenciesTooltip(availability, data, deps, options) {
            availability;
            data;
            deps;
            options;
            return "";
        }
        /* -------------------------------------------- */
        /**
         * List any installed systems that are incompatible with this module's systems relationship, and format them for
         * display.
         * @param {Partial<PackageManifestData>} data             The compatibility data.
         * @param {Iterable<RelatedPackage>} relationships        The system relationships.
         * @param {object} [options]
         * @param {Collection<string, System>} [options.systems]  A specific collection of systems to test against. Tests
         *                                                        against the currently installed systems by default.
         * @returns {string}
         * @protected
         */
        static _formatIncompatibleSystemsTooltip(data, relationships, options) {
            data;
            relationships;
            options;
            return "";
        }
        /**
         * When a package has been installed, add it to the local game data.
         */
        install() { }
        /**
         * When a package has been uninstalled, remove it from the local game data.
         */
        uninstall() { }
        /**
         * Remove a package from the local game data when it has been uninstalled.
         * @param {string} id  The package ID.
         */
        static uninstall(id) {
            id;
        }
        /**
         * Retrieve the latest Package manifest from a provided remote location.
         * @param manifest A remote manifest URL to load
         * @param options Additional options which affect package construction
         * @param options.strict Whether to construct the remote package strictly
         * @returns A Promise which resolves to a constructed ServerPackage instance
         * @throws An error if the retrieved manifest data is invalid
         */
        static async fromRemoteManifest(manifest, options) {
            manifest;
            options;
            return null;
        }
    }
    return ClientPackage;
}
