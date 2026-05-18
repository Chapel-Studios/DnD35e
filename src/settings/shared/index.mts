/**
 * Shared settings infrastructure
 *
 * Cross-cutting helpers, components, stores, composites, and types used by
 * multiple settings categories (and elsewhere in the system).
 */

export * from './constants.mjs';
export * from './sheet/index.mjs';
export type { SettingConfig, SettingScope, SystemSettings } from './types.mjs';
