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
  /** Localized label override. Falls back to DataField.label. */
  display?: string;
  /** If true, this field appears in formula autocomplete. Default false. */
  formulaVisible?: boolean;
  /** Override the inferred aspect type (normally inferred from inner field class). */
  aspectType?: 'string' | 'number';
  /** Override the key used in the AspectGroup (normally the field name). */
  aspectKey?: string;
}

/**
 * Context binding spec stored in DB per FormulaField instance.
 * Describes how to resolve a named context (e.g. "owner") to a live document.
 */
export interface FormulaContextBinding {
  /** Path from the formula's document upward, e.g. 'parent', 'parent.parent' */
  resolvePath: string;
  /** Expected Foundry document type, e.g. 'Actor', 'Item' */
  documentType: string;
  /** Expected subtypes for familiar union, e.g. ['character', 'npc'] */
  expectedSubtypes: string[];
  /** Alternative names that also resolve to this context, e.g. ['item', 'weapon'] */
  aliases?: string[];
}

// ============================================================================
// View Mode
// ============================================================================

/** Whether the user is viewing the identified or unidentified version of a document. */
export type EditorViewMode = 'identified' | 'unidentified';

export const IDENTIFIED: EditorViewMode = 'identified';
export const UNIDENTIFIED: EditorViewMode = 'unidentified';

// ============================================================================
// Familiar Types
// ============================================================================
/**
 * A single resolvable variable value (leaf node in the familiar tree)
 */
export interface FieldAspect {
  display?: string;           // Localized label (e.g., "Hardness", "Rarity")
  value?: string | number;    // Current computed value (e.g., 10, "common") — optional, filled at runtime
  type: 'string' | 'number';  // Type determines what operations can be performed
  accessPath: string;         // The real document path (e.g., "system.hardness", "name")
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
 * Represents a nested structure of properties (can be leaf or branch)
 */
export interface AspectGroup {
  [propertyPath: string]: FieldAspect | AspectGroup;
}

/**
 * Configuration for a single familiar context (self, owner, target, etc.).
 * Each consumer creates one per context name and passes the full map to FormulaFormGroup.
 */
export interface FamiliarContext {
  properties: AspectGroup;
  aliases?: string[];  // e.g., ["item", "weapon"] — alternative names that also resolve to this context
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
  onUpdate: (value: string) => void;  // Called when formula changes

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
