

## Problem
The "Optimize Routes" button appears to do nothing because the request never reaches the server. The edge function works correctly (tested and confirmed). The issue is that **client-side validation fails silently** — the error toasts ("Enter at least 2 addresses" or "Select at least 1 driver") may not be visible or noticed.

Additionally, there's no visual feedback on the form itself indicating what's missing.

## Solution
Add inline validation feedback so the user can clearly see what's needed before clicking Optimize.

### Changes: `src/components/tms/RoutePlanner.tsx`

1. **Add inline error messages** below the addresses textarea and driver selection when validation fails — red text like "Enter at least 2 addresses" and "Select at least 1 driver" that appear after clicking Optimize with invalid input.

2. **Add console.log in handleOptimize** for debugging — log the addresses count and selected drivers count so we can trace exactly what's happening if the issue persists.

3. **Disable the button with a tooltip** when prerequisites aren't met (no addresses or no drivers), making it clear the user needs to fill in the form first.

4. **Ensure toast notifications are visible** — verify the Toaster component is rendered in the app and positioned correctly.

### Technical details
- Add `validationErrors` state to track which fields failed
- Show red helper text under each field when validation fails
- Keep the toast as a secondary notification
- Add `console.log` breadcrumbs in `handleOptimize` for future debugging
