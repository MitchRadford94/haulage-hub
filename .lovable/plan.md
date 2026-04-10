

## Problem

The preview is blank due to a CSS build error: `@import must precede all other statements`. In `src/index.css`, the `@import url(...)` for Google Fonts is on line 5, but CSS requires `@import` to come before all other statements — the `@tailwind` directives on lines 1-3 violate this rule.

There may also be a lingering dependency issue with `react-leaflet` from the previous fix.

## Plan

### 1. Fix CSS import order in `src/index.css`
Move the `@import url(...)` line to the very top of the file, before the `@tailwind` directives.

### 2. Verify dependencies are installed
Run `npm install` / `bun install` to ensure `react-leaflet@4.2.1` and `leaflet` are properly installed after the previous version change.

### Technical Details
- Move line 5 (`@import url('https://fonts.googleapis.com/css2?...')`) to line 1
- Keep `@tailwind base/components/utilities` after the import
- Everything else in the file stays the same

