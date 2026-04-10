
Problem:
- The road line is only fetched for `selectedJob`, but creating a job does not auto-select it.
- Current evidence supports this: the map code only calls `fetchRoute(...)` inside `if (selectedJob)`, and the network snapshot shows no OSRM requests.
- So after creating a job, you see markers, but no real road route unless that job is actively selected.
- Also, unselected jobs only render a faint dashed straight line, which is easy to miss and is not a real road path.

Plan:
1. Make new jobs auto-select
- Update the job creation flow so the newly created job becomes `selectedJobId` immediately after submit.
- This guarantees the map requests and shows the real road route as soon as the route is planned.

2. Ensure one route is always clearly shown
- If no job is selected, default the map’s “active route” to the newest job (or the only job).
- Keep other jobs muted in the background.

3. Strengthen real road-route rendering
- Keep using OSRM, but make the selected route more visible with a thicker high-contrast line.
- Keep the straight-line fallback visible until the OSRM route loads, and leave it in place if the API fails.
- Add proper response checks (`res.ok`, `data.code === 'Ok'`) so failed requests do not silently disappear.

4. Improve route-planning clarity
- Add clearer visual hierarchy:
  - selected route: bold blue road line
  - unselected routes: muted dashed lines
  - start/end markers: stronger emphasis than intermediate stops
- Optionally fit bounds again after the real OSRM geometry arrives so the full road path is centered.

Technical details:
- `src/components/tms/MapView.tsx`
  - derive an `activeJob` instead of relying only on `selectedJob`
  - fetch OSRM for `activeJob`
  - improve route styling and fallback handling
- `src/components/tms/JobCreationPanel.tsx` or `src/contexts/TMSContext.tsx`
  - set the new job as selected right after creation
- Expected result:
  - when you create a multi-stop job, the map immediately shows an actual road-following route line
  - if you click another job, its route becomes the highlighted road path

Notes:
- A real road line only makes sense when a job has 2+ stops. If there is only 1 stop, we should keep just the marker and no route line.
- The separate ref warnings in console are likely unrelated to this specific routing issue, so I would keep this fix focused on route visibility first.
