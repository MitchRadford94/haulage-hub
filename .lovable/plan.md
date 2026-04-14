

## Problem

Two issues causing routes to appear "all over the place":

1. **Wrong geocoding results**: Bare postcodes like "B1 1HJ" sometimes match roads/places in Northern Ireland instead of the actual Birmingham postcode. The network logs show "B1 1HJ" resolving to lat 54.3 / lon -5.7 (Downpatrick, NI) instead of Birmingham (lat 52.5 / lon -1.9).

2. **Rate limiting**: Nominatim allows ~1 request/second. When 29 postcodes are geocoded simultaneously via `Promise.all`, most requests fail ("Failed to fetch"), falling through to the hash-based random placement.

## Solution

### Fix 1: Better postcode queries
Detect UK postcode patterns and use Nominatim's structured search (`postalcode` + `country=gb`) instead of free-text `q=`. This returns the correct postcode centroid every time.

### Fix 2: Rate-limit geocoding
Serialize geocode requests with a small delay (~300ms) between calls to Nominatim, so they don't get rejected. Cached results return instantly with no delay.

### Changes: `src/components/tms/MapView.tsx`

- Add a UK postcode regex: `/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i`
- When a postcode is detected, call Nominatim with `postalcode=B1+1HJ&country=gb&format=json&limit=1` instead of `q=B1+1HJ`
- Replace `Promise.all(stops.map(geocode))` with a sequential loop that adds a 300ms delay between uncached Nominatim calls
- Keep the cache so repeated lookups are instant

### Result
All Birmingham postcodes will correctly resolve to Birmingham, and no requests will be dropped due to rate limiting.

