
## What’s actually wrong

I checked the current flow and there are two separate issues:

1. **The map dots are not mainly a postcode API problem now**
   - The postcode lookups are returning correct Birmingham coordinates from `postcodes.io`.
   - The bigger problem is the planner is still using an **AI text assignment only** in `optimize-routes`, with no real coordinate-based optimization.
   - So the stop order can still look messy even if each postcode geocodes correctly.

2. **Your start/depot location is not being used on the map or in route building**
   - `RoutePlanner` sends `depot` to the backend.
   - But when jobs are created, only delivery stops are saved.
   - `MapView` only routes `job.stops`, so the depot is completely ignored when drawing the route.
   - The current AI prompt mentions the depot, but that alone does not guarantee proper start/end routing.

3. **There is also a data-quality bug**
   - The latest optimize response included an empty stop (`""`) for one driver.
   - That can create bad markers/routing behavior and needs to be filtered out.

## Plan

### 1) Make route planning coordinate-based, not AI-only
Update `supabase/functions/optimize-routes/index.ts` so the planner:
- geocodes all postcodes/addresses first
- geocodes the depot too when provided
- assigns stops to drivers using actual coordinates, not just AI text reasoning
- orders each driver’s stops by nearest-neighbour from the depot (or from the first stop if no depot)

AI can still be used as a fallback, but the primary planner should be deterministic.

### 2) Save depot/start location with each AI-created job
Extend the job model so AI-created jobs keep:
- `startLocation` / depot address
- optionally depot coordinates if already resolved

That way the route shown later matches what was planned.

### 3) Render depot on the map and route from it
Update `src/components/tms/MapView.tsx` to:
- geocode and display the depot as a distinct marker
- build the active route as:
  - depot -> ordered stops
  - optionally back to depot if needed
- fit the map bounds using depot + stops together

This is the missing piece causing “it’s not using my start location”.

### 4) Sanitize planner output
Update `src/components/tms/RoutePlanner.tsx` and/or the backend to:
- trim and remove blank addresses before assignment
- reject empty returned stops
- prevent `""` from being saved into jobs

### 5) Make the route logic consistent everywhere
Ensure the same geocoding method is used in both:
- planner optimization
- map rendering

That avoids one system planning with one location set and the map drawing with another.

## Files to update

- `supabase/functions/optimize-routes/index.ts`
- `src/components/tms/RoutePlanner.tsx`
- `src/components/tms/MapView.tsx`
- `src/types/tms.ts`
- likely `src/components/tms/JobList.tsx` if we want to show the saved depot/start info

## Technical detail

```text
Current issue:
planner = LLM prompt with addresses only
map = geocode saved stops only
depot = sent to backend but never persisted into jobs, never drawn on map

Target flow:
input addresses + depot
-> geocode all points
-> assign drivers by coordinate clustering
-> order stops from depot
-> save depot onto each created job
-> map renders depot marker + depot-first route
```

## Expected result

After this change:
- UK postcode dots should stay in the right place
- routes should look geographically sensible
- the depot/start location will actually be included in the displayed route
- AI-created jobs won’t contain blank stops
