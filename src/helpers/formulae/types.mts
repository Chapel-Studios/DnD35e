/**
 * FormulaFormGroup Type Definitions
 * Defines all interfaces for formula intellisense and validation
 */

/**
 * A single resolvable variable value (leaf node in the intellisense tree)
 */
export interface IntellisenseProperty {
  display?: string;           // Localized label (e.g., "Hardness", "Rarity")
  value?: string | number;    // Current computed value (e.g., 10, "common") — optional, filled at runtime
  type: 'string' | 'number';  // Type determines what operations can be performed
  accessPath: string;         // The real document path (e.g., "system.hardness", "name")
}

/**
 * Check if a value is an IntellisenseProperty
 */
export function isIntellisenseProperty(value: unknown): value is IntellisenseProperty {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return 'accessPath' in obj && 'type' in obj;
}

/**
 * Represents a nested structure of properties (can be leaf or branch)
 */
export interface IntellisenseObject {
  [propertyPath: string]: IntellisenseProperty | IntellisenseObject;
}

/**
 * Configuration for a single intellisense context (self, owner, target, etc.).
 * Each consumer creates one per context name and passes the full map to FormulaFormGroup.
 */
export interface IntellisenseContext {
  properties: IntellisenseObject;
  aliases?: string[];  // e.g., ["item", "weapon"] — alternative names that also resolve to this context
}

/**
 * The complete intellisense map passed to FormulaFormGroup.
 * Each key is a context name ("self", "owner", etc.) mapped to its config.
 */
export interface IntellisenseSchema {
  [contextName: string]: IntellisenseContext;
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
export interface Token {
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
  isLeaf: boolean;            // true if IntellisenseProperty, false if branch
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

  // Intellisense data (for autocomplete & validation)
  contexts: IntellisenseSchema;
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
