import { useEffect, useRef, useMemo } from 'react';
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

function getCoords(address: string): [number, number] {
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(sampleCoords)) {
    if (lower.includes(key)) return coords;
  }
  const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return [51.5 + (hash % 40 - 20) * 0.1, -1.5 + (hash % 30 - 15) * 0.1];
}

export default function MapView() {
  const { jobs, selectedJobId, drivers, vehicles } = useTMS();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

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

    // Fix tile rendering after container is sized
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

    lg.clearLayers();

    const allCoords: [number, number][] = [];

    jobs.forEach((job) => {
      const isSelected = job.id === selectedJobId;
      const stopCoords: [number, number][] = [];

      job.stops.forEach((stop, i) => {
        const coords = getCoords(stop.address);
        allCoords.push(coords);
        stopCoords.push(coords);

        const marker = L.circleMarker(coords, {
          radius: isSelected ? 7 : 5,
          color: isSelected ? 'hsl(210, 100%, 56%)' : 'hsl(215, 20%, 55%)',
          fillColor: isSelected ? 'hsl(210, 100%, 56%)' : 'hsl(215, 20%, 40%)',
          fillOpacity: isSelected ? 0.9 : 0.6,
          weight: isSelected ? 2 : 1,
        });

        marker.bindTooltip(`Stop ${i + 1}: ${stop.address}`, { direction: 'top', offset: [0, -8] });
        lg.addLayer(marker);
      });

      if (isSelected && stopCoords.length > 1) {
        const polyline = L.polyline(stopCoords, {
          color: 'hsl(210, 100%, 56%)',
          weight: 3,
          opacity: 0.8,
          dashArray: '8 6',
        });
        lg.addLayer(polyline);
      }
    });

    // Fit bounds
    if (selectedJob) {
      const coords = selectedJob.stops.map((s) => getCoords(s.address));
      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords.map((c) => L.latLng(c[0], c[1]))), { padding: [50, 50], maxZoom: 10 });
      }
    } else if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords.map((c) => L.latLng(c[0], c[1]))), { padding: [50, 50], maxZoom: 8 });
    }
  }, [jobs, selectedJobId, selectedJob]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded border border-border bg-card/85 px-3 py-2 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Route Overview</div>
        <div className="mt-1 text-xs text-foreground">
          {jobs.length} jobs · {jobs.reduce((n, j) => n + j.stops.length, 0)} stops
        </div>
      </div>

      {selectedJob && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded border border-border bg-card/85 px-3 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Selected Job</div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {drivers.find((d) => d.id === selectedJob.driverId)?.name} —{' '}
            {vehicles.find((v) => v.id === selectedJob.vehicleId)?.registration}
          </div>
          <div className="text-[10px] text-muted-foreground">{selectedJob.stops.length} stops</div>
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
