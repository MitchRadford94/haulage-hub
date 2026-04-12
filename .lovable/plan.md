

## Problem
The `getCoords` function only matches city names (london, manchester, etc.). Postcodes like "SW1A 1AA" don't match any key, so they fall through to a hash-based random position.

## Solution
Use the **OpenStreetMap Nominatim** geocoding API to resolve any address or postcode to real coordinates. It's free, no API key needed, and handles UK postcodes well.

### Changes: `src/components/tms/MapView.tsx`

1. **Replace `getCoords` with an async `geocode` function** that:
   - Calls `https://nominatim.openstreetmap.org/search?format=json&q={address}&countrycodes=gb&limit=1`
   - Returns `[lat, lng]` from the response
   - Falls back to the existing city-name lookup if the API fails
   - Caches results in a `Map<string, [number, number]>` to avoid repeat requests

2. **Make the marker/route sync `useEffect` async** to await geocoding before placing markers and fetching OSRM routes.

3. **Add a small delay between geocode calls** (or batch them) to respect Nominatim's 1 req/sec rate limit.

4. Keep the existing `sampleCoords` lookup as a fast offline fallback — check it first before hitting the API.

### Technical shape
```text
geocodeCache: Map<string, [number,number]>

async geocode(address):
  if cache has address → return cached
  if sampleCoords match → return & cache
  fetch Nominatim → parse lat/lon → cache & return
  on error → hash fallback

useEffect (jobs/selectedJobId change):
  resolve all stop coords via await Promise.all(geocode(...))
  place markers + fetch OSRM route (unchanged)
```

### Result
- Entering "SW1A 1AA" or "M1 1AA" will place markers at the correct real-world location.
- City names still work instantly via the local lookup.
- Routes between postcodes will follow real roads via OSRM.

