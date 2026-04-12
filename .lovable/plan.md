

## AI Route Planner

### What it does
A new "Route Planner" tab where dispatchers enter a list of addresses/postcodes and select which drivers are available. AI optimizes and assigns stops across drivers, minimizing total distance. It then creates the jobs automatically.

### How it works

1. **New nav tab**: Add "Route Planner" with a brain/wand icon to the NavBar.

2. **New component `src/components/tms/RoutePlanner.tsx`**:
   - Left side: text area to paste/type all delivery addresses (one per line), multi-select for available drivers + vehicles, date picker
   - "Optimize Routes" button
   - Right side: shows AI-generated assignments per driver with ordered stop lists
   - "Create All Jobs" button to batch-create the jobs

3. **Edge function `supabase/functions/optimize-routes/index.ts`**:
   - Receives: list of addresses, list of available drivers/vehicles, optional depot address
   - Calls Lovable AI (Gemini) with a prompt like: "You are a logistics route optimizer. Given these delivery addresses and N available drivers starting from [depot], assign stops to drivers and order each driver's stops to minimize total driving distance. Return structured JSON."
   - Uses tool-calling for structured output: `{ assignments: [{ driverIndex: number, stops: string[] }] }`
   - Returns the optimized assignments

4. **Flow**:
   - User pastes 20 addresses, selects 3 drivers + vehicles
   - Clicks "Optimize" → calls edge function → AI returns grouped & ordered stops
   - UI shows the plan per driver with a preview
   - User clicks "Create Jobs" → creates one Job per driver with the AI-ordered stops
   - Map auto-shows the routes

### Technical details

- **Edge function** uses `LOVABLE_API_KEY` (already available) to call `https://ai.gateway.lovable.dev/v1/chat/completions`
- Structured output via tool-calling ensures reliable JSON parsing
- Model: `google/gemini-3-flash-preview` (fast, cheap)
- Need to set up Lovable Cloud (supabase init) since no `supabase/` folder exists yet
- Add the new tab to NavBar and Index.tsx
- The RoutePlanner component uses the existing TMSContext to create jobs

### Files to create/edit
- `supabase/functions/optimize-routes/index.ts` — edge function
- `src/components/tms/RoutePlanner.tsx` — new UI component
- `src/components/tms/NavBar.tsx` — add tab
- `src/pages/Index.tsx` — render RoutePlanner on new tab

