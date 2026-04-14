import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

interface Coord {
  lat: number;
  lng: number;
}

async function geocodePostcode(pc: string): Promise<Coord | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc.trim())}`);
    if (res.ok) {
      const d = await res.json();
      if (d.status === 200 && d.result) return { lat: d.result.latitude, lng: d.result.longitude };
    }
  } catch { /* ignore */ }
  return null;
}

async function geocodeBulkPostcodes(postcodes: string[]): Promise<Map<string, Coord>> {
  const result = new Map<string, Coord>();
  // postcodes.io bulk endpoint, max 100 per request
  for (let i = 0; i < postcodes.length; i += 100) {
    const batch = postcodes.slice(i, i + 100);
    try {
      const res = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcodes: batch }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.result ?? []) {
          if (item.result) {
            result.set(item.query.trim().toUpperCase().replace(/\s+/g, " "), {
              lat: item.result.latitude,
              lng: item.result.longitude,
            });
          }
        }
      }
    } catch { /* ignore */ }
  }
  return result;
}

function dist(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Nearest-neighbour ordering from a start point
function orderByNearest(start: Coord, stops: { address: string; coord: Coord }[]): { address: string; coord: Coord }[] {
  const remaining = [...stops];
  const ordered: typeof stops = [];
  let current = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = dist(current, remaining[i].coord);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    ordered.push(remaining[bestIdx]);
    current = remaining[bestIdx].coord;
    remaining.splice(bestIdx, 1);
  }
  return ordered;
}

// Assign stops to drivers by geographic clustering (k-means-like with nearest assignment)
function assignToDrivers(
  stops: { address: string; coord: Coord }[],
  driverCount: number,
  depotCoord: Coord | null
): { address: string; coord: Coord }[][] {
  if (driverCount <= 1) return [stops];

  // Sort all stops by angle from centroid for initial partitioning
  const centroid: Coord = {
    lat: stops.reduce((s, x) => s + x.coord.lat, 0) / stops.length,
    lng: stops.reduce((s, x) => s + x.coord.lng, 0) / stops.length,
  };

  const withAngle = stops.map(s => ({
    ...s,
    angle: Math.atan2(s.coord.lat - centroid.lat, s.coord.lng - centroid.lng),
  }));
  withAngle.sort((a, b) => a.angle - b.angle);

  // Split roughly evenly by angle
  const groups: { address: string; coord: Coord }[][] = Array.from({ length: driverCount }, () => []);
  const perDriver = Math.ceil(withAngle.length / driverCount);
  withAngle.forEach((s, i) => {
    const gi = Math.min(Math.floor(i / perDriver), driverCount - 1);
    groups[gi].push(s);
  });

  return groups;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { addresses: rawAddresses, drivers, depot } = await req.json();

    // Sanitize: trim and remove blank addresses
    const addresses: string[] = (rawAddresses ?? [])
      .map((a: string) => a?.trim())
      .filter((a: string) => a && a.length > 0);

    if (addresses.length < 2 || !drivers?.length) {
      return new Response(JSON.stringify({ error: "At least 2 addresses and 1 driver required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[optimize-routes] ${addresses.length} addresses, ${drivers.length} drivers, depot: ${depot || "none"}`);

    // Collect all postcodes for bulk geocoding
    const allToGeocode = [...addresses];
    if (depot?.trim()) allToGeocode.push(depot.trim());

    const postcodes = allToGeocode.filter(a => UK_POSTCODE_RE.test(a));
    const coordMap = await geocodeBulkPostcodes(postcodes);

    // For non-postcodes, try individual geocoding
    for (const addr of allToGeocode) {
      const key = addr.trim().toUpperCase().replace(/\s+/g, " ");
      if (!coordMap.has(key)) {
        if (UK_POSTCODE_RE.test(addr)) {
          const c = await geocodePostcode(addr);
          if (c) coordMap.set(key, c);
        }
      }
    }

    // Build stop objects with coordinates
    const stops: { address: string; coord: Coord }[] = [];
    const failedAddresses: string[] = [];

    for (const addr of addresses) {
      const key = addr.trim().toUpperCase().replace(/\s+/g, " ");
      const coord = coordMap.get(key);
      if (coord) {
        stops.push({ address: addr, coord });
      } else {
        failedAddresses.push(addr);
      }
    }

    // If some addresses failed geocoding, still include them but warn
    // Place them at centroid of successful ones
    if (failedAddresses.length > 0 && stops.length > 0) {
      const centroid: Coord = {
        lat: stops.reduce((s, x) => s + x.coord.lat, 0) / stops.length,
        lng: stops.reduce((s, x) => s + x.coord.lng, 0) / stops.length,
      };
      for (const addr of failedAddresses) {
        stops.push({ address: addr, coord: centroid });
      }
      console.log(`[optimize-routes] ${failedAddresses.length} addresses failed geocoding, placed at centroid`);
    }

    if (stops.length === 0) {
      return new Response(JSON.stringify({ error: "Could not geocode any addresses" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Depot coordinate
    let depotCoord: Coord | null = null;
    if (depot?.trim()) {
      const depotKey = depot.trim().toUpperCase().replace(/\s+/g, " ");
      depotCoord = coordMap.get(depotKey) ?? null;
      console.log(`[optimize-routes] depot coord:`, depotCoord);
    }

    // Assign stops to drivers by geographic clustering
    const groups = assignToDrivers(stops, drivers.length, depotCoord);

    // Order each group by nearest-neighbour from depot (or centroid)
    const startPoint = depotCoord ?? {
      lat: stops.reduce((s, x) => s + x.coord.lat, 0) / stops.length,
      lng: stops.reduce((s, x) => s + x.coord.lng, 0) / stops.length,
    };

    const assignments = groups.map((group, idx) => ({
      driverIndex: idx,
      stops: orderByNearest(startPoint, group).map(s => s.address),
    })).filter(a => a.stops.length > 0);

    console.log(`[optimize-routes] assignments:`, assignments.map(a => `driver ${a.driverIndex}: ${a.stops.length} stops`));

    return new Response(JSON.stringify({
      assignments,
      depot: depot?.trim() || null,
      depotCoord,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-routes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
