# UI Customization Design

**Date:** 2026-03-30

## Goal

Allow users to customize the app's accent color and light/dark color scheme, persisted across sessions.

## Approved Approach: NativeWind CSS Variables

Use NativeWind's semantic color token system (CSS variables) for theming. A `ThemeProvider` wraps the app and injects tokens based on user preferences. Dark mode uses NativeWind's built-in `dark:` variant.

## State & Storage

Extend `stores/settingsStore.ts` with two new persisted fields:

```ts
accentColor: string           // hex, default '#6366f1' (indigo)
colorScheme: 'light' | 'dark' | 'system'  // default 'system'
```

No new store is needed — piggybacks on existing Zustand + AsyncStorage persist setup.

## Theme System

### tailwind.config.js tokens

```js
colors: {
  accent: 'var(--color-accent)',
  'accent-light': 'var(--color-accent-light)',  // accent at ~15% opacity
  surface: 'var(--color-surface)',
  'surface-card': 'var(--color-surface-card)',
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  border: 'var(--color-border)',
}
```

### ThemeProvider

A new `components/ThemeProvider.tsx` wraps the app root in `app/_layout.tsx`. It:

1. Reads `accentColor` and `colorScheme` from `settingsStore`
2. Resolves effective scheme: if `'system'`, uses `Appearance.getColorScheme()`
3. Listens to `Appearance` changes when scheme is `'system'`
4. Injects CSS variable values into the root view
5. Sets `colorScheme` prop on the root view so NativeWind `dark:` variants activate

### Color token values

| Token            | Light                  | Dark                   |
|------------------|------------------------|------------------------|
| `--color-accent`       | user accentColor       | user accentColor       |
| `--color-accent-light` | accentColor @ 15% opacity | accentColor @ 20% opacity |
| `--color-surface`      | `#f9fafb` (gray-50)    | `#111827` (gray-900)   |
| `--color-surface-card` | `#ffffff`              | `#1f2937` (gray-800)   |
| `--color-primary`      | `#111827` (gray-900)   | `#f9fafb` (gray-50)    |
| `--color-secondary`    | `#6b7280` (gray-500)   | `#9ca3af` (gray-400)   |
| `--color-border`       | `#e5e7eb` (gray-200)   | `#374151` (gray-700)   |

### Hardcoded color replacement

All existing hardcoded Tailwind color classes (e.g. `text-indigo-500`, `bg-indigo-600`) and inline style values (e.g. `tabBarActiveTintColor: '#6366f1'`) are replaced with semantic equivalents (`text-accent`, `bg-accent`, etc.).

## Settings UI

A new **"Appearance"** section is added to `app/settings.tsx`, above "Sync & Backup":

### Color Scheme control
A segmented 3-button row: **Light | Dark | System**. Tapping updates `colorScheme` in the store. Active segment styled with accent color.

### Accent Color control
A row of 6 preset color swatches:
- Indigo `#6366f1`
- Rose `#f43f5e`
- Emerald `#10b981`
- Amber `#f59e0b`
- Sky `#0ea5e9`
- Violet `#8b5cf6`

Plus a `+` swatch that opens a system color picker. The active swatch shows a checkmark overlay. Tapping any swatch updates `accentColor` in the store immediately.

**Library:** `@react-native-community/color-picker` (or `expo-color-picker` if available) for the custom color option.

## Out of Scope

- Font size customization
- Tab reordering
- Per-screen theme overrides
