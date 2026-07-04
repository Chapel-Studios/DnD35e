import type { SelectOption } from './index.mjs';

interface ValueUnitInputProps<
  TValue extends string | number,
  TUnit extends string = string
> {
  /** Type of the value input. Defaults to 'number'. */
  valueType: TValue extends number ? 'number' : 'text';
  /** Current value of the value input. */
  value: TValue | null;
  /** Current selected unit option value. */
  unit: TUnit;
  /** Options for the unit select. */
  unitOptions: SelectOption<TUnit>[];
  /** Optional full option set used only for intrinsic width sizing. */
  sizingUnitOptions?: SelectOption<TUnit>[];
  /** Min for number inputs. */
  min?: TValue extends number ? number : never;
  /** Max for number inputs. */
  max?: TValue extends number ? number : never;
  /** Step for number inputs. */
  step?: TValue extends number ? number : never;
  /** Placeholder for the value input. */
  placeholder?: string;
  /** Disable both halves and visually dim the wrapper. */
  disabled?: boolean;
  /** Called when the value input commits a change. Receives the raw string from the input. */
  onValueChange?: (raw: TValue) => void;
  /** Called when the unit select commits a change. */
  onUnitChange?: (unit: TUnit) => void;
}

export type {
  ValueUnitInputProps,
};
