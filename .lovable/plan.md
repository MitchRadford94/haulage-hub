

## HGV-Friendly Routing

### Problem
Currently using OSRM's demo server with `driving` profile — standard car routing that ignores truck restrictions like low bridges, weight limits, and width constraints.

### Solution
Switch from OSRM to **Valhalla** (open-source, free public instance at `valhalla1.openstreetmap.de`) using its `truck` costing model. This accounts for:
- Vehicle height/weight/width restrictions
- Low bridge avoidance
- Road access restrictions for HGVs

### Changes: `src/components/tms/MapView.tsx`

Replace the `fetchRoute` function to call Valhalla instead of OSRM:

- **Endpoint**: `https://valhalla1.openstreetmap.de/route`
- **Costing**: `"truck"` with sensible UK HGV defaults (height: 4.11m, width: 2.6m, weight: 44t, length: 16.5m)
- **Request format**: POST with JSON body containing locations and truck costing options
- **Response parsing**: Extract the encoded polyline shape from Valhalla's response and decode it to lat/lng coordinates
- **Fallback**: If Valhalla fails, fall back to OSRM car routing, then to straight lines

### Technical Detail
```text
POST https://valhalla1.openstreetmap.de/route
Body: {
  "locations": [{"lat":..,"lon":..}, ...],
  "costing": "truck",
  "costing_options": {
    "truck": { "height": 4.11, "width": 2.6, "weight": 44, "length": 16.5 }
  },
  "units": "km",
  "shape_format": "polyline6"
}
```

Decode the returned polyline shape into `[lat, lng][]` and render as before. No new dependencies needed — just a polyline decode function (~15 lines).

