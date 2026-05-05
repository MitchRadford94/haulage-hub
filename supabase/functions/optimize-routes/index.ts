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

async function geocodeAddress(address: string): Promise<Coord | null> {
  if (UK_POSTCODE_RE.test(address)) {
    const postcodeCoord = await geocodePostcode(address);
    if (postcodeCoord) return postcodeCoord;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=gb&limit=1`,
      { headers: { "User-Agent": "HaulageHub/1.0" } },
    );
    if (res.ok) {
      const data = await res.json();
      const first = data?.[0];
      if (first?.lat && first?.lon) {
        return { lat: Number(first.lat), lng: Number(first.lon) };
      }
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

interface RouteDriver {
  id?: string;
  name?: string;
  vehicle?: string;
}

interface StopWithCoord {
  address: string;
  coord: Coord;
}

interface RouteGroup {
  stopIndexes: number[];
  orderedIndexes: number[];
  duration: number;
}

function fallbackTruckMatrix(points: Coord[]): number[][] {
  // Conservative HGV average including urban delivery work, in seconds.
  const secondsPerKm = 75;
  return points.map(from => points.map(to => dist(from, to) * secondsPerKm));
}

async function fetchTruckMatrix(points: Coord[]): Promise<{ matrix: number[][]; source: "valhalla" | "fallback" }> {
  const fallback = fallbackTruckMatrix(points);

  try {
    const locations = points.map(({ lat, lng }) => ({ lat, lon: lng }));
    const res = await fetch("https://valhalla1.openstreetmap.de/sources_to_targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: locations,
        targets: locations,
        costing: "truck",
        costing_options: {
          truck: { height: 4.11, width: 2.6, weight: 44, length: 16.5 },
        },
        units: "km",
      }),
    });

    if (!res.ok) return { matrix: fallback, source: "fallback" };

    const data = await res.json();
    const rows = data.sources_to_targets;
    if (!Array.isArray(rows) || rows.length !== points.length) return { matrix: fallback, source: "fallback" };

    const matrix = rows.map((row: Array<{ time?: number }>, fromIdx: number) =>
      row.map((cell, toIdx) => {
        const time = cell?.time;
        return Number.isFinite(time) && time >= 0 ? time : fallback[fromIdx][toIdx];
      })
    );

    return { matrix, source: "valhalla" };
  } catch {
    return { matrix: fallback, source: "fallback" };
  }
}

function routeDuration(startIndex: number, orderedStopIndexes: number[], matrix: number[][]): number {
  let duration = 0;
  let current = startIndex;
  for (const stopIndex of orderedStopIndexes) {
    duration += matrix[current][stopIndex];
    current = stopIndex;
  }
  return duration;
}

function nearestByTime(startIndex: number, stopIndexes: number[], matrix: number[][]): number[] {
  const remaining = [...stopIndexes];
  const ordered: number[] = [];
  let current = startIndex;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestTime = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const time = matrix[current][remaining[i]];
      if (time < bestTime) {
        bestTime = time;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    current = next;
  }

  return ordered;
}

function twoOptOpenRoute(startIndex: number, orderedStopIndexes: number[], matrix: number[][]): number[] {
  let route = [...orderedStopIndexes];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const candidate = [
          ...route.slice(0, i),
          ...route.slice(i, k + 1).reverse(),
          ...route.slice(k + 1),
        ];
        if (routeDuration(startIndex, candidate, matrix) + 1 < routeDuration(startIndex, route, matrix)) {
          route = candidate;
          improved = true;
        }
      }
    }
  }

  return route;
}

function optimizeStopOrder(startIndex: number, stopIndexes: number[], matrix: number[][]): number[] {
  return twoOptOpenRoute(startIndex, nearestByTime(startIndex, stopIndexes, matrix), matrix);
}

function assignToDriversByTime(
  stopIndexes: number[],
  driverCount: number,
  matrix: number[][],
): RouteGroup[] {
  const startIndex = 0;
  const targetStopsPerDriver = Math.ceil(stopIndexes.length / driverCount);
  const groups: RouteGroup[] = Array.from({ length: driverCount }, () => ({
    stopIndexes: [],
    orderedIndexes: [],
    duration: 0,
  }));

  const hardestStopsFirst = [...stopIndexes].sort((a, b) => matrix[startIndex][b] - matrix[startIndex][a]);

  for (const stopIndex of hardestStopsFirst) {
    let bestGroupIndex = 0;
    let bestScore = Infinity;

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const candidateStops = [...groups[groupIndex].stopIndexes, stopIndex];
      const candidateOrder = optimizeStopOrder(startIndex, candidateStops, matrix);
      const candidateDuration = routeDuration(startIndex, candidateOrder, matrix);
      const overloadPenalty = Math.max(0, candidateStops.length - targetStopsPerDriver) * 15 * 60;
      const idleBalancePenalty = groups[groupIndex].stopIndexes.length * 2 * 60;
      const score = candidateDuration + overloadPenalty + idleBalancePenalty;

      if (score < bestScore) {
        bestScore = score;
        bestGroupIndex = groupIndex;
      }
    }

    const group = groups[bestGroupIndex];
    group.stopIndexes.push(stopIndex);
    group.orderedIndexes = optimizeStopOrder(startIndex, group.stopIndexes, matrix);
    group.duration = routeDuration(startIndex, group.orderedIndexes, matrix);
  }

  return groups;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { addresses: rawAddresses, drivers: rawDrivers, depot } = await req.json();
    const drivers: RouteDriver[] = Array.isArray(rawDrivers) ? rawDrivers : [];

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

    // For anything not covered by the postcode bulk endpoint, try individual geocoding.
    for (const addr of allToGeocode) {
      const key = addr.trim().toUpperCase().replace(/\s+/g, " ");
      if (!coordMap.has(key)) {
        const c = await geocodeAddress(addr);
        if (c) coordMap.set(key, c);
      }
    }

    // Build stop objects with coordinates
    const stops: StopWithCoord[] = [];
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

    const startPoint = depotCoord ?? {
      lat: stops.reduce((s, x) => s + x.coord.lat, 0) / stops.length,
      lng: stops.reduce((s, x) => s + x.coord.lng, 0) / stops.length,
    };

    const matrixPoints = [startPoint, ...stops.map(stop => stop.coord)];
    const { matrix, source: matrixSource } = await fetchTruckMatrix(matrixPoints);
    const stopIndexes = stops.map((_, idx) => idx + 1);
    const groups = assignToDriversByTime(stopIndexes, drivers.length, matrix);

    const assignments = groups.map((group, idx) => ({
      driverIndex: idx,
      driverId: drivers[idx]?.id ?? null,
      estimatedMinutes: Math.round(group.duration / 60),
      stops: group.orderedIndexes.map(stopIndex => stops[stopIndex - 1].address),
    })).filter(a => a.stops.length > 0);

    console.log(
      `[optimize-routes] ${matrixSource} assignments:`,
      assignments.map(a => `driver ${a.driverIndex}: ${a.stops.length} stops, ${a.estimatedMinutes} mins`),
    );

    return new Response(JSON.stringify({
      assignments,
      optimization: {
        mode: "hgv_quickest",
        matrixSource,
      },
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
