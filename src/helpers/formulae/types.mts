/**
 * FormulaFormGroup Type Definitions
 * Defines all interfaces for formula familiar and validation
 */

// ============================================================================
// Dnd35eField + FormulaField Metadata Types
// ============================================================================

/**
 * Familiar metadata carried in a field's constructor options.
 * Used by the schema walker to auto-generate AspectGroup trees.
 */
export interface FormulaFieldMeta {
  /** If true, this field appears in formula autocomplete. Default true. */
  formulaVisible?: boolean;
  /** Familiar-only display label override; does not affect normal UI labels/localization. */
  familiarLabel?: string;
  /** I18n key for Familiar-only display label override (preferred over familiarLabel). */
  familiarLabelKey?: string;
  /** Override the inferred aspect type (normally inferred from inner field class). */
  aspectType?: 'string' | 'number' | 'boolean';
  /** Override the key used in the AspectGroup (normally the field name). */
  aspectKey?: string;
  /** Alternative names that also resolve to this field, e.g. ['dmg', 'damage']. */
  aliases?: string[];
}

/**
 * Context binding spec stored in DB per FormulaField instance.
 * Describes how to resolve a named context (e.g. "owner") to a live document.
 */
export interface FormulaContextBinding {
  /** Path from the formula's document upward, e.g. 'parent', 'parent.parent'. Omit for runtime-provided contexts. */
  resolvePath?: string;
  /** Expected Foundry document type, e.g. 'Actor', 'Item' */
  documentType: string;
  /** Expected subtypes for familiar union, e.g. ['character', 'npc'] */
  expectedSubtypes: string[];
  /** Alternative names that also resolve to this context, e.g. ['item', 'weapon'] */
  aliases?: string[];
}

/**
 * Static declaration of an additional formula context available on a system model.
 *
 * Each concrete system model (WeaponSystemModel, MaterialSystemModel, etc.)
 * declares its desired contexts via `static get formulaContexts()`.
 * This drives both autocomplete/schema building AND runtime data resolution.
 */
export interface FormulaContextDeclaration {
  /** The context name used in formulas, e.g. 'Owner', 'Item'. */
  contextName: string;
  /**
   * How to resolve the live document from the formula's own document.
   * e.g. 'parent' → `doc.parent`, 'parent.parent' → `doc.parent.parent`.
   *
   * When omitted, the context is **runtime-provided** — the caller must
   * inject it at evaluation time (e.g. a combat target). Autocomplete
   * still works via `documentType` + `fallbackSubtypes`.
   */
  resolvePath?: string;
  /**
   * Foundry document type for schema lookups, e.g. 'Actor', 'Item'.
   * Used when no live parent is available (schema-only/fallback mode).
   */
  documentType: foundry.CONST.DocumentType;
  /**
   * Subtypes whose schemas should be unioned for autocomplete when no
   * live parent is available. e.g. `['weapon']` or `['weapon', 'armor']`.
   * When a live parent IS available, its actual type is used instead.
   */
  fallbackSubtypes: string[];
  /** Aliases users can type instead of the context name, e.g. ['Parent']. */
  aliases?: string[];
}

// ============================================================================
// View Mode
// ============================================================================

/**
 * 3-state sheet mode model.
 * Runtime values:
 * - 'play' = Play Mode (player-visible, masks applied when present)
 * - 'true' = True Mode (GM-only unmasked play view)
 * - 'edit' = Edit Mode
 */
export type ViewMode = 'edit' | 'play' | 'true';

export type DisplayMode = 'play' | 'true';

export const EDIT: ViewMode = 'edit';
export const PLAY: ViewMode = 'play';
export const TRUE: ViewMode = 'true';

/** Per-field permission overrides — nullable (null = use defaults). */
export interface Dnd35eFieldOverrides {
  visibility: 'everyone' | 'ownerPlus' | 'gmOnly';
  editability: 'normal' | 'gmOnly';
}

// ============================================================================
// Familiar Types
// ============================================================================
/**
 * A single resolvable variable value (leaf node in the familiar tree)
 */
export interface FieldAspect {
  display?: string;           // Localized label (e.g., "Hardness", "Rarity")
  value?: string | number;    // Current computed value (e.g., 10, "common") — optional, filled at runtime; booleans stored as 'true'/'false'
  type: 'string' | 'number' | 'boolean';  // Type determines what operations can be performed
  accessPath: string;         // The real document path (e.g., "system.hardness", "name")
  aliases?: string[];         // Alternative names that also resolve to this field
}

