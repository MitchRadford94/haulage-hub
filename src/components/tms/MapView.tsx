import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTMS } from '@/contexts/TMSContext';

const sampleCoords: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  manchester: [53.4808, -2.2426],
  birmingham: [52.4862, -1.8904],
  leeds: [53.8008, -1.5491],
  liverpool: [53.4084, -2.9916],
  bristol: [51.4545, -2.5879],
  sheffield: [53.3811, -1.4701],
  edinburgh: [55.9533, -3.1883],
  glasgow: [55.8642, -4.2518],
  cardiff: [51.4816, -3.1791],
  newcastle: [54.9783, -1.6178],
  nottingham: [52.9548, -1.1581],
  default: [52.5, -1.5],
};

const geocodeCache = new Map<string, [number, number]>();
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodePostcode(postcode: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 200 && data.result) {
        return [data.result.latitude, data.result.longitude];
      }
    }
  } catch {
    // fall through
  }
  return null;
}

async function geocode(address: string): Promise<[number, number]> {
  const key = address.trim().toLowerCase();

  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  // Check local city lookup
  for (const [city, coords] of Object.entries(sampleCoords)) {
    if (city !== 'default' && key.includes(city)) {
      geocodeCache.set(key, coords);
      return coords;
    }
  }

  // UK postcode → use postcodes.io (free, CORS-friendly, accurate)
  const trimmed = address.trim();
  if (UK_POSTCODE_RE.test(trimmed)) {
    const coords = await geocodePostcode(trimmed);
    if (coords) {
      geocodeCache.set(key, coords);
      return coords;
    }
  }

  // Non-postcode: try Nominatim free-text
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=gb&limit=1`,
      { headers: { 'User-Agent': 'LovableTMS/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geocodeCache.set(key, coords);
        return coords;
      }
    }
  } catch {
    // fall through
  }

  // Hash fallback
  const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const fallback: [number, number] = [51.5 + (hash % 40 - 20) * 0.1, -1.5 + (hash % 30 - 15) * 0.1];
  geocodeCache.set(key, fallback);
  return fallback;
}

function createStopIcon(index: number, selected: boolean): L.DivIcon {
  const size = selected ? 28 : 22;
  const bg = selected ? '#3b82f6' : '#64748b';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};color:#fff;
      border-radius:50%;border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:${selected ? 12 : 10}px;font-weight:700;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      line-height:1;
    ">${index + 1}</div>`,
  });
}

function decodePolyline6(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const isLng of [false, true]) {
      let shift = 0, result = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (isLng) lng += delta; else lat += delta;
    }
    coords.push([lat / 1e6, lng / 1e6]);
  }
  return coords;
}

async function fetchRoute(stops: [number, number][]): Promise<[number, number][] | null> {
  if (stops.length < 2) return null;

  // Try Valhalla truck routing first
  try {
    const body = {
      locations: stops.map(([lat, lon]) => ({ lat, lon })),
      costing: 'truck',
      costing_options: {
        truck: { height: 4.11, width: 2.6, weight: 44, length: 16.5 },
      },
      units: 'km',
      shape_format: 'polyline6',
    };
    const res = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const shape = data.trip?.legs?.map((l: { shape: string }) => l.shape).join('') ?? data.trip?.shape;
      if (shape) return decodePolyline6(shape);
    }
  } catch {
    // fall through to OSRM
  }

  // Fallback: OSRM car routing
  try {
    const coords = stops.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }
  } catch {
    // fall back to straight line
  }

  return null;
}

export default function MapView() {
  const { jobs, selectedJobId, drivers, vehicles } = useTMS();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  // Default to newest job if none selected
  const activeJob = selectedJob ?? (jobs.length > 0 ? jobs[jobs.length - 1] : null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [54.0, -2.0],
      zoom: 6,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Sync markers & route
  useEffect(() => {
    const map = mapRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    let cancelled = false;

    (async () => {
      lg.clearLayers();
      const allCoords: [number, number][] = [];

      // Geocode all stops for all jobs
      for (const job of jobs) {
        const isActive = activeJob && job.id === activeJob.id;
        const stopCoords: [number, number][] = [];

        const coords: [number, number][] = [];
        for (const s of job.stops) {
          const wasCached = geocodeCache.has(s.address.trim().toLowerCase());
          coords.push(await geocode(s.address));
          if (!wasCached) await delay(300);
        }

        coords.forEach((c, i) => {
          if (cancelled) return;
          allCoords.push(c);
          stopCoords.push(c);

          const marker = L.marker(c, { icon: createStopIcon(i, !!isActive) });
          marker.bindTooltip(`Stop ${i + 1}: ${job.stops[i].address}`, { direction: 'top', offset: [0, -14] });
          lg.addLayer(marker);
        });

        if (cancelled) return;

        // Non-active jobs: thin dashed line
        if (!isActive && stopCoords.length > 1) {
          lg.addLayer(
            L.polyline(stopCoords, {
              color: '#64748b',
              weight: 2,
              opacity: 0.4,
              dashArray: '6 4',
            })
          );
        }
      }

      if (cancelled) return;

      // Active job: fetch real road route
      if (activeJob) {
        const stopCoords: [number, number][] = [];
        for (const s of activeJob.stops) {
          const wasCached = geocodeCache.has(s.address.trim().toLowerCase());
          stopCoords.push(await geocode(s.address));
          if (!wasCached) await delay(300);
        }
        if (stopCoords.length > 1) {
          const fallback = L.polyline(stopCoords, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.6,
            dashArray: '8 6',
          });
          lg.addLayer(fallback);

          const roadCoords = await fetchRoute(stopCoords);
          if (!cancelled && roadCoords) {
            lg.removeLayer(fallback);
            lg.addLayer(
              L.polyline(roadCoords, {
                color: '#3b82f6',
                weight: 5,
                opacity: 0.9,
              })
            );
          }
        }

        if (stopCoords.length > 0) {
          map.fitBounds(L.latLngBounds(stopCoords.map((c) => L.latLng(c[0], c[1]))), { padding: [50, 50], maxZoom: 10 });
        }
      } else if (allCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allCoords.map((c) => L.latLng(c[0], c[1]))), { padding: [50, 50], maxZoom: 8 });
      }
    })();

    return () => { cancelled = true; };
  }, [jobs, selectedJobId, activeJob]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded border border-border bg-card/85 px-3 py-2 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Route Overview</div>
        <div className="mt-1 text-xs text-foreground">
          {jobs.length} jobs · {jobs.reduce((n, j) => n + j.stops.length, 0)} stops
        </div>
      </div>

      {activeJob && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded border border-border bg-card/85 px-3 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active Job</div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {drivers.find((d) => d.id === activeJob.driverId)?.name} —{' '}
            {vehicles.find((v) => v.id === activeJob.vehicleId)?.registration}
          </div>
          <div className="text-[10px] text-muted-foreground">{activeJob.stops.length} stops</div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="rounded border border-dashed border-border bg-card/70 px-4 py-3 text-center backdrop-blur">
            <div className="text-xs font-medium text-foreground">No routes yet</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Create a job to see route coverage here.</div>
          </div>
        </div>
      )}
    </div>
  );
}
