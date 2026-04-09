# Foundry VTT v12+ Theme Variable Cheatsheet

This file lists all the CSS variables exposed by Foundry VTT v12+.

---

## 🎨 Text Colors

- `--color-text-emphatic`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-subtle`
- `--color-text-accent`
- `--color-text-selection`
- `--color-text-selection-bg`

---

## 🎨 Semantic Level Colors

### Error
- `--color-level-error`
- `--color-level-error-bg`
- `--color-level-error-border`

### Success
- `--color-level-success`
- `--color-level-success-bg`
- `--color-level-success-border`

### Warning
- `--color-level-warning`
- `--color-level-warning-bg`
- `--color-level-warning-border`

### Info
- `--color-level-info`
- `--color-level-info-bg`
- `--color-level-info-border`

---

## 🎨 Backgrounds

- `--background`
- `--table-background-color`
- `--table-header-bg-color`
- `--sidebar-background`
- `--content-link-background`

---

## 🎨 Borders

- `--color-border`
- `--color-tabs-border`
- `--color-fieldset-border`
- `--color-data-border`
- `--content-link-border-color`

---

## 🎨 Raw Palette Tokens

### Light Palette
- `--color-light-1`
- `--color-light-2`
- `--color-light-3`
- `--color-light-4`
- `--color-light-5`
- `--color-light-6`

### Dark Palette
- `--color-dark-1`
- `--color-dark-2`
- `--color-dark-3`
- `--color-dark-4`
- `--color-dark-5`
- `--color-dark-6`

### Warm Palette
- `--color-warm-1`
- `--color-warm-2`
- `--color-warm-3`

### Cool Palette
- `--color-cool-3`
- `--color-cool-4`
- `--color-cool-5`
- `--color-cool-5-25`
- `--color-cool-5-50`
- `--color-cool-5-75`
- `--color-cool-5-90`

---

## 🎨 Misc UI Tokens

- `--color-scrollbar`
- `--color-scrollbar-track`
- `--sidebar-separator`
- `--sidebar-entry-hover-bg`
- `--color-ownership-none`
- `--color-ownership-observer`
- `--color-ownership-owner`

---

# ✔ Notes

- These are the **only** variables guaranteed to exist in Foundry v12+.
- Legacy variables like `--color-text-dark-secondary`, `--color-border-light-primary`, etc. **no longer exist**.
- Use palette tokens (`--color-light-*`, `--color-dark-*`) when you need fine control.
