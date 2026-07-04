/**
 * Core settings types
 * Generic types used by settings configuration dialogs
 */

interface FieldChoice {
  value: string;
  label: string;
}

interface SettingField {
  key: string;
  label: string;
  hint?: string;
  type: 'boolean' | 'string' | 'number' | 'formula';
  choices?: FieldChoice[];
}

interface SettingsSection {
  key: string;
  label: string;
  fields: SettingField[];
}

export type { FieldChoice, SettingField, SettingsSection };
