
import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';

interface BaseFormGroupProps {
  label?: string;
  hint?: string;
  isDmOnly?: boolean;
  fieldPath: string;
  defaultVisibility?: FieldVisibility;
  defaultEditability?: FieldEditability;
  disabled?: boolean;
  readOnly?: boolean;
  forceEdit?: boolean;
}

interface ValueProp<TValue> {
  value?: TValue;
}

interface UpdaterProp<TValue> {
  onUpdate?: (value: TValue) => void;
}

/**
 * Contract for transformed editors (Use Case C):
 * 1) provide an explicit projected `value`
 * 2) provide an `onUpdate` that performs inverse mapping and then delegates to
 *    `getViewAwareFieldUpdater(fieldPath)`
 */
interface ProjectionPairProps<TValue> {
  value: TValue;
  onUpdate: (value: TValue) => void;
}

interface SelectOption<TValue> {
  label: string;
  value: TValue;
}

interface MultiSelectOption<TValue> {
  label: string;
  value: TValue;
  icon?: string;
}

export type {
  BaseFormGroupProps,
  MultiSelectOption,
  ProjectionPairProps,
  SelectOption,
  UpdaterProp,
  ValueProp,
};
