
interface SelectOption<TValue> {
  label: string;
  value: TValue;
}

interface MultiSelectOption<TValue> {
  label: string;
  value: TValue;
  icon?: string;
}

export type { MultiSelectOption, SelectOption };
