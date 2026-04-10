

## Problem
1. **Stop markers are too small** — `circleMarker` with radius 5-7 is hard to see, especially on a busy map.
2. **Route line is a straight dashed line** — it connects stops point-to-point, not following actual roads.

## Plan

### 1. Make stop markers more visible
- Replace `L.circleMarker` with standard `L.marker` using custom colored `L.divIcon` markers (numbered, larger, with a colored background and white text).
- Selected job markers: bright blue with larger size. Unselected: muted gray, smaller.
- Add a white border/shadow so they stand out on any map background.

### 2. Add real road-following route lines
- Use the free **OSRM (Open Source Routing Machine)** demo API to fetch actual road geometry between stops.
- Endpoint: `https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson`
- When a job is selected, send all its stop coordinates to OSRM and draw the returned road geometry as a polyline.
- Fall back to straight-line polyline if the API request fails.
- Keep the dashed straight-line for unselected jobs (lightweight).

### Technical Details

**File: `src/components/tms/MapView.tsx`**
- Add an async function `fetchRoute(stops: [number,number][])` that calls OSRM and returns GeoJSON coordinates.
- In the marker sync `useEffect`, for the selected job, call `fetchRoute` and draw a `L.geoJSON` or `L.polyline` with the road geometry.
- Replace `L.circleMarker` with `L.marker` using `L.divIcon` containing a styled numbered div (e.g. `<div style="background:#3b82f6;color:white;border-radius:50%;width:24px;height:24px;...">1</div>`).
- OSRM is free, no API key needed, rate-limited but fine for a prototype.