/**
 * Check if a value is a FieldAspect
 */
export function isFieldAspect(value: unknown): value is FieldAspect {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return 'accessPath' in obj && 'type' in obj;
}

/**
 * Represents a nested structure of properties (can be leaf or branch).
 *
 * Branch nodes (SchemaField groups) may carry metadata properties prefixed
 * with `_` (skipped during autocomplete traversal):
 *   - `_display`: pre-localized label for the group (e.g. "Hit Points")
 *   - `_aliases`: schema key(s) that also resolve to this branch
 *     (e.g. `['hp']` when the branch's primary key is the localized form)
 */
export interface AspectGroup {
  /** Pre-localized display label for this group node. Set by the schema walker. */
  _display?: string;
  /**
   * Alternative keys that resolve to this branch node.
   * Populated when the primary key is a localized label and the schema field
   * name differs (e.g. primary key `hitPoints`, alias `hp`).
   */
  _aliases?: string[];
  [propertyPath: string]: FieldAspect | AspectGroup | string[] | string | undefined;
}

/**
 * Configuration for a single familiar context (self, owner, target, etc.).
 * Each consumer creates one per context name and passes the full map to FormulaFormGroup.
 */
export interface FamiliarContext {
  properties: AspectGroup;
  aliases?: string[];  // e.g., ["item", "weapon"] — alternative names that also resolve to this context
  /**
   * Localized display label shown in the autocomplete dropdown instead of the raw key.
   * e.g. key='self', display='Self' (or 'Siebie' in Polish).
   */
  display?: string;
}

/**
 * The complete familiar map passed to FormulaFormGroup.
 * Each key is a context name ("self", "owner", etc.) mapped to its config.
 */
export interface FamiliarSchema {
  [contextName: string]: FamiliarContext;
}

/**
 * Stored formula with its context bindings.
 * When saved, the formula records which schema type each context name resolves to,
 * so the system can evaluate it without the component being open.
 *
 * Example:
 *   formula: "Silver Longsword (+#self.hardness AC)"
 *   contexts: { self: "weapon", owner: "actor" }
 */
export interface FormulaFieldData {
  formula: string;
  contexts: Record<string, string>;  // contextName → schema type name (e.g. "weapon", "actor")
}

/**
 * Represents a token in a parsed formula
 */
export interface FormulaToken {
  type: 'text' | 'variable';
  value: string;
  startIndex: number;
  endIndex: number;
  partial?: boolean;           // True when the variable is still being typed (e.g. unclosed quote)
}

/**
 * Validation error for a formula variable
 */
export interface ValidationError {
  variable: string;           // "#self.invalid"
  context: string;            // "self"
  path: string[];             // ["invalid"]
  error: string;              // "Property 'invalid' not found on self"
  severity: 'error' | 'warning';
  index: number;              // Position in formula
}

/**
 * Autocomplete suggestion option
 */
export interface AutocompleteOption {
  path: string;               // "hardness" or "attackDetails"
  display: string;            // "Hardness" (localized)
  value: string | number | null;
  isLeaf: boolean;            // true if FieldAspect, false if branch
  fullPath: string;           // "#self.hardness" — full path for insertion
  accessPath?: string;        // "system.hardness" — real document path (leaves only)
}

/**
 * Props for FormulaFormGroup component
 */
export interface FormulaFormGroupProps {
  // Labels & hints
  label?: string;              // e.g., "Material Name Formula"
  hint?: string;               // e.g., "Use #self.property or #owner.property"
  isDmOnly?: boolean;          // DM-only field flag

  // Data & callbacks
  value: string;               // The formula string: "Silver (+#self.hardness AC)"
  onUpdate?: (value: string) => void;  // Optional override; when omitted, component infers updater from fieldPath

  // Component state
  disabled?: boolean;          // Override: force-disable editing regardless of store state

  // Familiar data (for autocomplete & validation)
  contexts: FamiliarSchema;
}

/**
 * Variable found in a formula
 */
export interface FormulaVariable {
  variable: string;           // "#self.hardness" or "#self.'system.isIdentified'"
  context: string;            // "self"
  path: string[];             // ["hardness"] — empty when customAccessPath is set
  startIndex: number;
  endIndex: number;
  isValid: boolean;
  error?: string;
  customAccessPath?: string;  // Raw document path from quoted syntax, e.g. "system.isIdentified"
}
