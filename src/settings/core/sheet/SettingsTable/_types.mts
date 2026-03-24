/**
 * Types for the generic SettingsTable component.
 */

import type { VNode } from 'vue';

/**
 * Base interface for any row in a settings table.
 * All items must have at least these properties.
 */
interface SettingsTableItem {
  /** Unique identifier for this item */
  id: string;
  /** Display label */
  label: string;
  /** Whether this item is enabled */
  enabled: boolean;
  /** Whether this is a built-in system item (can be disabled but not deleted) */
  isSystem: boolean;
  /** Additional properties for extra columns */
  [key: string]: unknown;
}

/**
 * Context passed to a column's render function.
 */
interface ColumnRenderContext {
  /** Current value of this column for the row */
  value: unknown;
  /** Call to update the value (triggers blur-style commit) */
  update: (newValue: unknown) => void;
  /** Whether the field should be read-only */
  disabled: boolean;
  /** The full item for this row */
  item: SettingsTableItem;
}

/**
 * Column definition for a settings table.
 */
interface SettingsTableColumn {
  /** Unique key matching a property on the item */
  key: string;
  /** Localization key for the column header */
  label: string;
  /** Input type for this column (ignored when render is provided) */
  type?: 'text' | 'number';
  /** CSS flex or width hint (e.g. '80px'). Applied to both header and cell. */
  width?: string;
  /** HTML input step attribute (for number fields) */
  step?: string;
  /** HTML input min attribute (for number fields) */
  min?: string;
  /** Maximum length (for text fields) */
  maxLength?: number;
  /**
   * Whether this column is read-only for system items.
   * Defaults to true; set to false to allow editing system items.
   */
  readonlyForSystem?: boolean;
  /**
   * Custom render function for this column's cell.
   * When provided, replaces the default input element entirely.
   * Return a VNode (use Vue's `h()` function).
   */
  render?: (ctx: ColumnRenderContext) => VNode;
}

/**
 * Configuration for how custom item IDs are generated and displayed.
 */
interface IdConfig {
  /** Prefix prepended to all custom (non-default) IDs. Defaults to DEFAULT_ID_PREFIX ('user_'). */
  customPrefix?: string;
}

/** Default prefix for custom IDs when none is specified */
const DEFAULT_ID_PREFIX = 'user_';

/** Auto-ID marker embedded in generated IDs */
const AUTO_ID_MARKER = '$!auto!$';

export { AUTO_ID_MARKER, DEFAULT_ID_PREFIX };
export type { ColumnRenderContext, IdConfig, SettingsTableColumn, SettingsTableItem };
