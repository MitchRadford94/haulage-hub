
Problem:
- The current `src/components/tms/MapView.tsx` is not a real map. It renders a styled SVG/grid background plus stop dots, so the dots appear but there are no actual map tiles underneath.
- `leaflet` is installed, but the app is not currently initializing a Leaflet map or importing Leaflet’s base CSS.
- We should not bring back `react-leaflet`, because that was the source of the earlier `render2 is not a function` crash.

Plan:
1. Replace the placeholder map with a real Leaflet map in `src/components/tms/MapView.tsx`
- Keep the existing UK address-to-coordinate logic (`getCoords`, `toPoint` can be adapted/reused as lat/lng sources).
- Use `useRef` + `useEffect` to create the Leaflet map imperatively.
- Add an OpenStreetMap tile layer so the user sees a real map background.
- Render markers for all stops and a polyline for the selected job.
- Preserve the top-left/top-right summary overlays.

2. Import Leaflet’s required CSS
- Add `import 'leaflet/dist/leaflet.css'` in the app entry path so tiles, panes, and controls render correctly.
- Keep the existing dark-theme overrides in `src/index.css` so the map still fits the TMS theme.

3. Update redraw behavior safely
- Initialize the map only once.
- On `jobs` / `selectedJobId` changes, clear old markers/routes and redraw them.
- Auto-fit the map to the selected route, or to all stops if no job is selected.
- Keep the existing empty-state message when there are no jobs.

4. Avoid reintroducing the runtime error
- Do not use `react-leaflet` components, context, or providers anywhere in the render tree.
- Use only the core `leaflet` package directly from effects.

Technical details:
- Files to change:
  - `src/components/tms/MapView.tsx`
  - `src/main.tsx` or equivalent entry import location for Leaflet CSS
- Implementation shape:
```text
MapView
 ├─ div ref={mapContainerRef}
 ├─ useEffect(init map once)
 ├─ useEffect(sync markers + route when jobs change)
 └─ overlay UI panels above the map
```
- Important cleanup:
  - remove Leaflet layers before redraw
  - destroy the map on unmount
  - keep selected job highlighting visually distinct

Expected result:
- Creating a job will show the stop markers on top of a real map.
- Selecting a job will show its route line on the map.
- The app stays React 18-safe and avoids the previous `render2` error.
