
import type { HexColorString } from '@common/constants.mjs';
import type Color from '@common/utils/color.mjs';
import type { CoinStack, PriceSource } from '@settings/currency/index.mjs';

import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';

type ValueType = string
  | number
  | boolean
  | Color;

interface BaseFormGroupProps<TValue extends ValueType> {
  label?: string; // localization key
  hint?: string; // localization key for hint text
  fieldPath: string; // unique identifier for this field's permission overrides
  defaultVisibility?: FieldVisibility; // defaults to 'everyone'
  defaultEditability?: FieldEditability; // defaults to 'normal'
  /** When true, forces the readonly display. */
  readOnly?: boolean;
  /** When true, forces the edit display even in play/true modes. */
  forceEdit?: boolean;
  /** When false, suppress the built-in FieldControls for this field wrapper. */
  showFieldControls?: boolean;
  /** The current value of the field. */
  value?: TValue | null;
}

interface FormGroupWithInputProps<TValue  extends ValueType> extends BaseFormGroupProps<TValue> {
  onUpdate?: (value: TValue | null) => void | boolean | Promise<void> | Promise<boolean>;
  disabled?: boolean;
}

interface ColorFormGroupProps extends FormGroupWithInputProps<HexColorString | Color> {}

interface NumberFormGroupProps extends FormGroupWithInputProps<number> {
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // for display only, does not affect behavior
}

interface ForcedUnitNumberFormGroupProps extends Omit<NumberFormGroupProps, 'unit'> {}

interface CheckBoxFormGroupProps extends Omit<FormGroupWithInputProps<boolean>, 'onUpdate'> {
  onUpdate?: (value: boolean) => void | boolean | Promise<void> | Promise<boolean>;
}

interface TextFormGroupProps extends FormGroupWithInputProps<string> {
  minLength?: number;
  maxLength?: number;
}

interface RichTextEditorFormGroupProps extends FormGroupWithInputProps<string> {
  /** Optional: placeholder text for the editor */
  placeholder?: string;
}

interface ToggleSwitchFormGroupProps extends FormGroupWithInputProps<boolean> {
  trueLabel?: string; // localization key
  falseLabel?: string; // localization key
  flip?: boolean; // when true, on/off states are visually flipped (on = left, off = right)
}

interface SelectFormGroupProps<TValue extends string | number> extends FormGroupWithInputProps<TValue> {
  options: SelectOption<TValue>[];
}

interface MultiSelectFormGroupProps<TValue extends string | number> extends Omit<FormGroupWithInputProps<TValue>, 'value' | 'onUpdate'> {
  value?: TValue[] | Set<TValue> | null;
  onUpdate?: (value: TValue[]) => void | boolean | Promise<void> | Promise<boolean>;
  options: SelectOption<TValue>[];
}

interface ListFormGroupProps<TItem, TUpdateData = TItem[]> extends Omit<FormGroupWithInputProps<string>, 'value' | 'onUpdate'> {
  /** The current value of the field. */
  value?: TItem[] | null;
  onUpdate?: (value: TUpdateData | null) => void | boolean | Promise<void> | Promise<boolean>;
  /** Localization key for "add item" button title */
  addButtonTitle: string;
  /** Localization key for "remove item" button title */
  removeButtonTitle: string;
  /** Localization key for empty list display (defaults to 'dnd35e.form.emptyList') */
  emptyLabel?: string;
  /** Optional: max items allowed (0 = unlimited) */
  maxItems?: number;
  /**
   * Called when the user clicks the add-item button. The consumer is
   * responsible for constructing a new item (only they know the shape and
   * sensible defaults) and pushing it to the field. If omitted, the add
   * button is hidden.
   */
  onAddItem: () => void | boolean | Promise<void> | Promise<boolean>;
}

interface CoinageFormGroupProps extends Omit<
  ListFormGroupProps<CoinStack, PriceSource>,
  'value' | 'addButtonTitle' | 'removeButtonTitle' | 'onAddItem'
> {
  value?: PriceSource | null;
  /** Optional: max count per stack (0 = unlimited) */
  maxStackValue?: number;
  /** Optional: min count per stack (0 = unlimited) */
  minStackValue?: number;
  /** Optional: step value for stack count */
  stackValueStep?: number;
  /** Optional override: localization key for "add item" button title */
  addButtonTitle?: string;
  /** Optional override: localization key for "remove item" button title */
  removeButtonTitle?: string;
  /** Optional override: Called when the user clicks the add-item button. */
  onAddItem?: () => void | boolean | Promise<void> | Promise<boolean>;
}

interface SelectOption<TValue> {
  label: string;
  value: TValue;
  icon?: string;
}

export type {
  BaseFormGroupProps,
  CheckBoxFormGroupProps,
  CoinageFormGroupProps,
  ColorFormGroupProps,
  ForcedUnitNumberFormGroupProps,
  FormGroupWithInputProps as FormGroupWithInput,
  ListFormGroupProps,
  MultiSelectFormGroupProps,
  NumberFormGroupProps,
  RichTextEditorFormGroupProps,
  SelectFormGroupProps,
  SelectOption,
  TextFormGroupProps,
  ToggleSwitchFormGroupProps,
};
