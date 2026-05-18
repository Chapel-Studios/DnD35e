# Vue Boolean Prop Defaults

- Vue Boolean props declared with type-only `defineProps` default to `false` when omitted.
- In shared wrappers like `FormGroup`, props such as `showFieldControls` must use `withDefaults(..., { showFieldControls: true })` or they will silently disable behavior across all callers.
- Symptom pattern: child components remain editable, but optional wrapper UI disappears everywhere unless callers explicitly pass the prop.
